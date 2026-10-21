require("dotenv").config();
import { Server, Socket } from "socket.io";
import {
  DataTypes,
  IAuthedAuxData,
  IAuthenticationData,
  IAuxAuthenticationData,
  isAuthedData,
} from "../model/eventData";
import { MatchController } from "../controller/MatchController";
import logging from "../util/Logging";
import { readFileSync } from "fs";
import { createServer } from "https";
import { createServer as createInsecureServer } from "http";
import { DatabaseConnector, KeyValidity, ValidityReasons } from "./databaseConnector";
import { isCompatibleVersion } from "../util/CompatibleClients";
const Log = logging("WebsocketIncoming");

export class WebsocketIncoming {
  wss: Server;
  static authedClients: ClientUser[] = [];
  matchController = MatchController.getInstance();

  constructor() {
    let serverInstance;

    if (process.env.INSECURE == "true") {
      serverInstance = createInsecureServer();
    } else {
      if (!process.env.SERVER_KEY || !process.env.SERVER_CERT) {
        Log.error(
          `Missing TLS key or certificate! Please provide the paths to the key and certificate in the .env file. (SERVER_KEY and SERVER_CERT)`,
        );
      }

      const options = {
        key: readFileSync(process.env.SERVER_KEY!),
        cert: readFileSync(process.env.SERVER_CERT!),
      };

      serverInstance = createServer(options);
    }

    this.wss = new Server(serverInstance, {
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024,
        },
        threshold: 1024,
      },
      cors: { origin: "*" },
    });

    this.wss.on(`connection`, (ws) => {
      const user = new ClientUser("New User", "Unknown Team", ws);

      ws.on("error", () => {
        Log.error(`${user.name} encountered a Websocket error.`);
      });

      // Trayb: drop the client from authedClients when its socket closes, otherwise the list
      // grows without bound over a long-running server (#21).
      ws.on("disconnect", () => {
        const i = WebsocketIncoming.authedClients.findIndex((c) => c.ws.id === ws.id);
        if (i !== -1) WebsocketIncoming.authedClients.splice(i, 1);
      });

      ws.once("obs_logon", async (msg) => {
        try {
          const authenticationData: IAuthenticationData = JSON.parse(msg.toString());

          if (WebsocketIncoming.authedClients.find((client) => client.ws.id === ws.id) != undefined)
            return;

          // Check if the packet is valid
          if (authenticationData.type !== DataTypes.AUTH) {
            ws.emit(
              "obs_logon_ack",
              JSON.stringify({ type: DataTypes.AUTH, value: false, reason: `Invalid packet.` }),
            );
            ws.disconnect();
            Log.info(`Received BAD auth request, invalid packet.`);
            return;
          }

          // Check if the client version is compatible with the server version
          if (!isCompatibleVersion(authenticationData.clientVersion)) {
            ws.emit(
              "obs_logon_ack",
              JSON.stringify({
                type: DataTypes.AUTH,
                value: false,
                reason: `Client version ${authenticationData.clientVersion} is not compatible with server version ${module.exports.version}.`,
              }),
            );
            ws.disconnect();
            Log.info(
              `Received BAD auth request from ${authenticationData.obsName}, using Group Code ${authenticationData.groupCode} and key ${authenticationData.key ? "[set]" : "[empty]"}, incompatible client version ${authenticationData.clientVersion}.`,
            );
            return;
          }

          // Check if the key is valid
          const validity = await this.isValidKey(authenticationData.key);
          if (validity.valid === false) {
            ws.emit(
              "obs_logon_ack",
              JSON.stringify({ type: DataTypes.AUTH, value: false, reason: validity.reason }),
            );
            ws.disconnect();
            Log.info(
              `Received BAD auth request from ${authenticationData.obsName}, using Group Code ${authenticationData.groupCode} and key ${authenticationData.key ? "[set]" : "[empty]"}`,
            );
            return;
          } else {
            //key is valid
            if (validity.organizationId) {
              authenticationData.organizationId = validity.organizationId;
            }
            authenticationData.isSupporter = validity.isSupporter;
          }

          // Trayb: the group code becomes part of the replay file path, so reject anything
          // that isn't plain uppercase letters/digits. A code with "/" or "\" could escape the
          // replays folder or crash the unhandled write stream (#21).
          if (!/^[A-Z0-9]{1,16}$/.test(authenticationData.groupCode)) {
            ws.emit(
              "obs_logon_ack",
              JSON.stringify({
                type: DataTypes.AUTH,
                value: false,
                reason: `Invalid group code. Use letters A-Z and digits only.`,
              }),
            );
            ws.disconnect();
            Log.info(`Received BAD auth request with invalid group code from ${authenticationData.obsName}.`);
            return;
          }

          // Check if the match can be created successfully
          const groupSecret = await this.matchController.createMatch(authenticationData);
          if (!groupSecret || groupSecret === "") {
            ws.emit(
              "obs_logon_ack",
              JSON.stringify({
                type: DataTypes.AUTH,
                value: false,
                reason: `Game with Group Code ${authenticationData.groupCode} exists and is still live.`,
              }),
            );
            ws.disconnect();
            Log.info(
              `Received BAD auth request from ${authenticationData.obsName}, using Group Code ${authenticationData.groupCode} and key ${authenticationData.key ? "[set]" : "[empty]"}`,
            );
            return;
          }

          // All checks passed, send logon acknolwedgement
          ws.emit(
            "obs_logon_ack",
            JSON.stringify({ type: DataTypes.AUTH, value: true, reason: groupSecret }),
          );
          user.name = authenticationData.obsName;
          user.groupCode = authenticationData.groupCode;
          WebsocketIncoming.authedClients.push(user);

          Log.info(
            `Received VALID auth request from ${authenticationData.obsName}, using Group Code ${authenticationData.groupCode} and with teams ${authenticationData.leftTeam.name} and ${authenticationData.rightTeam.name}`,
          );
          this.onAuthSuccess(user);
        } catch (e) {
          Log.error(`Error parsing incoming auth request: ${e}`);
          Log.error(e);
        }
      });

      ws.once("aux_logon", async (msg) => {
        try {
          const authenticationData: IAuxAuthenticationData = JSON.parse(msg.toString());

          if (WebsocketIncoming.authedClients.find((client) => client.ws.id === ws.id) != undefined)
            return;

          // Check if the packet is valid
          if (authenticationData.type !== DataTypes.AUX_AUTH) {
            ws.emit(
              "aux_logon_ack",
              JSON.stringify({ type: DataTypes.AUTH, value: false, reason: `Invalid packet.` }),
            );
            ws.disconnect();
            Log.info(`Received BAD aux auth request, invalid packet.`);
            return;
          }

          // Check if the client version is compatible with the server version
          if (!isCompatibleVersion(authenticationData.clientVersion)) {
            ws.emit(
              "aux_logon_ack",
              JSON.stringify({
                type: DataTypes.AUTH,
                value: false,
                reason: `Client version ${authenticationData.clientVersion} is not compatible with server version ${module.exports.version}.`,
              }),
            );
            ws.disconnect();
            Log.info(
              `Received BAD aux auth request from ${authenticationData.playerId} for match ${authenticationData.matchId}, incompatible client version ${authenticationData.clientVersion}.`,
            );
            return;
          }

          const groupCode = this.matchController.findMatch(authenticationData.matchId);
          // Check if the match exists
          if (groupCode == null) {
            ws.emit(
              "aux_logon_ack",
              JSON.stringify({
                type: DataTypes.AUTH,
                value: false,
                reason: `Game with Match ID ${authenticationData.matchId} not found.`,
              }),
            );
            ws.disconnect();
            Log.info(
              `Received BAD aux auth request from ${authenticationData.playerId} for match ${authenticationData.matchId}, match not found.`,
            );
            return;
          }

          // All checks passed, send logon acknolwedgement
          ws.emit("aux_logon_ack", JSON.stringify({ type: DataTypes.AUX_AUTH, value: true }));
          user.name = authenticationData.name;
          user.groupCode = groupCode;
          user.isAuxiliary = true;
          user.playerId = authenticationData.playerId;
          WebsocketIncoming.authedClients.push(user);

          Log.info(
            `Received VALID aux auth request from ${authenticationData.playerId} for Group Code ${groupCode}`,
          );
          this.onAuthSuccess(user);
        } catch (e) {
          Log.error(`Error parsing incoming auth request: ${e}`);
          Log.error(e);
        }
      });

      ws.on("disconnect", () => {
        const index = WebsocketIncoming.authedClients.findIndex((client) => client.ws.id === ws.id);
        if (index != -1) {
          const client = WebsocketIncoming.authedClients[index];
          if (client.playerId !== "") {
            Log.info(`Auxiliary player ${client.playerId} disconnected.`);
            this.matchController.setAuxDisconnected(client.groupCode, client.playerId);
          }
          if (client.isAuxiliary) {
            WebsocketIncoming.authedClients.splice(index, 1);
          }
        }
      });
    });

    serverInstance.listen(5100);
    Log.info(`Spectra Server ingesting on port 5100!`);
  }

  private onAuthSuccess(user: ClientUser) {
    user.ws.on("obs_data", async (msg: any) => {
      try {
        const data = JSON.parse(msg.toString());
        if (isAuthedData(data)) {
          // Trayb: route by the socket's own match, not the group code in the payload, so a
          // logged-in client can't push data into someone else's match (#21).
          if ("groupCode" in data && data.groupCode !== user.groupCode) {
            Log.info(`Dropped obs_data for ${data.groupCode} from a client authed to ${user.groupCode}`);
            return;
          }
          await this.matchController.receiveMatchData(data);
        }
      } catch (e) {
        Log.error(`Error parsing obs_data: ${e}`);
      }
    });

    user.ws.on("aux_data", async (msg: any) => {
      try {
        const data = JSON.parse(msg.toString());
        if (isAuthedData(data)) {
          // Trayb: a player may only send their own player's data, into their own match (#21).
          const auxData = data as IAuthedAuxData;
          if (user.playerId !== "" && auxData.playerId !== user.playerId) {
            Log.info(`Dropped aux_data for player ${auxData.playerId} from ${user.playerId}`);
            return;
          }
          if ("matchId" in data && this.matchController.findMatch(auxData.matchId) !== user.groupCode) {
            Log.info(`Dropped aux_data for match ${auxData.matchId} from a client authed to ${user.groupCode}`);
            return;
          }
          await this.matchController.receiveMatchData(data);
          if (data.type === DataTypes.AUX_SCOREBOARD && user.playerId === "") {
            user.playerId = auxData.playerId;
          }
        }
      } catch (e) {
        Log.error(`Error parsing aux_data: ${e}`);
      }
    });
  }

  public async isValidKey(key: string): Promise<KeyValidity> {
    if (process.env.REQUIRE_AUTH_KEY === "false")
      return { valid: true, reason: ValidityReasons.VALID };

    if (process.env.AUTH_KEY === key) return { valid: true, reason: ValidityReasons.VALID };

    let validity: KeyValidity = { valid: false, reason: ValidityReasons.INVALID };
    if (process.env.USE_BACKEND === "true") {
      validity = await DatabaseConnector.verifyAccessKey(key);
    }

    return validity;
  }

  public static disconnectGroupCode(groupCode: string) {
    for (const client of WebsocketIncoming.authedClients) {
      if (client.groupCode === groupCode) {
        client.ws.disconnect();
      }
    }
  }
}

class ClientUser {
  name: string;
  groupCode: string;
  isAuxiliary: boolean = false;
  playerId: string = "";
  ws: Socket;

  constructor(name: string, groupCode: string, ws: Socket) {
    this.name = name;
    this.groupCode = groupCode;
    this.ws = ws;
  }
}

export interface AuthTeam {
  name: string;
  tricode: string;
  url: string;
  attackStart: boolean;
}

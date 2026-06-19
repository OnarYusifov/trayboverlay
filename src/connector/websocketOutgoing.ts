require("dotenv").config();
import { Server } from "socket.io";
import logging from "../util/Logging";
import { readFileSync } from "fs";
import { createServer } from "https";
import { createServer as createInsecureServer } from "http";
import { MatchController } from "../controller/MatchController";
import { timingSafeEqual } from "crypto";
const Log = logging("WebsocketOutgoing");

export class WebsocketOutgoing {
  private static instance: WebsocketOutgoing;
  wss: Server;

  public static getInstance(): WebsocketOutgoing {
    if (WebsocketOutgoing.instance == null) WebsocketOutgoing.instance = new WebsocketOutgoing();
    return WebsocketOutgoing.instance;
  }

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

    this.wss.use((ws, next) => {
      const expectedToken = process.env.OVERLAY_AUTH_TOKEN || process.env.OUTPUT_AUTH_TOKEN;
      if (!expectedToken) {
        next();
        return;
      }

      const headerToken = ws.handshake.headers["x-overlay-auth-token"];
      const providedToken =
        ws.handshake.auth?.token ||
        ws.handshake.query?.token ||
        (Array.isArray(headerToken) ? headerToken[0] : headerToken);

      if (typeof providedToken === "string" && this.tokensMatch(providedToken, expectedToken)) {
        next();
        return;
      }

      Log.info("Rejected output websocket connection with missing or invalid overlay token.");
      next(new Error("Unauthorized"));
    });

    this.wss.on(`connection`, (ws) => {
      ws.on("error", (e) => {
        Log.error(`Someone in ${ws.rooms} encountered a Websocket error: ${e}`);
      });

      ws.once("logon", (msg: string) => {
        try {
          const json = JSON.parse(msg);
          if (!json.groupCode || typeof json.groupCode !== "string") {
            ws.emit("logon_fail", JSON.stringify({ msg: "Missing group code" }));
            ws.disconnect();
            return;
          }

          ws.join(json.groupCode);
          ws.emit(
            "logon_success",
            JSON.stringify({
              groupCode: json.groupCode,
              msg: `Logon succeeded for group code ${json.groupCode}`,
            }),
          );
          Log.info(`Received output logon using Group Code ${json.groupCode}`);
          MatchController.getInstance().sendMatchDataForLogon(json.groupCode);
        } catch (e) {
          Log.error(`Error parsing outgoing logon request: ${e}`);
        }
      });
    });

    this.wss.engine.on("connection_error", (err) => {
      Log.error("Socket.IO error: " + err);
    });

    serverInstance.listen(5200);

    Log.info(`Trayb Server outputting on port 5200!`);
  }

  private tokensMatch(providedToken: string, expectedToken: string): boolean {
    const provided = Buffer.from(providedToken);
    const expected = Buffer.from(expectedToken);
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  }

  sendMatchData(groupCode: string, data: any) {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      replayLog,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      eventNumber,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      groupSecret,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      playercamUrl,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      timeoutEndTimeout,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      timeoutRemainingLoop,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      toastEndTimeout,

      ...formattedData
    } = data;

    const deepMod: any = structuredClone(formattedData);
    if (
      deepMod.tools &&
      deepMod.tools.playercamsInfo &&
      typeof deepMod.tools.playercamsInfo === "object"
    ) {
      delete deepMod.tools.playercamsInfo.secret;
      delete deepMod.tools.playercamsInfo.endTime;
    }

    this.wss.to(groupCode).emit("match_data", JSON.stringify(deepMod));
  }
}

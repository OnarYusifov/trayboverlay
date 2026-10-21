// End-to-end smoke test for the server pipeline (#22). Proves an observer can log on, an
// overlay receives match_data, and the auth/validation guards reject bad input. Run against a
// server reachable at SMOKE_HOST (default 127.0.0.1) with SMOKE_KEY as AUTH_KEY.
//
//   node scripts/smoke-test.mjs
//
// Exit non-zero on the first failed assertion. Used by .github/workflows/ci.yml.
import { io } from "socket.io-client";

const HOST = process.env.SMOKE_HOST || "127.0.0.1";
const KEY = process.env.SMOKE_KEY || "smokekey123";
const INGEST = `http://${HOST}:5100`;
const OUTPUT = `http://${HOST}:5200`;

const team = (name) => ({ name, tricode: name.slice(0, 3).toUpperCase(), url: "", attackStart: true });
const fail = (m) => {
  console.error(`FAIL: ${m}`);
  process.exit(1);
};
const ok = (m) => console.log(`ok: ${m}`);

function obsLogon(key, groupCode) {
  return new Promise((resolve) => {
    const s = io(INGEST, { transports: ["websocket"], reconnection: false, timeout: 5000 });
    const done = (r) => {
      resolve({ ...r, socket: s });
    };
    s.on("connect", () =>
      s.emit(
        "obs_logon",
        JSON.stringify({
          type: "authenticate",
          clientVersion: "0.3.4",
          obsName: "smoke",
          key,
          groupCode,
          leftTeam: team("Left"),
          rightTeam: team("Right"),
          toolsData: {},
        }),
      ),
    );
    s.on("obs_logon_ack", (m) => done(JSON.parse(m)));
    s.on("connect_error", (e) => done({ error: e.message }));
    setTimeout(() => done({ error: "timeout" }), 6000);
  });
}

function overlayMatchData(groupCode) {
  return new Promise((resolve) => {
    const s = io(OUTPUT, { transports: ["websocket"], reconnection: false });
    s.on("connect", () => s.emit("logon", JSON.stringify({ groupCode })));
    s.on("match_data", (m) => {
      s.close();
      resolve(JSON.parse(m));
    });
    setTimeout(() => {
      s.close();
      resolve(null);
    }, 5000);
  });
}

// 1. A valid observer logs on and gets a 12-char group secret.
const good = await obsLogon(KEY, "AAAAAA");
if (good.value !== true) fail(`valid logon rejected: ${good.reason || good.error}`);
ok("valid observer logon");

// 2. The overlay receives match_data for that group.
const md = await overlayMatchData("AAAAAA");
if (!md) fail("overlay received no match_data");
if (md.groupCode !== "AAAAAA") fail(`match_data groupCode ${md.groupCode} != AAAAAA`);
if (!Array.isArray(md.teams)) fail("match_data has no teams array");
ok("overlay received match_data");

// 3. A wrong key is rejected.
const wrong = await obsLogon("definitely-wrong", "AAAAAB");
if (wrong.value !== false) fail("wrong key was accepted");
ok("wrong key rejected");

// 4. A malformed group code is rejected (replay-path guard, #21).
const bad = await obsLogon(KEY, "bad/code");
if (bad.value !== false) fail("malformed group code was accepted");
ok("malformed group code rejected");

// 5. The server is still alive after the bad input, and the first match still serves data.
const stillUp = await overlayMatchData("AAAAAA");
if (!stillUp || stillUp.groupCode !== "AAAAAA") fail("server/match unhealthy after bad input");
ok("server healthy after bad input");

good.socket?.close();
console.log("smoke test passed");
process.exit(0);

/**
 * Start Next standalone without Docker's HOSTNAME (container id), which would
 * make Node listen on the wrong interface and Traefik/Coolify show "no available server".
 * When HOSTNAME is unset, `.next/standalone/server.js` defaults to 0.0.0.0.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const serverJs = path.join(root, ".next", "standalone", "server.js");

const env = { ...process.env };
delete env.HOSTNAME;

const child = spawn(process.execPath, [serverJs], {
  stdio: "inherit",
  env,
  cwd: root,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});

/**
 * Start Next standalone: replace Docker's HOSTNAME (container id) so Node does not bind to it.
 * Use `::` so the server listens dual-stack; probes to `localhost` (often ::1) still work.
 * (Binding only 0.0.0.0 breaks some Alpine/wget healthchecks against localhost.)
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const serverJs = path.join(root, ".next", "standalone", "server.js");

const env = { ...process.env };
delete env.HOSTNAME;
env.HOSTNAME = "::";

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

import net from "net";

const host = "127.0.0.1";
const port = Number(process.env.PG_PORT || 54329);
const timeoutMs = 60_000;
const start = Date.now();

function tryConnect() {
  return new Promise((resolve, reject) => {
    const s = net.createConnection({ host, port }, () => {
      s.end();
      resolve(true);
    });
    s.on("error", reject);
  });
}

(async () => {
  while (Date.now() - start < timeoutMs) {
    try {
      await tryConnect();
      process.exit(0);
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  console.error(`Postgres not reachable on ${host}:${port} after ${timeoutMs}ms`);
  process.exit(1);
})();

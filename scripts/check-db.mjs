// Lancé automatiquement avant « npm run dev » : message clair si la base PostgreSQL ne répond pas
import "dotenv/config";
import net from "node:net";

const url = new URL(process.env.DATABASE_URL ?? "postgresql://localhost:5432");
const port = Number(url.port) || 5432;
const ok = await new Promise((resolve) => {
  const s = net.connect({ host: url.hostname, port, timeout: 1500 }, () => { s.end(); resolve(true); });
  s.on("error", () => resolve(false));
  s.on("timeout", () => { s.destroy(); resolve(false); });
});
if (!ok) {
  console.error(`\n✖ La base de données ne répond pas (${url.hostname}:${port}).`);
  console.error("  Ouvrez un autre terminal et lancez :  npm run db");
  console.error("  Attendez « PostgreSQL prêt », puis relancez :  npm run dev\n");
  process.exit(1);
}

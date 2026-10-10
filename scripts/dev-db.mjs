// Base PostgreSQL locale pour le développement (sans Docker). Données dans ./.pgdata
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const pg = new EmbeddedPostgres({ databaseDir: "./.pgdata", user: "fogeko", password: "fogeko", port: 54329, persistent: true });
if (!existsSync("./.pgdata/PG_VERSION")) await pg.initialise();
await pg.start();
try { await pg.createDatabase("fogeko"); } catch { /* existe déjà */ }
console.log("PostgreSQL prêt : postgresql://fogeko:fogeko@localhost:54329/fogeko");
const stop = async () => { await pg.stop(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

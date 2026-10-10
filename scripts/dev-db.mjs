// Base PostgreSQL locale pour le développement (sans Docker). Données dans ./.pgdata
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import pgLib from "pg";

// UTF-8 obligatoire : sous Windows, PostgreSQL choisit sinon WIN1252 (emojis et certains caractères refusés)
const pg = new EmbeddedPostgres({
  databaseDir: "./.pgdata", user: "fogeko", password: "fogeko", port: 54329, persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});
if (!existsSync("./.pgdata/PG_VERSION")) await pg.initialise();
await pg.start();

const admin = new pgLib.Client("postgresql://fogeko:fogeko@localhost:54329/postgres");
await admin.connect();
const { rows } = await admin.query("SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = 'fogeko'");
if (!rows.length) await admin.query("CREATE DATABASE fogeko ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0");
else if (rows[0].enc !== "UTF8") console.warn(`⚠ La base « fogeko » est en ${rows[0].enc} : les emojis et certains caractères seront refusés.`);
await admin.end();

console.log("PostgreSQL prêt : postgresql://fogeko:fogeko@localhost:54329/fogeko");
const stop = async () => { await pg.stop(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

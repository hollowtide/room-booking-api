const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const config = require("../../src/config");
const db = require("../../src/db/knex");

async function ensureTestDatabase() {
  const url = new URL(config.DATABASE_URL);
  const name = url.pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to run integration tests on non-test database "${name}"`);
  }
  url.pathname = "/postgres";
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (rowCount === 0) await client.query(`CREATE DATABASE "${name}"`);
  } finally {
    await client.end();
  }
}

async function setupSchema() {
  await ensureTestDatabase();
  await db.migrate.latest();
}

async function resetData() {
  await db.raw("TRUNCATE audit_log, reservations, rooms, buildings, users RESTART IDENTITY CASCADE");
  await db("users").insert({
    email: "admin@example.com",
    password_hash: await bcrypt.hash("admin-password-123", 4),
    role: "ADMIN",
  });
  await db("buildings").insert({ name: "Budynek A", address: "ul. Testowa 1, Kraków" });
  await db("rooms").insert([
    { building_id: 1, name: "101", capacity: 10 },
    { building_id: 1, name: "102", capacity: 20 },
  ]);
}

module.exports = { db, setupSchema, resetData };

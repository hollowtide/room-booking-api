const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");

function toEmail(name) {
  if (/^[^@\s]+@[^@\s]+$/.test(name.trim())) return name.trim().toLowerCase();
  const local = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return `${local || "user"}@example.com`;
}

exports.up = async function (knex) {
  await knex.schema.alterTable("reservations", (table) => {
    table.integer("user_id").references("id").inTable("users").onDelete("RESTRICT");
  });

  const rows = await knex("reservations").distinct("reserved_by").orderBy("reserved_by");
  for (const { reserved_by: name } of rows) {
    const email = toEmail(name);
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
    await knex("users").insert({ email, password_hash: passwordHash, role: "USER" }).onConflict("email").ignore();
    const user = await knex("users").where({ email }).first("id");
    await knex("reservations").where({ reserved_by: name }).update({ user_id: user.id });
  }

  await knex.schema.alterTable("reservations", (table) => {
    table.integer("user_id").notNullable().alter();
    table.index(["user_id"]);
    table.dropColumn("reserved_by");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("reservations", (table) => {
    table.string("reserved_by", 100);
  });

  await knex.raw(`
    UPDATE reservations r
    SET reserved_by = u.email
    FROM users u
    WHERE u.id = r.user_id
  `);

  await knex.schema.alterTable("reservations", (table) => {
    table.string("reserved_by", 100).notNullable().alter();
    table.dropIndex(["user_id"]);
    table.dropColumn("user_id");
  });
};

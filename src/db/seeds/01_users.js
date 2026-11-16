const bcrypt = require("bcryptjs");
const config = require("../../config");

exports.seed = async function (knex) {
  await knex.raw("TRUNCATE audit_log, reservations, rooms, buildings, users RESTART IDENTITY CASCADE");

  const hash = (password) => bcrypt.hash(password, config.BCRYPT_ROUNDS);

  await knex("users").insert([
    { email: "admin@example.com", password_hash: await hash("admin-password-123"), role: "ADMIN" },
    { email: "jan.kowalski@example.com", password_hash: await hash("jan-password-123"), role: "USER" },
    { email: "anna.nowak@example.com", password_hash: await hash("anna-password-123"), role: "USER" },
  ]);
};

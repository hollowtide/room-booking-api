const config = require("./config");
const { createApp } = require("./app");
const { createEventBus } = require("./events/eventBus");

function createInMemory() {
  const bcrypt = require("bcryptjs");
  const { createInMemoryUnitOfWork } = require("./db/unitOfWork.memory");
  const uow = createInMemoryUnitOfWork({
    users: [
      {
        id: 1,
        email: "admin@example.com",
        passwordHash: bcrypt.hashSync("admin-password-123", config.BCRYPT_ROUNDS),
        role: "ADMIN",
        createdAt: new Date(),
      },
    ],
    buildings: [{ id: 1, name: "Budynek A", address: "ul. Warszawska 24, Kraków", createdAt: new Date() }],
    rooms: [{ id: 1, buildingId: 1, name: "101", capacity: 30, createdAt: new Date() }],
    reservations: [],
  });
  return { ...uow, close: async () => {} };
}

function createKnex(eventBus) {
  const db = require("./db/knex");
  const { createKnexUnitOfWork } = require("./db/unitOfWork.knex");
  const { registerAuditListeners } = require("./events/auditListeners");
  const { registerNotificationListeners } = require("./events/notificationListeners");

  registerAuditListeners(eventBus, db);
  registerNotificationListeners(eventBus, db);
  return { ...createKnexUnitOfWork(db), close: () => db.destroy() };
}

const eventBus = createEventBus();
const { runInTransaction, close } = config.REPOSITORY === "memory" ? createInMemory() : createKnex(eventBus);

const app = createApp({ config, runInTransaction, eventBus });

const server = app.listen(config.PORT, () => {
  console.log(`Room Booking API działa na http://localhost:${config.PORT} (dokumentacja: /api/docs)`);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down gracefully`);

  server.close(async (err) => {
    if (err) console.error("HTTP server close failed:", err);
    await close();
    console.log("HTTP server closed, database pool closed - bye");
    process.exit(err ? 1 : 0);
  });

  setTimeout(() => {
    console.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 8000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

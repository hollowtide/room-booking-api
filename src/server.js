const config = require("./config");
const { createApp } = require("./app");

function createUnitOfWork() {
  if (config.REPOSITORY === "memory") {
    const bcrypt = require("bcryptjs");
    const { createInMemoryUnitOfWork } = require("./db/unitOfWork.memory");
    return createInMemoryUnitOfWork({
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
  }
  const db = require("./db/knex");
  const { createKnexUnitOfWork } = require("./db/unitOfWork.knex");
  return createKnexUnitOfWork(db);
}

const app = createApp({ config, ...createUnitOfWork() });

app.listen(config.PORT, () => {
  console.log(`Room Booking API v4 działa na http://localhost:${config.PORT} (dokumentacja: /api/docs)`);
});

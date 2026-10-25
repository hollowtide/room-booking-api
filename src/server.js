const { createApp } = require("./app");

const PORT = 3000;

function createUnitOfWork() {
  if (process.env.REPOSITORY === "memory") {
    const { createInMemoryUnitOfWork } = require("./db/unitOfWork.memory");
    return createInMemoryUnitOfWork({
      buildings: [{ id: 1, name: "Budynek A", address: "ul. Warszawska 24, Kraków", createdAt: new Date() }],
      rooms: [{ id: 1, buildingId: 1, name: "101", capacity: 30, createdAt: new Date() }],
      reservations: [],
    });
  }
  const db = require("./db/knex");
  const { createKnexUnitOfWork } = require("./db/unitOfWork.knex");
  return createKnexUnitOfWork(db);
}

const app = createApp(createUnitOfWork());

app.listen(PORT, () => {
  console.log(`Room Booking API v3 działa na http://localhost:${PORT}`);
});

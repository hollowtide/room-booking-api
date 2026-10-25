const { createKnexBuildingsRepository } = require("../modules/buildings/buildings.repository.knex");
const { createKnexRoomsRepository } = require("../modules/rooms/rooms.repository.knex");
const { createKnexReservationsRepository } = require("../modules/reservations/reservations.repository.knex");

function createKnexRepositories(db) {
  return {
    buildings: createKnexBuildingsRepository(db),
    rooms: createKnexRoomsRepository(db),
    reservations: createKnexReservationsRepository(db),
  };
}

function createKnexUnitOfWork(db) {
  return {
    runInTransaction: (fn) => db.transaction((trx) => fn(createKnexRepositories(trx))),
  };
}

module.exports = { createKnexRepositories, createKnexUnitOfWork };

const { createKnexAuditRepository } = require("../modules/audit/audit.repository.knex");
const { createKnexUsersRepository } = require("../modules/users/users.repository.knex");
const { createKnexBuildingsRepository } = require("../modules/buildings/buildings.repository.knex");
const { createKnexRoomsRepository } = require("../modules/rooms/rooms.repository.knex");
const { createKnexReservationsRepository } = require("../modules/reservations/reservations.repository.knex");

function createKnexRepositories(db) {
  return {
    users: createKnexUsersRepository(db),
    audit: createKnexAuditRepository(db),
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

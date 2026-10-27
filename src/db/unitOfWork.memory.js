const { createInMemoryUsersRepository } = require("../modules/users/users.repository.memory");
const { createInMemoryBuildingsRepository } = require("../modules/buildings/buildings.repository.memory");
const { createInMemoryRoomsRepository } = require("../modules/rooms/rooms.repository.memory");
const { createInMemoryReservationsRepository } = require("../modules/reservations/reservations.repository.memory");

function createInMemoryUnitOfWork(seed = {}) {
  const state = {
    users: structuredClone(seed.users ?? []),
    buildings: structuredClone(seed.buildings ?? []),
    rooms: structuredClone(seed.rooms ?? []),
    reservations: structuredClone(seed.reservations ?? []),
  };
  const repositories = {
    users: createInMemoryUsersRepository(state),
    buildings: createInMemoryBuildingsRepository(state),
    rooms: createInMemoryRoomsRepository(state),
    reservations: createInMemoryReservationsRepository(state),
  };
  return { runInTransaction: (fn) => fn(repositories) };
}

module.exports = { createInMemoryUnitOfWork };

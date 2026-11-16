const { createInMemoryUnitOfWork } = require("../../src/db/unitOfWork.memory");
const { createReservationsService } = require("../../src/modules/reservations/reservations.service");

const NOW = new Date("2026-12-01T08:00:00Z");

const ADMIN = { id: 1, role: "ADMIN" };
const JAN = { id: 2, role: "USER" };
const ANNA = { id: 3, role: "USER" };

function at(time) {
  return new Date(`2026-12-10T${time}:00Z`);
}

function reservation(id, roomId, userId, start, end, extra = {}) {
  return {
    id,
    roomId,
    userId,
    participants: 5,
    startTime: at(start),
    endTime: at(end),
    status: "CONFIRMED",
    createdAt: NOW,
    cancelledAt: null,
    ...extra,
  };
}

function setup({ reservations = [], now = NOW, eventBus } = {}) {
  const clock = { now };
  const uow = createInMemoryUnitOfWork({
    users: [
      { id: 1, email: "admin@example.com", passwordHash: "x", role: "ADMIN", createdAt: NOW },
      { id: 2, email: "jan@example.com", passwordHash: "x", role: "USER", createdAt: NOW },
      { id: 3, email: "anna@example.com", passwordHash: "x", role: "USER", createdAt: NOW },
    ],
    buildings: [{ id: 1, name: "Budynek A", address: "ul. Testowa 1", createdAt: NOW }],
    rooms: [
      { id: 1, buildingId: 1, name: "101", capacity: 10, createdAt: NOW },
      { id: 2, buildingId: 1, name: "102", capacity: 20, createdAt: NOW },
    ],
    reservations,
  });
  const service = createReservationsService({
    runInTransaction: uow.runInTransaction,
    eventBus,
    now: () => clock.now,
  });
  return { service, clock };
}

function input(start, end, extra = {}) {
  return {
    roomId: 1,
    participants: 5,
    startTime: at(start).toISOString(),
    endTime: at(end).toISOString(),
    ...extra,
  };
}

module.exports = { NOW, ADMIN, JAN, ANNA, at, reservation, setup, input };

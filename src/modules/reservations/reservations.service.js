const { NotFoundError, ConflictError, ValidationError, ForbiddenError } = require("../../errors/AppError");

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

const ALLOWED_TRANSITIONS = {
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
};

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function canAccess(reservation, currentUser) {
  return currentUser.role === "ADMIN" || reservation.userId === currentUser.id;
}

function createReservationsService({ runInTransaction, now = () => new Date() }) {
  async function createReservation(input, currentUser) {
    return runInTransaction(async ({ rooms, reservations }) => {
      const room = await rooms.findById(input.roomId);
      if (!room) throw new NotFoundError("Room");

      const start = new Date(input.startTime).getTime();
      const end = new Date(input.endTime).getTime();

      if (end <= start) {
        throw new ValidationError([{ location: "body", field: "endTime", message: "endTime must be after startTime" }]);
      }
      const duration = end - start;
      if (duration < MIN_DURATION_MS || duration > MAX_DURATION_MS) {
        throw new ValidationError([
          { location: "body", field: "endTime", message: "Reservation must last between 15 minutes and 8 hours" },
        ]);
      }
      if (start < now().getTime()) {
        throw new ValidationError([{ location: "body", field: "startTime", message: "startTime cannot be in the past" }]);
      }

      if (input.participants > room.capacity) {
        throw new ConflictError("Room capacity exceeded", "ROOM_CAPACITY_EXCEEDED");
      }

      await rooms.lockById(room.id);

      const active = await reservations.findActiveByRoom(room.id);
      const conflict = active.some((r) => overlaps(start, end, r.startTime.getTime(), r.endTime.getTime()));
      if (conflict) {
        throw new ConflictError("Room is already booked in this time range", "ROOM_ALREADY_BOOKED");
      }

      return reservations.create({
        roomId: room.id,
        userId: currentUser.id,
        participants: input.participants,
        startTime: new Date(start),
        endTime: new Date(end),
        status: "CONFIRMED",
        createdAt: now(),
      });
    });
  }

  async function listReservations(query, currentUser) {
    const filters = { ...query };
    if (currentUser.role !== "ADMIN") {
      if (query.userId !== undefined && query.userId !== currentUser.id) {
        throw new ForbiddenError("Filtering by userId is available only for ADMIN");
      }
      filters.userId = currentUser.id;
    }

    return runInTransaction(async ({ reservations }) => {
      const { items, total } = await reservations.list(filters);
      return {
        items,
        meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      };
    });
  }

  async function getReservation(id, currentUser) {
    return runInTransaction(async ({ reservations }) => {
      const reservation = await reservations.findById(id);
      if (!reservation || !canAccess(reservation, currentUser)) throw new NotFoundError("Reservation");
      return reservation;
    });
  }

  async function cancelReservation(id, currentUser) {
    return runInTransaction(async ({ reservations }) => {
      const reservation = await reservations.findById(id);
      if (!reservation || !canAccess(reservation, currentUser)) throw new NotFoundError("Reservation");
      const target = "CANCELLED";

      if (reservation.status === target) return reservation;

      if (!ALLOWED_TRANSITIONS[reservation.status].includes(target)) {
        throw new ConflictError(
          `Cannot change status from ${reservation.status} to ${target}`,
          "INVALID_STATUS_TRANSITION"
        );
      }

      if (reservation.startTime.getTime() <= now().getTime()) {
        throw new ConflictError("Reservation has already started", "RESERVATION_ALREADY_STARTED");
      }

      return reservations.update(id, { status: target, cancelledAt: now() });
    });
  }

  return { createReservation, listReservations, getReservation, cancelReservation };
}

module.exports = { createReservationsService, ALLOWED_TRANSITIONS };

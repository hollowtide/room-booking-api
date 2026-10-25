const { NotFoundError, ConflictError, ValidationError } = require("../../errors/AppError");

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

const ALLOWED_TRANSITIONS = {
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
};

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function createReservationsService({ roomsRepository, reservationsRepository, now = () => new Date() }) {
  async function createReservation(input) {
    const room = await roomsRepository.findById(input.roomId);
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

    const active = await reservationsRepository.findActiveByRoom(room.id);
    const conflict = active.some((r) => overlaps(start, end, r.startTime.getTime(), r.endTime.getTime()));
    if (conflict) {
      throw new ConflictError("Room is already booked in this time range", "ROOM_ALREADY_BOOKED");
    }

    return reservationsRepository.create({
      roomId: room.id,
      reservedBy: input.reservedBy,
      participants: input.participants,
      startTime: new Date(start),
      endTime: new Date(end),
      status: "CONFIRMED",
      createdAt: now(),
    });
  }

  async function listReservations(filters) {
    return reservationsRepository.findAll(filters);
  }

  async function getReservation(id) {
    const reservation = await reservationsRepository.findById(id);
    if (!reservation) throw new NotFoundError("Reservation");
    return reservation;
  }

  async function cancelReservation(id) {
    const reservation = await getReservation(id);
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

    return reservationsRepository.update(id, { status: target, cancelledAt: now() });
  }

  return { createReservation, listReservations, getReservation, cancelReservation };
}

module.exports = { createReservationsService, ALLOWED_TRANSITIONS };

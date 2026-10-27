const toIso = (date) => (date ? new Date(date).toISOString() : null);

function toReservationResponse(r) {
  return {
    id: r.id,
    room: {
      id: r.room.id,
      name: r.room.name,
      building: { id: r.room.building.id, name: r.room.building.name },
    },
    user: { id: r.user.id, email: r.user.email },
    participants: r.participants,
    startTime: toIso(r.startTime),
    endTime: toIso(r.endTime),
    status: r.status,
    createdAt: toIso(r.createdAt),
    cancelledAt: toIso(r.cancelledAt),
  };
}

module.exports = { toReservationResponse };

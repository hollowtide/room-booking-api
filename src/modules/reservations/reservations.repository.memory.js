const SORT_FIELDS = { startTime: "startTime", createdAt: "createdAt", participants: "participants" };

function createInMemoryReservationsRepository(state) {
  let nextId = Math.max(0, ...state.reservations.map((r) => r.id)) + 1;

  const withRoom = (r) => {
    const room = state.rooms.find((x) => x.id === r.roomId);
    const b = state.buildings.find((x) => x.id === room.buildingId);
    const u = state.users.find((x) => x.id === r.userId);
    return {
      ...r,
      user: { id: u.id, email: u.email },
      room: { id: room.id, name: room.name, building: { id: b.id, name: b.name } },
    };
  };

  return {
    async list({ roomId, buildingId, userId, status, from, to, page, limit, sort }) {
      const desc = sort.startsWith("-");
      const field = SORT_FIELDS[desc ? sort.slice(1) : sort];
      const items = state.reservations
        .map(withRoom)
        .filter(
          (r) =>
            (roomId === undefined || r.roomId === roomId) &&
            (buildingId === undefined || r.room.building.id === buildingId) &&
            (userId === undefined || r.userId === userId) &&
            (status === undefined || r.status === status) &&
            (to === undefined || r.startTime < new Date(to)) &&
            (from === undefined || r.endTime > new Date(from))
        )
        .sort((a, b) => (a[field] - b[field]) * (desc ? -1 : 1) || a.id - b.id);
      return { items: items.slice((page - 1) * limit, page * limit), total: items.length };
    },
    async findById(id) {
      const r = state.reservations.find((x) => x.id === id);
      return r ? withRoom(r) : null;
    },
    async findActiveByRoom(roomId) {
      return state.reservations.filter((r) => r.roomId === roomId && r.status === "CONFIRMED").map(withRoom);
    },
    async create(data) {
      const reservation = { id: nextId++, cancelledAt: null, internalNote: "created via API v3", ...data };
      state.reservations.push(reservation);
      return withRoom(reservation);
    },
    async update(id, changes) {
      const r = state.reservations.find((x) => x.id === id);
      Object.assign(r, changes);
      return withRoom(r);
    },
  };
}

module.exports = { createInMemoryReservationsRepository };

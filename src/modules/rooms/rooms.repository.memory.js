function createInMemoryRoomsRepository(state) {
  let nextId = Math.max(0, ...state.rooms.map((r) => r.id)) + 1;
  const withBuilding = (r) => {
    const b = state.buildings.find((x) => x.id === r.buildingId);
    return { ...r, building: { id: b.id, name: b.name } };
  };

  return {
    async findAll() {
      return state.rooms.map(withBuilding);
    },
    async findById(id) {
      const r = state.rooms.find((x) => x.id === id);
      return r ? withBuilding(r) : null;
    },
    async findByBuilding(buildingId) {
      return state.rooms.filter((r) => r.buildingId === buildingId).map(withBuilding);
    },
    async create({ buildingId, name, capacity }) {
      const room = { id: nextId++, buildingId, name, capacity, createdAt: new Date() };
      state.rooms.push(room);
      return withBuilding(room);
    },
    async update(id, changes) {
      const r = state.rooms.find((x) => x.id === id);
      Object.assign(r, Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)));
      return withBuilding(r);
    },
    async delete(id) {
      if (state.reservations.some((r) => r.roomId === id)) {
        throw Object.assign(new Error("room in use"), { code: "23503" });
      }
      state.rooms = state.rooms.filter((r) => r.id !== id);
    },
    async lockById() {
    },
  };
}

module.exports = { createInMemoryRoomsRepository };

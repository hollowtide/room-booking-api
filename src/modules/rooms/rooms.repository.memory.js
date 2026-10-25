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
    async lockById() {
    },
  };
}

module.exports = { createInMemoryRoomsRepository };

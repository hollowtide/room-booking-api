function toRoom(row) {
  if (!row) return null;
  return {
    id: row.id,
    buildingId: row.building_id,
    name: row.name,
    capacity: row.capacity,
    createdAt: row.created_at,
    building: { id: row.building_id, name: row.building_name },
  };
}

function createKnexRoomsRepository(db) {
  const withBuilding = () =>
    db("rooms")
      .join("buildings", "buildings.id", "rooms.building_id")
      .select(
        "rooms.id",
        "rooms.building_id",
        "rooms.name",
        "rooms.capacity",
        "rooms.created_at",
        "buildings.name as building_name"
      );

  return {
    async findAll() {
      const rows = await withBuilding().orderBy("rooms.id");
      return rows.map(toRoom);
    },

    async findById(id) {
      return toRoom(await withBuilding().where("rooms.id", id).first());
    },

    async findByBuilding(buildingId) {
      const rows = await withBuilding().where("rooms.building_id", buildingId).orderBy("rooms.id");
      return rows.map(toRoom);
    },

    async create({ buildingId, name, capacity }) {
      const [{ id }] = await db("rooms").insert({ building_id: buildingId, name, capacity }).returning("id");
      return this.findById(id);
    },

    async lockById(id) {
      await db("rooms").where({ id }).forUpdate().first("id");
    },
  };
}

module.exports = { createKnexRoomsRepository };

function toBuilding(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    createdAt: row.created_at,
    roomsCount: Number(row.rooms_count ?? 0),
  };
}

function createKnexBuildingsRepository(db) {
  const withRoomsCount = () =>
    db("buildings")
      .leftJoin("rooms", "rooms.building_id", "buildings.id")
      .select("buildings.id", "buildings.name", "buildings.address", "buildings.created_at")
      .count({ rooms_count: "rooms.id" })
      .groupBy("buildings.id");

  return {
    async findAll() {
      const rows = await withRoomsCount().orderBy("buildings.id");
      return rows.map(toBuilding);
    },

    async findById(id) {
      return toBuilding(await withRoomsCount().where("buildings.id", id).first());
    },

    async create({ name, address }) {
      const [row] = await db("buildings").insert({ name, address }).returning("*");
      return toBuilding(row);
    },
  };
}

module.exports = { createKnexBuildingsRepository };

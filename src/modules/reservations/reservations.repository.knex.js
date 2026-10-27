const SORT_COLUMNS = {
  startTime: "reservations.start_time",
  createdAt: "reservations.created_at",
  participants: "reservations.participants",
};

function toReservation(row) {
  if (!row) return null;
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    user: { id: row.user_id, email: row.user_email },
    room: {
      id: row.room_id,
      name: row.room_name,
      building: { id: row.building_id, name: row.building_name },
    },
    participants: row.participants,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
  };
}

function createKnexReservationsRepository(db) {
  const withRoomAndBuilding = () =>
    db("reservations")
      .join("rooms", "rooms.id", "reservations.room_id")
      .join("buildings", "buildings.id", "rooms.building_id")
      .join("users", "users.id", "reservations.user_id")
      .select(
        "reservations.id",
        "reservations.room_id",
        "reservations.user_id",
        "users.email as user_email",
        "reservations.participants",
        "reservations.start_time",
        "reservations.end_time",
        "reservations.status",
        "reservations.created_at",
        "reservations.cancelled_at",
        "rooms.name as room_name",
        "rooms.building_id",
        "buildings.name as building_name"
      );

  function applyFilters(qb, { roomId, buildingId, userId, status, from, to }) {
    if (roomId !== undefined) qb.where("reservations.room_id", roomId);
    if (userId !== undefined) qb.where("reservations.user_id", userId);
    if (buildingId !== undefined) qb.where("rooms.building_id", buildingId);
    if (status !== undefined) qb.where("reservations.status", status);
    if (to !== undefined) qb.where("reservations.start_time", "<", to);
    if (from !== undefined) qb.where("reservations.end_time", ">", from);
  }

  return {
    async list({ page, limit, sort, ...filters }) {
      const desc = sort.startsWith("-");
      const column = SORT_COLUMNS[desc ? sort.slice(1) : sort];

      const rowsQuery = withRoomAndBuilding()
        .modify(applyFilters, filters)
        .orderBy(column, desc ? "desc" : "asc")
        .orderBy("reservations.id", "asc")
        .limit(limit)
        .offset((page - 1) * limit);

      const countQuery = db("reservations")
        .join("rooms", "rooms.id", "reservations.room_id")
        .modify(applyFilters, filters)
        .count({ count: "reservations.id" })
        .first();

      const [rows, { count }] = await Promise.all([rowsQuery, countQuery]);
      return { items: rows.map(toReservation), total: Number(count) };
    },

    async findById(id) {
      return toReservation(await withRoomAndBuilding().where("reservations.id", id).first());
    },

    async findActiveByRoom(roomId) {
      const rows = await withRoomAndBuilding()
        .where("reservations.room_id", roomId)
        .where("reservations.status", "CONFIRMED");
      return rows.map(toReservation);
    },

    async create({ roomId, userId, participants, startTime, endTime, status, createdAt }) {
      const [{ id }] = await db("reservations")
        .insert({
          room_id: roomId,
          user_id: userId,
          participants,
          start_time: startTime,
          end_time: endTime,
          status,
          created_at: createdAt,
        })
        .returning("id");
      return this.findById(id);
    },

    async update(id, { status, cancelledAt }) {
      await db("reservations").where({ id }).update({ status, cancelled_at: cancelledAt });
      return this.findById(id);
    },
  };
}

module.exports = { createKnexReservationsRepository };

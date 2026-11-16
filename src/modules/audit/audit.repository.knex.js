function toEntry(row) {
  return {
    id: Number(row.id),
    eventType: row.event_type,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

function createKnexAuditRepository(db) {
  return {
    async list({ eventType, page, limit }) {
      const filtered = () => {
        const qb = db("audit_log");
        if (eventType !== undefined) qb.where({ event_type: eventType });
        return qb;
      };

      const [rows, { count }] = await Promise.all([
        filtered()
          .orderBy("created_at", "desc")
          .orderBy("id", "desc")
          .limit(limit)
          .offset((page - 1) * limit),
        filtered().count({ count: "*" }).first(),
      ]);
      return { items: rows.map(toEntry), total: Number(count) };
    },
  };
}

module.exports = { createKnexAuditRepository };

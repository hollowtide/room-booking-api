function createInMemoryAuditRepository(state) {
  return {
    async list({ eventType, page, limit }) {
      const items = state.auditLog
        .filter((e) => eventType === undefined || e.eventType === eventType)
        .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
      return { items: items.slice((page - 1) * limit, page * limit), total: items.length };
    },
  };
}

module.exports = { createInMemoryAuditRepository };

const { z } = require("zod");
const { AUDITED_EVENTS } = require("../../events/auditListeners");

const listAuditLogQuery = z.object({
  eventType: z.enum(AUDITED_EVENTS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { listAuditLogQuery };

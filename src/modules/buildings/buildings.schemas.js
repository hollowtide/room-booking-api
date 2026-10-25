const { z } = require("zod");

const buildingIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

const createBuildingBody = z.strictObject({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().min(3).max(200),
});

module.exports = { buildingIdParams, createBuildingBody };

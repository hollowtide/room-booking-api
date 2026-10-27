const { z } = require("zod");

const buildingIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

const createBuildingBody = z.strictObject({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().min(3).max(200),
});

const updateBuildingBody = createBuildingBody
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: "At least one field is required" });

module.exports = { buildingIdParams, createBuildingBody, updateBuildingBody };

const { z } = require("zod");

const roomIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

const createRoomBody = z.strictObject({
  buildingId: z.number().int().positive(),
  name: z.string().trim().min(1).max(50),
  capacity: z.number().int().positive(),
});

const updateRoomBody = z
  .strictObject({
    name: z.string().trim().min(1).max(50),
    capacity: z.number().int().positive(),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: "At least one field is required" });

module.exports = { roomIdParams, createRoomBody, updateRoomBody };

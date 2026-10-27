const { z } = require("zod");

const email = z.string().trim().toLowerCase().pipe(z.email({ error: "Invalid email address" }));

const registerBody = z.strictObject({
  email,
  password: z.string().min(10, "Password must have at least 10 characters").max(72, "Password must have at most 72 characters"),
});

const loginBody = z.strictObject({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1).max(72),
});

module.exports = { registerBody, loginBody };

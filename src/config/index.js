const { z } = require("zod");

try {
  process.loadEnvFile();
} catch {}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: "DATABASE_URL must be a valid postgres:// URL" }),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must have at least 32 characters"),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, "JWT_EXPIRES_IN must look like 15m, 10s, 1h or 7d").default("15m"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  REPOSITORY: z.enum(["knex", "memory"]).default("knex"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:");
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

module.exports = Object.freeze(result.data);

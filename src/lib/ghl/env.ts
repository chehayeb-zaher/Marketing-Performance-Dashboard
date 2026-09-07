import "server-only";
import { z } from "zod";

/**
 * Server-only environment configuration for the GoHighLevel integration.
 * Importing this module from client code is blocked at build time by `server-only`.
 */
const envSchema = z.object({
  GHL_PRIVATE_TOKEN: z.string().min(1, "GHL_PRIVATE_TOKEN is required"),
  GHL_LOCATION_ID: z.string().min(1, "GHL_LOCATION_ID is required"),
  GHL_API_BASE_URL: z
    .string()
    .url("GHL_API_BASE_URL must be a valid URL")
    .default("https://services.leadconnectorhq.com"),
  GHL_API_VERSION: z.string().min(1).default("v3"),
  REPORT_TIMEZONE: z.string().min(1).default("UTC"),
});

export type GhlEnv = z.infer<typeof envSchema>;

let cached: GhlEnv | null = null;

/** Parses and validates required GHL env vars. Throws a descriptive error (never logs the token). */
export function getGhlEnv(): GhlEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse({
    GHL_PRIVATE_TOKEN: process.env.GHL_PRIVATE_TOKEN,
    GHL_LOCATION_ID: process.env.GHL_LOCATION_ID,
    GHL_API_BASE_URL: process.env.GHL_API_BASE_URL,
    GHL_API_VERSION: process.env.GHL_API_VERSION,
    REPORT_TIMEZONE: process.env.REPORT_TIMEZONE,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid GoHighLevel environment configuration - ${issues}`);
  }

  cached = parsed.data;
  return cached;
}

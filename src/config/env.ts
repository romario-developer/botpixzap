import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  PORT: z.string().default("4000"),
  DATABASE_URL: z.string().min(1),
  WA_VERIFY_TOKEN: z.string().min(1),
  WA_PHONE_NUMBER_ID: z.string().min(1),
  WA_ACCESS_TOKEN: z.string().min(1),
  MP_ACCESS_TOKEN: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  ADMIN_JWT_SECRET: z.string().min(1),
  PUBLIC_BASE_URL: z.string().url(),
  TZ: z.string().default("America/Bahia"),
});

export const env = envSchema.parse(process.env);
export const appConfig = {
  port: Number.parseInt(env.PORT, 10),
  timezone: env.TZ,
  wa: {
    verifyToken: env.WA_VERIFY_TOKEN,
    phoneNumberId: env.WA_PHONE_NUMBER_ID,
    accessToken: env.WA_ACCESS_TOKEN,
  },
  mp: {
    accessToken: env.MP_ACCESS_TOKEN,
  },
  admin: {
    password: env.ADMIN_PASSWORD,
    jwtSecret: env.ADMIN_JWT_SECRET,
  },
  publicBaseUrl: env.PUBLIC_BASE_URL,
};

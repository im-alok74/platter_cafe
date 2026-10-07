import { z } from "zod";

// Server-only values. Optional ones become required in the phase that uses them.
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),
  SEND_SMS_HOOK_SECRET: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

// NEXT_PUBLIC_* must be read as literal process.env.X so Next can inline them.
const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
});

const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
});

// Parsed only on the server so secrets never reach the browser bundle.
// Blank values (as in .env.example) count as unset.
const unblank = (e: NodeJS.ProcessEnv) => Object.fromEntries(Object.entries(e).filter(([, v]) => v !== ""));
const serverEnv = typeof window === "undefined" ? serverSchema.parse(unblank(process.env)) : ({} as z.infer<typeof serverSchema>);

export const env = { ...publicEnv, ...serverEnv };

import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/kandycabs?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z
    .string()
    .default('super-secret-kandy-cabs-jwt-key-change-in-production-min-32-chars'),
  GOOGLE_MAPS_API_KEY: z.string().default('AIzaSyMockGoogleMapsApiKeyForKandyCabs'),
  RAZORPAY_KEY_ID: z.string().default('rzp_test_mock_kandy_cabs_key'),
  RAZORPAY_KEY_SECRET: z.string().default('mock_razorpay_secret_key_12345'),
  STORAGE_ACCESS_KEY: z.string().default('mock_storage_access_key'),
  STORAGE_SECRET_KEY: z.string().default('mock_storage_secret_key'),
  OTP_PROVIDER_API_KEY: z.string().default('mock_fast2sms_or_msg91_api_key'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY,
  STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY,
  OTP_PROVIDER_API_KEY: process.env.OTP_PROVIDER_API_KEY,
  NODE_ENV: process.env.NODE_ENV,
});

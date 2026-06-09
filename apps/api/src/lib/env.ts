import { logger } from './logger';

export interface EnvValidationResult {
  valid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  errors: string[];
}

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

const OPTIONAL_ENV_VARS = [
  'REDIS_URL',
  'FRONTEND_URL',
  'API_URL',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'STRIPE_SECRET_KEY',
  'SMTP_HOST'
];

export function validateEnv(): EnvValidationResult {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  const errors: string[] = [];

  for (const v of REQUIRED_ENV_VARS) {
    if (!process.env[v]) {
      missingRequired.push(v);
      errors.push(`Required environment variable ${v} is missing.`);
    }
  }

  for (const v of OPTIONAL_ENV_VARS) {
    if (!process.env[v]) {
      missingOptional.push(v);
    }
  }

  if (missingRequired.length > 0) {
    logger.error('CRITICAL: Missing required environment variables:', missingRequired);
  }
  if (missingOptional.length > 0) {
    logger.warn('WARNING: Missing optional environment variables:', missingOptional);
  }

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    missingOptional,
    errors
  };
}

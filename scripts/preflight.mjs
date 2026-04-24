import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const envFile = path.join(projectRoot, '.env.local');
const migrationFile = path.join(
  projectRoot,
  'supabase',
  'migrations',
  '20260423_enterprise_hardening.sql'
);

const requiredEnvKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'APP_SESSION_SECRET',
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error('.env.local is missing');
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .reduce((acc, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) return acc;

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

const envMap = parseEnvFile(envFile);
const missingKeys = requiredEnvKeys.filter((key) => !envMap[key]);

if (missingKeys.length > 0) {
  throw new Error(`Missing required env keys: ${missingKeys.join(', ')}`);
}

if (!fs.existsSync(migrationFile)) {
  throw new Error('Migration contract is missing');
}

console.log('Preflight OK');

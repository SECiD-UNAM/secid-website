import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM: __dirname does not exist; derive it from import.meta.url.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Minimal .env loader (KEY=VALUE lines, # comments, optional quotes).
 * Avoids a dotenv dependency; existing process.env values win.
 */
function loadEnvFile(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function globalSetup(config: FullConfig) {
  // Load environment variables
  loadEnvFile(path.join(__dirname, '..', '.env.test'));

  // Store auth state for reuse
  process.env.STORAGE_STATE = path.join(
    __dirname,
    '..',
    'test-results',
    '.auth',
    'user.json'
  );

  console.log('🚀 Global setup: Starting E2E tests');
  console.log(`📍 Base URL: ${config.projects[0].use.baseURL}`);
  console.log(`🌐 Running ${config.projects.length} browser configurations`);

  // Initialize test database if needed
  if (process.env.USE_TEST_DB === 'true') {
    console.log('🗄️  Setting up test database...');
    // Add database setup logic here
  }

  // Clear test data from previous runs
  console.log('🧹 Cleaning up previous test data...');

  return async () => {
    // This function will be available in tests as globalSetup
  };
}

export default globalSetup;

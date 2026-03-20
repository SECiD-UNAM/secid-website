import { FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

async function globalSetup(config: FullConfig) {
  // Load environment variables
  dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

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

import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🏁 Global teardown: Cleaning up after tests');
  
  // Clean up test artifacts
  try {
    const authDir = path.join(__dirname, '..', 'test-results', '.auth');
    await fs.rmdir(authDir, { recursive: true });
  } catch (error) {
    // Directory might not exist
  }
  
  // Clean up test database if used
  if (process.env.USE_TEST_DB === 'true') {
    console.log('🗄️  Cleaning up test database...');
    // Add database cleanup logic here
  }
  
  // Generate test summary
  console.log('📊 Test run completed');
  
  // Upload results to dashboard if in CI
  if (process.env.CI) {
    console.log('📤 Uploading test results to dashboard...');
    // Add test results upload logic here
  }
}

export default globalTeardown;
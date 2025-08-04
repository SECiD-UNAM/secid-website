#!/usr/bin/env node

/**
 * Setup Validation Script
 * Checks if the development environment is properly configured
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}${msg}${colors.reset}\n${'='.repeat(msg.length)}`),
};

let hasErrors = false;
let hasWarnings = false;

// Check Node.js version
function checkNodeVersion() {
  log.section('Checking Node.js Version');
  
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    log.info(`Node.js version: ${nodeVersion}`);
    
    if (majorVersion < 20) {
      log.error(`Node.js 20.17.0 or higher is required (found ${nodeVersion})`);
      hasErrors = true;
    } else {
      log.success('Node.js version meets requirements');
    }
  } catch (error) {
    log.error('Failed to check Node.js version');
    hasErrors = true;
  }
}

// Check npm version
function checkNpmVersion() {
  log.section('Checking npm Version');
  
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log.info(`npm version: ${npmVersion}`);
    
    const majorVersion = parseInt(npmVersion.split('.')[0]);
    if (majorVersion < 8) {
      log.warn(`npm 8.0.0 or higher is recommended (found ${npmVersion})`);
      hasWarnings = true;
    } else {
      log.success('npm version meets requirements');
    }
  } catch (error) {
    log.error('npm is not installed or not in PATH');
    hasErrors = true;
  }
}

// Check required files
function checkRequiredFiles() {
  log.section('Checking Required Files');
  
  const requiredFiles = [
    { path: 'package.json', type: 'file' },
    { path: 'astro.config.mjs', type: 'file' },
    { path: 'tsconfig.json', type: 'file' },
    { path: '.gitignore', type: 'file' },
    { path: 'src', type: 'directory' },
    { path: 'public', type: 'directory' },
  ];
  
  requiredFiles.forEach(({ path: filePath, type }) => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      log.success(`${filePath} exists`);
    } else {
      log.error(`Missing ${type}: ${filePath}`);
      hasErrors = true;
    }
  });
}

// Check environment configuration
function checkEnvironment() {
  log.section('Checking Environment Configuration');
  
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      log.warn('.env file not found - copy .env.example to .env and update values');
      hasWarnings = true;
    } else {
      log.error('Neither .env nor .env.example found');
      hasErrors = true;
    }
  } else {
    log.success('.env file exists');
    
    // Check for required environment variables
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'PUBLIC_FIREBASE_API_KEY',
      'PUBLIC_FIREBASE_AUTH_DOMAIN',
      'PUBLIC_FIREBASE_PROJECT_ID',
    ];
    
    requiredVars.forEach((varName) => {
      if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your-`)) {
        log.success(`${varName} is configured`);
      } else {
        log.warn(`${varName} needs to be configured in .env`);
        hasWarnings = true;
      }
    });
  }
}

// Check dependencies
function checkDependencies() {
  log.section('Checking Dependencies');
  
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    log.error('node_modules not found - run "npm install"');
    hasErrors = true;
    return;
  }
  
  log.success('node_modules directory exists');
  
  // Check for key dependencies
  const keyDeps = ['astro', 'react', 'typescript', 'tailwindcss'];
  keyDeps.forEach((dep) => {
    const depPath = path.join(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
      log.success(`${dep} is installed`);
    } else {
      log.error(`${dep} is not installed`);
      hasErrors = true;
    }
  });
}

// Check Git configuration
function checkGitConfig() {
  log.section('Checking Git Configuration');
  
  try {
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    log.success('Git repository initialized');
    
    if (gitStatus.trim()) {
      const changes = gitStatus.trim().split('\n').length;
      log.warn(`${changes} uncommitted changes found`);
      hasWarnings = true;
    } else {
      log.success('Working directory clean');
    }
  } catch (error) {
    log.error('Not a git repository or git not installed');
    hasErrors = true;
  }
}

// Check ports
function checkPorts() {
  log.section('Checking Port Availability');
  
  const net = require('net');
  const port = 4321;
  
  const server = net.createServer();
  
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log.warn(`Port ${port} is in use - dev server may fail to start`);
      hasWarnings = true;
    }
  });
  
  server.once('listening', () => {
    log.success(`Port ${port} is available`);
    server.close();
  });
  
  server.listen(port);
}

// Check VS Code settings
function checkVSCodeSettings() {
  log.section('Checking VS Code Configuration');
  
  const vscodePath = path.join(process.cwd(), '.vscode', 'settings.json');
  
  if (fs.existsSync(vscodePath)) {
    log.success('VS Code settings configured');
  } else {
    log.warn('VS Code settings not found - IDE features may be limited');
    hasWarnings = true;
  }
}

// Main validation function
async function validateSetup() {
  console.log(`
${colors.blue}╔═══════════════════════════════════════╗
║   SECiD Development Setup Validator   ║
╚═══════════════════════════════════════╝${colors.reset}
`);

  checkNodeVersion();
  checkNpmVersion();
  checkRequiredFiles();
  checkEnvironment();
  checkDependencies();
  checkGitConfig();
  checkVSCodeSettings();
  
  // Wait for async port check
  setTimeout(() => {
    checkPorts();
    
    // Final summary
    setTimeout(() => {
      console.log('\n' + '='.repeat(40));
      
      if (hasErrors) {
        console.log(`\n${colors.red}✗ Setup validation failed${colors.reset}`);
        console.log('Please fix the errors above before proceeding.\n');
        process.exit(1);
      } else if (hasWarnings) {
        console.log(`\n${colors.yellow}⚠ Setup validation passed with warnings${colors.reset}`);
        console.log('Your setup is functional but could be improved.\n');
        console.log(`Run ${colors.green}make setup${colors.reset} to fix most issues automatically.\n`);
      } else {
        console.log(`\n${colors.green}✓ Setup validation passed!${colors.reset}`);
        console.log('Your development environment is ready.\n');
        console.log(`Run ${colors.green}make dev${colors.reset} to start developing.\n`);
      }
    }, 100);
  }, 100);
}

// Run validation
if (require.main === module) {
  validateSetup();
}

module.exports = { validateSetup };
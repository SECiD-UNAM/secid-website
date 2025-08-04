#!/usr/bin/env node

/**
 * Development Environment Health Check
 * Quick script to check if everything is working properly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

// Status symbols
const symbols = {
  success: `${colors.green}✓${colors.reset}`,
  error: `${colors.red}✗${colors.reset}`,
  warning: `${colors.yellow}⚠${colors.reset}`,
  info: `${colors.blue}ℹ${colors.reset}`,
};

class HealthChecker {
  constructor() {
    this.checks = [];
    this.hasErrors = false;
    this.hasWarnings = false;
  }

  addCheck(name, status, message, details = null) {
    this.checks.push({ name, status, message, details });
    if (status === 'error') this.hasErrors = true;
    if (status === 'warning') this.hasWarnings = true;
  }

  async checkNodeModules() {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    const packageLockPath = path.join(process.cwd(), 'package-lock.json');
    
    if (!fs.existsSync(nodeModulesPath)) {
      this.addCheck('Dependencies', 'error', 'node_modules not found', 'Run: npm install');
      return;
    }

    // Check if package-lock.json is newer than node_modules
    const lockStats = fs.statSync(packageLockPath);
    const modulesStats = fs.statSync(nodeModulesPath);
    
    if (lockStats.mtime > modulesStats.mtime) {
      this.addCheck('Dependencies', 'warning', 'package-lock.json updated', 'Run: npm install');
    } else {
      this.addCheck('Dependencies', 'success', 'All dependencies installed');
    }
  }

  async checkEnvironment() {
    const envPath = path.join(process.cwd(), '.env');
    
    if (!fs.existsSync(envPath)) {
      this.addCheck('Environment', 'warning', '.env file missing', 'Copy .env.example to .env');
      return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasPlaceholders = envContent.includes('your-api-key') || envContent.includes('your-project-id');
    
    if (hasPlaceholders) {
      this.addCheck('Environment', 'warning', '.env has placeholder values', 'Update with real credentials');
    } else {
      this.addCheck('Environment', 'success', '.env configured');
    }
  }

  async checkGitStatus() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      const changes = status.trim().split('\n').filter(line => line.trim()).length;
      
      if (changes > 10) {
        this.addCheck('Git', 'warning', `${changes} uncommitted changes`, 'Consider committing your work');
      } else if (changes > 0) {
        this.addCheck('Git', 'success', `${changes} uncommitted changes`);
      } else {
        this.addCheck('Git', 'success', 'Working directory clean');
      }
    } catch (error) {
      this.addCheck('Git', 'error', 'Git not available');
    }
  }

  async checkTypeScript() {
    try {
      execSync('npm run typecheck', { encoding: 'utf8', stdio: 'pipe' });
      this.addCheck('TypeScript', 'success', 'No type errors');
    } catch (error) {
      const errorOutput = error.stdout || error.stderr || '';
      const errorCount = (errorOutput.match(/error TS/g) || []).length;
      
      if (errorCount > 0) {
        this.addCheck('TypeScript', 'error', `${errorCount} type errors`, 'Run: npm run typecheck');
      } else {
        this.addCheck('TypeScript', 'warning', 'TypeScript check failed');
      }
    }
  }

  async checkLinting() {
    try {
      execSync('npm run lint', { encoding: 'utf8', stdio: 'pipe' });
      this.addCheck('Linting', 'success', 'No linting errors');
    } catch (error) {
      const errorOutput = error.stdout || error.stderr || '';
      const errorMatch = errorOutput.match(/(\d+) error/);
      const warningMatch = errorOutput.match(/(\d+) warning/);
      
      const errors = errorMatch ? parseInt(errorMatch[1]) : 0;
      const warnings = warningMatch ? parseInt(warningMatch[1]) : 0;
      
      if (errors > 0) {
        this.addCheck('Linting', 'error', `${errors} errors, ${warnings} warnings`, 'Run: npm run lint:fix');
      } else if (warnings > 0) {
        this.addCheck('Linting', 'warning', `${warnings} warnings`);
      } else {
        this.addCheck('Linting', 'warning', 'Linting check failed');
      }
    }
  }

  async checkDevServer() {
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: 4321,
        path: '/',
        method: 'GET',
        timeout: 1000,
      };

      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          this.addCheck('Dev Server', 'success', 'Running on port 4321');
        } else {
          this.addCheck('Dev Server', 'warning', `Responding with status ${res.statusCode}`);
        }
        resolve();
      });

      req.on('error', () => {
        this.addCheck('Dev Server', 'info', 'Not running', 'Run: make dev');
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        this.addCheck('Dev Server', 'info', 'Not running', 'Run: make dev');
        resolve();
      });

      req.setTimeout(1000);
      req.end();
    });
  }

  async checkDiskSpace() {
    try {
      const output = execSync('df -h .', { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      const dataLine = lines[1];
      const usage = parseInt(dataLine.split(/\s+/)[4]);
      
      if (usage > 90) {
        this.addCheck('Disk Space', 'error', `${usage}% used`, 'Free up disk space');
      } else if (usage > 80) {
        this.addCheck('Disk Space', 'warning', `${usage}% used`);
      } else {
        this.addCheck('Disk Space', 'success', `${usage}% used`);
      }
    } catch (error) {
      // Skip on Windows or if df is not available
    }
  }

  async checkNodeVersion() {
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.split('.')[0].substring(1));
    
    if (major < 20) {
      this.addCheck('Node.js', 'error', `Version ${nodeVersion}`, 'Requires v20.17.0+');
    } else {
      this.addCheck('Node.js', 'success', `Version ${nodeVersion}`);
    }
  }

  printResults() {
    console.log(`\n${colors.blue}═══ Development Health Check ═══${colors.reset}\n`);

    const maxNameLength = Math.max(...this.checks.map(c => c.name.length));
    
    this.checks.forEach(({ name, status, message, details }) => {
      const symbol = symbols[status] || symbols.info;
      const padding = ' '.repeat(maxNameLength - name.length);
      
      console.log(`${symbol} ${name}${padding}  ${message}`);
      
      if (details) {
        console.log(`  ${colors.gray}→ ${details}${colors.reset}`);
      }
    });

    console.log(`\n${colors.blue}═══════════════════════════════${colors.reset}\n`);

    if (this.hasErrors) {
      console.log(`${symbols.error} ${colors.red}Health check failed${colors.reset}`);
      console.log(`   Fix the errors above to ensure smooth development\n`);
      process.exit(1);
    } else if (this.hasWarnings) {
      console.log(`${symbols.warning} ${colors.yellow}Health check passed with warnings${colors.reset}`);
      console.log(`   Your environment is functional but could be improved\n`);
    } else {
      console.log(`${symbols.success} ${colors.green}All systems operational!${colors.reset}`);
      console.log(`   Your development environment is healthy\n`);
    }
  }

  async runAllChecks() {
    // Quick checks first
    await this.checkNodeVersion();
    await this.checkNodeModules();
    await this.checkEnvironment();
    await this.checkGitStatus();
    await this.checkDiskSpace();
    
    // Slower checks
    await this.checkDevServer();
    await this.checkTypeScript();
    await this.checkLinting();
  }
}

// Run health check
async function main() {
  const checker = new HealthChecker();
  
  console.log(`${colors.gray}Running health checks...${colors.reset}`);
  
  await checker.runAllChecks();
  checker.printResults();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { HealthChecker };
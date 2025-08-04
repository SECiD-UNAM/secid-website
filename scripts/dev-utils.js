#!/usr/bin/env node

/**
 * Development Utility Scripts
 * Helpful commands for common development tasks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Utility functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
};

// Command implementations
const commands = {
  // Clean all generated files and caches
  'clean-all': {
    description: 'Remove all generated files and caches',
    run: () => {
      log.info('Cleaning all generated files...');
      
      const dirsToRemove = [
        'node_modules',
        'dist',
        '.astro',
        'coverage',
        '.turbo',
        '.parcel-cache',
        '.next',
        '.nuxt',
        '.cache',
      ];
      
      dirsToRemove.forEach(dir => {
        const fullPath = path.join(process.cwd(), dir);
        if (fs.existsSync(fullPath)) {
          log.info(`Removing ${dir}...`);
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      });
      
      // Clean package-lock if requested
      if (process.argv.includes('--lock')) {
        log.info('Removing package-lock.json...');
        fs.rmSync('package-lock.json', { force: true });
      }
      
      log.success('Clean complete!');
    }
  },

  // Find and list TODO comments
  'find-todos': {
    description: 'Find all TODO comments in the codebase',
    run: () => {
      log.info('Searching for TODO comments...\n');
      
      try {
        const output = execSync(
          'grep -r "TODO\\|FIXME\\|HACK\\|XXX" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.astro" src/ || true',
          { encoding: 'utf8' }
        );
        
        if (output.trim()) {
          const lines = output.trim().split('\n');
          const todos = {};
          
          lines.forEach(line => {
            const match = line.match(/^([^:]+):(\d+):\s*\/\/\s*(TODO|FIXME|HACK|XXX):?\s*(.*)$/);
            if (match) {
              const [, file, lineNum, type, comment] = match;
              if (!todos[type]) todos[type] = [];
              todos[type].push({ file, lineNum, comment: comment.trim() });
            }
          });
          
          // Display organized by type
          Object.entries(todos).forEach(([type, items]) => {
            console.log(`\n${colors.yellow}${type}s (${items.length})${colors.reset}`);
            console.log('─'.repeat(40));
            
            items.forEach(({ file, lineNum, comment }) => {
              console.log(`${colors.cyan}${file}:${lineNum}${colors.reset}`);
              console.log(`  ${comment}\n`);
            });
          });
        } else {
          log.success('No TODOs found!');
        }
      } catch (error) {
        log.error('Error searching for TODOs');
      }
    }
  },

  // Check for unused dependencies
  'check-deps': {
    description: 'Check for unused dependencies',
    run: () => {
      log.info('Checking for unused dependencies...\n');
      
      try {
        execSync('npx depcheck', { stdio: 'inherit' });
      } catch (error) {
        log.error('Error checking dependencies');
      }
    }
  },

  // Generate TypeScript coverage report
  'ts-coverage': {
    description: 'Generate TypeScript coverage report',
    run: () => {
      log.info('Generating TypeScript coverage report...\n');
      
      try {
        execSync('npx type-coverage --detail', { stdio: 'inherit' });
      } catch (error) {
        log.error('Error generating coverage report');
      }
    }
  },

  // List large files
  'find-large': {
    description: 'Find large files in the project',
    run: () => {
      log.info('Finding large files...\n');
      
      const maxSize = parseInt(process.argv[3] || '1000000'); // 1MB default
      const largeFiles = [];
      
      function walkDir(dir) {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules') {
              walkDir(filePath);
            }
          } else if (stat.size > maxSize) {
            largeFiles.push({ path: filePath, size: stat.size });
          }
        });
      }
      
      walkDir(process.cwd());
      
      if (largeFiles.length > 0) {
        console.log(`Files larger than ${(maxSize / 1024 / 1024).toFixed(2)}MB:\n`);
        largeFiles
          .sort((a, b) => b.size - a.size)
          .forEach(({ path: filePath, size }) => {
            const relPath = path.relative(process.cwd(), filePath);
            console.log(`${colors.yellow}${(size / 1024 / 1024).toFixed(2)}MB${colors.reset}  ${relPath}`);
          });
      } else {
        log.success('No large files found!');
      }
    }
  },

  // Check for security issues
  'security-check': {
    description: 'Run security checks on dependencies',
    run: () => {
      log.info('Running security audit...\n');
      
      try {
        execSync('npm audit', { stdio: 'inherit' });
      } catch (error) {
        log.warn('Security vulnerabilities found. Run "npm audit fix" to resolve.');
      }
    }
  },

  // Generate project stats
  'project-stats': {
    description: 'Show project statistics',
    run: () => {
      log.info('Calculating project statistics...\n');
      
      const stats = {
        files: { total: 0, byType: {} },
        lines: { total: 0, code: 0, comments: 0, blank: 0 },
      };
      
      function countLines(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        let codeLines = 0;
        let commentLines = 0;
        let blankLines = 0;
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) {
            blankLines++;
          } else if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            commentLines++;
          } else {
            codeLines++;
          }
        });
        
        return { total: lines.length, code: codeLines, comments: commentLines, blank: blankLines };
      }
      
      function walkDir(dir) {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            if (!file.startsWith('.') && !['node_modules', 'dist', 'coverage'].includes(file)) {
              walkDir(filePath);
            }
          } else {
            const ext = path.extname(file);
            if (['.ts', '.tsx', '.js', '.jsx', '.astro', '.css', '.scss'].includes(ext)) {
              stats.files.total++;
              stats.files.byType[ext] = (stats.files.byType[ext] || 0) + 1;
              
              const lineCount = countLines(filePath);
              stats.lines.total += lineCount.total;
              stats.lines.code += lineCount.code;
              stats.lines.comments += lineCount.comments;
              stats.lines.blank += lineCount.blank;
            }
          }
        });
      }
      
      walkDir(path.join(process.cwd(), 'src'));
      
      console.log(`${colors.blue}Project Statistics${colors.reset}`);
      console.log('═'.repeat(40));
      
      console.log(`\n${colors.cyan}Files:${colors.reset}`);
      console.log(`  Total: ${stats.files.total}`);
      Object.entries(stats.files.byType).forEach(([ext, count]) => {
        console.log(`  ${ext}: ${count}`);
      });
      
      console.log(`\n${colors.cyan}Lines of Code:${colors.reset}`);
      console.log(`  Total: ${stats.lines.total.toLocaleString()}`);
      console.log(`  Code: ${stats.lines.code.toLocaleString()} (${((stats.lines.code / stats.lines.total) * 100).toFixed(1)}%)`);
      console.log(`  Comments: ${stats.lines.comments.toLocaleString()} (${((stats.lines.comments / stats.lines.total) * 100).toFixed(1)}%)`);
      console.log(`  Blank: ${stats.lines.blank.toLocaleString()} (${((stats.lines.blank / stats.lines.total) * 100).toFixed(1)}%)`);
    }
  },

  // Port killer
  'kill-port': {
    description: 'Kill process using a specific port',
    run: () => {
      const port = process.argv[3] || '4321';
      log.info(`Killing process on port ${port}...`);
      
      try {
        if (process.platform === 'win32') {
          execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { stdio: 'inherit' });
        } else {
          execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'inherit' });
        }
        log.success(`Port ${port} is now free!`);
      } catch (error) {
        log.warn(`No process found on port ${port}`);
      }
    }
  },
};

// Main execution
function main() {
  const command = process.argv[2];
  
  if (!command || command === 'help') {
    console.log(`\n${colors.blue}Development Utilities${colors.reset}`);
    console.log('═'.repeat(40));
    console.log('\nUsage: node scripts/dev-utils.js <command>\n');
    console.log('Commands:');
    
    Object.entries(commands).forEach(([cmd, { description }]) => {
      console.log(`  ${colors.yellow}${cmd.padEnd(15)}${colors.reset} ${description}`);
    });
    
    console.log('\nExamples:');
    console.log('  node scripts/dev-utils.js clean-all');
    console.log('  node scripts/dev-utils.js find-todos');
    console.log('  node scripts/dev-utils.js kill-port 3000');
    console.log();
    return;
  }
  
  if (commands[command]) {
    commands[command].run();
  } else {
    log.error(`Unknown command: ${command}`);
    console.log('Run "node scripts/dev-utils.js help" for available commands');
  }
}

if (require.main === module) {
  main();
}

module.exports = { commands };
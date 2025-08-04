#!/usr/bin/env node

/**
 * Component Generator Script
 * Quickly scaffold new React components with TypeScript
 */

const fs = require('fs');
const path = require('path');

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Utility functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
};

// Template functions
const templates = {
  component: (name, props = false) => `import React from 'react';
import clsx from 'clsx';

${props ? `export interface ${name}Props {
  className?: string;
  children?: React.ReactNode;
  // TODO: Add your props here
}` : ''}

/**
 * ${name} Component
 * 
 * TODO: Add component description
 */
export const ${name}: React.FC${props ? `<${name}Props>` : ''} = (${props ? '{ className, children, ...props }' : ''}) => {
  return (
    <div className={${props ? 'clsx("", className)' : '""'}}>
      <h2>${name} Component</h2>
      ${props ? '{children}' : ''}
    </div>
  );
};

export default ${name};`,

  story: (name, category) => `import type { Meta, StoryObj } from '@storybook/react';
import { ${name} } from './${name}';

const meta = {
  title: '${category}/${name}',
  component: ${name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    // Define controls here
  },
} satisfies Meta<typeof ${name}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Default props
  },
};

export const Example: Story = {
  args: {
    // Example props
  },
};`,

  test: (name) => `import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('renders without crashing', () => {
    render(<${name} />);
    expect(screen.getByText('${name} Component')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<${name} className="custom-class" />);
    const element = screen.getByText('${name} Component').parentElement;
    expect(element).toHaveClass('custom-class');
  });

  // TODO: Add more tests
});`,

  index: (name) => `export { ${name} } from './${name}';
export type { ${name}Props } from './${name}';`,

  hook: (name) => `import { useState, useEffect } from 'react';

/**
 * ${name} Hook
 * 
 * TODO: Add hook description
 */
export function ${name}() {
  const [state, setState] = useState(null);

  useEffect(() => {
    // TODO: Add effect logic
  }, []);

  return {
    state,
    // TODO: Return hook values
  };
}

export default ${name};`,

  hookTest: (name) => `import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => ${name}());
    expect(result.current.state).toBe(null);
  });

  // TODO: Add more tests
});`,

  util: (name) => `/**
 * ${name} Utility
 * 
 * TODO: Add utility description
 */

export function ${name}(input: any): any {
  // TODO: Implement utility function
  return input;
}

// TODO: Add more utility functions as needed

export default ${name};`,

  utilTest: (name) => `import { describe, it, expect } from 'vitest';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('should work correctly', () => {
    const result = ${name}('test');
    expect(result).toBe('test');
  });

  // TODO: Add more tests
});`,
};

// Component categories
const categories = {
  ui: 'src/components/ui',
  layout: 'src/components/layout',
  features: 'src/components/features',
  auth: 'src/components/auth',
  common: 'src/components/common',
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    name: null,
    type: 'component',
    category: 'ui',
    props: true,
    test: true,
    story: false,
    force: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '--type' || arg === '-t') {
      options.type = args[++i];
    } else if (arg === '--category' || arg === '-c') {
      options.category = args[++i];
    } else if (arg === '--no-props') {
      options.props = false;
    } else if (arg === '--no-test') {
      options.test = false;
    } else if (arg === '--story' || arg === '-s') {
      options.story = true;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (!arg.startsWith('-')) {
      options.name = arg;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
${colors.blue}Component Generator${colors.reset}
===================

Usage: node scripts/generate-component.js [name] [options]

Options:
  -t, --type <type>      Component type (component, hook, util) [default: component]
  -c, --category <cat>   Component category (ui, layout, features, auth, common) [default: ui]
  --no-props            Don't include props interface
  --no-test             Don't create test file
  -s, --story           Include Storybook story
  -f, --force           Overwrite existing files
  -h, --help            Show this help

Examples:
  node scripts/generate-component.js Button
  node scripts/generate-component.js Card --category ui --story
  node scripts/generate-component.js useAuth --type hook
  node scripts/generate-component.js formatDate --type util

Categories:
  ui        - Reusable UI components
  layout    - Layout components
  features  - Feature-specific components
  auth      - Authentication components
  common    - Common/shared components
`);
}

// Create component files
function createComponent(options) {
  const { name, type, category, props, test, story, force } = options;
  
  if (!name) {
    log.error('Component name is required');
    showHelp();
    process.exit(1);
  }

  // Ensure PascalCase for components and camelCase for hooks/utils
  const componentName = type === 'component' 
    ? name.charAt(0).toUpperCase() + name.slice(1)
    : name.charAt(0).toLowerCase() + name.slice(1);

  // Determine base path
  let basePath;
  if (type === 'component') {
    basePath = path.join(process.cwd(), categories[category] || category, componentName);
  } else if (type === 'hook') {
    basePath = path.join(process.cwd(), 'src/hooks');
  } else if (type === 'util') {
    basePath = path.join(process.cwd(), 'src/lib/utils');
  }

  // Check if already exists
  if (type === 'component' && fs.existsSync(basePath) && !force) {
    log.error(`Component ${componentName} already exists at ${basePath}`);
    log.warn('Use --force to overwrite');
    process.exit(1);
  }

  // Create directory for components
  if (type === 'component') {
    fs.mkdirSync(basePath, { recursive: true });
  } else {
    fs.mkdirSync(basePath, { recursive: true });
  }

  // Generate files
  const files = [];

  if (type === 'component') {
    // Component file
    files.push({
      path: path.join(basePath, `${componentName}.tsx`),
      content: templates.component(componentName, props),
    });

    // Index file
    files.push({
      path: path.join(basePath, 'index.ts'),
      content: templates.index(componentName),
    });

    // Test file
    if (test) {
      files.push({
        path: path.join(basePath, `${componentName}.test.tsx`),
        content: templates.test(componentName),
      });
    }

    // Story file
    if (story) {
      files.push({
        path: path.join(basePath, `${componentName}.stories.tsx`),
        content: templates.story(componentName, category),
      });
    }
  } else if (type === 'hook') {
    // Hook file
    files.push({
      path: path.join(basePath, `${componentName}.ts`),
      content: templates.hook(componentName),
    });

    // Hook test
    if (test) {
      files.push({
        path: path.join(basePath, `${componentName}.test.ts`),
        content: templates.hookTest(componentName),
      });
    }
  } else if (type === 'util') {
    // Utility file
    files.push({
      path: path.join(basePath, `${componentName}.ts`),
      content: templates.util(componentName),
    });

    // Utility test
    if (test) {
      files.push({
        path: path.join(basePath, `${componentName}.test.ts`),
        content: templates.utilTest(componentName),
      });
    }
  }

  // Write files
  files.forEach(({ path: filePath, content }) => {
    fs.writeFileSync(filePath, content);
    log.success(`Created ${path.relative(process.cwd(), filePath)}`);
  });

  // Success message
  console.log(`\n${colors.green}✨ ${componentName} ${type} created successfully!${colors.reset}`);
  
  if (type === 'component') {
    console.log(`\nImport it with:`);
    console.log(`  ${colors.cyan}import { ${componentName} } from '@/components/${category}/${componentName}';${colors.reset}`);
  } else if (type === 'hook') {
    console.log(`\nImport it with:`);
    console.log(`  ${colors.cyan}import { ${componentName} } from '@/hooks/${componentName}';${colors.reset}`);
  } else if (type === 'util') {
    console.log(`\nImport it with:`);
    console.log(`  ${colors.cyan}import { ${componentName} } from '@/lib/utils/${componentName}';${colors.reset}`);
  }

  if (test) {
    console.log(`\nRun tests with:`);
    console.log(`  ${colors.cyan}npm run test ${componentName}${colors.reset}`);
  }
}

// Main execution
function main() {
  const options = parseArgs();
  createComponent(options);
}

if (require.main === module) {
  main();
}

module.exports = { createComponent };
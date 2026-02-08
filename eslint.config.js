import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * OCT Architectural Boundary Enforcement
 *
 * Rules:
 * - Core: NO imports from CLI, Server, or Infra (only neverthrow, zod allowed)
 * - CLI: Can import from Core, Infra
 * - Server: Can import from Core, Infra
 * - Infra: Can import from Core only
 */

// Core package - most restrictive
const coreConfig = {
  files: ['packages/core/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        { name: '@oct/cli', message: 'Core MUST NOT import from CLI' },
        { name: '@oct/server', message: 'Core MUST NOT import from Server' },
        { name: '@oct/infra', message: 'Core MUST NOT import from Infra' },
      ],
      patterns: [
        {
          group: ['@oct/cli', '@oct/cli/**'],
          message: 'Core MUST NOT import from CLI'
        },
        {
          group: ['@oct/server', '@oct/server/**'],
          message: 'Core MUST NOT import from Server'
        },
        {
          group: ['@oct/infra', '@oct/infra/**'],
          message: 'Core MUST NOT import from Infra'
        },
        {
          group: ['fastify', 'fastify/*'],
          message: 'Core MUST NOT import HTTP libraries'
        },
        {
          group: ['commander', 'commander/*'],
          message: 'Core MUST NOT import CLI libraries'
        },
      ],
    }],
  },
};

// CLI package - can import Core and Infra
const cliConfig = {
  files: ['packages/cli/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        { name: '@oct/server', message: 'CLI MUST NOT import from Server' },
      ],
      patterns: [
        {
          group: ['@oct/server', '@oct/server/**'],
          message: 'CLI MUST NOT import from Server'
        },
      ],
    }],
  },
};

// Server package - can import Core and Infra
const serverConfig = {
  files: ['packages/server/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        { name: '@oct/cli', message: 'Server MUST NOT import from CLI' },
      ],
      patterns: [
        {
          group: ['@oct/cli', '@oct/cli/**'],
          message: 'Server MUST NOT import from CLI'
        },
      ],
    }],
  },
};

// Infra package - can only import Core
const infraConfig = {
  files: ['packages/infra/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        { name: '@oct/cli', message: 'Infra MUST NOT import from CLI' },
        { name: '@oct/server', message: 'Infra MUST NOT import from Server' },
      ],
      patterns: [
        {
          group: ['@oct/cli', '@oct/cli/**'],
          message: 'Infra MUST ONLY import from Core'
        },
        {
          group: ['@oct/server', '@oct/server/**'],
          message: 'Infra MUST ONLY import from Core'
        },
      ],
    }],
  },
};

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  coreConfig,
  cliConfig,
  serverConfig,
  infraConfig,
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.d.ts',
    ],
  }
);

# Architecture Compliance Tests

## Overview
Tests to verify architectural boundaries and ensure Core-first architecture compliance. These tests prevent architectural drift and enforce dependency rules.

---

## 1. Dependency Graph Validation

### 1.1 Core Import Rules
```typescript
// Test: Core has zero imports from outside
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { glob } from 'glob'

describe('Core Import Rules', () => {
  const coreFiles = glob.sync('packages/core/src/**/*.ts')

  it('Core should not import from CLI', () => {
    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')
      const imports = extractImports(content)

      for (const imp of imports) {
        expect(imp).not.toMatch(/@oct\/cli/)
        expect(imp).not.toMatch(/\/cli\//)
      }
    }
  })

  it('Core should not import from Server', () => {
    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')
      const imports = extractImports(content)

      for (const imp of imports) {
        expect(imp).not.toMatch(/@oct\/server/)
        expect(imp).not.toMatch(/\/server\//)
      }
    }
  })

  it('Core should not import from Infra', () => {
    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')
      const imports = extractImports(content)

      for (const imp of imports) {
        expect(imp).not.toMatch(/@oct\/infra/)
        expect(imp).not.toMatch(/\/infra\//)
      }
    }
  })

  it('Core should not import HTTP-related libraries', () => {
    const forbiddenLibs = [
      'fastify',
      'express',
      'koa',
      'hapi',
      'http',
      'https',
      'node:http'
    ]

    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')
      const imports = extractImports(content)

      for (const imp of imports) {
        for (const lib of forbiddenLibs) {
          expect(imp).not.toBe(lib)
        }
      }
    }
  })

  it('Core should not import CLI-related libraries', () => {
    const forbiddenLibs = [
      'commander',
      'yargs',
      'minimist',
      'inquirer',
      'chalk',
      'ora',
      'progress'
    ]

    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')
      const imports = extractImports(content)

      for (const imp of imports) {
        for (const lib of forbiddenLibs) {
          expect(imp).not.toBe(lib)
        }
      }
    }
  })
})
```

### 1.2 Allowed Dependencies
```typescript
// Test: Allowed import directions
describe('Allowed Dependencies', () => {
  it('CLI should import from Core', () => {
    const cliFiles = glob.sync('packages/cli/src/**/*.ts')
    let hasCoreImport = false

    for (const file of cliFiles) {
      const content = readFileSync(file, 'utf-8')
      if (content.includes('@oct/core')) {
        hasCoreImport = true
        break
      }
    }

    expect(hasCoreImport).toBe(true)
  })

  it('Server should import from Core', () => {
    const serverFiles = glob.sync('packages/server/src/**/*.ts')
    let hasCoreImport = false

    for (const file of serverFiles) {
      const content = readFileSync(file, 'utf-8')
      if (content.includes('@oct/core')) {
        hasCoreImport = true
        break
      }
    }

    expect(hasCoreImport).toBe(true)
  })

  it('Infra should import from Core', () => {
    const infraFiles = glob.sync('packages/infra/src/**/*.ts')
    let hasCoreImport = false

    for (const file of infraFiles) {
      const content = readFileSync(file, 'utf-8')
      if (content.includes('@oct/core')) {
        hasCoreImport = true
        break
      }
    }

    expect(hasCoreImport).toBe(true)
  })
})
```

### 1.3 Circular Dependency Detection
```typescript
// Test: No circular dependencies
describe('Circular Dependencies', () => {
  it('should have no circular dependencies', () => {
    // Use madge or similar tool
    const result = checkCircularDependencies()
    expect(result.circular).toHaveLength(0)
  })

  it('Core should not depend on any other package', () => {
    const deps = getPackageDependencies('packages/core')
    expect(deps).not.toContain('@oct/cli')
    expect(deps).not.toContain('@oct/server')
    expect(deps).not.toContain('@oct/infra')
  })
})
```

---

## 2. Business Logic Location Tests

### 2.1 No Business Logic Outside Core
```typescript
// Test: Business logic only in Core
describe('Business Logic Location', () => {
  it('CLI should not contain business logic', () => {
    const cliFiles = glob.sync('packages/cli/src/**/*.ts')

    for (const file of cliFiles) {
      const content = readFileSync(file, 'utf-8')

      // CLI should only: parse args, build context, call Core, format output
      // Should not contain: validation logic, state transitions, calculations
      expect(content).not.toContain('validateTask') // Should be in Core
      expect(content).not.toContain('calculateNextStatus') // Should be in Core
      expect(content).not.toContain('checkPermission') // Should be in Core
    }
  })

  it('Server should not contain business logic', () => {
    const serverFiles = glob.sync('packages/server/src/**/*.ts')

    for (const file of serverFiles) {
      const content = readFileSync(file, 'utf-8')

      // Server should only: route, auth, context, delegate, serialize
      expect(content).not.toContain('validateTask')
      expect(content).not.toContain('calculateNextStatus')
      expect(content).not.toContain('checkPermission')
    }
  })
})
```

### 2.2 Validation Location
```typescript
// Test: All validation in Core
describe('Validation Location', () => {
  it('CLI should not define validation schemas', () => {
    const cliFiles = glob.sync('packages/cli/src/**/*.ts')

    for (const file of cliFiles) {
      const content = readFileSync(file, 'utf-8')

      // CLI should import schemas from Core, not define them
      expect(content).not.toContain('z.object({') // Schema definition
      expect(content).not.toContain('z.string()') // Schema definition
    }
  })

  it('Server should not define validation schemas', () => {
    const serverFiles = glob.sync('packages/server/src/**/*.ts')

    for (const file of serverFiles) {
      const content = readFileSync(file, 'utf-8')

      // Server should import schemas from Core
      expect(content).not.toContain('z.object({')
      expect(content).not.toContain('z.string()')
    }
  })

  it('Core should define all schemas', () => {
    const coreFiles = glob.sync('packages/core/src/schemas/**/*.ts')
    expect(coreFiles.length).toBeGreaterThan(0)
  })
})
```

---

## 3. ExecutionContext Compliance Tests

### 3.1 Context Parameter Tests
```typescript
// Test: All Core functions take ExecutionContext
describe('ExecutionContext Compliance', () => {
  it('all public Core functions take context as first parameter', () => {
    const corePublicFiles = glob.sync('packages/core/src/use-cases/**/*.ts')

    for (const file of corePublicFiles) {
      const content = readFileSync(file, 'utf-8')

      // Check function signatures
      const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)/g) || []
      for (const fn of functionMatches) {
        // First param should be context or _
        expect(fn).toMatch(/\(\s*(context|_|:)\s*:/)
      }
    }
  })

  it('Core functions should not access process.env', () => {
    const coreFiles = glob.sync('packages/core/src/**/*.ts')

    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')
      expect(content).not.toContain('process.env')
    }
  })

  it('Core functions should not access global state', () => {
    const coreFiles = glob.sync('packages/core/src/**/*.ts')

    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')
      expect(content).not.toContain('global.')
    }
  })
})
```

---

## 4. Forbidden Pattern Tests

### 4.1 No Console in Core
```typescript
// Test: No console usage in Core
describe('No Console in Core', () => {
  it('Core should not use console.log', () => {
    const coreFiles = glob.sync('packages/core/src/**/*.ts')

    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')
      expect(content).not.toContain('console.log')
      expect(content).not.toContain('console.error')
      expect(content).not.toContain('console.warn')
      expect(content).not.toContain('console.info')
    }
  })
})
```

### 4.2 No HTTP in Core
```typescript
// Test: No HTTP concepts in Core
describe('No HTTP in Core', () => {
  it('Core should not reference HTTP status codes', () => {
    const coreFiles = glob.sync('packages/core/src/**/*.ts')
    const httpCodes = ['200', '201', '400', '401', '403', '404', '409', '500']

    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')

      for (const code of httpCodes) {
        // Allow numbers in general, but not in HTTP context
        // This is a heuristic check
        expect(content).not.toContain(`status ${code}`)
        expect(content).not.toContain(`statusCode: ${code}`)
      }
    }
  })

  it('Core should not reference HTTP methods', () => {
    const coreFiles = glob.sync('packages/core/src/**/*.ts')
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')

      for (const method of methods) {
        expect(content).not.toContain(`'${method}'`)
        expect(content).not.toContain(`"${method}"`)
      }
    }
  })
})
```

### 4.3 No Process Access in Core
```typescript
// Test: No process access in Core
describe('No Process Access in Core', () => {
  it('Core should not access process object', () => {
    const coreFiles = glob.sync('packages/core/src/**/*.ts')

    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')
      expect(content).not.toContain('process.')
    }
  })

  it('Core should not access __dirname', () => {
    const coreFiles = glob.sync('packages/core/src/**/*.ts')

    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')
      expect(content).not.toContain('__dirname')
    }
  })

  it('Core should not access __filename', () => {
    const coreFiles = glob.sync('packages/core/src/**/*.ts')

    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')
      expect(content).not.toContain('__filename')
    }
  })
})
```

---

## 5. Schema Ownership Tests

### 5.1 Schema Definition Location
```typescript
// Test: Schemas defined in Core only
describe('Schema Ownership', () => {
  it('Core should define all domain schemas', () => {
    const schemaFiles = glob.sync('packages/core/src/schemas/**/*.ts')
    expect(schemaFiles).toContain('packages/core/src/schemas/task.ts')
    expect(schemaFiles).toContain('packages/core/src/schemas/context.ts')
    expect(schemaFiles).toContain('packages/core/src/schemas/error.ts')
  })

  it('CLI should import schemas from Core', () => {
    const cliFiles = glob.sync('packages/cli/src/**/*.ts')
    let importsCoreSchemas = false

    for (const file of cliFiles) {
      const content = readFileSync(file, 'utf-8')
      if (content.includes('@oct/core/schemas')) {
        importsCoreSchemas = true
        break
      }
    }

    expect(importsCoreSchemas).toBe(true)
  })

  it('Server should import schemas from Core', () => {
    const serverFiles = glob.sync('packages/server/src/**/*.ts')
    let importsCoreSchemas = false

    for (const file of serverFiles) {
      const content = readFileSync(file, 'utf-8')
      if (content.includes('@oct/core/schemas')) {
        importsCoreSchemas = true
        break
      }
    }

    expect(importsCoreSchemas).toBe(true)
  })
})
```

---

## 6. Use Case Mapping Tests

### 6.1 CLI to Use Case Mapping
```typescript
// Test: CLI commands map 1:1 to use cases
describe('CLI to Use Case Mapping', () => {
  it('each CLI command maps to a Core use case', () => {
    const cliCommands = glob.sync('packages/cli/src/commands/**/*.ts')
    const useCases = glob.sync('packages/core/src/use-cases/**/*.ts')

    for (const cmd of cliCommands) {
      const cmdName = extractCommandName(cmd)
      const matchingUseCase = useCases.find(uc =>
        uc.toLowerCase().includes(cmdName.toLowerCase())
      )

      expect(matchingUseCase).toBeDefined()
    }
  })
})
```

### 6.2 REST to Use Case Mapping
```typescript
// Test: REST endpoints map 1:1 to use cases
describe('REST to Use Case Mapping', () => {
  it('each REST endpoint maps to a Core use case', () => {
    const routes = glob.sync('packages/server/src/routes/**/*.ts')
    const useCases = glob.sync('packages/core/src/use-cases/**/*.ts')

    for (const route of routes) {
      const routeName = extractRouteName(route)
      const matchingUseCase = useCases.find(uc =>
        uc.toLowerCase().includes(routeName.toLowerCase())
      )

      expect(matchingUseCase).toBeDefined()
    }
  })
})
```

---

## 7. ESLint Architectural Rules

### 7.1 ESLint Configuration
```json
// .eslintrc.json - Architectural rules
{
  "rules": {
    "import/no-restricted-paths": ["error", {
      "zones": [
        {
          "target": "packages/core",
          "from": "packages/cli",
          "message": "Core cannot import from CLI"
        },
        {
          "target": "packages/core",
          "from": "packages/server",
          "message": "Core cannot import from Server"
        },
        {
          "target": "packages/core",
          "from": "packages/infra",
          "message": "Core cannot import from Infra"
        },
        {
          "target": "packages/core",
          "from": "node_modules/fastify",
          "message": "Core cannot import HTTP libraries"
        },
        {
          "target": "packages/core",
          "from": "node_modules/commander",
          "message": "Core cannot import CLI libraries"
        }
      ]
    }],
    "no-restricted-globals": ["error", {
      "name": "process",
      "message": "Core cannot access process global"
    }]
  }
}
```

### 7.2 ESLint Tests
```typescript
// Test: ESLint rules pass
describe('ESLint Architectural Rules', () => {
  it('should have no ESLint violations in Core', () => {
    const result = runESLint('packages/core/src')
    expect(result.errorCount).toBe(0)
  })

  it('should have no import violations', () => {
    const result = runESLint('packages/core/src', ['import/no-restricted-paths'])
    expect(result.errorCount).toBe(0)
  })
})
```

---

## 8. Package.json Dependency Tests

### 8.1 Dependency Declaration
```typescript
// Test: Package.json dependencies
describe('Package Dependencies', () => {
  it('Core should not list CLI as dependency', () => {
    const corePkg = JSON.parse(readFileSync('packages/core/package.json', 'utf-8'))
    const deps = Object.keys(corePkg.dependencies || {})
    expect(deps).not.toContain('@oct/cli')
    expect(deps).not.toContain('@oct/server')
    expect(deps).not.toContain('@oct/infra')
  })

  it('Core should not list HTTP libraries as dependency', () => {
    const corePkg = JSON.parse(readFileSync('packages/core/package.json', 'utf-8'))
    const deps = Object.keys(corePkg.dependencies || {})
    expect(deps).not.toContain('fastify')
    expect(deps).not.toContain('express')
  })

  it('Core should not list CLI libraries as dependency', () => {
    const corePkg = JSON.parse(readFileSync('packages/core/package.json', 'utf-8'))
    const deps = Object.keys(corePkg.dependencies || {})
    expect(deps).not.toContain('commander')
    expect(deps).not.toContain('chalk')
  })

  it('CLI should list Core as dependency', () => {
    const cliPkg = JSON.parse(readFileSync('packages/cli/package.json', 'utf-8'))
    const deps = Object.keys(cliPkg.dependencies || {})
    expect(deps).toContain('@oct/core')
  })

  it('Server should list Core as dependency', () => {
    const serverPkg = JSON.parse(readFileSync('packages/server/package.json', 'utf-8'))
    const deps = Object.keys(serverPkg.dependencies || {})
    expect(deps).toContain('@oct/core')
  })
})
```

---

## 9. Sign-off Criteria Tests

### 9.1 Final Verification
```typescript
// Test: Sign-off criteria
describe('Sign-off Criteria', () => {
  it('CLI works without server', async () => {
    // Ensure server is not running
    // Run CLI commands
    // Verify they succeed
  })

  it('Server can be removed and CLI still works', () => {
    // Simulate server package removal
    // Verify CLI still functions
  })

  it('AI agent can execute full workflows via CLI', async () => {
    // Script complete workflow using --json
    // Verify no prompts, clean JSON output
  })

  it('Core has zero imports from outside itself', () => {
    const coreFiles = glob.sync('packages/core/src/**/*.ts')

    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8')
      const imports = extractImports(content)

      for (const imp of imports) {
        expect(imp).not.toMatch(/^@oct\/(cli|server|infra)/)
      }
    }
  })

  it('All validation lives in Core', () => {
    // Verify all zod schemas are in Core
    // Verify no validation in CLI or Server
  })

  it('All permissions live in Core', () => {
    // Verify permission checks are in Core
    // Verify no permission logic in CLI or Server
  })
})
```

---

## 10. CI Enforcement

### 10.1 CI Pipeline Checks
```yaml
# .github/workflows/architecture.yml
name: Architecture Compliance

on: [push, pull_request]

jobs:
  architecture-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check Core has no external imports
        run: pnpm test:architecture:imports

      - name: Check no business logic outside Core
        run: pnpm test:architecture:logic

      - name: Check ESLint architectural rules
        run: pnpm lint:architecture

      - name: Check Core coverage >= 90%
        run: |
          COVERAGE=$(pnpm test:core --coverage --reporter=json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 90" | bc -l) )); then
            echo "Core coverage $COVERAGE% is below 90%"
            exit 1
          fi

      - name: Check no new logic outside Core
        run: pnpm test:architecture:new-logic
```

---

## 11. Test Execution

### 11.1 Run Commands
```bash
# Run all architecture tests
pnpm test:architecture

# Run specific architecture checks
pnpm test:architecture:imports
pnpm test:architecture:logic
pnpm test:architecture:schemas

# Run ESLint architectural rules
pnpm lint:architecture

# Check dependencies
pnpm test:architecture:deps
```

### 11.2 Coverage Requirements
- All architectural rules must pass
- 100% of Core import rules must be verified
- 100% of business logic location rules must pass

---

**Document Version:** 1.0
**Last Updated:** 2026-02-08
**Owner:** QA Engineer

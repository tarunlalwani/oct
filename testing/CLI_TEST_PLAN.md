# CLI Package Test Plan

## Overview
Comprehensive test plan for the CLI package. Tests cover cold start performance, JSON output mode, exit codes, and server independence.

---

## 1. Cold Start Performance Tests

### 1.1 Timing Requirements
```typescript
// Test: CLI cold start < 200ms
describe('CLI Cold Start Performance', () => {
  it('should start in less than 200ms for --version', async () => {
    const start = performance.now()
    await execa('oct', ['--version'])
    const duration = performance.now() - start
    expect(duration).toBeLessThan(200)
  })

  it('should start in less than 200ms for --help', async () => {
    const start = performance.now()
    await execa('oct', ['--help'])
    const duration = performance.now() - start
    expect(duration).toBeLessThan(200)
  })

  it('should start in less than 200ms for task list', async () => {
    const start = performance.now()
    await execa('oct', ['task', 'list', '--json'])
    const duration = performance.now() - start
    expect(duration).toBeLessThan(200)
  })

  it('should measure from process spawn to first output')
  it('should test on clean environment (no cached deps)')
  it('should average over 10 runs')
})
```

### 1.2 Measurement Method
```bash
# Manual verification command
time oct --version
time oct --help
time oct task list --json

# Automated measurement
node -e "
const { execSync } = require('child_process');
const start = performance.now();
execSync('oct --version', { stdio: 'ignore' });
console.log(performance.now() - start);
"
```

---

## 2. Server Independence Tests

### 2.1 No Server Required
```typescript
// Test: CLI works without server
describe('CLI Server Independence', () => {
  beforeEach(() => {
    // Ensure server is not running
    // No server process on expected ports
  })

  it('should complete task:create without server', async () => {
    const result = await execa('oct', [
      'task', 'create',
      '--title', 'Test Task',
      '--json'
    ])
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout)
    expect(output.ok).toBe(true)
  })

  it('should complete task:list without server', async () => {
    const result = await execa('oct', [
      'task', 'list',
      '--json'
    ])
    expect(result.exitCode).toBe(0)
  })

  it('should complete task:get without server', async () => {
    const result = await execa('oct', [
      'task', 'get',
      '--id', 'task-123',
      '--json'
    ])
    expect(result.exitCode).toBe(0)
  })

  it('should complete task:run without server', async () => {
    const result = await execa('oct', [
      'task', 'run',
      '--id', 'task-123',
      '--json'
    ])
    expect(result.exitCode).toBe(0)
  })

  it('should not attempt to connect to any server port')
  it('should not show "waiting for server" messages')
  it('should not require server environment variables')
})
```

### 2.2 No Background Processes
```typescript
// Test: No background process spawning
describe('No Background Processes', () => {
  it('should not spawn server process', async () => {
    const before = await getProcessList()
    await execa('oct', ['task', 'list', '--json'])
    const after = await getProcessList()
    expect(after).toEqual(before)
  })

  it('should not leave zombie processes')
  it('should not require process cleanup')
})
```

---

## 3. JSON Output Mode Tests

### 3.1 Universal JSON Flag Support
```typescript
// Test: All commands support --json
describe('JSON Output Mode', () => {
  const commands = [
    ['task', 'create', '--title', 'Test'],
    ['task', 'list'],
    ['task', 'get', '--id', '123'],
    ['task', 'run', '--id', '123'],
    ['task', 'update', '--id', '123'],
    ['task', 'delete', '--id', '123'],
    ['--version'],
    ['--help']
  ]

  it.each(commands)('%s should support --json flag', async (cmd) => {
    const result = await execa('oct', [...cmd, '--json'])
    expect(result.exitCode).toBe(0)
    expect(() => JSON.parse(result.stdout)).not.toThrow()
  })
})
```

### 3.2 Success Envelope Schema
```typescript
// Test: Success response envelope
describe('JSON Success Envelope', () => {
  it('should return {ok: true, data: ...} on success', async () => {
    const result = await execa('oct', [
      'task', 'create',
      '--title', 'Test',
      '--json'
    ])
    const output = JSON.parse(result.stdout)

    expect(output).toHaveProperty('ok', true)
    expect(output).toHaveProperty('data')
    expect(output).not.toHaveProperty('error')
  })

  it('should have exactly two top-level keys: ok, data', async () => {
    const result = await execa('oct', [
      'task', 'create',
      '--title', 'Test',
      '--json'
    ])
    const output = JSON.parse(result.stdout)
    expect(Object.keys(output)).toHaveLength(2)
    expect(output).toHaveProperty('ok')
    expect(output).toHaveProperty('data')
  })

  it('should contain use case output in data field', async () => {
    const result = await execa('oct', [
      'task', 'create',
      '--title', 'Test',
      '--json'
    ])
    const output = JSON.parse(result.stdout)
    expect(output.data).toHaveProperty('task')
    expect(output.data.task).toHaveProperty('taskId')
    expect(output.data.task).toHaveProperty('title', 'Test')
  })
})
```

### 3.3 Error Envelope Schema
```typescript
// Test: Error response envelope
describe('JSON Error Envelope', () => {
  it('should return {ok: false, error: ...} on error', async () => {
    const result = await execa('oct', [
      'task', 'get',
      '--id', 'nonexistent',
      '--json'
    ], { reject: false })

    const output = JSON.parse(result.stdout)
    expect(output).toHaveProperty('ok', false)
    expect(output).toHaveProperty('error')
    expect(output).not.toHaveProperty('data')
  })

  it('should have exactly two top-level keys: ok, error', async () => {
    const result = await execa('oct', [
      'task', 'get',
      '--id', 'nonexistent',
      '--json'
    ], { reject: false })

    const output = JSON.parse(result.stdout)
    expect(Object.keys(output)).toHaveLength(2)
    expect(output).toHaveProperty('ok')
    expect(output).toHaveProperty('error')
  })

  it('should contain error object with code, message, retryable', async () => {
    const result = await execa('oct', [
      'task', 'get',
      '--id', 'nonexistent',
      '--json'
    ], { reject: false })

    const output = JSON.parse(result.stdout)
    expect(output.error).toHaveProperty('code')
    expect(output.error).toHaveProperty('message')
    expect(output.error).toHaveProperty('retryable')
  })
})
```

### 3.4 No Console Noise in JSON Mode
```typescript
// Test: Clean JSON output
describe('No Console Noise in JSON Mode', () => {
  it('should not include log messages in stdout', async () => {
    const result = await execa('oct', ['task', 'list', '--json'])
    const lines = result.stdout.trim().split('\n')
    expect(lines).toHaveLength(1) // Only JSON output
  })

  it('should not include warnings in stdout', async () => {
    const result = await execa('oct', ['task', 'list', '--json'])
    expect(result.stdout).not.toContain('warning')
    expect(result.stdout).not.toContain('Warning')
  })

  it('should not include info messages in stdout', async () => {
    const result = await execa('oct', ['task', 'list', '--json'])
    expect(result.stdout).not.toContain('info:')
    expect(result.stdout).not.toContain('[INFO]')
  })

  it('should output valid JSON to stdout only', async () => {
    const result = await execa('oct', ['task', 'list', '--json'])
    expect(() => JSON.parse(result.stdout)).not.toThrow()
  })

  it('should not mix human-readable with JSON', async () => {
    const result = await execa('oct', ['task', 'create', '--title', 'Test', '--json'])
    const output = result.stdout
    expect(output.startsWith('{')).toBe(true)
    expect(output.endsWith('}')).toBe(true)
  })
})
```

---

## 4. Exit Code Tests

### 4.1 Exit Code Mapping
```typescript
// Test: Exit code mapping from domain errors
describe('Exit Code Mapping', () => {
  it('should exit 0 on success', async () => {
    const result = await execa('oct', [
      'task', 'create',
      '--title', 'Test',
      '--json'
    ])
    expect(result.exitCode).toBe(0)
  })

  it('should exit 1 for INVALID_INPUT', async () => {
    const result = await execa('oct', [
      'task', 'create',
      '--title', '', // Invalid: empty title
      '--json'
    ], { reject: false })
    expect(result.exitCode).toBe(1)
  })

  it('should exit 2 for NOT_FOUND', async () => {
    const result = await execa('oct', [
      'task', 'get',
      '--id', 'nonexistent',
      '--json'
    ], { reject: false })
    expect(result.exitCode).toBe(2)
  })

  it('should exit 3 for UNAUTHORIZED', async () => {
    const result = await execa('oct', [
      'task', 'create',
      '--title', 'Test',
      '--json'
    ], {
      reject: false,
      env: { OCT_NO_AUTH: 'true' } // Simulate no auth
    })
    expect(result.exitCode).toBe(3)
  })

  it('should exit 4 for FORBIDDEN', async () => {
    const result = await execa('oct', [
      'task', 'create',
      '--title', 'Test',
      '--json'
    ], {
      reject: false,
      env: { OCT_NO_PERMISSIONS: 'true' }
    })
    expect(result.exitCode).toBe(4)
  })

  it('should exit 5 for CONFLICT', async () => {
    const result = await execa('oct', [
      'task', 'run',
      '--id', 'already-running',
      '--json'
    ], { reject: false })
    expect(result.exitCode).toBe(5)
  })

  it('should exit 6 for INTERNAL_ERROR', async () => {
    const result = await execa('oct', [
      'task', 'list',
      '--json'
    ], {
      reject: false,
      env: { OCT_SIMULATE_ERROR: 'internal' }
    })
    expect(result.exitCode).toBe(6)
  })
})
```

### 4.2 Exit Code Stability
```typescript
// Test: Exit codes are stable and documented
describe('Exit Code Stability', () => {
  it('should have documented exit codes', () => {
    const exitCodes = {
      0: 'Success',
      1: 'Invalid input',
      2: 'Not found',
      3: 'Unauthorized',
      4: 'Forbidden',
      5: 'Conflict',
      6: 'Internal error'
    }
    // Verify these match implementation
  })

  it('should use same exit codes across all commands')
  it('should not change exit codes between versions')
})
```

---

## 5. Human-Readable Output Tests

### 5.1 Snapshot Tests
```typescript
// Test: Human-readable output snapshots
describe('Human-Readable Output', () => {
  it('should match snapshot for task:create', async () => {
    const result = await execa('oct', [
      'task', 'create',
      '--title', 'Test Task'
    ])
    expect(result.stdout).toMatchSnapshot()
  })

  it('should match snapshot for task:list', async () => {
    const result = await execa('oct', ['task', 'list'])
    expect(result.stdout).toMatchSnapshot()
  })

  it('should match snapshot for task:get', async () => {
    const result = await execa('oct', [
      'task', 'get',
      '--id', 'task-123'
    ])
    expect(result.stdout).toMatchSnapshot()
  })

  it('should match snapshot for --help', async () => {
    const result = await execa('oct', ['--help'])
    expect(result.stdout).toMatchSnapshot()
  })

  it('should match snapshot for errors', async () => {
    const result = await execa('oct', [
      'task', 'get',
      '--id', 'nonexistent'
    ], { reject: false })
    expect(result.stdout).toMatchSnapshot()
  })
})
```

### 5.2 Colored Output
```typescript
// Test: Colored output with chalk
describe('Colored Output', () => {
  it('should use colors in human mode', async () => {
    const result = await execa('oct', ['task', 'list'])
    expect(result.stdout).toContain('\x1b[') // ANSI escape codes
  })

  it('should not use colors with --no-color', async () => {
    const result = await execa('oct', ['task', 'list', '--no-color'])
    expect(result.stdout).not.toContain('\x1b[')
  })

  it('should respect NO_COLOR environment variable', async () => {
    const result = await execa('oct', ['task', 'list'], {
      env: { NO_COLOR: '1' }
    })
    expect(result.stdout).not.toContain('\x1b[')
  })
})
```

---

## 6. Context Construction Tests

### 6.1 CLI Context Building
```typescript
// Test: ExecutionContext construction from CLI
describe('CLI Context Construction', () => {
  it('should construct context from config file', async () => {
    // Create temp config file
    const config = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['task:create']
    }
    // Test context is built correctly
  })

  it('should construct context from environment variables', async () => {
    const result = await execa('oct', ['task', 'list', '--json'], {
      env: {
        OCT_ACTOR_ID: 'user-123',
        OCT_WORKSPACE_ID: 'ws-456',
        OCT_PERMISSIONS: 'task:create,task:read'
      }
    })
    expect(result.exitCode).toBe(0)
  })

  it('should construct context from CLI flags', async () => {
    const result = await execa('oct', [
      'task', 'list',
      '--actor-id', 'user-123',
      '--workspace-id', 'ws-456',
      '--json'
    ])
    expect(result.exitCode).toBe(0)
  })

  it('should merge config < env < flags (flags win)', async () => {
    // Test precedence
  })
})
```

### 6.2 Environment Detection
```typescript
// Test: Environment detection
describe('Environment Detection', () => {
  it('should set environment to "local" by default', async () => {
    // Verify context.environment = 'local'
  })

  it('should detect CI environment', async () => {
    const result = await execa('oct', ['task', 'list', '--json'], {
      env: { CI: 'true' }
    })
    // Verify context.environment = 'ci'
  })
})
```

---

## 7. Remote Mode Tests

### 7.1 Remote Flag Behavior
```typescript
// Test: --remote flag functionality
describe('Remote Mode', () => {
  it('should call REST API when --remote is used', async () => {
    // Mock server
    // Verify HTTP request is made
  })

  it('should use same input schema in remote mode', async () => {
    // Compare local vs remote request body
  })

  it('should use same output schema in remote mode', async () => {
    // Compare local vs remote response
  })

  it('should have same error semantics in remote mode', async () => {
    // Compare error handling
  })

  it('should not auto-detect server', async () => {
    // Verify no auto-detection logic
  })

  it('should not implicitly start server', async () => {
    // Verify server is not started
  })
})
```

---

## 8. AI Agent Compatibility Tests

### 8.1 Non-Interactive Mode
```typescript
// Test: No interactive prompts
describe('AI Agent Compatibility', () => {
  it('should not prompt for input by default', async () => {
    const result = await execa('oct', ['task', 'create'], {
      timeout: 5000,
      reject: false
    })
    // Should fail fast, not hang waiting for input
    expect(result.timedOut).toBe(false)
  })

  it('should fail gracefully when required args missing', async () => {
    const result = await execa('oct', ['task', 'create'], {
      reject: false
    })
    expect(result.exitCode).not.toBe(0)
    expect(result.stdout).toContain('error') // or similar
  })

  it('should support --yes flag for confirmations', async () => {
    const result = await execa('oct', [
      'task', 'delete',
      '--id', 'task-123',
      '--yes',
      '--json'
    ])
    expect(result.exitCode).toBe(0)
  })
})
```

### 8.2 Scriptable Output
```typescript
// Test: Output suitable for scripting
describe('Scriptable Output', () => {
  it('should produce parseable JSON', async () => {
    const result = await execa('oct', ['task', 'list', '--json'])
    const parsed = JSON.parse(result.stdout)
    expect(parsed).toBeDefined()
  })

  it('should have stable field names', async () => {
    // Field names should not change between versions
  })

  it('should have stable field types', async () => {
    // Field types should not change
  })
})
```

---

## 9. Command-Specific Tests

### 9.1 Task Commands
```typescript
// Test: All task commands
describe('Task Commands', () => {
  describe('task:create', () => {
    it('should create task with --title')
    it('should create task with --description')
    it('should create task with --metadata')
    it('should fail without --title')
    it('should support --json output')
  })

  describe('task:list', () => {
    it('should list tasks')
    it('should support --limit')
    it('should support --cursor')
    it('should support --json output')
  })

  describe('task:get', () => {
    it('should get task by --id')
    it('should fail without --id')
    it('should return NOT_FOUND for invalid id')
    it('should support --json output')
  })

  describe('task:run', () => {
    it('should run task by --id')
    it('should support --options')
    it('should fail without --id')
    it('should support --json output')
  })
})
```

---

## 10. Integration Tests

### 10.1 End-to-End Workflows
```typescript
// Test: Complete workflows
describe('End-to-End Workflows', () => {
  it('should complete create → get → run workflow', async () => {
    // Create
    const create = await execa('oct', [
      'task', 'create',
      '--title', 'Workflow Test',
      '--json'
    ])
    const { data: { task: { taskId } } } = JSON.parse(create.stdout)

    // Get
    const get = await execa('oct', [
      'task', 'get',
      '--id', taskId,
      '--json'
    ])
    expect(JSON.parse(get.stdout).data.task.taskId).toBe(taskId)

    // Run
    const run = await execa('oct', [
      'task', 'run',
      '--id', taskId,
      '--json'
    ])
    expect(JSON.parse(run.stdout).ok).toBe(true)
  })
})
```

---

## 11. Test Execution

### 11.1 Run Commands
```bash
# Run all CLI tests
pnpm test:cli

# Run with coverage
pnpm test:cli --coverage

# Run specific test file
pnpm test:cli src/commands/task.test.ts

# Run in watch mode
pnpm test:cli --watch

# Run with server stopped (verify independence)
pnpm test:cli --testNamePattern="server independence"
```

### 11.2 Coverage Requirements
- Line Coverage: ≥ 80%
- Branch Coverage: ≥ 80%
- Function Coverage: 100%
- Critical paths: 100%

---

**Document Version:** 1.0
**Last Updated:** 2026-02-08
**Owner:** QA Engineer

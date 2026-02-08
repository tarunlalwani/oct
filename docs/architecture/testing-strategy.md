# Testing Strategy

This document outlines the testing approach for each layer of the OCT architecture.

## Testing Philosophy

- **Core layer**: Pure unit tests with no I/O, fully deterministic
- **Adapter layers** (CLI, Server): Test adapter logic, not core business rules
- **No integration tests** at the package level - use cases are tested with in-memory repositories
- **Fast feedback**: All tests run in milliseconds

## Core Layer Testing (`packages/core/`)

The Core layer contains pure business logic tested with deterministic unit tests.

### Test Characteristics

| Aspect | Approach |
|--------|----------|
| Isolation | Each test is independent with fresh repository |
| I/O | No I/O - in-memory repositories only |
| Determinism | Fixed dates, no randomness |
| Coverage | All use cases, schemas, and domain logic |

### Test Structure

```typescript
// Example: packages/core/src/use-cases/create-task.test.ts
describe('CreateTask Use Case', () => {
  let repository: InMemoryTaskRepository;
  let validContext: ExecutionContext;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();  // Fresh repository
    validContext = {
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['task:create', 'task:read'],
      environment: 'local',
    };
  });

  it('should create task with minimal valid input', async () => {
    const result = await createTaskUseCase(validContext, { title: 'Test' }, repository);
    expect(result.isOk()).toBe(true);
  });
});
```

### Core Test Categories

**Success Cases** (`packages/core/src/use-cases/*.test.ts`)
- Valid input produces expected output
- Side effects (repository state changes)
- Return value structure

**Validation Errors**
- Invalid input returns `Err` with `INVALID_INPUT` code
- Boundary conditions (max length, empty strings)

**Authorization Errors**
- Missing `actorId` returns `UNAUTHORIZED`
- Missing permissions returns `FORBIDDEN`

**Schema Tests** (`packages/core/src/schemas/*.test.ts`)
- Zod schema validation
- Type inference correctness

### Running Core Tests

```bash
cd packages/core
npm test              # Run once
npm run test:watch    # Watch mode
```

## CLI Layer Testing (`packages/cli/`)

The CLI layer tests adapter concerns: formatting, exit codes, and context building.

### Test Characteristics

| Aspect | Approach |
|--------|----------|
| Focus | Output formatting, exit codes, context building |
| Mocking | Console I/O mocked with Vitest spies |
| Business Logic | Not tested - covered in Core |

### CLI Test Categories

**Output Formatting** (`packages/cli/src/output/formatter.test.ts`)

```typescript
describe('JsonFormatter', () => {
  it('should output valid JSON on success', () => {
    formatter.success({ message: 'Hello' });
    const output = consoleSpy.mock.calls[0][0];
    expect(() => JSON.parse(output)).not.toThrow();
    expect(JSON.parse(output)).toEqual({ ok: true, data: { message: 'Hello' } });
  });
});
```

Tests cover:
- JSON formatter outputs valid JSON with `{ ok: true, data: ... }` structure
- Human formatter outputs readable text
- Error formatting includes code, message, details

**Exit Codes** (`packages/cli/src/output/formatter.test.ts`)

```typescript
describe('getExitCode', () => {
  it('should return 1 for INVALID_INPUT', () => {
    expect(getExitCode('INVALID_INPUT')).toBe(1);
  });
  it('should return 3 for UNAUTHORIZED', () => {
    expect(getExitCode('UNAUTHORIZED')).toBe(3);
  });
});
```

**Context Building** (`packages/cli/src/context/builder.test.ts`)
- Environment variable parsing
- Default values for local development
- Permission string splitting

### Running CLI Tests

```bash
cd packages/cli
npm test              # Run once
npm run test:watch    # Watch mode
```

## Server Layer Testing (`packages/server/`)

The Server layer tests HTTP-specific concerns: serialization and context extraction.

### Test Characteristics

| Aspect | Approach |
|--------|----------|
| Focus | HTTP status mapping, response serialization, context building |
| Mocking | Request/response objects mocked |
| Business Logic | Not tested - covered in Core |

### Server Test Categories

**Error Serialization** (`packages/server/src/serializers/error.test.ts`)

```typescript
describe('errorToHttpStatus', () => {
  it('should map UNAUTHORIZED to 401', () => {
    const error: DomainError = { code: 'UNAUTHORIZED', message: 'Unauthorized', retryable: false };
    expect(errorToHttpStatus(error)).toBe(401);
  });
});

describe('serializeError', () => {
  it('should return {ok: false, error: ...}', () => {
    const result = serializeError(error);
    expect(result).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Task not found', retryable: false }
    });
  });
});
```

Tests cover:
- Error code to HTTP status mapping
- Success response structure `{ ok: true, data: ... }`
- Error response structure `{ ok: false, error: ... }`

**Context Building** (`packages/server/src/context/builder.test.ts`)
- Header extraction (`x-actor-id`, `x-workspace-id`, `x-permissions`)
- Default values for anonymous requests
- Metadata capture (IP, user agent)

### Running Server Tests

```bash
cd packages/server
npm test              # Run once
npm run test:watch    # Watch mode
```

## Infra Layer Testing

The Infra layer is tested indirectly through Core use case tests. The `InMemoryTaskRepository` is the primary implementation.

### Repository Test Utils

```typescript
// packages/core/src/test-utils/in-memory-repository.ts
export class InMemoryTaskRepository implements TaskRepository {
  private tasks: Map<string, Task> = new Map();
  // Implementation used by Core tests
}
```

This shared test utility ensures:
- Core tests run with a real (in-memory) repository implementation
- No mocking of repository behavior
- Tests reflect actual repository contract

## Coverage Thresholds

| Layer | Target Coverage | Enforcement |
|-------|----------------|-------------|
| Core | >= 90% | Required - business logic |
| CLI | >= 80% | Recommended - adapter code |
| Server | >= 80% | Recommended - adapter code |
| Infra | >= 70% | Recommended - via Core tests |

## Running All Tests

```bash
# From repository root - run all packages
npm test --workspaces

# Or run individually
cd packages/core && npm test
cd packages/cli && npm test
cd packages/server && npm test
```

## Test Commands Summary

| Package | Test Command | Watch Command |
|---------|-------------|---------------|
| Core | `cd packages/core && npm test` | `npm run test:watch` |
| CLI | `cd packages/cli && npm test` | `npm run test:watch` |
| Server | `cd packages/server && npm test` | `npm run test:watch` |

## Key Testing Principles

1. **Test at the lowest level** - Business logic tested in Core, not through HTTP/CLI
2. **Use real implementations** - In-memory repositories, not mocks
3. **Deterministic tests** - No random data, no external services
4. **Fast execution** - All tests complete in under 1 second per package
5. **Clear failure messages** - Tests describe expected behavior in plain language

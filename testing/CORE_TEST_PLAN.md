# Core Package Test Plan

## Overview
Comprehensive test plan for the Core package - the authoritative business logic layer. All tests must be pure unit tests with no I/O, fully deterministic.

---

## 1. ExecutionContext Tests

### 1.1 Context Structure Validation
```typescript
// Test: ExecutionContext schema validation
describe('ExecutionContext', () => {
  it('should accept valid context with all required fields')
  it('should reject context without actorId')
  it('should reject context without workspaceId')
  it('should reject context without permissions')
  it('should reject context without environment')
  it('should accept valid environment values: local, ci, server')
  it('should reject invalid environment values')
  it('should accept optional traceId')
  it('should accept optional metadata')
  it('should reject unknown fields (strict schema)')
})
```

### 1.2 Context Immutability
```typescript
// Test: Context cannot be modified after creation
describe('ExecutionContext Immutability', () => {
  it('should not allow mutation of context properties')
  it('should not allow mutation of permissions array')
  it('should not allow mutation of metadata object')
  it('should require new context for changes')
})
```

### 1.3 Context Construction
```typescript
// Test: Context construction from various sources
describe('ExecutionContext Construction', () => {
  it('should construct from CLI sources (config, env, flags)')
  it('should construct from REST sources (headers, metadata)')
  it('should construct from test fixtures')
  it('should validate permissions format')
})
```

---

## 2. Domain Model Tests (Task Entity)

### 2.1 Task Creation
```typescript
// Test: Task entity creation
describe('Task Domain Model', () => {
  it('should create task with valid title (1-256 chars)')
  it('should reject title with 0 characters')
  it('should reject title with >256 characters')
  it('should accept valid description (markdown allowed)')
  it('should accept null description')
  it('should accept valid metadata object')
  it('should accept null metadata')
  it('should auto-generate taskId (UUIDv7 format)')
  it('should set createdAt to current timestamp')
  it('should set updatedAt to current timestamp')
  it('should set createdBy from context actorId')
  it('should set initial status to "pending"')
})
```

### 2.2 Task Status Transitions
```typescript
// Test: Valid and invalid status transitions
describe('Task Status Transitions', () => {
  // Valid transitions
  it('should allow pending → running')
  it('should allow pending → cancelled')
  it('should allow running → completed')
  it('should allow running → failed')
  it('should allow running → cancelled')

  // Invalid transitions
  it('should reject pending → completed')
  it('should reject pending → failed')
  it('should reject completed → any')
  it('should reject failed → any')
  it('should reject cancelled → any')
})
```

### 2.3 Task Update
```typescript
// Test: Task updates
describe('Task Updates', () => {
  it('should update title within 1-256 char limit')
  it('should reject title update to empty string')
  it('should update description')
  it('should update metadata')
  it('should update updatedAt timestamp on modification')
  it('should not modify createdAt on update')
  it('should not modify taskId on update')
  it('should not modify createdBy on update')
})
```

---

## 3. Use Case Tests

### 3.1 CreateTask Use Case
```typescript
// Test: CreateTask use case
describe('CreateTask Use Case', () => {
  describe('Success Cases', () => {
    it('should create task with minimal valid input (title only)')
    it('should create task with description')
    it('should create task with metadata')
    it('should return task in output')
    it('should set status to pending')
    it('should generate unique taskId')
    it('should set createdBy from context')
  })

  describe('Validation Errors', () => {
    it('should return INVALID_INPUT for missing title')
    it('should return INVALID_INPUT for empty title')
    it('should return INVALID_INPUT for title >256 chars')
    it('should return INVALID_INPUT for invalid metadata type')
  })

  describe('Authorization Errors', () => {
    it('should return UNAUTHORIZED for null actorId')
    it('should return FORBIDDEN without "task:create" permission')
  })

  describe('Result Type', () => {
    it('should return Ok result on success')
    it('should return Err result on failure')
    it('should never throw uncaught errors')
  })
})
```

### 3.2 GetTask Use Case
```typescript
// Test: GetTask use case
describe('GetTask Use Case', () => {
  describe('Success Cases', () => {
    it('should return task by id')
    it('should return complete task object')
  })

  describe('Error Cases', () => {
    it('should return NOT_FOUND for non-existent taskId')
    it('should return INVALID_INPUT for malformed taskId')
    it('should return UNAUTHORIZED for null actorId')
    it('should return FORBIDDEN without "task:read" permission')
  })

  describe('Permissions', () => {
    it('should allow access to own tasks')
    it('should allow admin to access any task')
    it('should deny access to other users tasks without permission')
  })
})
```

### 3.3 RunTask Use Case
```typescript
// Test: RunTask use case
describe('RunTask Use Case', () => {
  describe('Success Cases', () => {
    it('should start pending task')
    it('should set status to running')
    it('should set startedAt timestamp')
    it('should return taskId, status, startedAt')
  })

  describe('Completion', () => {
    it('should complete running task')
    it('should set status to completed')
    it('should set finishedAt timestamp')
  })

  describe('Failure', () => {
    it('should fail running task')
    it('should set status to failed')
    it('should set finishedAt timestamp')
  })

  describe('Error Cases', () => {
    it('should return NOT_FOUND for non-existent task')
    it('should return CONFLICT if task not in pending state')
    it('should return UNAUTHORIZED for null actorId')
    it('should return FORBIDDEN without "task:run" permission')
  })
})
```

### 3.4 ListTasks Use Case
```typescript
// Test: ListTasks use case
describe('ListTasks Use Case', () => {
  describe('Success Cases', () => {
    it('should return list of tasks')
    it('should return empty array when no tasks')
    it('should respect limit parameter')
    it('should return nextCursor for pagination')
    it('should use cursor for offset')
  })

  describe('Filtering', () => {
    it('should filter by workspace from context')
    it('should return only accessible tasks')
  })

  describe('Pagination', () => {
    it('should return correct page with cursor')
    it('should return null nextCursor when no more items')
    it('should handle invalid cursor gracefully')
  })

  describe('Authorization', () => {
    it('should return UNAUTHORIZED for null actorId')
    it('should return FORBIDDEN without "task:list" permission')
  })
})
```

---

## 4. Error Handling Tests

### 4.1 Domain Error Types
```typescript
// Test: Typed domain errors
describe('Domain Errors', () => {
  it('should have UNAUTHORIZED error with retryable=false')
  it('should have FORBIDDEN error with retryable=false')
  it('should have NOT_FOUND error with retryable=false')
  it('should have INVALID_INPUT error with retryable=false')
  it('should have CONFLICT error with retryable=false')
  it('should have INTERNAL_ERROR error with retryable=true')

  it('should include error code')
  it('should include error message')
  it('should include optional details object')
  it('should include retryable boolean')
})
```

### 4.2 Error Schema Compliance
```typescript
// Test: Error schema validation
describe('Error Schema', () => {
  it('should validate all error codes are in closed set')
  it('should reject unknown error codes')
  it('should require message for all errors')
  it('should require retryable for all errors')
})
```

### 4.3 Result Type
```typescript
// Test: Result type (neverthrow or equivalent)
describe('Result Type', () => {
  it('should return Ok for success cases')
  it('should return Err for error cases')
  it('should never throw exceptions')
  it('should allow type-safe error handling')
  it('should support map/chain operations')
})
```

---

## 5. Schema Validation Tests (Zod)

### 5.1 Input Schema Validation
```typescript
// Test: Zod input schemas
describe('Input Schema Validation', () => {
  describe('CreateTaskInput', () => {
    it('should validate valid input')
    it('should reject missing required fields')
    it('should reject invalid field types')
    it('should reject extra fields (strict)')
    it('should coerce types where appropriate')
  })

  describe('GetTaskInput', () => {
    it('should validate taskId string')
    it('should reject non-string taskId')
    it('should reject empty taskId')
  })

  describe('RunTaskInput', () => {
    it('should validate taskId and options')
    it('should make options optional')
  })

  describe('ListTasksInput', () => {
    it('should validate limit as positive number')
    it('should validate cursor as string')
    it('should make all fields optional')
  })
})
```

### 5.2 Output Schema Validation
```typescript
// Test: Zod output schemas
describe('Output Schema Validation', () => {
  it('should validate CreateTaskOutput')
  it('should validate GetTaskOutput')
  it('should validate RunTaskOutput')
  it('should validate ListTasksOutput')
  it('should reject output not matching schema')
})
```

---

## 6. Authorization Tests

### 6.1 Permission Checks
```typescript
// Test: Permission-based authorization
describe('Authorization', () => {
  it('should check permissions from context')
  it('should allow action with required permission')
  it('should deny action without required permission')
  it('should deny action with empty permissions array')
  it('should support permission wildcards')

  describe('Task Permissions', () => {
    it('should require "task:create" for CreateTask')
    it('should require "task:read" for GetTask')
    it('should require "task:run" for RunTask')
    it('should require "task:list" for ListTasks')
    it('should require "task:update" for UpdateTask')
    it('should require "task:delete" for DeleteTask')
  })
})
```

### 6.2 Actor Identity
```typescript
// Test: Actor identity validation
describe('Actor Identity', () => {
  it('should reject null actorId for protected operations')
  it('should accept valid actorId format')
  it('should use actorId for createdBy field')
  it('should use actorId for audit trails')
})
```

---

## 7. Port/Interface Tests

### 7.1 Repository Port
```typescript
// Test: TaskRepository interface
describe('TaskRepository Port', () => {
  it('should define get(id: string): Task interface')
  it('should define save(task: Task): void interface')
  it('should define list(options): Task[] interface')
  it('should define delete(id: string): void interface')
})
```

### 7.2 Port Implementations
```typescript
// Test: Port implementations (in-memory for tests)
describe('InMemoryTaskRepository', () => {
  it('should store and retrieve tasks')
  it('should update existing tasks')
  it('should delete tasks')
  it('should list all tasks')
  it('should be isolated between test runs')
})
```

---

## 8. Deterministic Execution Tests

### 8.1 Pure Functions
```typescript
// Test: Pure function behavior
describe('Deterministic Execution', () => {
  it('should produce same output for same input')
  it('should not depend on external state')
  it('should not produce side effects')
  it('should be testable without mocks')
})
```

### 8.2 Idempotency
```typescript
// Test: Idempotent operations
describe('Idempotency', () => {
  it('should return same result on repeated calls')
  it('should not create duplicates on retry')
  it('should handle concurrent calls safely')
})
```

---

## 9. Test Coverage Requirements

### 9.1 Coverage Targets
- **Line Coverage:** ≥ 90%
- **Branch Coverage:** ≥ 90%
- **Function Coverage:** 100%
- **Statement Coverage:** ≥ 90%

### 9.2 Critical Paths (100% Coverage Required)
- [ ] All use cases
- [ ] All domain entities
- [ ] All validation logic
- [ ] All authorization checks
- [ ] All error paths

---

## 10. Test Implementation Guidelines

### 10.1 Test Structure
```typescript
// Example test structure
describe('Feature', () => {
  describe('Success Cases', () => { /* ... */ })
  describe('Validation Errors', () => { /* ... */ })
  describe('Authorization Errors', () => { /* ... */ })
  describe('Edge Cases', () => { /* ... */ })
})
```

### 10.2 Fixtures
```typescript
// Required fixtures
const validContext: ExecutionContext = {
  actorId: 'user-123',
  workspaceId: 'ws-456',
  permissions: ['task:create', 'task:read'],
  environment: 'local'
}

const adminContext: ExecutionContext = {
  actorId: 'admin-789',
  workspaceId: 'ws-456',
  permissions: ['*'],
  environment: 'local'
}

const unauthorizedContext: ExecutionContext = {
  actorId: 'user-000',
  workspaceId: 'ws-456',
  permissions: [],
  environment: 'local'
}
```

### 10.3 Assertions
```typescript
// Required assertion patterns
expect(result.isOk()).toBe(true)
expect(result.isErr()).toBe(true)
expect(result._unsafeUnwrap()).toEqual(expected)
expect(result._unsafeUnwrapErr().code).toBe('NOT_FOUND')
```

---

## 11. Test Execution

### 11.1 Run Commands
```bash
# Run all Core tests
pnpm test:core

# Run with coverage
pnpm test:core --coverage

# Run specific test file
pnpm test:core src/use-cases/CreateTask.test.ts

# Run in watch mode
pnpm test:core --watch
```

### 11.2 Coverage Report
```bash
# Generate coverage report
pnpm test:core --coverage --reporter=html

# Coverage thresholds (enforced in CI)
# - branches: 90
# - functions: 100
# - lines: 90
# - statements: 90
```

---

**Document Version:** 1.0
**Last Updated:** 2026-02-08
**Owner:** QA Engineer

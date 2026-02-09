# OCT v2 Implementation Review

**Date:** 2026-02-09
**Reviewer:** Senior Code Reviewer & Architecture Specialist
**Scope:** Architecture Compliance, Code Quality, Completeness, Potential Issues

---

## Executive Summary

| Area | Status | Notes |
|------|--------|-------|
| **Architecture Compliance** | ⚠️ Partial | Core structure follows design doc, but significant deviations in use case signatures, missing transaction support, and incomplete StorageAdapter interface |
| **Code Quality** | ⚠️ Partial | Good TypeScript strictness and Zod validation, but inconsistent error handling patterns, missing imports, and legacy code pollution |
| **Completeness** | ❌ Missing | Many required use cases not implemented, CLI commands incomplete, missing summary/report use cases |
| **Production Readiness** | ❌ Not Ready | Critical bugs, race conditions, and incomplete implementations would cause production failures |

---

## Detailed Findings

### CRITICAL Severity

#### 1. Broken Dependency Unblocking Logic in `complete-task.ts`
**File:** `/home/ubuntu/projects/oct/packages/core/src/use-cases/task/complete-task.ts`

**Issue:** The `unblockDependentTasks` function has a critical bug where it filters dependencies incorrectly:

```typescript
// BUG: async function used in Array.filter - always returns truthy
const remainingBlockers = dependent.dependencies.filter(async (depId) => {
  const depResult = await adapter.getTask(depId);
  return depResult.isOk() && depResult.value && depResult.value.status !== 'done';
});

// This will always result in blockers.length === 0 because:
// 1. Array.filter doesn't await async predicates
// 2. The returned Promise is always truthy
const blockers = await Promise.all(remainingBlockers);
if (blockers.length === 0) {  // This is ALWAYS true
  // Task gets incorrectly unblocked
}
```

**Impact:** Tasks will be incorrectly unblocked even when dependencies are not completed, breaking the entire dependency management system.

**Fix:** Rewrite using proper async iteration:
```typescript
async function unblockDependentTasks(completedTaskId: string, adapter: StorageAdapter): Promise<void> {
  const dependentsResult = await adapter.getTasksByDependency(completedTaskId);
  if (dependentsResult.isErr()) return;

  for (const dependent of dependentsResult.value) {
    if (dependent.status === 'blocked') {
      // Check ALL dependencies properly
      const depStatuses = await Promise.all(
        dependent.dependencies.map(async (depId) => {
          const depResult = await adapter.getTask(depId);
          return depResult.isOk() && depResult.value?.status === 'done';
        })
      );

      const allDone = depStatuses.every(status => status);
      if (allDone) {
        const updatedDependent: Task = {
          ...dependent,
          status: 'todo',
          blockedBy: [],
          updatedAt: new Date().toISOString(),
        };
        await adapter.saveTask(updatedDependent);
      }
    }
  }
}
```

---

#### 2. Missing `err` Import in `list-tasks.ts`
**File:** `/home/ubuntu/projects/oct/packages/core/src/use-cases/task/list-tasks.ts`

**Issue:** Line 36 uses `err()` but it's not imported from `neverthrow`:

```typescript
import { ok, type Result } from 'neverthrow';  // Missing 'err'
// ...
return err(result.error);  // Runtime error: err is not defined
```

**Impact:** Runtime crash when listing tasks fails.

**Fix:** Add `err` to imports:
```typescript
import { ok, err, type Result } from 'neverthrow';
```

---

#### 3. CLI Task Command Uses Non-Existent Imports
**File:** `/home/ubuntu/projects/oct/packages/cli/src/commands/task.ts`

**Issue:** Imports reference v1 use cases that no longer exist:

```typescript
import {
  createTaskUseCase,
  getTaskUseCase,
  runTaskUseCase,  // ❌ Does not exist in v2
  listTasksUseCase,
  createTaskInputSchema,
  getTaskInputSchema,
  runTaskInputSchema,  // ❌ Does not exist in v2
  listTasksInputSchema,
  createError,
  type CreateTaskOutput,
  type GetTaskOutput,
  type RunTaskOutput,  // ❌ Does not exist in v2
  type ListTasksOutput,
} from '@oct/core';
```

Also imports from `@oct/infra` which is not in package.json dependencies.

**Impact:** Build failure and broken CLI task commands.

**Fix:** Update imports to use actual v2 exports and remove `@oct/infra` dependency.

---

#### 4. Stale Legacy Code Pollution
**Files:** Multiple files reference v1 patterns

**Issues:**
- `/home/ubuntu/projects/oct/packages/core/src/ports/task-repository.ts` - Legacy v1 repository interface still exported
- `/home/ubuntu/projects/oct/packages/core/src/schemas/use-cases.ts` - Contains v1 task schemas (createTaskInputSchema without projectId, etc.)
- `/home/ubuntu/projects/oct/packages/core/src/index.ts` exports both v1 and v2 patterns

**Impact:** Confusing API, potential for using wrong interfaces, build conflicts.

**Fix:** Remove all v1 legacy code or move to a `legacy/` directory.

---

### HIGH Severity

#### 5. Missing Required Use Cases
**Per PRD-v2.md Section 4, the following use cases are NOT implemented:**

**Project Use Cases:**
- `addEmployeeToProject` - ❌ Missing
- `removeEmployeeFromProject` - ❌ Missing

**Employee Use Cases:**
- `updateEmployee` - ❌ Missing
- `deleteEmployee` - ❌ Missing
- `refreshFromTemplate` - ❌ Missing

**Template Use Cases:**
- `updateTemplate` - ❌ Missing
- `deleteTemplate` - ❌ Missing
- `getTemplate` - ❌ Missing

**Task Use Cases:**
- `updateTask` - ❌ Missing
- `moveTask` - ❌ Missing
- `deleteTask` - ❌ Missing
- `blockTask` - ❌ Missing
- `approveTask` - ❌ Missing
- `rejectTask` - ❌ Missing

**Summary Use Cases:**
- `getProjectSummary` - ❌ Missing
- `getEmployeeWorkload` - ❌ Missing
- `getPendingApprovals` - ❌ Missing
- `getBlockedTasks` - ❌ Missing

**Impact:** Core functionality incomplete per PRD requirements.

---

#### 6. Missing Transaction Support in StorageAdapter
**File:** `/home/ubuntu/projects/oct/packages/core/src/ports/storage-adapter.ts`

**Per Architecture Doc Section 1:**
```typescript
// Required per architecture:
transaction<T>(fn: (adapter: StorageAdapter) => Promise<T>): Promise<Result<T, DomainError>>;
```

**Current:** No transaction method defined.

**Impact:** No atomic operations possible. The `archiveProject` use case archives sub-projects one-by-one without rollback on failure, potentially leaving the system in an inconsistent state.

---

#### 7. Race Condition in File System Storage
**File:** `/home/ubuntu/projects/oct/packages/storage-fs/src/fs-storage-adapter.ts`

**Issue:** No file locking mechanism implemented despite architecture doc specifying it (Section 4.4).

**Impact:** Concurrent writes can corrupt data. Two simultaneous `saveTask` calls can result in partial writes or lost updates.

**Fix:** Implement file locking as specified in architecture doc using lockfiles.

---

#### 8. No Input Validation on `getProjectUseCase` and Similar
**File:** `/home/ubuntu/projects/oct/packages/core/src/use-cases/project/get-project.ts`

**Issue:** No Zod validation for input schema:

```typescript
// Current - no validation:
export async function getProjectUseCase(
  ctx: ExecutionContext,
  input: GetProjectInput,  // Could be anything at runtime
  adapter: StorageAdapter
): Promise<Result<GetProjectOutput, DomainError>>
```

**Impact:** Runtime type errors not caught, potential security issues.

**Fix:** Add `getProjectInputSchema.safeParse(input)` validation.

---

#### 9. Inconsistent Permission Checks
**File:** `/home/ubuntu/projects/oct/packages/core/src/use-cases/task/get-task.ts`

**Issue:** Requires authentication but `listProjectsUseCase` and `getProjectUseCase` don't:

```typescript
// get-task.ts requires auth:
if (ctx.actorId === null) {
  return err(createError('UNAUTHORIZED', 'Authentication required', false));
}

// But get-project.ts doesn't - inconsistent
```

**Impact:** Inconsistent security model.

**Fix:** Standardize authentication requirements per PRD.

---

### MEDIUM Severity

#### 10. Missing Priority Filter in Task List
**File:** `/home/ubuntu/projects/oct/packages/core/src/use-cases/task/list-tasks.ts`

**Per Architecture Doc Section 5.4:**
```typescript
export const listTasksInputSchema = z.object({
  filter: z.object({
    projectId: z.string().optional(),
    ownerId: z.string().optional(),
    status: z.enum([...]).optional(),
    priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),  // ❌ Missing
  }).optional(),
});
```

**Impact:** Cannot filter tasks by priority as required.

---

#### 11. ID Generation Not UUIDv7 Compliant
**File:** `/home/ubuntu/projects/oct/packages/core/src/use-cases/*/create-*.ts`

**Current implementation:**
```typescript
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}${random}`;
}
```

**Per PRD-v2.md:** IDs should be UUIDv7 format.

**Impact:** IDs are not sortable by time (UUIDv7 property), not standard format.

**Fix:** Use proper UUIDv7 library.

---

#### 12. Missing Template Version Increment
**File:** `/home/ubuntu/projects/oct/packages/core/src/use-cases/template/` (update-template.ts doesn't exist)

**Per Architecture Doc Section 5.3:**
```typescript
// Increments version number on successful update
```

**Impact:** Template versioning not implemented.

---

#### 13. No Circular Project Hierarchy Detection
**File:** `/home/ubuntu/projects/oct/packages/core/src/use-cases/project/update-project.ts`

**Issue:** `updateProject` allows setting `parentId` but doesn't check for circular references.

**Impact:** Could create infinite loops in project hierarchy.

---

#### 14. CLI Missing Summary Commands
**File:** `/home/ubuntu/projects/oct/packages/cli/src/index.ts`

**Per PRD-v2.md Section 5.1:**
```bash
oct summary --project <id>
oct workload --employee <id>
oct blocked
```

**Impact:** Summary/reporting CLI commands not implemented.

---

#### 15. `blockedBy` Field Not Recomputed on Dependency Status Change
**File:** `/home/ubuntu/projects/oct/packages/core/src/use-cases/task/complete-task.ts`

**Issue:** When a task is completed, dependent tasks are unblocked but their `blockedBy` array is not updated to reflect which dependencies remain blocking.

---

### LOW Severity

#### 16. Inconsistent Schema Strictness
**Files:** Various schema files

**Issue:** Some schemas use `.strict()` while others don't:
- `project.ts` - uses `.strict()`
- `employee.ts` - uses `.strict()`
- `use-cases.ts` - NOT strict

**Impact:** Inconsistent validation behavior.

---

#### 17. Missing `getTemplateUseCase` Export
**File:** `/home/ubuntu/projects/oct/packages/core/src/use-cases/template/index.ts`

**Issue:** Only exports `create` and `list`, missing `get`, `update`, `delete`.

---

#### 18. Test Files Use Outdated Schema
**File:** `/home/ubuntu/projects/oct/packages/core/src/schemas/task.test.ts`

**Issue:** Tests reference old v1 schema fields (`createdBy`, `status: 'pending'`) that don't exist in v2.

```typescript
const validTask = {
  taskId: 'task-123',
  status: 'pending' as const,  // ❌ Not in v2 taskStatusSchema
  title: 'Test Task',
  createdBy: 'user-123',  // ❌ Not in v2 schema
};
```

**Impact:** Tests will fail.

---

#### 19. CLI Context Builder Missing Project Permissions
**File:** `/home/ubuntu/projects/oct/packages/cli/src/context/builder.ts`

**Issue:** Default permissions only include task permissions:
```typescript
return ['task:create', 'task:read', 'task:run', 'task:update', 'task:delete'];
```

Missing: `project:*`, `employee:*`, `template:*` permissions.

**Impact:** CLI commands for projects/employees/templates fail with FORBIDDEN.

---

#### 20. Storage Adapter Missing `priority` Filter
**File:** `/home/ubuntu/projects/oct/packages/core/src/ports/storage-adapter.ts`

**Issue:** `listTasks` filter doesn't include `priority`:
```typescript
listTasks(filter?: { projectId?: string; ownerId?: string; status?: string }): Promise<Result<Task[], DomainError>>;
```

**Fix:** Add `priority?: string` to filter type.

---

## Recommendations Summary

### Immediate Actions (Before Production)

1. **Fix CRITICAL bugs:**
   - Fix async filter bug in `complete-task.ts`
   - Add missing `err` import in `list-tasks.ts`
   - Fix CLI task command imports

2. **Implement missing use cases:**
   - All task lifecycle use cases (update, delete, approve, reject, block)
   - Employee management (update, delete, refresh)
   - Template management (get, update, delete)
   - Summary/report use cases

3. **Add transaction support** to StorageAdapter for atomic operations

4. **Implement file locking** in storage-fs

### Short-term Improvements

5. Standardize input validation across all use cases
6. Add UUIDv7-compliant ID generation
7. Implement circular reference detection for project hierarchies
8. Remove or isolate all v1 legacy code
9. Fix test files to match v2 schemas
10. Update CLI context builder with all required permissions

### Architecture Compliance

11. Review all use case signatures against architecture doc
12. Ensure all PRD-required features are implemented
13. Add proper error handling for all edge cases
14. Implement missing filter options (priority, etc.)

---

## Conclusion

The OCT v2 implementation shows good foundational structure with proper separation of concerns, TypeScript strictness, and use of Zod for validation. However, it is **not production-ready** due to critical bugs, significant missing functionality, and deviations from the architecture specification.

**Estimated completion:** ~60% of v2 requirements implemented
**Estimated time to production-ready:** 2-3 weeks of focused development

Priority should be given to fixing the critical bugs (dependency unblocking, missing imports) before any deployment.

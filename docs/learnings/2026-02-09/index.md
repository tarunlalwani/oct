# Learnings: 2026-02-09 - OCT v2 Implementation

## Critical Bugs Found

| File | Issue | Learning |
|------|-------|----------|
| `complete-task.ts` | Async filter bug | [async-array-methods.md](async-array-methods.md) |
| `list-tasks.ts` | Missing import | [import-verification.md](import-verification.md) |
| `builder.ts` | Missing permissions | [permission-completeness.md](permission-completeness.md) |
| `storage-adapter.ts` | Filter mismatch | [storage-usecase-consistency.md](storage-usecase-consistency.md) |

## Quick Reference

**Before committing:**
```bash
tsc --noEmit          # Type check
# Test the actual CLI command you changed
```

**When adding new domain:**
1. Add schema
2. Add use cases
3. Update StorageAdapter interface
4. Update storage-fs implementation
5. Update CLI context permissions
6. Add CLI commands

## Patterns to Remember

1. **Async + Array**: Use `Promise.all(array.map(...))` never `array.filter(async)`
2. **Imports**: Copy code → Check imports → Run typecheck
3. **Permissions**: New domain = Update all context builders
4. **Filters**: Interface → Implementation → Use case

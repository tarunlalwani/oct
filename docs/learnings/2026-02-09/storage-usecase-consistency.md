# StorageAdapter vs Use Case Filter Consistency

## Mistake
Adding filter to use case but not StorageAdapter:
```typescript
// use-case.ts has priority filter
listTasksInputSchema = z.object({
  filter: z.object({
    priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(), // Added
  })
});

// storage-adapter.ts missing priority
listTasks(filter?: {
  projectId?: string;
  // priority missing!
}): Promise<Result<Task[], DomainError>>;
```

## Impact
TypeScript allows it but filter silently fails at runtime.

## Prevention Checklist
- [ ] Update StorageAdapter interface first
- [ ] Update storage-fs implementation
- [ ] Then update use case input schema
- [ ] Run typecheck: `tsc --noEmit`

## Pattern
Interface → Implementation → Use Case (in that order)

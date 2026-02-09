# Permission Completeness

## Mistake
Adding new domains but not updating default permissions:
```typescript
// OLD - Missing new domains
return ['task:create', 'task:read', ...];

// NEW - Must include all domains
return [
  'task:create', ...,
  'project:create', ...,  // Added domain
  'employee:create', ..., // Added domain
];
```

## When This Happens
- Adding new entity types (Project, Employee, Template)
- Adding new use cases with new permissions
- Creating CLI commands that fail with FORBIDDEN errors

## Prevention Checklist
- [ ] Search for `permissions` in codebase when adding new domain
- [ ] Update context builders (CLI, server, tests)
- [ ] Test new CLI command immediately after creating it

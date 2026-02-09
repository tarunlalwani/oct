# Async Array Methods Trap

## Mistake
Using async predicate in `Array.filter()`:
```typescript
// WRONG - Always returns truthy (Promise is truthy)
const remaining = deps.filter(async (id) => {
  const task = await getTask(id);
  return task.status !== 'done';
});
```

## Why It Fails
`Array.filter()` doesn't await async predicates. The returned Promise is always truthy, so all items pass the filter.

## Correct Pattern
```typescript
// CORRECT - Check all async conditions properly
const statuses = await Promise.all(
  deps.map(async (id) => {
    const task = await getTask(id);
    return task.status === 'done';
  })
);
const allDone = statuses.every(s => s);
```

## Checklist
- [ ] Never use `array.filter(async ...)`
- [ ] Never use `array.some(async ...)`
- [ ] Never use `array.every(async ...)`
- [ ] Use `Promise.all(array.map(async ...))` then process results

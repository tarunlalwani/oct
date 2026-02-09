# Import Verification

## Mistake
Using `err()` without importing it:
```typescript
import { ok, type Result } from 'neverthrow';  // Missing 'err'
// ...
return err(result.error);  // Runtime error: err is not defined
```

## Root Cause
Copy-pasted code from another file without checking imports.

## Prevention Checklist
- [ ] When copying code, always check imports match
- [ ] Run `tsc --noEmit` after changes
- [ ] Look for grayed-out/unresolved symbols in IDE

## Quick Fix
Use IDE "Add import" feature or check source file imports when copying code.

# REST Server Test Plan

## Overview
Comprehensive test plan for the REST Server package. Tests focus on integration, authentication, routing, serialization, and thin controller verification.

---

## 1. Integration Tests

### 1.1 Server Startup
```typescript
// Test: Server startup and lifecycle
describe('Server Startup', () => {
  it('should start on specified port', async () => {
    const server = await buildServer({ port: 3000 })
    await server.listen()
    expect(server.server.address().port).toBe(3000)
    await server.close()
  })

  it('should start with default configuration', async () => {
    const server = await buildServer()
    await server.listen()
    expect(server.server.listening).toBe(true)
    await server.close()
  })

  it('should gracefully shutdown', async () => {
    const server = await buildServer()
    await server.listen()
    await server.close()
    expect(server.server.listening).toBe(false)
  })

  it('should handle concurrent requests', async () => {
    const server = await buildServer()
    await server.listen()

    const requests = Array(10).fill(null).map(() =>
      fetch('http://localhost:3000/v1/tasks')
    )
    const responses = await Promise.all(requests)

    expect(responses.every(r => r.status === 200)).toBe(true)
    await server.close()
  })
})
```

### 1.2 Health Check
```typescript
// Test: Health check endpoint
describe('Health Check', () => {
  it('should return 200 on /health', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/health')
    expect(response.status).toBe(200)

    await server.close()
  })

  it('should return health status', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/health')
    const body = await response.json()
    expect(body).toHaveProperty('status', 'healthy')

    await server.close()
  })
})
```

---

## 2. Authentication Tests

### 2.1 Auth Middleware
```typescript
// Test: Authentication middleware
describe('Authentication', () => {
  it('should reject request without auth header', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' })
    })

    expect(response.status).toBe(401)
    await server.close()
  })

  it('should reject invalid auth token', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      },
      body: JSON.stringify({ title: 'Test' })
    })

    expect(response.status).toBe(401)
    await server.close()
  })

  it('should accept valid auth token', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token'
      },
      body: JSON.stringify({ title: 'Test' })
    })

    expect(response.status).not.toBe(401)
    await server.close()
  })
})
```

### 2.2 Permission Extraction
```typescript
// Test: Permission extraction from auth
describe('Permission Extraction', () => {
  it('should extract permissions from JWT token', async () => {
    const token = generateToken({
      actorId: 'user-123',
      permissions: ['task:create', 'task:read']
    })

    // Verify context.permissions is populated
  })

  it('should extract actorId from JWT token', async () => {
    const token = generateToken({
      actorId: 'user-123',
      permissions: ['task:create']
    })

    // Verify context.actorId is populated
  })

  it('should extract workspaceId from JWT token', async () => {
    const token = generateToken({
      actorId: 'user-123',
      workspaceId: 'ws-456',
      permissions: ['task:create']
    })

    // Verify context.workspaceId is populated
  })
})
```

---

## 3. Routing Tests

### 3.1 API Versioning
```typescript
// Test: API versioning (/v1)
describe('API Versioning', () => {
  it('should require /v1 prefix', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/tasks')
    expect(response.status).toBe(404)

    await server.close()
  })

  it('should route /v1/tasks correctly', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks', {
      headers: { 'Authorization': 'Bearer token' }
    })
    expect(response.status).not.toBe(404)

    await server.close()
  })
})
```

### 3.2 Route Handlers
```typescript
// Test: Route handlers
describe('Route Handlers', () => {
  describe('POST /v1/tasks', () => {
    it('should handle CreateTask', async () => {
      const server = await buildServer()
      await server.listen()

      const response = await fetch('http://localhost:3000/v1/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify({ title: 'Test Task' })
      })

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body).toHaveProperty('task')

      await server.close()
    })
  })

  describe('GET /v1/tasks/:id', () => {
    it('should handle GetTask', async () => {
      const server = await buildServer()
      await server.listen()

      const response = await fetch('http://localhost:3000/v1/tasks/task-123', {
        headers: { 'Authorization': 'Bearer token' }
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('task')

      await server.close()
    })

    it('should return 404 for non-existent task', async () => {
      const server = await buildServer()
      await server.listen()

      const response = await fetch('http://localhost:3000/v1/tasks/nonexistent', {
        headers: { 'Authorization': 'Bearer token' }
      })

      expect(response.status).toBe(404)
      await server.close()
    })
  })

  describe('GET /v1/tasks', () => {
    it('should handle ListTasks', async () => {
      const server = await buildServer()
      await server.listen()

      const response = await fetch('http://localhost:3000/v1/tasks', {
        headers: { 'Authorization': 'Bearer token' }
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('items')
      expect(body).toHaveProperty('nextCursor')

      await server.close()
    })
  })

  describe('POST /v1/tasks/:id/run', () => {
    it('should handle RunTask', async () => {
      const server = await buildServer()
      await server.listen()

      const response = await fetch('http://localhost:3000/v1/tasks/task-123/run', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer token' }
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('status')

      await server.close()
    })
  })
})
```

---

## 4. Error to HTTP Status Mapping

### 4.1 Domain Error Mapping
```typescript
// Test: Error code to HTTP status mapping
describe('Error to HTTP Status Mapping', () => {
  it('should map UNAUTHORIZED to 401', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' })
    })

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error.code).toBe('UNAUTHORIZED')

    await server.close()
  })

  it('should map FORBIDDEN to 403', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer no-permissions-token'
      },
      body: JSON.stringify({ title: 'Test' })
    })

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error.code).toBe('FORBIDDEN')

    await server.close()
  })

  it('should map NOT_FOUND to 404', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks/nonexistent', {
      headers: { 'Authorization': 'Bearer token' }
    })

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error.code).toBe('NOT_FOUND')

    await server.close()
  })

  it('should map INVALID_INPUT to 400', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token'
      },
      body: JSON.stringify({}) // Missing required title
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('INVALID_INPUT')

    await server.close()
  })

  it('should map CONFLICT to 409', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks/already-running/run', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer token' }
    })

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error.code).toBe('CONFLICT')

    await server.close()
  })

  it('should map INTERNAL_ERROR to 500', async () => {
    const server = await buildServer()
    await server.listen()

    // Simulate internal error
    const response = await fetch('http://localhost:3000/v1/error-simulation', {
      headers: { 'Authorization': 'Bearer token' }
    })

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error.code).toBe('INTERNAL_ERROR')

    await server.close()
  })
})
```

### 4.2 Error Response Schema
```typescript
// Test: Error response schema
describe('Error Response Schema', () => {
  it('should return error with code, message, retryable', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks/nonexistent', {
      headers: { 'Authorization': 'Bearer token' }
    })

    const body = await response.json()
    expect(body).toHaveProperty('ok', false)
    expect(body).toHaveProperty('error')
    expect(body.error).toHaveProperty('code')
    expect(body.error).toHaveProperty('message')
    expect(body.error).toHaveProperty('retryable')

    await server.close()
  })

  it('should not include stack traces in production', async () => {
    // Verify no internal details leaked
  })
})
```

---

## 5. Context Construction Tests

### 5.1 Request to Context Mapping
```typescript
// Test: Context construction from HTTP request
describe('Context Construction', () => {
  it('should construct context from auth header', async () => {
    // Verify context.actorId from JWT
  })

  it('should construct context from request metadata', async () => {
    // Verify traceId from request headers
  })

  it('should set environment to "server"', async () => {
    // Verify context.environment = 'server'
  })

  it('should extract workspace from JWT', async () => {
    // Verify context.workspaceId
  })

  it('should extract permissions from JWT', async () => {
    // Verify context.permissions
  })
})
```

---

## 6. Serialization Tests

### 6.1 Request Serialization
```typescript
// Test: Request body serialization
describe('Request Serialization', () => {
  it('should parse JSON body', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token'
      },
      body: JSON.stringify({ title: 'Test' })
    })

    expect(response.status).toBe(201)
    await server.close()
  })

  it('should reject non-JSON content', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Authorization': 'Bearer token'
      },
      body: 'title=Test'
    })

    expect(response.status).toBe(400)
    await server.close()
  })
})
```

### 6.2 Response Serialization
```typescript
// Test: Response serialization
describe('Response Serialization', () => {
  it('should return JSON content type', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks', {
      headers: { 'Authorization': 'Bearer token' }
    })

    expect(response.headers.get('content-type')).toContain('application/json')
    await server.close()
  })

  it('should serialize dates as ISO-8601', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks/task-123', {
      headers: { 'Authorization': 'Bearer token' }
    })

    const body = await response.json()
    expect(body.task.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    await server.close()
  })

  it('should match CLI JSON output structure', async () => {
    // Compare server response with CLI --json output
    // They should have identical structure
  })
})
```

---

## 7. Thin Controller Verification

### 7.1 Controller Line Count
```typescript
// Test: Controllers are thin (≤ 30 LOC)
describe('Thin Controllers', () => {
  it('should have controllers with ≤ 30 lines', () => {
    const controllers = [
      'src/routes/tasks/create.ts',
      'src/routes/tasks/get.ts',
      'src/routes/tasks/list.ts',
      'src/routes/tasks/run.ts'
    ]

    for (const controller of controllers) {
      const content = fs.readFileSync(controller, 'utf-8')
      const lines = content.split('\n').filter(l => l.trim())
      expect(lines.length).toBeLessThanOrEqual(30)
    }
  })
})
```

### 7.2 Controller Responsibilities
```typescript
// Test: Controllers only handle HTTP concerns
describe('Controller Responsibilities', () => {
  it('should not contain business logic', () => {
    // Verify controllers delegate to Core
  })

  it('should not contain validation logic', () => {
    // Verify validation is in Core
  })

  it('should only: route, auth, context, delegate, serialize', () => {
    // Verify limited responsibilities
  })
})
```

---

## 8. Rate Limiting Tests

### 8.1 Rate Limit Enforcement
```typescript
// Test: Rate limiting
describe('Rate Limiting', () => {
  it('should limit requests per IP', async () => {
    const server = await buildServer()
    await server.listen()

    // Make many requests
    const requests = Array(100).fill(null).map(() =>
      fetch('http://localhost:3000/v1/tasks', {
        headers: { 'Authorization': 'Bearer token' }
      })
    )

    const responses = await Promise.all(requests)
    const limited = responses.filter(r => r.status === 429)

    expect(limited.length).toBeGreaterThan(0)
    await server.close()
  })

  it('should return 429 when rate limited', async () => {
    const server = await buildServer()
    await server.listen()

    // Exceed rate limit
    const response = await fetch('http://localhost:3000/v1/tasks', {
      headers: { 'Authorization': 'Bearer token' }
    })

    if (response.status === 429) {
      expect(response.headers.get('Retry-After')).toBeDefined()
    }

    await server.close()
  })
})
```

---

## 9. Middleware Tests

### 9.1 CORS
```typescript
// Test: CORS handling
describe('CORS', () => {
  it('should handle CORS preflight', async () => {
    const server = await buildServer()
    await server.listen()

    const response = await fetch('http://localhost:3000/v1/tasks', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3001',
        'Access-Control-Request-Method': 'POST'
      }
    })

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined()

    await server.close()
  })
})
```

### 9.2 Request Logging
```typescript
// Test: Request logging
describe('Request Logging', () => {
  it('should log requests', async () => {
    // Verify request logging middleware
  })

  it('should not log sensitive headers', async () => {
    // Verify Authorization header is redacted
  })
})
```

---

## 10. End-to-End Tests

### 10.1 Complete Workflows
```typescript
// Test: Complete API workflows
describe('End-to-End Workflows', () => {
  it('should complete create → get → run → list workflow', async () => {
    const server = await buildServer()
    await server.listen()

    // Create
    const createRes = await fetch('http://localhost:3000/v1/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token'
      },
      body: JSON.stringify({ title: 'Workflow Test' })
    })
    expect(createRes.status).toBe(201)
    const { task: { taskId } } = await createRes.json()

    // Get
    const getRes = await fetch(`http://localhost:3000/v1/tasks/${taskId}`, {
      headers: { 'Authorization': 'Bearer token' }
    })
    expect(getRes.status).toBe(200)

    // Run
    const runRes = await fetch(`http://localhost:3000/v1/tasks/${taskId}/run`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer token' }
    })
    expect(runRes.status).toBe(200)

    // List
    const listRes = await fetch('http://localhost:3000/v1/tasks', {
      headers: { 'Authorization': 'Bearer token' }
    })
    expect(listRes.status).toBe(200)
    const { items } = await listRes.json()
    expect(items.some((t: any) => t.taskId === taskId)).toBe(true)

    await server.close()
  })
})
```

---

## 11. Test Execution

### 11.1 Run Commands
```bash
# Run all server tests
pnpm test:server

# Run with coverage
pnpm test:server --coverage

# Run specific test file
pnpm test:server src/routes/tasks.test.ts

# Run in watch mode
pnpm test:server --watch

# Run integration tests only
pnpm test:server --testNamePattern="Integration"
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

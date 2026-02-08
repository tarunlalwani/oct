Below is a **full, updated PRD** for a **Core + CLI + REST** architecture, written as something you could hand to engineers, agents, or stakeholders and actually build from.
I’m being explicit and opinionated to remove ambiguity.

---

# Product Requirements Document (PRD)

## Project Name

**OCT = OpenClaw Task Manager** — Core-First Platform with CLI and REST Interfaces

---

## 1. Purpose & Vision

Build a **core-first system** where all business logic lives in a shared **Core** layer, and is consumed by:

* a **CLI** (default, local-first, agent-friendly)
* a **REST API server** (optional, long-running, multi-user)

The system must work **without a server running**, while still supporting a robust API surface for UI, remote access, and integrations.

This architecture is explicitly designed to support:

* human developers
* automation
* AI agents
* CI/CD environments

---

## 2. Non-Goals

* No server-required workflows for core functionality
* No duplicated business logic between CLI and server
* No implicit global state (process, HTTP, env-only context)
* No tight coupling between CLI lifecycle and server lifecycle

---

## 3. High-Level Architecture

```
┌────────────┐
│    CLI     │
│ (default)  │
└─────┬──────┘
      │
┌─────▼──────┐
│   CORE     │  ← single source of truth
│ (domain +  │
│  services) │
└─────┬──────┘
      │
┌─────▼──────┐
│     DB     │
└────────────┘

┌────────────┐
│   REST     │
│  Server    │ (optional)
└─────┬──────┘
      │
      ▼
    CORE
```

---

## 4. System Components

---

## 4.1 Core Layer (Authoritative)

### Responsibilities

The Core layer is the **only place** where business rules exist.

It is responsible for:

* Domain models
* Use cases / services
* Validation and invariants
* Authorization decisions (via context)
* Persistence (via adapters)
* Deterministic execution

### Design Principles

* No HTTP concepts
* No CLI concepts
* No global state
* Explicit inputs and outputs
* Context passed explicitly

### Example Core API

```ts
runTask(context: ExecutionContext, input: RunTaskInput): RunTaskResult
```

### Execution Context (Required Everywhere)

```ts
type ExecutionContext = {
  actorId: string | null
  workspaceId: string
  permissions: string[]
  environment: "local" | "ci" | "server"
  traceId?: string
  metadata?: Record<string, any>
}
```

**Rules**

* Context is always explicit
* Core never “reads” context from globals
* CLI and REST both construct context independently

---

## 4.2 CLI (Primary Interface)

### Role

The CLI is the **default interface** for:

* developers
* power users
* AI agents
* automation

### Key Properties

* No server required
* Single-process execution
* Fast startup
* Deterministic output
* Scriptable and composable

### CLI Responsibilities

* Parse arguments
* Construct ExecutionContext
* Call Core directly
* Render output (human or machine)

### Output Modes

* Human-readable (default)
* `--json` (required for agents)
* Exit codes are meaningful and stable

### Example Usage

```bash
tool run task --id 123
tool run task --id 123 --json
tool run task --id 123 --remote
```

### Remote Mode (Optional)

* `--remote` flag causes CLI to call REST API instead of Core directly
* Same inputs, same outputs
* Used only when:

  * multi-user coordination is required
  * remote state must be authoritative

---

## 4.3 REST API Server (Optional)

### Role

The REST server exists to:

* expose Core to external clients
* support UIs
* enable multi-user / remote workflows

### Responsibilities

* HTTP routing
* AuthN / AuthZ
* Rate limiting
* Observability
* Context construction from requests
* Delegation to Core

### Explicit Non-Responsibilities

* No business logic
* No validation beyond transport concerns
* No divergence from Core behavior

### API Design

* REST (JSON)
* Versioned (`/v1`)
* Thin controllers

### Example Flow

```
HTTP Request
 → Auth middleware
 → Build ExecutionContext
 → Call Core
 → Serialize result
```

---

## 5. Data & Persistence

### Persistence Rules

* Core owns persistence interfaces
* Infrastructure provides adapters (DB, filesystem, etc.)
* CLI and REST do not access DB directly

### Adapter Pattern

```ts
interface TaskRepository {
  get(id: string): Task
  save(task: Task): void
}
```

Adapters can differ by environment:

* local DB
* cloud DB
* in-memory (tests)

---

## 6. AI Agent Compatibility (Explicit Requirement)

The system **must be usable by AI agents without special casing**.

### Hard Requirements

* No background services required
* No interactive prompts by default
* JSON output mode
* Stable schemas
* Idempotent operations where possible

### Anti-Patterns (Disallowed)

* “Start the server first”
* “Check if port is open”
* Hidden state between runs

---

## 7. Error Handling

### Core

* Domain errors (typed, structured)
* No HTTP codes
* No console output

### CLI

* Maps domain errors to:

  * exit codes
  * human messages
  * structured JSON errors

### REST

* Maps domain errors to HTTP status codes
* Never invents new error semantics

---

## 8. Security & Permissions

### Core

* Authorization decisions happen in Core
* Context includes permissions
* Core enforces access

### REST

* Authenticates requests
* Builds permissions into context

### CLI

* Uses local identity (config, env, tokens)
* Still passes permissions explicitly

---

## 9. Testing Strategy

### Core

* Pure unit tests
* No I/O
* Deterministic

### CLI

* Golden output tests
* JSON schema validation
* Exit code assertions

### REST

* Thin integration tests
* Focused on auth + serialization

---

## 10. Deployment & Operations

### CLI

* Distributed as single binary or npm package
* Zero runtime dependencies beyond config

### REST Server

* Container-friendly
* Horizontally scalable
* Stateless (except DB)

---

## 11. Success Metrics

* CLI cold start < 200ms
* 100% business logic coverage in Core
* No feature implemented outside Core
* CLI usable without server for all local workflows
* AI agents can complete workflows in a single process

---

## 12. Explicit Architectural Decision (ADR Summary)

**Decision:**
Adopt **Core-first architecture with optional REST server and primary CLI**.

**Rationale:**

* Maximizes reuse
* Enables AI agents
* Avoids server coupling
* Improves local developer experience
* Scales to multi-user environments

**Status:**
Accepted

---

Below is a **no-ambiguity Technical Implementation Guide** you can hand directly to an engineering team.
It is **prescriptive**, **normative**, and intentionally leaves **no architectural discretion** unless explicitly stated.

This is **not a tutorial** and **contains no code**, only structure, contracts, and constraints.

---

# Technical Implementation Guide

**Core + CLI + REST Architecture**

---

## 1. Technology Choices (MANDATORY)

### Runtime & Language

* **Node.js ≥ 20**
* **TypeScript (strict mode ON)**
* **ESM only** (no CommonJS)

### Package Manager

* **pnpm** (required)
* Workspace / monorepo mode

### Build Tooling

* **tsup** for builds
* **tsx** for local execution
* **zod** for schema validation (input/output)
* **neverthrow** or equivalent Result type library

---

## 2. Repository Structure (MANDATORY)

```
/repo-root
│
├─ packages/
│   │
│   ├─ core/
│   │   ├─ src/
│   │   │   ├─ domain/
│   │   │   ├─ use-cases/
│   │   │   ├─ services/
│   │   │   ├─ ports/
│   │   │   ├─ errors/
│   │   │   ├─ context/
│   │   │   ├─ schemas/
│   │   │   └─ index.ts
│   │   └─ package.json
│   │
│   ├─ cli/
│   │   ├─ src/
│   │   │   ├─ commands/
│   │   │   ├─ output/
│   │   │   ├─ context/
│   │   │   ├─ config/
│   │   │   └─ index.ts
│   │   └─ package.json
│   │
│   ├─ server/
│   │   ├─ src/
│   │   │   ├─ routes/
│   │   │   ├─ middleware/
│   │   │   ├─ context/
│   │   │   ├─ serializers/
│   │   │   └─ index.ts
│   │   └─ package.json
│   │
│   └─ infra/
│       ├─ db/
│       ├─ repositories/
│       └─ config/
│
├─ tooling/
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

**Rules**

* No cross-imports except:

  * `cli → core`
  * `server → core`
  * `infra → core`
* Core **never imports** from CLI, Server, or Infra

---

## 3. Core Package (Authoritative Layer)

### Purpose

Core is the **single source of truth** for:

* business rules
* validation
* authorization
* domain invariants

### Forbidden in Core

❌ HTTP
❌ CLI arguments
❌ Environment variables
❌ Console logging
❌ Process state

---

### 3.1 Core Layer Breakdown

#### `/domain`

* Pure domain entities
* No I/O
* No side effects

#### `/use-cases`

* Orchestrates domain logic
* Entry point for all actions
* Every CLI command and REST endpoint maps **1:1** to a use case

#### `/services`

* Domain services (non-entity logic)
* Stateless

#### `/ports`

* Interfaces only
* DB, cache, queue, filesystem
* No implementations

#### `/schemas`

* zod schemas for:

  * inputs
  * outputs
  * errors

Schemas are **canonical** and reused by CLI and REST.

#### `/context`

Defines **ExecutionContext** shape.
Core functions must **require** it.

#### `/errors`

Typed domain errors only.
No strings. No HTTP codes.

---

### 3.2 Core Rules (Non-Negotiable)

* Every public Core function:

  * takes `ExecutionContext` as first argument
  * returns a Result type (success | error)
* No function reads globals
* No function throws uncaught errors

---

## 4. CLI Package (Primary Interface)

### Purpose

The CLI is:

* default entrypoint
* agent-compatible
* local-first

### Required Packages

* `commander` or equivalent (argument parsing)
* `zx` is **not allowed**
* `zod` (reused schemas)
* `chalk` (human output only)

---

### 4.1 CLI Responsibilities

* Parse arguments
* Validate input using Core schemas
* Build ExecutionContext
* Call Core directly
* Format output
* Set exit codes

---

### 4.2 Output Modes

#### Human Mode (default)

* Colored
* Concise
* No stack traces

#### JSON Mode (`--json`)

* Machine-readable
* Stable schema
* No extra text
* Required for AI agents

---

### 4.3 Remote Mode (`--remote`)

* Optional flag
* Causes CLI to call REST instead of Core
* Same input/output schemas
* Same error semantics

**No auto-detection.
No implicit server startup.**

---

### 4.4 CLI Rules

* CLI must work with **no server running**
* No background processes
* No interactive prompts unless explicitly requested
* Exit codes must be documented and stable

---

## 5. REST Server Package

### Purpose

Expose Core to:

* UIs
* external clients
* multi-user environments

---

### Required Packages

* **Fastify** (mandatory)
* `zod` for request/response validation
* OpenTelemetry-compatible logging
* No ORM inside server (delegated to infra)

---

### Server Responsibilities

* HTTP routing
* Authentication
* Rate limiting
* Context construction
* Delegation to Core
* Serialization

---

### Forbidden in Server

❌ Business logic
❌ Validation not defined in Core
❌ DB queries
❌ State storage

---

### API Rules

* `/v1` versioning mandatory
* REST only (no GraphQL unless approved separately)
* Controllers must be thin (≤ ~30 LOC)

---

## 6. Infra Package (Implementations)

### Purpose

Concrete implementations of Core ports.

### Examples

* Database adapters
* File system adapters
* Cache adapters

### Rules

* Infra depends on Core
* Core defines interfaces
* Infra supplies implementations at runtime

---

## 7. Context Construction (Critical)

### Context Sources

| Layer | Source                         |
| ----- | ------------------------------ |
| CLI   | local config, env, flags       |
| REST  | auth headers, request metadata |
| Tests | fixtures                       |

### Context is:

* explicit
* immutable
* passed everywhere

No globals. Ever.

---

## 8. Error Handling Model

### Core

* Typed domain errors
* No logging
* No HTTP knowledge

### CLI

* Maps errors → exit codes
* Renders human or JSON output

### REST

* Maps errors → HTTP status
* Serializes error schema

---

## 9. Testing Requirements

### Core

* Pure unit tests
* No mocks of business logic
* Deterministic

### CLI

* Snapshot tests for output
* JSON schema validation
* Exit code assertions

### Server

* Minimal integration tests
* Focus on auth, routing, serialization

---

## 10. Build & Distribution

### CLI

* Single binary or npm package
* Zero runtime config required for local mode

### Server

* Containerized
* Stateless
* Horizontally scalable

---

## 11. Enforcement & Governance

### Required

* ESLint with architectural boundaries
* Dependency graph checks
* CI rule: Core coverage ≥ 90%
* CI rule: No new logic outside Core

---

## 12. Final Architectural Law (Read This Twice)

> **If behavior differs between CLI and REST, it is a bug.**
> **If logic exists outside Core, it is a violation.**
> **If Core requires a server, the design has failed.**

---

## 13. Sign-off Criteria

Engineering implementation is considered correct only if:

* CLI works without server
* Server can be removed and CLI still works
* AI agent can execute full workflows via CLI
* Core has zero imports from outside itself
* All validation and permissions live in Core

Below is a **complete, implementation-ready Fields & Schema Specification**.
This is the document your team was missing.
It is **normative**, **exhaustive**, and **non-ambiguous**.

No code. No examples disguised as guidance.
This is the **contract of record**.

---

# Fields & Schema Specification

**(Canonical – Applies to Core, CLI, REST, Agents)**

---

## 0. Status & Authority

* **Status:** FINAL
* **Owner:** Core
* **Scope:** All layers (Core, CLI, REST, Infra)
* **Change Policy:** Backward-compatible only (additive).
  Breaking changes require version bump (`v2`).

---

## 1. Global Conventions (MANDATORY)

### 1.1 JSON Rules

* Encoding: UTF-8
* Object keys: `camelCase`
* Ordering: **not guaranteed**
* Unknown fields: **rejected**
* Dates: **RFC 3339 / ISO-8601 UTC**
* IDs: **string**, opaque (UUIDv7 recommended)

---

### 1.2 Nullability Rules

* Fields are **non-nullable by default**
* Nullable fields explicitly marked
* Missing ≠ null

---

### 1.3 Stability Rules

* Field names are **stable forever**
* Semantics may not change
* Fields may only be added, never removed

---

## 2. ExecutionContext Schema (GLOBAL)

This schema is **required for every Core invocation**.

### 2.1 ExecutionContext Object

| Field         | Type     | Required | Nullable | Source     | Notes                      |    |         |
| ------------- | -------- | -------- | -------- | ---------- | -------------------------- | -- | ------- |
| `actorId`     | string   | yes      | no       | CLI / REST | Logical caller identity    |    |         |
| `workspaceId` | string   | yes      | no       | CLI / REST | Isolation boundary         |    |         |
| `permissions` | string[] | yes      | no       | CLI / REST | Fully resolved permissions |    |         |
| `environment` | enum     | yes      | no       | CLI / REST | `local                     | ci | server` |
| `traceId`     | string   | no       | no       | system     | Correlation only           |    |         |
| `metadata`    | object   | no       | yes      | caller     | Opaque passthrough         |    |         |

### 2.2 Context Rules

* Context is **immutable**
* Core may **read but not modify**
* Absence of required fields is a hard error
* Authorization decisions depend **only** on context + input

---

## 3. Domain: Task (Authoritative Example Domain)

This domain is assumed unless explicitly overridden.

---

### 3.1 Task Object (Canonical)

| Field         | Type              | Required | Nullable | Notes               |
| ------------- | ----------------- | -------- | -------- | ------------------- |
| `taskId`      | string            | yes      | no       | System-generated    |
| `status`      | enum              | yes      | no       | See §3.2            |
| `title`       | string            | yes      | no       | 1–256 chars         |
| `description` | string            | no       | yes      | Markdown allowed    |
| `createdAt`   | string (datetime) | yes      | no       | Immutable           |
| `updatedAt`   | string (datetime) | yes      | no       | Updated on mutation |
| `createdBy`   | string            | yes      | no       | actorId             |
| `metadata`    | object            | no       | yes      | Arbitrary, opaque   |

---

### 3.2 TaskStatus Enum

| Value       | Meaning               |
| ----------- | --------------------- |
| `pending`   | Created, not started  |
| `running`   | In progress           |
| `completed` | Successfully finished |
| `failed`    | Terminal failure      |
| `cancelled` | Explicitly cancelled  |

Enum values are **closed**.
No new values without version bump.

---

## 4. Use Case Schemas (INPUT / OUTPUT)

Each use case has **exactly one input schema and one output schema**.

---

## 4.1 CreateTask

### Input Schema

| Field         | Type   | Required | Nullable |
| ------------- | ------ | -------- | -------- |
| `title`       | string | yes      | no       |
| `description` | string | no       | yes      |
| `metadata`    | object | no       | yes      |

### Output Schema

| Field  | Type | Required |
| ------ | ---- | -------- |
| `task` | Task | yes      |

---

## 4.2 GetTask

### Input Schema

| Field    | Type   | Required |
| -------- | ------ | -------- |
| `taskId` | string | yes      |

### Output Schema

| Field  | Type | Required |
| ------ | ---- | -------- |
| `task` | Task | yes      |

---

## 4.3 RunTask

### Input Schema

| Field     | Type   | Required | Nullable |
| --------- | ------ | -------- | -------- |
| `taskId`  | string | yes      | no       |
| `options` | object | no       | yes      |

### Output Schema

| Field        | Type              | Required |
| ------------ | ----------------- | -------- |
| `taskId`     | string            | yes      |
| `status`     | TaskStatus        | yes      |
| `startedAt`  | string (datetime) | yes      |
| `finishedAt` | string (datetime) | no       |

---

## 4.4 ListTasks

### Input Schema

| Field    | Type   | Required |
| -------- | ------ | -------- |
| `limit`  | number | no       |
| `cursor` | string | no       |

### Output Schema

| Field        | Type   | Required |
| ------------ | ------ | -------- |
| `items`      | Task[] | yes      |
| `nextCursor` | string | no       |

---

## 5. Error Schema (GLOBAL)

### 5.1 Error Object (Canonical)

| Field       | Type    | Required |
| ----------- | ------- | -------- |
| `code`      | string  | yes      |
| `message`   | string  | yes      |
| `details`   | object  | no       |
| `retryable` | boolean | yes      |

---

### 5.2 Error Codes (CLOSED SET)

| Code             | Meaning          | Retryable |
| ---------------- | ---------------- | --------- |
| `UNAUTHORIZED`   | No identity      | no        |
| `FORBIDDEN`      | Lacks permission | no        |
| `NOT_FOUND`      | Entity missing   | no        |
| `INVALID_INPUT`  | Schema violation | no        |
| `CONFLICT`       | State violation  | no        |
| `INTERNAL_ERROR` | Unexpected       | yes       |

Codes are **stable and global**.

---

## 6. CLI JSON Output Envelope

When `--json` is used, **all CLI commands MUST return this shape**.

### Success Envelope

```json
{
  "ok": true,
  "data": { ...use-case output... }
}
```

### Error Envelope

```json
{
  "ok": false,
  "error": Error
}
```

No additional fields.
No console noise.

---

## 7. REST Response Envelope

REST responses MUST mirror CLI JSON.

### HTTP Mapping Rules

| Error Code     | HTTP Status |
| -------------- | ----------- |
| UNAUTHORIZED   | 401         |
| FORBIDDEN      | 403         |
| NOT_FOUND      | 404         |
| INVALID_INPUT  | 400         |
| CONFLICT       | 409         |
| INTERNAL_ERROR | 500         |

---

## 8. Schema Ownership Rules

* Core owns **all schemas**
* CLI and REST **import, never redefine**
* Infra may not invent fields
* Tests must validate schemas exactly

---

## 9. Final Non-Negotiable Rules

1. If a field is not in this document → **it does not exist**
2. If CLI JSON ≠ REST JSON → **bug**
3. If Core accepts undocumented input → **bug**
4. If error codes differ → **violation**
5. If schema changes without versioning → **release blocked**

---

## 10. What This Unlocks

With this document, your team now has:

* zero discretion on fields
* zero ambiguity on JSON
* agent-safe contracts
* enforceable reviews
* stable future evolution

---


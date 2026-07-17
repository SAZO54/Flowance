# AGENTS.md

## 0. Mandatory Workflow for Agents

Before executing any request from the chat, agents must first inspect this AGENTS.md and the relevant files under /docs/.

Required workflow:

1. Read this AGENTS.md.
2. Inspect the relevant files under /docs/.
3. Treat /docs/ as the current source of truth for Flowance specifications.
4. Execute the user request in a way that is consistent with /docs/.
5. If the chat request conflicts with /docs/, clearly explain the conflict and ask for direction before making a conflicting change.

Do not rely only on prior assumptions. Do not rely on outdated technology choices from old conversations. Current project decisions are documented under /docs/.

---

## 1. Project Overview

Flowance is a full-stack platform for freelancers to manage clients, projects, contracts, schedules, actual work records, and monthly settlements.

Phase1 focuses on helping a freelancer understand planned work, actual work, and expected monthly revenue without implementing the full invoice and payment workflow yet.

Phase1 target capabilities:

- Authentication and authorization
- Organization and basic role management
- Client management
- Project management
- Client and project icons
- Contract management
- Weekly schedules and individual work schedules
- Calendar display
- Work records
- Monthly settlement calculation
- Audit logs
- Optimistic locking
- Idempotency for important commands
- OpenAPI documentation
- Redis and Celery based asynchronous processing

Phase2 or later capabilities:

- Invoice management
- Payment management
- Income and expense view
- Analysis dashboard
- PDF invoice generation
- ACCOUNTANT role
- Advanced accounting integrations

---

## 2. Repository Structure

Flowance is maintained as a single product-oriented repository.

Current main directories:

    flowance/
      AGENTS.md
      docs/
      flowance-api/
      flowance-web/

Directory roles:

- docs: Requirements, design documents, API design, database design, architecture, security, operations, testing, and ADRs.
- flowance-api: Django / DRF backend API and Celery worker.
- flowance-web: Next.js frontend.

When a directory name in older documents differs from the current repository, prefer the actual current directory names while preserving the architecture described in /docs/.

Do not split Flowance into separate repositories unless the user explicitly decides to change the repository strategy.

---

## 3. Phase1 Technology Stack

### 3.1 Frontend

Use the following frontend stack:

- Next.js
- React
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui when useful
- TanStack Query when useful
- React Hook Form
- Zod
- FullCalendar or equivalent calendar UI
- Vitest
- React Testing Library
- Playwright

Frontend responsibilities:

- Page rendering
- UI state
- Form handling
- Client-side validation as assistance only
- Calendar interaction
- API communication through infrastructure adapters
- Loading and error presentation
- Responsive UI

Frontend must not be the only place where business rules are enforced.

### 3.2 Backend

Use the following backend stack:

- Python
- Django
- Django REST Framework
- Django ORM
- Django Authentication
- Django Migration
- PostgreSQL
- Redis
- Celery
- Pillow
- Django Storage API
- Cloudflare R2 for production file storage
- Gunicorn for production application serving
- pytest
- Ruff
- mypy

Do not use the old Java / Spring Boot / JPA / Flyway stack for this project.

Backend responsibilities:

- Authentication
- Authorization
- Business rules
- Tenant isolation
- Persistence
- Transaction management
- Contract validation
- Schedule generation
- Work time calculation
- Settlement calculation
- File and icon processing coordination
- Audit logging
- Optimistic locking
- Idempotency
- API error handling
- Background task coordination

### 3.3 Data and Infrastructure

Use the following data and infrastructure components:

- PostgreSQL as the source of truth
- Redis as Celery broker, short-lived cache, rate-limit storage, or temporary state
- Celery Worker for asynchronous tasks
- Docker Compose for local backend-related services
- Cloudflare R2 for production object storage
- Cloudflare CDN with custom domain for production image delivery
- GitHub Actions for CI/CD

Redis, Celery result backend, browser state, and object keys must not be treated as source-of-truth business data.

---

## 4. Phase1 Scope Rules

### 4.1 Implement in Phase1

Agents may implement or modify features related to:

- Authentication APIs
- Cookie based JWT authentication
- CSRF handling
- OWNER / ADMIN / MEMBER role checks
- Organization scoped tenant isolation
- Clients
- Projects
- Icons and file uploads
- Contracts
- Weekly schedules
- Work schedules
- Schedule generation
- Calendar event display
- Work records
- Monthly settlements
- Audit logs
- Error responses
- OpenAPI YAML
- Redis / Celery tasks
- Docker Compose backend environment
- Testing and CI for Phase1 scope

### 4.2 Keep out of Phase1 unless explicitly requested

Do not implement the following as Phase1 production features unless the user explicitly changes the scope:

- Invoice API
- Invoice screens
- Invoice PDF generation
- Invoice numbering
- Payment API
- Payment screens
- Income and expense screen
- Analysis dashboard
- ACCOUNTANT role
- External accounting integrations
- External calendar integrations
- SSO / OAuth / MFA
- Complex approval workflows
- Multi-currency settlement

When these appear in existing UI, keep them hidden, commented out, or clearly marked as Phase2 according to /docs/.

---

## 5. Backend Architecture Rules

Flowance backend uses Django pragmatically while following Clean Architecture and DDD-inspired responsibility separation.

All backend design and implementation must follow Clean Architecture and Domain-Driven Design principles as defined in /docs/. Agents must model business concepts in the Domain layer first, orchestrate use cases in the Application layer, and keep framework, database, storage, HTTP, and Celery details in outer layers.

Recommended backend app layout:

    flowance-api/
      config/
        settings/
        urls.py
        celery.py
        asgi.py
        wsgi.py
      apps/
        accounts/
        organizations/
        clients/
        projects/
        contracts/
        schedules/
        work_records/
        settlements/
        files/
        audit_logs/
        common/

Within each domain app, prefer this conceptual separation:

- domain: Entities, value objects, domain services, domain exceptions, framework-independent rules.
- application: Use cases, commands, queries, transaction orchestration, permission orchestration.
- infrastructure: Django ORM repositories, storage adapters, Celery integration, external adapters.
- presentation: DRF views, viewsets, serializers, request and response mapping.

Rules:

- Domain code must not depend on Django, DRF, ORM, Redis, Celery, Pillow, Storage, or HTTP.
- DRF View, ViewSet, and Serializer must not contain complex business decisions.
- Business rules belong primarily in Domain or Application layers.
- Database access belongs behind repository or infrastructure boundaries where practical.
- Use Django ORM and Django Migration as the database implementation mechanism.
- Use transactions for multi-table business operations.
- Use optimistic locking with version fields for update APIs that require concurrency control.
- Use PostgreSQL constraints for data integrity that must not be bypassed.

---

## 6. Domain and Business Rules

Agents must preserve the following Phase1 business decisions.

### 6.1 Authentication and email

- Store original email for display and communication.
- Use normalized_email for login and uniqueness checks.
- Normalize email for comparison without losing the original input.
- JWT must be handled via HttpOnly Cookie.
- Do not include JWT values in API response bodies.
- Use CSRF protection for cookie-authenticated unsafe methods.

### 6.2 Roles and permissions

Phase1 roles:

- OWNER
- ADMIN
- MEMBER

ACCOUNTANT is Phase2 or later.

Phase1 should keep permission design simple. Fine-grained project-level edit permissions can be expanded later.

### 6.3 Contracts

Phase1 contract types:

- HOURLY
- MONTHLY_RANGE
- MONTHLY_FIXED
- PERFORMANCE

Contract period overlap rule:

- Overlap is forbidden within the same project.
- Overlap is allowed across different projects.
- Enforce overlap with both Application validation and PostgreSQL exclusion constraint.
- Store valid_from and valid_until as ordinary columns.
- Use daterange expression in the database constraint rather than storing a dedicated DateRangeField unless /docs/ is changed.

### 6.4 Money and settlement

- Use decimal.Decimal in Python.
- Use DecimalField in Django.
- Use numeric in PostgreSQL.
- Do not use float for money.
- Tax, withholding tax, and total amount rounding must follow the rules in /docs/.
- Monthly range settlement uses base_minutes difference as the basis for deduction and overtime calculation.

### 6.5 Schedule generation

- day_of_week uses 0=Sunday, 1=Monday, ..., 6=Saturday.
- Initial generation range limit is 100 days.
- dryRun must not persist generated schedules.
- Phase1 schedule title uses the project name.
- Schedule overlap is allowed with warning in Phase1.
- Do not overwrite manually overridden schedules during generation.

### 6.6 Work records

- Request receives actualStartAt, actualEndAt, and breaks.
- Backend calculates actualMinutes and billableMinutes.
- Frontend must not send calculated actualMinutes or billableMinutes as source-of-truth values.
- Phase1 is DRAFT-centered.
- Strict DRAFT / CONFIRMED operation is Phase2 or later unless /docs/ changes.

### 6.7 Files and icons

- Local development uses Django MEDIA_ROOT.
- Production uses Cloudflare R2 through Django Storage API.
- Production image delivery uses Cloudflare CDN with custom domain.
- Store file metadata in PostgreSQL.
- Do not store file binaries in PostgreSQL.
- Keep original uploaded image path using a clear column such as original_image_path where relevant.
- Generated display images should use versioned object keys for cache safety.
- SVG is not allowed for Phase1 icon upload unless /docs/ changes.

---

## 7. API Rules

API design must follow docs/06_api.

General rules:

- Use /api/v1 prefix.
- Use JSON request and response bodies except multipart upload and binary downloads.
- Use consistent ErrorResponse with code, message, details, and traceId.
- Use 401 for unauthenticated requests.
- Use 403 for authenticated but unauthorized requests.
- Use 404 or 403 consistently for cross-tenant access according to the relevant API design.
- Use 409 for optimistic lock conflict and business conflicts such as contract period overlap.
- Use 422 or 400 consistently for validation according to API policy.
- Do not define requestBody for GET, HEAD, or DELETE operations in OpenAPI.
- DELETE APIs that need version should pass it through query parameter or a dedicated action endpoint, not request body.
- Creation APIs should normally return 201 Created, Location header, and a useful created resource summary when that helps the client.
- Important command APIs should support Idempotency-Key when documented.

OpenAPI rules:

- Keep YAML compatible with OpenAPI 3.0.3.
- Ensure all component references resolve.
- Ensure Swagger UI can load the YAML.
- Keep Phase2 APIs out of Phase1 API files unless clearly marked as future reference.

---

## 8. Frontend Architecture Rules

Follow the frontend architecture in docs/03_architecture/frontend-architecture.md.

Rules:

- Use Server Components by default where practical.
- Use Client Components only for interactivity, browser APIs, forms, calendar interactions, and local UI state.
- Do not call Django API directly from arbitrary page or UI components.
- Put API communication in infrastructure adapters.
- Put use-case orchestration in application layer.
- Keep domain concepts independent from React, Next.js, TanStack Query, React Hook Form, Zod, FullCalendar, and browser APIs.
- Client-side validation is for user experience, not the source of truth.
- Business validation must be enforced by Django.

Phase2 side-menu items such as income and expense, invoices, and analysis should stay hidden or commented out with TODO comments unless scope changes.

---

## 9. Local Development Rules

Current local development convention:

- flowance-web: run Next.js on the host machine.
- flowance-api: run Django API, Celery Worker, PostgreSQL, and Redis with Docker Compose when possible.

Environment files:

- .env.local is for host-based backend execution.
- .env.docker is for Docker Compose services.
- .env may exist as a convenience copy, but Compose should explicitly use .env.docker.

Docker Compose should include:

- api
- worker
- postgres
- redis

Docker Compose should not include the frontend unless the user explicitly changes the local development policy.

Connection host rule:

- Host execution uses localhost for PostgreSQL and Redis.
- Docker execution uses service names postgres and redis.

---

## 10. Database Rules

Follow docs/05_database.

Rules:

- PostgreSQL is the source of truth.
- Use Django Migration for schema changes.
- Prefer backward-compatible migrations.
- Use UUID primary keys where specified by docs.
- Use organization_id scoping for tenant-owned data.
- Use version columns for optimistic locking where required.
- Use created_at, updated_at, and deleted_at where specified.
- Use audit_logs for important changes.
- Use idempotency keys for command deduplication where specified.
- Use PostgreSQL exclusion constraint for same-project contract period overlap.
- Do not use Redis as permanent business storage.
- Do not store file binaries in PostgreSQL.

---

## 11. Asynchronous Processing Rules

Redis and Celery are Phase1 components.

Celery handles:

- Icon image conversion
- Display image generation
- Old image deletion
- Orphan file cleanup
- Outbox event processing when introduced
- Other slow or retryable background work documented in /docs/

Rules:

- PostgreSQL background_tasks is the business-visible task state source.
- Do not expose raw Celery internal state directly as business API state.
- Tasks must be idempotent where retry is possible.
- Preserve traceId across API and Celery task boundaries where practical.
- On file or DB failure, preserve consistency with compensation logic.

---

## 12. Testing and Quality Rules

Follow docs/16_testing.

Backend checks should include where applicable:

- Ruff lint
- Ruff format check
- mypy
- Django System Check
- Django Migration check
- pytest
- PostgreSQL integration tests
- Redis integration tests
- Celery task tests
- OpenAPI validation

Frontend checks should include where applicable:

- TypeScript typecheck
- ESLint
- Next.js build
- Vitest
- React Testing Library
- Playwright for key flows

Before handing off code changes, run the smallest meaningful verification that matches the risk of the change. If a check cannot be run, explain why.

---

## 13. Git and File Editing Rules

- Preserve user changes.
- Check the working tree before broad edits when relevant.
- Do not use destructive commands such as hard reset unless the user explicitly requests them.
- Prefer small, focused changes.
- Do not edit generated or unrelated files unnecessarily.
- Keep documents and implementation consistent when a change affects both.
- Use /docs/ as the source for deciding whether a behavior belongs to Phase1.

---

## 14. Documentation Rules

When changing behavior, update relevant documents if the user asks for documentation sync or if the change clearly affects documented design.

Relevant documentation areas:

- docs/01_requirements
- docs/02_basic-design
- docs/03_architecture
- docs/04_domain
- docs/05_database
- docs/06_api
- docs/07_security
- docs/08_error-handling
- docs/09_async-processing
- docs/10_file-management
- docs/11_cache
- docs/12_operations
- docs/13_icon-processing
- docs/14_schedule-generation
- docs/15_contract-revenue
- docs/16_testing
- docs/adr

If Notion pages are involved, sync Notion and local docs when requested.

---

## 15. Decision Priority

When instructions conflict, use this priority:

1. System and developer instructions from the current Codex session.
2. Explicit user request in the current chat.
3. Current /docs/ specifications.
4. This AGENTS.md.
5. Existing code conventions.
6. Older conversation assumptions.

If a higher-priority instruction conflicts with /docs/, explain the conflict and make the smallest safe change needed to satisfy the user.

---

## 16. Current Important Reminders

- This project is Django / DRF, not Spring Boot.
- This project uses Django ORM and Django Migration, not JPA or Flyway.
- Phase1 excludes invoices, payments, income and expense, analysis, and ACCOUNTANT role.
- PostgreSQL is the source of truth.
- Redis is not source-of-truth storage.
- Celery is included in Phase1.
- Cloudflare R2 is the production object storage choice.
- Cloudflare CDN with custom domain is used for production image delivery.
- Frontend is Next.js and runs outside Docker Compose in local development.
- Backend API, Celery Worker, PostgreSQL, and Redis can run through Docker Compose.

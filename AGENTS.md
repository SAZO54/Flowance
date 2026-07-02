# AGENTS.md

## 1. Project Overview

Flowance is a full-stack platform for freelancers to manage projects, schedules, actual work hours, revenue, invoices, and payments.

The service is intended to solve the following core problems:

- Understand which project is scheduled on which day and at what time
- Register recurring weekly work schedules
- Override individual calendar entries
- Record planned and actual work hours separately
- Calculate monthly revenue totals
- Calculate revenue totals by project
- Support hourly, daily, monthly fixed, and settlement-range contracts
- Manage invoices and payment status
- Visualize workload, revenue, and client concentration

Flowance is also a production-oriented portfolio project intended to demonstrate practical backend engineering, including domain modeling, authentication, authorization, transaction management, concurrency control, aggregation, testing, CI/CD, and observability.

---

## 2. Repository Policy

Flowance must be maintained as a single product-oriented monorepo.

```text
flowance/
├── frontend/
├── backend/
├── infrastructure/
├── docs/
├── compose.yaml
├── README.md
└── AGENTS.md
```

Do not create separate repositories named `flowance_frontend` and `flowance_backend` unless the repository strategy is intentionally changed later.

The repository represents one product consisting of multiple applications.

- `frontend`: Next.js application
- `backend`: Spring Boot API
- `infrastructure`: Docker, AWS, Terraform, monitoring, and deployment configuration
- `docs`: requirements, API documentation, architecture, ER diagrams, and design decisions

---

## 3. Technology Stack

### Frontend

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- FullCalendar
- ECharts or Recharts
- Vitest
- React Testing Library
- Playwright

### Backend

- Java
- Spring Boot
- Spring Security
- Spring Data JPA
- Hibernate
- Bean Validation
- Flyway
- OpenAPI
- Swagger UI
- JUnit 5
- Mockito
- Spring Boot Test
- Testcontainers

### Data and Infrastructure

- PostgreSQL
- Redis
- Docker
- Docker Compose
- GitHub Actions
- AWS
- Terraform
- OpenTelemetry
- Prometheus
- Grafana

Redis, AWS, Terraform, Prometheus, Grafana, and advanced observability are not mandatory for the MVP. Add them according to the development phase rather than prematurely.

---

## 4. Architecture

### 4.1 Responsibility Separation

The frontend is responsible for:

- Rendering pages and components
- Calendar interactions
- Form handling
- Client-side validation
- API communication
- Loading states
- Error states
- Presentation-oriented state
- Responsive UI

The backend is responsible for:

- Authentication
- Authorization
- Business logic
- Database operations
- Contract validation
- Work-hour calculation
- Revenue calculation
- Monthly aggregation
- Invoice and payment processing
- Transactions
- Concurrency control
- Audit logs
- Background processing

Do not duplicate business rules in both Next.js and Spring Boot.

Core business operations must go through the Spring Boot API.

### 4.2 Backend Architecture

Use a modular monolith with feature-based packaging.

```text
backend/src/main/java/<base-package>/
├── authentication/
├── organization/
├── client/
├── project/
├── contract/
├── workschedule/
├── workrecord/
├── settlement/
├── invoice/
├── payment/
├── audit/
└── shared/
```

Each feature may contain:

```text
domain/
application/
infrastructure/
presentation/
```

Avoid a project-wide package structure that separates all controllers, services, repositories, and entities when doing so scatters one feature across the entire codebase.

### 4.3 Frontend Architecture

Adopt Clean Architecture principles for the frontend.

Organize the frontend so that business rules, application use cases, infrastructure concerns, and UI components remain clearly separated. Dependencies must point inward toward the domain and application layers.

frontend/src/
├── app/
│   ├── routes/
│   ├── layouts/
│   └── providers/
│
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── repositories/
│   └── services/
│
├── application/
│   ├── use-cases/
│   ├── ports/
│   ├── dto/
│   └── mappers/
│
├── infrastructure/
│   ├── api/
│   ├── repositories/
│   ├── auth/
│   ├── storage/
│   └── config/
│
├── presentation/
│   ├── features/
│   ├── components/
│   ├── hooks/
│   ├── forms/
│   └── view-models/
│
├── shared/
│   ├── components/
│   ├── constants/
│   ├── types/
│   ├── utils/
│   └── validation/
│
└── styles/

Layer responsibilities:

domain: Framework-independent business concepts, entities, value objects, repository interfaces, and domain services
application: Application use cases, ports, DTOs, and mapping between domain and presentation or infrastructure models
infrastructure: Spring Boot API clients, repository implementations, authentication adapters, browser storage, and environment configuration
presentation: Next.js pages, feature UI, forms, hooks, view models, and user interaction logic
shared: Reusable UI components and utilities that do not belong to a specific business feature
app: Next.js App Router entry points, layouts, route groups, providers, loading states, and error boundaries

Dependencies must follow these rules:

presentation → application → domain
infrastructure → application/domain
domain → no outer layer

The domain layer must not import:

React
Next.js
TanStack Query
React Hook Form
Zod schemas tied to UI forms
FullCalendar
Browser APIs
API client implementations

Repository contracts must be declared in the domain or application layer, while their API-based implementations must be placed in the infrastructure layer.

Example:

domain/repositories/ProjectRepository.ts
infrastructure/repositories/ApiProjectRepository.ts
application/use-cases/GetProjects.ts
presentation/features/projects/

Do not call the backend API directly from page components or reusable UI components. API access must go through infrastructure adapters and application use cases.

Use Server Components by default for:

Route entry points
Layouts
Initial data loading
Read-only summaries
Static or mostly static content
Server-side authentication checks

Use Client Components only when required for:

FullCalendar
Forms
Drag and drop
Resize operations
Modals and dialogs
Browser APIs
Interactive charts
Local interaction state
Client-side mutations
Real-time user feedback

Keep Client Components as small and focused as possible. Do not mark an entire page as a Client Component when only one interactive section requires client-side behavior.

Next.js-specific code must remain in the outer presentation or infrastructure layers and must not leak into domain logic.

---

## 5. Design System and Color Palette

The UI must use the color palette provided in the approved reference image.

### Approved color palette

```text
#8DBFD3
#A5D1E7
#C3E7F6
#E5F2FA
#75A8C7
```

The fifth color label in the reference image is partially obscured, so `#75A8C7` is taken from the visible swatch color itself.

These colors must be treated as the primary Flowance brand palette.

### Recommended semantic usage

```text
#75A8C7  Primary action / active state / strong accent
#8DBFD3  Secondary action / emphasized cards / selected items
#A5D1E7  Soft accent / hover / secondary surfaces
#C3E7F6  Light panel / calendar background / informational state
#E5F2FA  Page background / subtle section background
```

### CSS variables

```css
:root {
  --flowance-primary: #75A8C7;
  --flowance-secondary: #8DBFD3;
  --flowance-accent: #A5D1E7;
  --flowance-soft: #C3E7F6;
  --flowance-background: #E5F2FA;
}
```

### Tailwind theme example

```ts
colors: {
  flowance: {
    100: "#E5F2FA",
    200: "#C3E7F6",
    300: "#A5D1E7",
    400: "#8DBFD3",
    500: "#75A8C7",
  },
}
```

### UI rules

- Use the approved palette consistently.
- Do not introduce unrelated strong brand colors without a documented reason.
- Neutral grays, white, black, success, warning, and error colors may be added for usability.
- Do not rely on color alone to communicate status.
- Maintain WCAG-conscious text contrast.
- Project labels may use user-selected colors, but the default application chrome must use the approved Flowance palette.
- Use `#E5F2FA` and `#C3E7F6` for soft backgrounds rather than large areas of highly saturated color.
- Use `#75A8C7` primarily for main actions, active navigation, focused calendar elements, and important highlights.

---

## 6. Core Domain Concepts

### User

A person who uses Flowance.

### Organization

A tenant boundary for future team and small-company use.

Even if the first release targets individual freelancers, tenant ownership should be considered in the data model.

### Client

A person or company that commissions work.

### Project

A freelance engagement associated with a client.

A project includes:

- Name
- Description
- Label color
- Status
- Contract period
- Workload rate
- Notes

Suggested statuses:

- Prospect
- Negotiating
- Contract scheduled
- Active
- Paused
- Completed
- Lost

Use enums or similarly constrained values rather than arbitrary strings.

### Project Contract

Contract information must be stored separately from the project.

Do not store only one mutable rate directly on the project.

Contract history is required because rates and terms may change over time.

Supported contract types:

- Hourly
- Daily
- Monthly fixed
- Monthly with settlement range
- Performance-based

A contract may include:

- Hourly rate
- Daily rate
- Monthly rate
- Currency
- Tax rate
- Withholding tax rate
- Minimum hours
- Maximum hours
- Base hours
- Deduction rate
- Overtime rate
- Rounding unit
- Rounding method
- Closing day
- Payment terms
- Valid-from date
- Valid-until date

### Weekly Schedule

A reusable weekday-based schedule for a project.

Example:

```text
Monday: 10:00-18:00
Tuesday: 10:00-18:00
Wednesday: Off
Thursday: 10:00-18:00
Friday: 10:00-18:00
```

Support:

- Applying one schedule to selected weekdays
- Applying a schedule to all weekdays
- Individual weekday overrides
- Default break duration
- Calendar event generation

### Work Schedule

Represents planned work.

Typical fields:

- `scheduledStartAt`
- `scheduledEndAt`
- Planned break
- Project
- User
- Status
- Notes
- Recurring-generation flag
- Recurrence source

### Work Record

Represents actual work.

Typical fields:

- `actualStartAt`
- `actualEndAt`
- Break duration
- Actual minutes
- Billable minutes
- Billable flag
- Status
- Notes

Do not overwrite planned values with actual values.

The system must be able to compare:

- Planned time
- Actual time
- Difference
- Overtime
- Underwork
- Planned revenue
- Actual revenue

### Settlement

Represents a monthly revenue calculation.

A settlement may include:

- Scheduled minutes
- Actual minutes
- Billable minutes
- Base amount
- Deduction amount
- Overtime amount
- Tax amount
- Withholding amount
- Total amount

### Invoice

Represents a client invoice.

Suggested statuses:

- Draft
- Created
- Issued
- Sent
- Awaiting payment
- Partially paid
- Paid
- Overdue
- Cancelled

### Payment

Represents money received against an invoice.

Support:

- Full payment
- Partial payment
- Overpayment
- Fees
- Payment date
- Payment method
- Sender information
- Notes

---

## 7. Calendar Requirements

The calendar must eventually provide:

- Month view
- Week view
- Day view
- Project filters
- Status filters
- Planned/actual switching
- Project label colors
- Drag and drop
- Resize
- Time-range selection
- Event editing
- Copy to another date
- Delete
- Planned-to-actual conversion
- Break entry
- Notes

A change to a recurring weekly schedule must not silently overwrite manually modified calendar entries.

Individual overrides must remain distinguishable from generated recurring events.

---

## 8. Time Tracking Policy

Flowance must support actual work recording.

For the MVP, actual work may be entered manually:

- Actual start time
- Actual end time
- Break duration

A stopwatch-style tracker is not required for the MVP.

A later phase may add:

- Start
- Pause
- Resume
- Stop

Time tracking exists to support:

- Hourly billing
- Monthly settlement-range calculations
- Planned versus actual comparisons
- Overtime and underwork detection
- Effective hourly rate calculation
- Monthly work reports
- Invoice evidence

---

## 9. Revenue Calculation Rules

### Monetary Types

Never use floating-point types for money.

Use:

- Java: `BigDecimal`
- PostgreSQL: `numeric`

The intended initial input range is:

- Minimum: `0`
- Maximum: `10,000,000 JPY`

Validate this in both frontend and backend.

### Hourly Contract

```text
billable hours × hourly rate
```

Billable time is calculated after breaks and rounding rules.

### Daily Contract

Calculate revenue based on billable workdays or configured daily units.

### Monthly Fixed Contract

Use the monthly contract amount while the contract is active.

Future prorating options may include:

- Calendar days
- Business days
- Scheduled workdays
- No proration

### Monthly Settlement Range

A settlement-range contract may include:

- Minimum hours
- Maximum hours
- Base hours
- Deduction rate
- Overtime rate

Example:

```text
Monthly rate: 800,000 JPY
Range: 140-180 hours
Actual: 190 hours
Overtime: 10 hours
Overtime rate: 5,000 JPY
Total: 850,000 JPY
```

Support explicitly configured and derived deduction/overtime rates.

### Rounding

Potential units:

- 1 minute
- 5 minutes
- 10 minutes
- 15 minutes
- 30 minutes
- 60 minutes

Potential methods:

- Round up
- Round down
- Nearest
- Start time up
- End time down

Calculation logic belongs in backend domain/application code and must have unit tests.

### Calculation Strategy

Prefer separate implementations.

```text
RevenueCalculator
├── HourlyRevenueCalculator
├── DailyRevenueCalculator
├── MonthlyFixedRevenueCalculator
├── MonthlyRangeRevenueCalculator
└── PerformanceFeeRevenueCalculator
```

Do not put contract calculation branches in controllers.

---

## 10. API Guidelines

Use REST APIs under:

```text
/api/v1
```

Example resources:

```text
/api/v1/auth
/api/v1/clients
/api/v1/projects
/api/v1/projects/{projectId}/contracts
/api/v1/projects/{projectId}/weekly-schedules
/api/v1/calendar/events
/api/v1/work-schedules
/api/v1/work-records
/api/v1/settlements
/api/v1/invoices
/api/v1/payments
```

Use consistent HTTP semantics.

- `GET`: read
- `POST`: create or execute an explicit command
- `PATCH`: partial update
- `DELETE`: delete or deactivate where appropriate

Use consistent error responses.

```json
{
  "code": "PROJECT_NOT_FOUND",
  "message": "The requested project was not found.",
  "details": [],
  "traceId": "abc123"
}
```

Validation error example:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Please review the submitted values.",
  "details": [
    {
      "field": "monthlyRate",
      "message": "Monthly rate must be between 0 and 10,000,000."
    }
  ]
}
```

---

## 11. Authentication and Authorization

Preferred browser flow:

```text
Next.js
→ Spring Boot authentication API
→ HttpOnly Cookie
```

Do not store access tokens in `localStorage`.

Use:

- HttpOnly
- Secure in production
- SameSite
- Appropriate expiration

Planned roles:

- `OWNER`
- `ADMIN`
- `MEMBER`
- `ACCOUNTANT`

Example permissions:

- Project creation: OWNER or ADMIN
- Work record editing: OWNER, ADMIN, or authorized MEMBER
- Invoice issuing: OWNER or ACCOUNTANT
- Organization settings: OWNER

Always enforce authorization in the backend.

Frontend permission checks are presentation logic only.

---

## 12. Multi-Tenancy

Tenant-owned data must be scoped by organization.

Do not retrieve tenant-owned entities by ID alone.

Avoid:

```text
findById(projectId)
```

Prefer:

```text
findByIdAndOrganizationId(projectId, organizationId)
```

Add integration tests for tenant isolation.

---

## 13. Concurrency and Consistency

### Optimistic Locking

Use optimistic locking for mutable business data where concurrent updates matter.

```java
@Version
private Long version;
```

Return `409 Conflict` for stale updates.

Candidates include:

- Project
- Contract
- Work schedule
- Work record
- Settlement
- Invoice

### Idempotency

Use idempotency keys for operations that must not be duplicated.

Candidates:

- Invoice issuance
- Payment registration
- Settlement finalization
- External integrations

```text
Idempotency-Key: <uuid>
```

### Transactions

Use transactions for logically atomic business operations.

### Outbox Pattern

A later phase may use an outbox table for reliable notifications and external side effects.

---

## 14. Audit Logging

Audit important actions:

- Project creation or changes
- Contract changes
- Work record changes
- Settlement recalculation
- Invoice issuance or cancellation
- Payment registration
- Role changes

Audit records should include:

- Actor
- Organization
- Entity type
- Entity ID
- Action
- Before value
- After value
- Timestamp
- IP address where appropriate
- User agent where appropriate

Never log passwords, tokens, or secrets.

---

## 15. Date, Time, and Time Zone

Store timestamps in UTC.

Store the user's time zone separately.

Initial default:

```text
Asia/Tokyo
```

Support work that crosses midnight.

```text
22:00-02:00 next day
```

Take care with:

- Month boundaries
- Contract boundaries
- Recurring schedules
- Non-Japan daylight saving time

---

## 16. Database and Migrations

Use PostgreSQL.

Use Flyway for schema migrations.

```text
V1__create_users.sql
V2__create_organizations.sql
V3__create_clients.sql
V4__create_projects.sql
V5__create_project_contracts.sql
V6__create_work_schedules.sql
V7__create_work_records.sql
```

Do not modify production schemas manually outside migrations.

Suggested main tables:

```text
users
organizations
organization_members
clients
projects
project_contracts
project_weekly_schedules
work_schedules
work_records
work_breaks
monthly_project_settlements
invoices
invoice_items
payments
audit_logs
outbox_events
refresh_tokens
idempotency_keys
```

Add indexes based on actual query patterns, especially:

- Organization IDs
- Project IDs
- User IDs
- Work timestamps
- Settlement year/month
- Invoice status
- Payment date

---

## 17. Frontend Data Management

Use:

- TanStack Query for server state
- React Hook Form for form state
- Zod for client-side validation
- URL search parameters for shareable filters
- `useState` or `useReducer` for local UI state

Do not introduce Redux unless there is a demonstrated requirement.

Avoid unnecessary global state.

After mutations, invalidate or update only relevant query keys.

---

## 18. UI and UX Guidelines

The product should feel like a professional, calm, and modern SaaS application.

Prioritize:

- Clear visual hierarchy
- Readable calendar entries
- Accessible forms
- Consistent spacing
- Responsive layouts
- Keyboard usability
- Clear loading states
- Clear empty states
- Clear validation errors
- Confirmations for destructive actions
- Consistent use of the approved blue palette

The visual tone should resemble clear water, air, and light rather than heavy enterprise software.

Use rounded corners and soft surfaces in moderation.

Avoid excessive shadows, gradients, and decorative effects that reduce readability.

---

## 19. Testing Requirements

### Backend Unit Tests

Cover:

- Hourly calculation
- Monthly fixed calculation
- Settlement range within range
- Below minimum hours
- Above maximum hours
- Break deduction
- Time rounding
- Work crossing midnight
- Work crossing month boundaries
- Rate changes over time
- Work before contract start
- Work after contract end
- Mid-month contract start
- Mid-month contract end
- Tax calculation
- Withholding calculation

### Backend Integration Tests

Use Testcontainers with PostgreSQL.

Test:

- Repository behavior
- Aggregation SQL
- Transactions
- Optimistic locking
- Unique constraints
- Tenant isolation
- Flyway migrations
- Invoice/payment consistency
- Outbox behavior when introduced

### Frontend Tests

Use Vitest and React Testing Library for:

- Form validation
- Conditional fields
- Data rendering
- Loading states
- Error states
- Key interactions

### End-to-End Tests

Use Playwright for critical workflows.

```text
Log in
→ Create client
→ Create project
→ Add contract
→ Add weekly schedule
→ View calendar entries
→ Record actual work
→ View monthly settlement
→ Create invoice
→ Register payment
```

Prioritize meaningful business tests over superficial coverage percentages.

---

## 20. Local Development

Use Docker Compose for local dependencies.

Possible services:

```text
frontend
backend
postgres
redis
mailpit
prometheus
grafana
```

Redis, Prometheus, and Grafana may be omitted until needed.

Provide clear root-level commands for local setup.

Do not commit secrets.

Provide `.env.example` files with placeholders.

---

## 21. CI/CD

GitHub Actions should eventually run:

### Pull Requests

- TypeScript type checking
- ESLint
- Frontend unit tests
- Java compilation
- Backend static analysis
- Backend unit tests
- Integration tests
- Docker build validation

### Main Branch

- Production builds
- Container image builds
- Registry push
- Deployment
- Database migrations
- Smoke tests

Do not depend on undocumented local deployment steps.

---

## 22. Observability

A later phase should add:

- OpenTelemetry
- Prometheus
- Grafana
- Structured logging
- Trace IDs
- Health checks

Useful metrics:

- API request count
- Error rate
- p95 latency
- SQL duration
- Database pool usage
- Monthly settlement duration
- Background job success rate
- Unprocessed outbox count
- Redis cache hit rate

Never log:

- Passwords
- Access tokens
- Refresh tokens
- Secret keys
- Full sensitive personal information

---

## 23. Development Phases

### Phase 1: MVP

Implement:

- Registration
- Login
- Logout
- Project creation and editing
- Project color
- Hourly and monthly rates
- Contract period
- Weekly common schedule
- Week calendar
- Month calendar
- Individual overrides
- Manual actual-work entry
- Monthly revenue total
- Revenue total by project
- Responsive UI

The Phase 1 core is:

```text
Projects
Calendar
Actual work
Monthly totals
Project totals
```

### Phase 2: Contract and Settlement

Add:

- Planned and actual separation
- Settlement ranges
- Deduction calculation
- Overtime calculation
- Contract history
- Contract renewal
- Mid-month start/end
- Multiple breaks
- Time rounding
- Planned versus actual comparison
- CSV export
- Optimistic locking
- Audit logs

### Phase 3: Invoice and Payment

Add:

- Client management
- Invoice creation
- Invoice PDF
- Invoice statuses
- Payment registration
- Partial payments
- Unpaid list
- Payment deadline notifications
- Monthly closing
- Idempotency
- Outbox pattern

### Phase 4: Advanced Backend and Operations

Add:

- Multi-tenancy
- Member management
- Role management
- Redis
- Background jobs
- Batch processing
- Google Calendar integration
- OpenTelemetry
- Prometheus
- Grafana
- AWS
- Terraform
- Production CI/CD

### Phase 5: SaaS

Potential additions:

- Free and paid plans
- Stripe billing
- Usage limits
- Team plan
- Invitations
- Data export
- Admin dashboard
- Product analytics

---

## 24. Explicit Non-Goals for the MVP

Do not implement unless required:

- Google Calendar synchronization
- Stripe billing
- Team invitations
- Multi-currency
- Slack notifications
- LINE notifications
- Accounting software integrations
- Microservices
- Kafka
- Kubernetes
- Complex event-driven architecture
- Advanced BI dashboards
- Stopwatch-style time tracking

Prefer a complete, tested MVP over many incomplete advanced features.

---

## 25. Documentation Requirements

Maintain documentation for:

- Product overview
- Setup
- Architecture
- ER diagram
- API specification
- Revenue calculation rules
- Authentication flow
- Testing strategy
- Deployment
- Known limitations
- Roadmap
- Color and design-system usage

README should explain key decisions, including:

- Contract data is separate from projects to preserve historical accuracy.
- Planned and actual work are separate.
- Optimistic locking prevents silent overwrites.
- Outbox processing protects consistency between database writes and notifications.
- Flowance uses the approved blue palette from the supplied visual reference.

---

## 26. Coding Guidelines

### General

- Keep functions and classes focused.
- Use descriptive names.
- Avoid hidden side effects.
- Prefer explicit domain concepts.
- Do not add dependencies without a clear reason.
- Remove dead code.
- Do not keep commented-out implementation blocks.
- Never hard-code secrets.

### Backend

- Keep controllers thin.
- Put business rules in domain/application services.
- Validate requests at the boundary.
- Validate business invariants in the domain/application layer.
- Use DTOs at API boundaries.
- Do not return JPA entities directly.
- Use consistent exception mapping.
- Use transactions deliberately.
- Avoid N+1 queries.

### Frontend

- Keep pages and layouts thin.
- Put feature logic in feature modules.
- Avoid giant Client Components.
- Keep API calls in shared or feature-specific clients.
- Use the Flowance design tokens instead of scattering raw hex values.
- Prefer reusable form, calendar, card, and table components.
- Keep loading, empty, and error states consistent.
- Preserve accessibility when using user-selected project colors.

---

## 27. Agent Rules

Any coding agent working on this repository must:

1. Read this file before making architectural changes.
2. Preserve the monorepo structure.
3. Keep business logic in Spring Boot.
4. Use the approved Flowance color palette.
5. Avoid adding advanced infrastructure before its phase.
6. Add or update tests for business logic changes.
7. Add Flyway migrations for database changes.
8. Update documentation when behavior or architecture changes.
9. Avoid unrelated refactoring in the same task.
10. Never expose secrets or sensitive data.
11. Ask for clarification only when a decision cannot be derived from this document or existing project code.
12. Prefer the simplest implementation that remains compatible with the stated roadmap.

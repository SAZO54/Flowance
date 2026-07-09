# Frontend architecture

The frontend follows Clean Architecture dependency rules.

## Layers

- domain: framework-independent business models.
- application: use cases, calculations, and repository ports. It depends only on domain.
- infrastructure: adapters that implement application ports. The current adapter provides in-memory demo data.
- presentation: React pages. Pages receive data through props and depend on domain and application, never on infrastructure.
- app: Next.js App Router routes and the composition root. It selects infrastructure adapters, injects their data into pages, and coordinates shared UI state.
- app/layout.tsx: root layout and global stylesheet entry point.
- app/*/page.tsx: route entry points rendered by the Next.js App Router.

## Dependency direction

presentation -> application -> domain

infrastructure -> application -> domain

app -> presentation + infrastructure

Infrastructure can be replaced with an HTTP API repository without changing domain models or page-level business calculations.

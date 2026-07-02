# Frontend architecture

The frontend follows Clean Architecture dependency rules.

## Layers

- domain: framework-independent business models.
- application: use cases, calculations, and repository ports. It depends only on domain.
- infrastructure: adapters that implement application ports. The current adapter provides in-memory demo data.
- presentation: React pages. Pages receive data through props and depend on domain and application, never on infrastructure.
- app: composition root. It selects infrastructure adapters, injects their data into pages, and coordinates routing and shared UI state.
- main.tsx: framework entry point only.

## Dependency direction

presentation -> application -> domain

infrastructure -> application -> domain

app -> presentation + infrastructure

Infrastructure can be replaced with an HTTP API repository without changing domain models or page-level business calculations.

# Flowance Claude Instructions

## Pull Request Review: Mandatory Preparation

Before reviewing any pull request, you MUST:

1. Read the repository-root `AGENTS.md` in full.
2. Identify the areas affected by the pull request.
3. Read the relevant specifications and design documents under `flowance-docs/docs/`.
4. Treat `flowance-docs/docs/` as the current source of truth, following the decision priority and workflow defined in `AGENTS.md`.

Do not review from the diff alone. Do not rely only on general framework conventions or prior assumptions.

## Specification Consistency Review

Compare the pull request with `AGENTS.md` and the relevant documents under `flowance-docs/docs/`.

Verify that:

- The implementation, tests, API contracts, database changes, validation, security, and operational behavior are consistent with the documented requirements and design.
- Phase 1 and Phase 2 scope boundaries are preserved.
- Technology choices and directory responsibilities match the current project decisions.
- A behavior change updates the relevant implementation, tests, and documentation together when necessary.

When reporting a discrepancy:

- Cite the relevant changed code.
- Cite the conflicting document path and section.
- Explain the concrete behavioral or design impact.
- Propose a specific correction consistent with the documented design.

If the documents are ambiguous or conflict with each other, report the ambiguity instead of inventing a requirement.

## Primary Review Focus: Clean Architecture and DDD

This is a high-priority review requirement. Review whether the implementation follows pragmatic Clean Architecture and Domain-Driven Design best practices defined in `AGENTS.md` and `flowance-docs/docs/`.

Pay particular attention to:

- Dependency direction: domain code must remain independent of frameworks, databases, HTTP, storage, queues, and UI libraries.
- Layer responsibilities: domain rules belong in the Domain layer, use-case orchestration belongs in the Application layer, technical details belong in Infrastructure, and request/response mapping belongs in Presentation.
- Business invariants: important rules must be represented explicitly and enforced at the appropriate boundary.
- Domain modeling: entities, value objects, domain services, and domain exceptions should express business concepts where they reduce ambiguity or protect invariants.
- Application services and use cases: coordinate permissions, transactions, repositories, and domain behavior without absorbing domain rules.
- Persistence boundaries: ORM models and queries must not leak into the Domain layer; repository boundaries should be used where they provide meaningful separation.
- Aggregate and transaction boundaries: state changes that must remain consistent should be handled atomically.
- Tenant isolation, authorization, optimistic locking, idempotency, audit logging, and error handling required by the design.
- Frontend boundaries: domain concepts and use-case orchestration must not be coupled to React, Next.js, form, query, calendar, or browser APIs.
- Testability: business rules should be testable without requiring framework or infrastructure setup where practical.

For each architecture or DDD concern:

- Explain which responsibility or dependency rule is violated.
- Explain the practical risk, not only the theoretical principle.
- Propose a concrete implementation approach and the appropriate layer or module.
- Prefer the smallest improvement that preserves the existing design.

Do not recommend abstractions, patterns, repositories, entities, or value objects solely for architectural purity. Make a proposal only when it protects a business rule, corrects dependency direction, improves testability, or removes meaningful coupling or duplication.

## Review Output

Prioritize findings in this order:

1. Bugs, security issues, data loss, tenant isolation, and authorization failures.
2. Differences from `flowance-docs/docs/` or `AGENTS.md`.
3. Clean Architecture and DDD responsibility or dependency violations.
4. Missing tests for changed behavior and important edge cases.

Keep findings actionable. Include the affected code, supporting specification or design rule, impact, and a concrete correction.

# AGENTS.md

## Docs Repository Rules

This directory is the dedicated documentation site for Flowance.

- Treat `docs/` as the source of truth for requirements, design documents, ADRs, and OpenAPI YAML.
- Use Docusaurus for HTML rendering.
- Use Swagger UI at `/api` for OpenAPI visualization.
- Keep OpenAPI YAML under `docs/06_api/openapi`.
- Run `npm run build` before considering documentation-site changes complete.

The `static/openapi` directory is generated from `docs/06_api/openapi` by `npm run sync:openapi`.
# Flowance Docs

Flowance の設計書とOpenAPI仕様を管理するdocs専用プロジェクトです。

## Source of truth

- Markdown: `docs/`
- OpenAPI YAML: `docs/06_api/openapi/`

## Commands

```bash
npm install
npm run start
npm run build
```

`npm run start` と `npm run build` の前に、`docs/06_api/openapi` から `static/openapi` へYAMLを自動同期します。

## Local URLs

- Docs: http://localhost:3001/docs/
- Swagger UI: http://localhost:3001/api
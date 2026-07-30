---
sidebar_position: 1
title: FLOWANCE 設計書
slug: /
---

## 🌊 FLOWANCE Documentation

FLOWANCE の設計書は、この docs ディレクトリを正本として管理します。Notion はダッシュボードと HTML リンク集、Docusaurus は閲覧用 HTML サイトとして扱います。

## 🧭 運用方針

| 項目 | 扱い |
| --- | --- |
| 正本 | docs 内の Markdown と OpenAPI YAML |
| 閲覧 | Docusaurus で生成する HTML サイト |
| 管理 | Notion の FLOWANCE DB から HTML へリンク |
| 履歴 | Git tag と Docusaurus versioning で Phase ごとに固定 |

## 🚀 Phase 方針

- Phase 中は docs を更新する。
- リリース時点で Git tag を作成する。
- 必要に応じて Docusaurus versioning で Phase1 HTML を固定する。
- Phase2 以降は最新設計を更新しながら、Phase1 版 HTML をスナップショットとして参照できるようにする。

## 📚 設計書一覧

| 区分 | 設計書 |
| --- | --- |
| 要件・基本 | 要件定義、基本設計、システムアーキテクチャ、サービス指向UI |
| ドメイン・DB | ドメイン・業務ロジック、DB、契約・売上計算 |
| API・エラー | API、エラーハンドリング、バリデーション詳細 |
| セキュリティ・基盤 | 認証・認可、非同期処理、ファイル・画像管理、キャッシュ、インフラ・運用 |
| 詳細設計 | アイコン処理、予定生成、テスト設計 |
| ADR | ADR 概要、ADR-001 から ADR-005 |

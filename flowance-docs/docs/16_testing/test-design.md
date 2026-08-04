---
title: テスト設計書
sidebar_label: テスト設計
---

## 🧭 文書概要

- Status: Phase1
- Version: 1.3
- Source: Notion「テスト設計書」
- Notion: https://app.notion.com/p/393ff2dc6fe9809288ddf224022891e3

本書は品質を担保するためのテスト方針、範囲、種別、主要観点、CI/CD 実行方針、受入条件を定義する。

## ✅ 基本方針

- 業務ルールは Domain / Application のテストで重点的に検証する。
- DRF View / Serializer は HTTP 入出力、認証、認可、形式検証、エラー変換を検証する。
- 金額計算、時間計算、契約期間重複、権限、テナント分離は必須テスト対象とする。
- OpenAPI YAML は Swagger UI で読み込めることを検証する。
- E2E は Phase1 受入条件に直結する主要フローへ絞る。
- プロダクト横断の Playwright E2E は flowance-web や flowance-api 配下ではなく、トップレベルの flowance-e2e に配置する。

## 📦 Phase1 テスト対象

| 領域 | 主な観点 |
| --- | --- |
| 認証・認可 | 登録、ログイン、token更新、Cookie、JWT、CSRF、normalized_email、ロール、tenant分離 |
| クライアント | 一覧、登録、詳細、更新、楽観ロック、初期アイコン、アップロード、削除 |
| 案件 | 一覧、登録、詳細、更新、ステータス、期間、案件メンバー、アイコン |
| アイコン | 初期生成、変換、EXIF削除、R2保存、CDN配信、非同期、fallback |
| 契約 | 4種契約、必須・不要項目、期間重複、権限、論理削除 |
| スケジュール | 週次予定、個別予定、生成、dryRun、重複警告、手動上書き |
| 稼働実績 | 休憩、actualMinutes、billableMinutes、DRAFT中心運用 |
| 精算 | 計算、再計算、確定、未確定削除、丸め、冪等性 |
| エラー | ErrorResponse、traceId、rate limit、conflict、not found |
| 非同期 | Celery task、Redis broker、retry、タスク状態、補償 |

## 🧪 Backend Unit Test

メール正規化、パスワード強度、アイコン初期生成、契約種別、契約期間重複、実稼働分、休憩分、請求対象分、4種契約の金額計算、消費税、源泉徴収、予定生成、エラー変換を検証する。

## 🔁 Application / Integration Test

organization 境界、OWNER / ADMIN / MEMBER 権限、version 不一致、Idempotency-Key、audit_logs、background_tasks、PostgreSQL 制約、Redis / Celery / Storage 障害時の整合性を検証する。

## 🌐 API Test

未認証401、権限不足403、tenant外404/403、validation error、楽観ロック409、GET / HEAD / DELETE requestBodyなし、Cookie認証、CSRF、OpenAPI参照解決を確認する。

## 🎯 Phase1 受入条件

- 利用者登録、ログイン、token更新、ログアウトができる。
- JWT は Cookie で扱われ、レスポンス本文へ含まれない。
- クライアントと案件を登録、一覧、詳細、更新できる。
- アイコンを初期表示、アップロード、削除できる。
- 他 organization のデータへアクセスできない。
- 契約を登録、更新、削除でき、同一案件内の契約期間重複を防止できる。
- 予定生成、稼働実績、月次精算の主要フローが通る。
- OpenAPI YAML が Swagger UI で読み込める。
- Next.js build と Docusaurus build が成功する。

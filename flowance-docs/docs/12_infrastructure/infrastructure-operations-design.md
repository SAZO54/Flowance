---
title: インフラ・運用設計書
sidebar_label: インフラ・運用
---

## 🧭 文書概要

- Status: Phase1
- Version: 1.3
- Updated: 2026-07-30
- Source: Notion「インフラ・運用設計書」
- Notion: https://app.notion.com/p/393ff2dc6fe980d6aa4ded875d2e5069

本書はインフラ構成、環境構成、デプロイ、監視、バックアップ、障害対応、運用手順を定義する。

## 🏗️ 構成要素

| 構成要素 | 技術 | 主な責務 |
| --- | --- | --- |
| Web フロントエンド | Next.js / React / TypeScript | 画面表示、ルーティング、フォーム、API通信 |
| Backend API | Django / DRF | 認証、認可、業務処理、API提供 |
| DB | PostgreSQL | 正規データ、認証、監査、冪等性、Outbox |
| Broker / 一時データ | Redis | Celery Broker、短時間 cache、rate limit |
| 非同期処理 | Celery Worker | 画像変換、旧画像削除、孤立ファイル削除、Outbox |
| File Storage | Django Storage API / Cloudflare R2 | 元画像、表示用画像、一時ファイル |
| CDN | Cloudflare CDN | 表示用画像の配信高速化 |

## 🧱 基本原則

- 正規データは PostgreSQL に集約する。
- Redis は Celery Broker、短時間 cache、rate limit、一時状態に限定する。
- ファイルのバイナリは PostgreSQL へ保存しない。
- 本番ファイルストレージは Cloudflare R2 を採用する。
- PostgreSQL と Redis は外部へ直接公開しない。
- OpenAPI を API 仕様の正とする。
- Django Migration を DB スキーマ変更の正とする。

## 🚀 デプロイ順序

1. PostgreSQL、Redis、R2 の疎通確認
2. 必要に応じて DB backup
3. Django Migration 実行
4. Django API deploy
5. Celery Worker deploy
6. Next.js deploy
7. Smoke Test
8. ログ、メトリクス、キュー滞留確認

## 🔐 Secret 管理

Secret は Git にコミットしない。DATABASE_URL、REDIS_URL、CELERY_BROKER_URL、DJANGO_SECRET_KEY、JWT 署名鍵、R2 credential、ALLOWED_HOSTS、CSRF_TRUSTED_ORIGINS、CORS_ALLOWED_ORIGINS を環境ごとに分離する。

## 🚦 APIレート制限

- register は IP 単位で 5回/時。
- login は IP 単位で 10回/5分、normalized_email 単位で 5回/15分。
- token refresh は IP 単位または Token Subject 単位で 30回/時。
- 制限超過時は HTTP 429、RATE_LIMITED、Retry-After を返す。
- Redis障害時の fail open / fail close はエンドポイントごとに決める。

## 📊 監視・アラート

| 領域 | 監視項目 |
| --- | --- |
| API | 5xx、4xx、p95応答時間、リクエスト数 |
| DB | 接続数、slow query、backup成功、migration失敗 |
| Redis | 接続数、memory、応答時間、エラー数 |
| Celery | queue滞留、失敗数、retry、処理時間 |
| R2 / CDN | upload失敗、download失敗、cache hit ratio |
| 認証 | login失敗、token更新失敗、CSRF失敗、rate limit |

## 🧯 障害対応

| 障害 | 方針 |
| --- | --- |
| DB | 原則 503。更新処理を継続しない |
| Redis | cache は DB fallback、Celery Broker 不可は非同期処理受付を失敗 |
| Worker 停止 | queue 滞留監視。復旧後に再開 |
| R2 | upload を 503 または task failed とし、補償処理を行う |
| deploy 失敗 | migration 前後を確認し、後方互換性を見て rollback 判断 |

## ✅ リリースチェック

Ruff、mypy、Django System Check、Migration 差分確認、pytest、PostgreSQL / Redis / Celery 統合テスト、TypeScript、ESLint、Next.js build、Vitest / Playwright、Docker build、OpenAPI 検証、Docusaurus build を確認する。

---
title: キャッシュ設計書
sidebar_label: キャッシュ
---

## 🧭 文書概要

- Status: Phase1
- Version: 1.0
- Source: Notion「キャッシュ設計書」
- Notion: https://app.notion.com/p/393ff2dc6fe980d09ca0dde42945dd9d

本書は Redis、HTTP cache、CDN cache、private API の cache-control 方針を定義する。

## 🧱 基本方針

- PostgreSQL を正規データとする。
- Redis、CDN cache、browser cache は正規データにしない。
- 認証済み業務 API は private, no-store を基本とする。
- 表示用画像は versioned object key により長期 cache する。
- cache には TTL を必ず設定する。

## 🔴 Redis 利用範囲

| 用途 | 方針 |
| --- | --- |
| Celery Broker | Phase1 で採用 |
| レート制限 | register / login / refresh のカウンタ |
| 短時間 cache | 必要な読み取り補助に限定 |
| 一時状態 | 正規データではないものに限定 |

## 🌐 HTTP Cache

| API | Cache-Control |
| --- | --- |
| 認証 API | no-store |
| クライアント / 案件 / 契約 | private, no-store |
| 予定 / 実績 / 精算 | private, no-store |
| OpenAPI / 静的 docs | public cache 可 |
| 表示用画像 | public, max-age 長め |

## ☁️ CDN Cache

- 本番画像配信は Cloudflare R2 custom domain + Cloudflare CDN を利用する。
- 表示用画像のみ CDN 配信対象とする。
- 元画像は原則 private とする。
- 画像更新時は object key を変更し、同一 URL 上書きに依存しない。

## 🚦 レート制限 Cache

| API | Key | TTL |
| --- | --- | --- |
| register | IP | 1時間 |
| login | IP | 5分 |
| login | normalized_email | 15分 |
| token refresh | IP または Token Subject | 1時間 |

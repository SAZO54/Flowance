---
title: システムアーキテクチャ設計書
sidebar_label: システムアーキテクチャ
---

## 🧭 文書概要

- Status: Phase1
- Version: 1.1
- Source: Notion「システムアーキテクチャ設計書」
- Notion: https://app.notion.com/p/391ff2dc6fe98053aae7dc05c0f95cc3

本書は Flowance Phase1 のシステム境界、技術構成、レイヤー責務、データフロー、運用上の前提を定義する。

## 🏗️ 全体構成

| コンポーネント | 技術 | 役割 |
| --- | --- | --- |
| Web | Next.js / React / TypeScript | UI、ルーティング、フォーム、API通信 |
| API | Django REST Framework | REST API、認証、認可、入力変換 |
| Domain / Application | Python / Django app | 業務ルール、UseCase、トランザクション |
| DB | PostgreSQL | 正規データ、監査ログ、冪等性、Outbox |
| Broker / Cache | Redis | Celery Broker、短時間 cache、rate limit |
| Worker | Celery | 画像変換、補償処理、Outbox dispatch |
| Storage | Cloudflare R2 / local storage | 元画像、表示用画像、一時ファイル |
| CDN | Cloudflare CDN | versioned object key の画像配信 |

## 🧱 レイヤー責務

| レイヤー | 責務 |
| --- | --- |
| Presentation | HTTP、Serializer、Cookie、CSRF、レスポンス変換 |
| Application | UseCase、認可、テナント境界、transaction、DTO |
| Domain | Entity、Value Object、計算、状態遷移、不変条件 |
| Infrastructure | ORM、Redis、Celery、R2、外部接続 |

Domain 層は Django、DRF、ORM、HTTP、Cookie、Redis、Celery、Next.js に依存しない。

## 🧭 データの正

- 業務データ、認証、監査ログ、冪等性、Outbox、background_tasks は PostgreSQL を正とする。
- Redis は正規データではなく、Broker、短時間 cache、rate limit、一時状態に限定する。
- ファイル本体は DB に保存せず、R2 またはローカル storage に保存する。
- ファイルの object key と状態は PostgreSQL に保存する。
- CDN URL や署名付き URL は派生値として扱う。

## 🔁 主要フロー

### 認証

1. フロントエンドが login API を呼び出す。
2. Django が normalized_email と password を検証する。
3. access / refresh token を HttpOnly Cookie に設定する。
4. 変更系 API では CSRF token を検証する。

### アイコンアップロード

1. API が画像、tenant、version を検証する。
2. 元画像とメタデータを保存する。
3. Celery task を登録する。
4. Worker が EXIF 削除、WebP 変換、表示用画像生成を行う。
5. 完了後に icon_status を READY へ更新する。

### 月次精算

1. 対象 project と settlementMonth を検証する。
2. 対象月に有効な契約を一意に決定する。
3. WorkRecord または WorkSchedule を集計する。
4. 契約種別に応じて金額を計算する。
5. calculation_snapshot と audit_logs を保存する。

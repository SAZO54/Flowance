---
title: 要件定義書
sidebar_label: 要件定義
---

## 🧭 文書概要

- Status: Phase1
- Version: 1.7
- Updated: 2026-07-30
- Source: Notion「要件定義書」
- Notion: https://app.notion.com/p/391ff2dc6fe980d696eed5338d3c09ca

本書は Flowance Phase1 で実現する業務要件、対象範囲、権限、主要機能、非機能要求、Phase2 以降へ送る事項を定義する。docs 配下を正本とし、Notion DB は各設計書へのリンク集として扱う。

## 🎯 Phase1 の目的

Flowance はフリーランス・小規模事業者が、クライアント、案件、契約、予定、稼働実績、月次精算を一つの流れで管理するための業務アプリケーションである。Phase1 では請求書・入金・分析の前段となる、売上計算に必要な正規データを整える。

## 📦 Phase1 対象範囲

| 領域 | 対象 |
| --- | --- |
| 認証 | 登録、ログイン、更新、ログアウト、JWT Cookie、CSRF |
| 組織 | 初期組織作成、組織設定更新、OWNER / ADMIN / MEMBER |
| クライアント | 一覧、登録、詳細、更新、ステータス、アイコン |
| 案件 | 一覧、登録、詳細、更新、ステータス、期間、アイコン |
| 契約 | 4種契約、契約履歴、期間重複防止、現在契約判定 |
| 予定 | 週次予定、個別予定、予定生成、重複警告 |
| 稼働実績 | 実績登録、休憩、実稼働分、請求対象分、DRAFT中心運用 |
| 精算 | 月次計算、再計算、確定、未確定削除、計算スナップショット |
| 共通 | エラー形式、監査ログ、楽観ロック、冪等性、レート制限 |

## 🚫 Phase1 対象外

- 請求書作成、請求書発行、PDF 生成
- 入金管理、消込、請求残高管理
- 売上分析、収支分析、BI 向け集計
- ACCOUNTANT ロール
- SSO / OAuth / MFA
- パスワードリセット、チーム招待
- 外部カレンダー連携、会計ソフト連携
- 複数通貨、外貨、返金、相殺、マイナス精算
- 成果物承認ワークフロー
- 案件単位の細粒度権限制御

## 🔐 認証・セキュリティ要件

- JWT はレスポンス本文へ含めず、HttpOnly Cookie で扱う。
- 本番 Cookie は Secure、HttpOnly、SameSite を設定する。
- 変更系 API は CSRF 検証を行う。
- パスワードは12文字以上128文字以下とする。
- 文字種の組み合わせは強制しない。
- Django 標準バリデータで、一般的すぎる値、ユーザー属性に類似する値、数字のみの値を拒否する。
- normalized_email は trim + lowercase とし、Gmail 固有のドット除去や plus addressing 除去は行わない。

## 👥 ロール要件

| ロール | Phase1 の扱い |
| --- | --- |
| OWNER | 組織管理、メンバー管理、全業務データ操作 |
| ADMIN | 業務データの登録・更新・削除、精算操作 |
| MEMBER | クライアント・案件・契約は閲覧、自身の予定・稼働実績を操作 |

マスタ、契約、精算の変更は OWNER / ADMIN のみ行える。案件単位の細粒度権限は Phase3 で扱う。

## 🧾 設定更新要件

| 区分 | 項目 |
| --- | --- |
| プロフィール | displayName 必須100文字以内、lastName / firstName 各50文字以内、email 254文字以内かつメール形式、phone 数字のみ15桁以内、bio 1000文字以内 |
| 組織 | name 必須150文字以内、tradeName 150文字以内、postalCode 20文字以内、prefecture 20文字以内、address 500文字以内 |

- プロフィールは認証済み利用者本人が更新できる。
- 組織設定は OWNER / ADMIN のみ更新できる。
- 組織更新では version を必須とし、競合時は 409 を返す。
- 適格請求書発行事業者番号は Phase1 対象外とする。

## 🧱 正規データ要件

正規データは PostgreSQL に保持する。Redis、Celery Result、ブラウザ状態、CDN cache、署名付き URL、ファイル名だけの情報は正規データとして扱わない。

| データ | 正規保存先 |
| --- | --- |
| 業務データ | PostgreSQL |
| 認証データ | PostgreSQL / Cookie |
| 監査ログ | PostgreSQL |
| 冪等性キー | PostgreSQL |
| 非同期タスク状態 | PostgreSQL background_tasks |
| ファイル本体 | Cloudflare R2 またはローカル storage |
| 短時間 cache / rate limit | Redis |

## 🧮 契約・精算要件

- 契約は HOURLY、MONTHLY_RANGE、MONTHLY_FIXED、PERFORMANCE の4種を扱う。
- 同一案件内の契約期間重複は禁止する。
- 別案件同士の契約期間重複は許可する。
- valid_until は業務上その日を含む終了日として扱う。
- 金額計算には Decimal を使用し、float を使わない。
- 精算確定は Idempotency-Key を必須とする。
- FINALIZED 精算は再計算・削除できない。

## 🚦 レート制限要件

| API | 既定値 |
| --- | --- |
| register | IP 単位で 5回/時 |
| login | IP 単位で 10回/5分、normalized_email 単位で 5回/15分 |
| token refresh | IP または Token Subject 単位で 30回/時 |

制限超過時は HTTP 429、エラーコード RATE_LIMITED、Retry-After ヘッダーを返す。カウンタは Redis に保持し、閾値は環境変数で変更可能にする。

## ✅ 受入条件

- 主要ユーザーフローが PC とスマートフォンで操作できる。
- OpenAPI YAML が Swagger UI で読み込める。
- Django Migration が適用できる。
- PostgreSQL を使った integration test が通る。
- Next.js build が成功する。
- Docusaurus build で docs の HTML 化が成功する。

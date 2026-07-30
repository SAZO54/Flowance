---
title: エラーハンドリング設計書
sidebar_label: エラーハンドリング
---

## 🧭 文書概要

- Status: Phase1
- Version: 1.0
- Source: Notion「エラーハンドリング設計書」
- Notion: https://app.notion.com/p/393ff2dc6fe980ccab4bebb72fe74a5d

本書は API、バックエンド、フロントエンド、非同期処理、ログ出力のエラーハンドリング方針を定義する。

## 🧯 基本方針

- API エラーは共通レスポンス形式で返す。
- フロントエンドは HTTP ステータスと error.code を基に表示、遷移、再試行を制御する。
- 利用者には業務上理解できるメッセージを返す。
- スタックトレース、SQL、内部例外名、token、Cookie、署名付き URL の内部情報はレスポンスに含めない。
- 予期しない例外は 500 とし、詳細はサーバーログへ出力する。
- 外部依存障害は原則 503 とする。
- 楽観ロックの version 不一致は 409 Conflict とする。

## 📦 共通エラーレスポンス

| フィールド | 型 | 説明 |
| --- | --- | --- |
| code | string | 機械判定用のエラーコード |
| message | string | 利用者向けの概要メッセージ |
| details | array | 項目別・条件別の詳細。該当なしは空配列 |
| traceId | string | ログと突合する追跡 ID |

## 🚦 HTTP ステータス

| HTTP | 用途 | 主な code |
| --- | --- | --- |
| 400 | 入力形式、必須、型不正 | BAD_REQUEST, VALIDATION_ERROR |
| 401 | 未ログイン、token期限切れ | UNAUTHORIZED, TOKEN_EXPIRED |
| 403 | 権限不足、CSRF | FORBIDDEN, CSRF_FAILED |
| 404 | 対象なし、tenant外参照 | NOT_FOUND |
| 409 | 競合、楽観ロック、冪等性衝突 | CONCURRENT_MODIFICATION, IDEMPOTENCY_CONFLICT |
| 413 | ファイルサイズ超過 | PAYLOAD_TOO_LARGE |
| 415 | 未対応形式 | UNSUPPORTED_MEDIA_TYPE |
| 422 | 業務ルール違反 | BUSINESS_RULE_VIOLATION |
| 429 | レート制限 | RATE_LIMITED |
| 500 | 想定外エラー | INTERNAL_SERVER_ERROR |
| 503 | 外部依存障害 | SERVICE_UNAVAILABLE |

## 🧾 Phase1 業務エラー

| code | HTTP | 説明 |
| --- | --- | --- |
| EMAIL_ALREADY_REGISTERED | 409 | normalized_email が登録済み |
| CONTRACT_PERIOD_OVERLAP | 409 | 同一案件内で契約期間が重複 |
| INVALID_CONTRACT_CONDITION | 422 | 契約種別と項目の組み合わせが不正 |
| INVALID_WORK_TIME_RANGE | 422 | 開始・終了時刻の範囲が不正 |
| INVALID_BREAK_RANGE | 422 | 休憩範囲が不正 |
| SETTLEMENT_TARGET_NOT_FOUND | 422 | 精算対象契約や実績が不足 |
| SETTLEMENT_ALREADY_FINALIZED | 409 | 確定済み精算に対する変更 |
| IMAGE_DIMENSION_TOO_LARGE | 422 | 画像サイズ上限超過 |
| IMAGE_PROCESSING_FAILED | 422 | 画像変換失敗 |

## 🖥️ フロントエンド表示

| HTTP | 表示方針 |
| --- | --- |
| 400 | field があれば項目、なければ画面上部 |
| 401 | refresh を試行し、失敗時ログインへ遷移 |
| 403 | 権限不足として表示 |
| 404 | 対象なしとして一覧へ戻る導線 |
| 409 | 最新状態の再取得導線 |
| 413 / 415 | ファイル上限・対応形式を表示 |
| 422 | 業務ルール違反として該当箇所へ表示 |
| 429 | Retry-After に従い再試行を促す |
| 500 / 503 | 一時的な障害として表示 |

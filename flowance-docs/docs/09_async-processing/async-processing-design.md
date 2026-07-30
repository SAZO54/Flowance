---
title: 非同期処理設計書
sidebar_label: 非同期処理
---

## 🧭 文書概要

- Status: Phase1
- Version: 1.0
- Source: Notion「非同期処理設計書」
- Notion: https://app.notion.com/p/393ff2dc6fe980b2a510c4226f18b908

本書は Celery / Redis を利用した非同期処理、タスク状態管理、リトライ、補償処理、監視方針を定義する。

## 🔁 基本方針

- Redis は Celery Broker として利用する。
- 業務 API に返す非同期タスク状態は PostgreSQL の background_tasks を正とする。
- Celery Result Backend の状態をそのまま業務 API へ露出しない。
- Redis は正規データではない。
- タスクは冪等に実装し、再実行で業務データが壊れないようにする。

## 📦 Phase1 対象タスク

| タスク | 用途 |
| --- | --- |
| アイコン画像変換 | 元画像から表示用 WebP やサムネイルを生成 |
| 旧画像削除 | 差し替え成功後に古い object を削除 |
| 孤立ファイル削除 | DB と storage の不整合を補償 |
| Outbox dispatch | 外部通知や将来連携のイベント送信 |
| cleanup / maintenance | 期限切れ一時ファイルや古いタスクの整理 |

## 🧾 background_tasks

| 項目 | 内容 |
| --- | --- |
| id | 業務 API に返す taskId |
| organization_id | テナント境界 |
| task_type | IMAGE_PROCESSING など |
| status | PENDING / RUNNING / SUCCEEDED / FAILED |
| target_type / target_id | 対象リソース |
| request_id / trace_id | ログ追跡 |
| error_code / error_message | 利用者向け失敗情報 |
| retry_count | 再試行回数 |

## 🔄 リトライ・補償

| エラー | 方針 |
| --- | --- |
| R2 一時障害 | retry 対象 |
| Redis / Broker 障害 | 受付時は 503、処理中は監視対象 |
| 未対応形式 | retry しない |
| 画像サイズ上限超過 | retry しない |
| DB 整合性違反 | 原因を記録し、補償または手動確認 |

- DB 更新失敗時は保存済み object を削除対象へ登録する。
- 旧画像は新画像が READY になってから削除する。
- 孤立ファイル削除 task は冪等にする。

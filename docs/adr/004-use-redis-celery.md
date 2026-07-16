# ADR-004: Redis / Celery を Phase1 で採用する

## ステータス

採用

## 日付

2026-07-16

## 背景

Flowance Phase1 では、アイコン画像のアップロード、画像検証、WebP 変換、サムネイル生成、旧画像削除、孤立ファイル削除、Outbox dispatch、cleanup など、HTTP リクエスト中に完結させるべきではない処理がある。

基本設計、非同期処理設計、ファイル・画像管理設計、アイコン処理詳細設計では、Redis / Celery を Phase1 内で導入する方針としている。

## 決定

Phase1 で Redis / Celery を採用する。

- Redis は Celery Broker として利用する。
- Celery Worker は非同期タスクを処理する。
- 永続化が必要なタスク状態は background_tasks など PostgreSQL に保存する。
- Redis / Celery Result / CDN cache は正規データにしない。
- Celery の内部状態名を業務 API へそのまま露出しない。

Phase1 の主な Celery 対象:

- アイコン画像処理
- WebP 変換
- サムネイル生成
- 旧画像削除
- 孤立ファイル削除
- Outbox dispatch
- cleanup / maintenance

## 理由

- 画像変換やファイル削除は HTTP リクエストを長時間ブロックしやすい。
- 非同期化により、API レスポンスを安定させやすい。
- 画像処理失敗時に retry / compensation を設計できる。
- Redis は Celery Broker として一般的で、Django / Celery 構成と相性がよい。
- タスク状態を PostgreSQL に保持することで、正規状態と UI 表示を安定させられる。

## 影響

### 良い影響

- アイコン処理 API は 202 Accepted / PENDING / PROCESSING / READY / FAILED のような状態管理ができる。
- 旧画像削除や孤立ファイル削除を補償処理として扱える。
- 将来の Outbox や通知処理にも拡張しやすい。

### 注意点

- Redis / Celery Worker の運用が必要になる。
- Broker 障害時の API 挙動を定義する必要がある。
- Celery task の冪等性を意識する必要がある。
- タスクの失敗・滞留を監視する必要がある。

## 採用しない選択肢

| 選択肢 | 採用しない理由 |
| --- | --- |
| 全処理を同期 API で実行 | 画像変換やファイル削除で API 応答が不安定になる |
| Redis に業務状態を保存 | Redis は一時データ向きであり、正規データは PostgreSQL に置く方針と合わない |
| OS cron のみで処理 | API 起点の非同期タスク管理や retry と相性が悪い |

## Phase1 未対応事項

- 予定生成の非同期化
- 精算計算の非同期化
- 複雑なワークフローエンジン
- Celery Result Backend を業務 API の正規状態にすること
- 複数 worker pool の詳細チューニング

## 変更履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-07-16 | 1.0 | Redis を Celery Broker として利用し、Celery Worker を Phase1 で採用する ADR を作成 |

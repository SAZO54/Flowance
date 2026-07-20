# API設計書

## 1. 文書概要

Flowance Phase1 の REST API 共通仕様を定義する。対象は認証、クライアント、案件、契約、スケジュール、稼働実績、月次精算である。請求書、入金、分析、PDF生成、請求番号採番、請求残高更新は Phase2 対応とする。

## 2. 基本方針

- Base Path は `/api/v1`。
- JSON を基本とし、ファイルアップロードは `multipart/form-data`。
- JWT は HttpOnly Cookie に保存し、レスポンス本文へ含めない。
- 変更系 API では CSRF Token を検証する。
- 日時は ISO 8601、内部は UTC。
- ID は UUID。
- 更新可能リソースは `version` による楽観ロック。
- DELETE API では requestBody を使わず、`version` は query parameter で受け取る。
- OpenAPI 3.0.3 で Swagger UI 読み込み可能な YAML を管理する。

## 3. Phase1 主要 API

| 領域 | API |
| --- | --- |
| 認証 | `/auth/register`, `/auth/login`, `/auth/token/refresh`, `/auth/logout`, `/auth/me` |
| クライアント | `/clients`, `/clients/{clientId}` |
| 案件 | `/projects`, `/projects/{projectId}` |
| 契約 | `/projects/{projectId}/contracts`, `/projects/{projectId}/contracts/{contractId}` |
| スケジュール | `/calendar/events`, `/projects/{projectId}/weekly-schedules`, `/work-schedules` |
| 稼働実績 | `/work-records`, `/work-records/{recordId}` |
| 精算 | `/settlements/calculate`, `/settlements/{settlementId}`, `/settlements/{settlementId}/recalculate`, `/settlements/{settlementId}/finalize`, `/settlements/{settlementId}` DELETE |

## 4. Phase1 から除外する API

- 請求書 API
- 入金 API
- 分析 API
- 請求書 PDF API
- 請求書メール送信 API
- 全端末ログアウト API
- 汎用タスク状態取得 API

## 5. ドメインルールの API 反映

- 同一案件内の契約期間重複は禁止する。
- 契約期間重複は PostgreSQL の daterange(valid_from, valid_until + 1日, '[)') expression による exclusion constraint と Application 層検証で制御する。
- Phase1 の契約種別は `HOURLY`, `MONTHLY_RANGE`, `MONTHLY_FIXED`, `PERFORMANCE`。
- 月額精算幅契約は `baseMinutes` 差分基準で控除 / 超過を計算する。
- 案件APIのworkloadRateは後方互換用に残すがdeprecatedとし、Phase1 UIでは表示・入力しない。
- 契約削除はOWNER/ADMINのみ許可し、未確定精算で使用中の場合は409 CONTRACT_IN_USEを返す。
- 契約一覧・詳細は組織タイムゾーン基準のisCurrentを返す。
- 税額、源泉徴収額、合計額はバックエンドで Decimal 計算し、JPY は 1 円単位で丸める。
- 稼働実績の `actualMinutes`, `breakMinutes`, `billableMinutes` はバックエンドで計算し、リクエストでは受け取らない。
- 稼働実績は Phase1 では DRAFT 中心。DRAFT / CONFIRMED の厳密運用は Phase2 以降。
- 予定重複は登録を許可し、警告情報をレスポンスに含める。
- 予定生成 API は POST /api/v1/work-schedules/generate とし、dryRun=true ではDBへ保存せず候補・スキップ件数・warningsのみ返す。
- 予定生成の dayOfWeek は 0=日曜, 1=月曜, 2=火曜, 3=水曜, 4=木曜, 5=金曜, 6=土曜とする。
- 予定生成期間上限の初期値は100日とする。
- アイコン画像は元画像を `original_object_key`、変換後画像を `processed_object_key` として保持する。
- 本番ストレージは Cloudflare R2。

## 6. OpenAPI ファイル

- `docs/06_api/openapi/authentication_api.yaml`
- `docs/06_api/openapi/client_api.yaml`
- `docs/06_api/openapi/project_api.yaml`
- `docs/06_api/openapi/contract_api.yaml`
- `docs/06_api/openapi/schedule_api.yaml`
- `docs/06_api/openapi/work_records_api.yaml`
- `docs/06_api/openapi/settings_api.yaml`

## 7. 未対応事項

- 請求書管理
- 入金管理
- 分析
- ACCOUNTANT ロール
- 消費税丸めの組織別設定
- 複雑な成果物承認ワークフロー
- 稼働実績の DRAFT / CONFIRMED 厳密運用
- 汎用非同期タスク状態取得 API

## 8. 変更履歴

| 日付 | 版 | 内容 |
| --- | --- | --- |
| 2026-07-15 | 1.1 | Phase1 用 API 設計書として再整理。請求書・入金・分析を Phase2 へ移動。DELETE requestBody 不使用、契約種別、予定重複警告、稼働実績バックエンド計算、Celery / Redis / Cloudflare R2 方針を反映。 |
| 2026-07-16 | 1.2 | 予定生成 API /work-schedules/generate、dryRun、dayOfWeek定義、生成期間上限100日を反映。 |
| 2026-07-20 | 1.3 | 契約isCurrent、削除権限・CONTRACT_IN_USE、期間重複式、workloadRate非推奨を反映 |

## 9. Settings API（2026-07-21追加）

- GET /api/v1/settingsで現在利用者・組織の複合設定を取得する。
- PATCH /api/v1/settingsでprofile、organization、business、appearanceのうち指定した領域だけを一括更新する。
- requestのversionsは更新する集約のversionだけ必須とし、profile/appearanceはuser、organizationはorganization、businessはbusinessを使う。
- 複数領域は原子的に更新し、権限違反、入力不正、競合時は部分成功させない。
- OWNER以外がorganization/businessを含めた場合は403、version不一致は409 CONCURRENT_MODIFICATIONとする。
- emailはレスポンスのみ、銀行口座・通知設定はPhase2とする。

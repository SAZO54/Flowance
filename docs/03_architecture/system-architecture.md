# システムアーキテクチャ設計書

## 1. 文書概要

### 1.1 目的

本書は、Flowance Phase1 を構成する Next.js、Django REST Framework、PostgreSQL、Redis、Celery、Cloudflare R2、ファイルストレージ、認証、非同期処理、監査、可観測性、デプロイ構成の責務と依存関係を定義する。

Phase1 では、フリーランサーがクライアント、案件、契約、予定、稼働実績、月次精算を一貫して管理できる状態を対象とする。

### 1.2 参照元

本書は次の Phase1 文書と整合させる。

- 要件定義書
- 基本設計書
- ドメイン・業務ロジック設計書
- DB設計書
- API設計書

### 1.3 対象範囲

- システム全体構成
- フロントエンド構成
- バックエンド構成
- クリーンアーキテクチャ
- モジュール境界
- PostgreSQL
- Redis
- Celery
- Cloudflare R2 / ローカルファイルストレージ
- JWT / HttpOnly Cookie 認証
- CSRF / CORS
- トランザクション
- 楽観ロック
- 冪等性
- Outbox
- 画像処理
- 可観測性
- ローカル開発構成
- デプロイ構成

### 1.4 Phase1 対象外

以下は Phase2 以降で扱う。

- 収支画面
- 請求書管理
- 入金管理
- 分析画面
- ACCOUNTANT ロール
- PDF生成
- 請求番号採番
- 請求残高更新
- 複数通貨
- 適格請求書対応
- 外部カレンダー同期
- Slack通知
- LINE通知
- 会計ソフト連携
- 決済サービス連携
- 高度なBIダッシュボード
- ストップウォッチ式タイムトラッキング
- 稼働実績の DRAFT / CONFIRMED 厳密運用
- 稼働実績の承認フロー
- 確定済み稼働実績の編集制御
- 複雑な成果物承認ワークフロー
- AIによるアイコン生成
- SVGアイコンアップロード
- 画像編集機能
- マイクロサービス化
- Kubernetes

## 2. アーキテクチャ目標

Flowance Phase1 では、次の品質特性を重視する。

- 業務ルールを Django / DRF から独立させる
- 組織単位のテナント分離を保証する
- クライアント、案件、契約、予定、実績、精算の整合性を保証する
- 同一案件内の契約期間重複を防止する
- 同時更新による意図しない上書きを防止する
- 非同期処理を安全に再実行できる
- PostgreSQL 以外に正規データを持たない
- ファイルのバイナリを PostgreSQL へ保存しない
- 障害箇所をログと Trace ID から追跡できる
- 開発環境と本番環境の差を小さくする
- OpenAPI を API 仕様の正とする

## 3. システム全体構成

### 3.1 採用構成

ブラウザ → Next.js → Django REST Framework → PostgreSQL / Redis / Celery Worker / File Storage / Cloudflare R2 の構成とする。

### 3.2 コンポーネント責務

| コンポーネント | 技術 | Phase1の責務 |
| --- | --- | --- |
| ブラウザ | Chrome / Edge / Safari | 画面操作、Cookie保持、ファイル選択 |
| フロントエンド | Next.js / React / TypeScript | 画面表示、ルーティング、フォーム、API通信 |
| バックエンドAPI | Python / Django / DRF | 認証、認可、業務処理、API提供 |
| DB | PostgreSQL | 業務データ、認証データ、監査データ、冪等性、Outbox |
| Broker / 一時データ | Redis | Celery Broker、短時間キャッシュ、レート制限、一時状態 |
| 非同期処理 | Celery Worker | 画像変換、サムネイル生成、旧画像削除、孤立ファイル削除、Outbox処理 |
| ファイルストレージ | Django Storage API / Cloudflare R2 | アイコン元画像、表示用画像、一時生成ファイル |
| 画像処理 | Pillow | 画像検証、EXIF反映、トリミング、WebP変換 |
| API仕様 | drf-spectacular | OpenAPI、Swagger UI |

## 4. アーキテクチャ方針

### 4.1 デプロイ単位

Phase1 では、単一の Django バックエンドを中心に構成する。バックエンド内部は業務領域ごとの Django app として分割し、マイクロサービスには分割しない。

Phase1 の主要バックエンド app は次の通り。

- accounts
- organizations
- clients
- projects
- contracts
- work_schedules
- work_records
- settlements
- audits
- shared

invoices、payments、analytics は Phase2 以降の app とし、Phase1 の主要実装対象から外す。

### 4.2 レイヤー構成

Django の実用性を活かしつつ、クリーンアーキテクチャ相当の責務分離を行う。

Presentation → Application → Domain
Infrastructure → Application / Domain の Port を実装

依存規則:

- Presentation は Application へ依存する
- Application は Domain へ依存する
- Infrastructure は Application / Domain の Port を実装する
- Domain は Django、DRF、ORM、Redis、Celery、Pillow、Storage、HTTP へ依存しない
- DRF View / ViewSet / Serializer に複雑な業務判断を置かない

## 5. バックエンドアーキテクチャ

### 5.1 Domain 層

配置するもの:

- Entity
- Value Object
- Domain Service
- Domain Exception
- Repository Interface
- 業務上の列挙値
- 状態遷移規則
- 契約計算規則
- 契約期間重複判定
- 時間丸め規則
- 月次精算計算
- 税額・源泉徴収計算
- 初期アイコン生成規則

### 5.2 Application 層

配置するもの:

- Use Case
- Command
- Query
- DTO
- Repository Port
- Transaction Port
- File Storage Port
- Task Queue Port
- Clock Port
- Application Exception

代表的な Use Case:

- RegisterUser
- LoginUser
- RefreshToken
- LogoutUser
- GetCurrentUser
- CreateClient
- UpdateClient
- UploadClientIcon
- DeleteClientIcon
- CreateProject
- UpdateProject
- UploadProjectIcon
- DeleteProjectIcon
- CreateContract
- UpdateContract
- DeleteContract
- CreateWeeklySchedule
- GenerateWorkSchedules
- CreateWorkSchedule
- UpdateWorkSchedule
- DeleteWorkSchedule
- CreateWorkRecord
- UpdateWorkRecord
- DeleteWorkRecord
- CalculateSettlement
- RecalculateSettlement
- FinalizeSettlement
- DeleteUnfinalizedSettlement

### 5.3 Infrastructure 層

配置するもの:

- Django Model
- Django ORM Repository
- Domain Mapper
- Django Migration
- PostgreSQL 接続
- Redis Cache / Broker Adapter
- Celery Task Queue Adapter
- Django Storage Adapter
- Cloudflare R2 Storage Adapter
- JWT Adapter
- Pillow Image Processor

PDF Generator、Mail Adapter、Invoice / Payment Adapter は Phase2 以降で扱う。

### 5.4 Presentation 層

配置するもの:

- APIView / ViewSet
- Serializer
- Permission
- Filter
- Pagination
- URL
- Exception Handler
- OpenAPI 定義

Presentation 層は HTTP 入出力、境界入力検証、DTO変換、Use Case呼び出し、HTTPレスポンス変換を担当する。

## 6. フロントエンドアーキテクチャ

### 6.1 基本構成

Next.js App Router を採用する。

flowance-web/src/
  app/
  domain/
  application/
  infrastructure/
  presentation/
  shared/
  styles/

Phase2 の balance、invoice、analytics は Phase1 ではサイドメニューから非表示またはコメントアウトする。

### 6.2 Server Components

次の用途で Server Components を優先する。

- ルートページ
- レイアウト
- 初期データ取得
- 読み取り専用表示
- Metadata
- サーバー側認証状態確認

### 6.3 Client Components

次の用途で Client Components を使用する。

- フォーム
- カレンダー
- ドラッグ＆ドロップ
- モーダル
- ファイル選択
- 画像プレビュー
- API Mutation
- ローカル状態

### 6.4 API Adapter

API通信は Infrastructure 層に集約する。

src/infrastructure/api/
  apiClient.ts
  authApi.ts
  clientApi.ts
  projectApi.ts
  contractApi.ts
  scheduleApi.ts
  workRecordApi.ts
  settlementApi.ts

invoiceApi.ts、paymentApi.ts、analyticsApi.ts は Phase2 以降で追加する。

## 7. モジュール境界

### 7.1 Accounts

- 利用者
- JWT発行
- Token更新
- ログアウト
- パスワード
- normalized_email

### 7.2 Organizations

- 組織
- メンバー
- OWNER / ADMIN / MEMBER
- 組織設定
- テナント境界

### 7.3 Clients

- クライアント情報
- クライアントアイコン
- クライアント状態

Clients は Projects 内部実装へ依存しない。

### 7.4 Projects

- 案件
- 案件アイコン
- 案件状態
- クライアント関連

### 7.5 Contracts

- 契約履歴
- HOURLY
- MONTHLY_RANGE
- MONTHLY_FIXED
- PERFORMANCE
- 単価
- 精算条件
- 契約期間
- 同一案件内の契約期間重複禁止

### 7.6 Work Schedules

- 週次予定
- 個別予定
- 定期予定生成
- 個別上書き
- 予定重複警告

### 7.7 Work Records

- 稼働実績
- 休憩
- 実稼働時間
- 請求対象時間
- Phase1 は DRAFT 中心

DRAFT / CONFIRMED の厳密運用、承認フロー、確定後編集制御は Phase2 以降とする。

### 7.8 Settlements

- 月次精算
- 契約種別別計算
- 税
- 源泉徴収
- 精算確定
- 未確定精算削除

### 7.9 Audits

- 監査ログ
- 操作履歴
- 変更前後データ

## 8. データアーキテクチャ

### 8.1 正規データ

業務上の正規データは PostgreSQL へ保存する。Redis、Celery Result、ファイル名、フロントエンド状態を正規データとして扱わない。

### 8.2 テナント分離

組織所有データには organization_id を必須とする。Repository は ID だけで組織所有データを取得してはならない。

データ分離は次の層で実施する。

- DRF Permission
- Application Use Case
- Repository
- DB制約
- 統合テスト

### 8.3 認証データ

- 表示用 email と normalized_email を分けて保持する
- normalized_email は trim + lowercase で生成する
- normalized_email に UNIQUE 制約を付与する

### 8.4 金額

- Python では decimal.Decimal を使用する
- Django では DecimalField を使用する
- PostgreSQL では numeric を使用する
- float は使用しない

### 8.5 日時

- PostgreSQL へ UTC で保存する
- Python ではタイムゾーン付き datetime を使用する
- 表示時に利用者タイムゾーンへ変換する
- 初期タイムゾーンは Asia/Tokyo とする

## 9. PostgreSQL アーキテクチャ

### 9.1 用途

- 利用者
- 組織
- クライアント
- 案件
- 契約
- 予定
- 実績
- 精算
- 監査
- 冪等性
- Outbox
- background_tasks
- stored_files

Phase2 用の invoices、invoice_items、payments は将来拡張として考慮するが、Phase1 の機能実装対象からは外す。

### 9.2 Migration

- Django Migration を使用する
- 手動で本番スキーマを変更しない
- Migration ファイルを Git 管理する
- Migration は CI で検証する
- 本番デプロイ時に Migration を実行する

### 9.3 整合性

- 外部キー
- 一意制約
- CHECK制約
- NOT NULL
- 楽観ロック
- 必要最小限の悲観ロック
- PostgreSQL exclusion constraint

同一案件内の契約期間重複は、Application 検証と PostgreSQL exclusion constraint の両方で防止する。契約期間は valid_from / valid_until を保持し、DB制約では daterange expression を使う。

## 10. トランザクション・排他制御

### 10.1 基本方針

業務上不可分な処理は transaction.atomic 内で実行する。

対象:

- 利用者登録
- クライアント登録・更新
- 案件登録・更新
- 契約登録・更新・削除
- 予定生成・更新・削除
- 稼働実績登録・更新・削除
- 月次精算計算・再計算・確定・削除
- 冪等性キー登録
- Outboxイベント登録

### 10.2 楽観ロック

version カラムを使用する。

対象:

- Client
- Project
- ProjectContract
- WorkSchedule
- WorkRecord
- MonthlyProjectSettlement

version 不一致時は HTTP 409 を返す。

### 10.3 悲観ロック

Phase1 では楽観ロックを優先し、必要な場合のみ select_for_update を使用する。

候補:

- 冪等性キー確定
- 精算確定時の二重確定防止

## 11. 認証・認可アーキテクチャ

### 11.1 認証方式

- Django Authentication を利用者管理に使用する
- API認証には JWT を使用する
- djangorestframework-simplejwt を使用する
- Access Token と Refresh Token を発行する
- Token は HttpOnly Cookie へ保存する
- localStorage と sessionStorage には保存しない

### 11.2 CSRF / CORS

- Cookie による JWT 送信を採用するため、変更系APIで CSRF 検証を行う
- Django CSRF Protection を有効にする
- Next.js は X-CSRFToken を送信する
- CORS 許可 Origin を限定する
- CSRF Trusted Origins を明示する

### 11.3 認可

実際の操作可否は次で判定する。

- DRF Permission
- 組織メンバー情報
- Application Use Case
- Domain状態
- Repository の organization_id 条件

## 12. Redis / Celery アーキテクチャ

### 12.1 Redis

Redis は Phase1 内で導入する。主用途は Celery Broker とし、必要に応じて短時間キャッシュ、レート制限情報、一時的な処理状態にも利用する。

Redis を正規データの保存先にしない。

### 12.2 Celery

Celery は Phase1 内で導入する。

Phase1 の用途:

- アイコン画像処理
- サムネイル生成
- 旧画像削除
- 孤立ファイル削除
- 一時ファイル削除
- Outbox処理
- 失敗タスク再実行

PDF生成、メール送信、支払期限通知、週次レポート通知は Phase2 以降で扱う。

### 12.3 Queue

Phase1 の Queue:

- default
- images
- maintenance

invoices、notifications は Phase2 以降で追加する。

### 12.4 タスク設計

- タスクは冪等にする
- Task ID を記録する
- 一時障害だけを再試行する
- 指数バックオフを使用する
- 最大再試行回数を設定する
- 入力不備は再試行しない
- タイムアウトを設定する
- タスク内で大きなバイナリデータを受け渡さない
- ファイルは object_key で参照する

## 13. ファイル・画像アーキテクチャ

### 13.1 保存対象

- クライアントアイコン元画像
- クライアントアイコン表示用画像
- 案件アイコン元画像
- 案件アイコン表示用画像
- 一時生成ファイル

### 13.2 Storage Adapter

Application 層は Storage 実装へ直接依存しない。Infrastructure 層で LocalFileStorage と CloudflareR2Storage を実装する。

### 13.3 保存方式

開発環境:

- Django MEDIA_ROOT
- Docker Volume

本番環境:

- Cloudflare R2
- 非公開 Bucket
- 署名付きURL
- 必要に応じて CDN

### 13.4 オブジェクトキー

- organizations/{organization_id}/clients/{client_id}/icons/original/{uuid}.{ext}
- organizations/{organization_id}/clients/{client_id}/icons/processed/{uuid}.webp
- organizations/{organization_id}/projects/{project_id}/icons/original/{uuid}.{ext}
- organizations/{organization_id}/projects/{project_id}/icons/processed/{uuid}.webp

DB には original_object_key、processed_object_key、content_type、file_size、checksum、width、height などのメタデータを保存する。ファイルのバイナリデータは保存しない。

### 13.5 画像処理

- 最大ファイルサイズは 5MB
- 最大縦横サイズは 4096px × 4096px
- 総ピクセル数は 16,777,216 pixels を上限とする
- SVG は受け付けない
- MIME Type と画像実体を検証する
- EXIF Orientation を反映する
- メタデータを削除する
- 中央トリミングする
- WebP へ変換する
- 64×64、128×128、256×256 を生成する

## 14. API / エラーアーキテクチャ

### 14.1 API 共通仕様

- Base Path は /api/v1
- JSON を基本とする
- ファイルは multipart/form-data
- 日時は ISO 8601
- 一覧はページング対応
- 更新は version 必須
- 非同期処理受付は HTTP 202
- GET、HEAD、DELETE API では requestBody を使用しない
- OpenAPI を仕様の正とする

### 14.2 Phase1 主要API

- 認証API
- クライアントAPI
- 案件API
- 契約API
- カレンダーAPI
- 週次予定API
- 個別予定API
- 稼働実績API
- 精算API

請求書API、入金API、分析APIは Phase2 以降で扱う。

### 14.3 エラー

エラーは Domain Error、Application Error、Infrastructure Error、Presentation Error に分類する。Infrastructure 例外をそのまま利用者へ公開しない。

## 15. セキュリティアーキテクチャ

- 外部通信は HTTPS を必須とする
- PostgreSQL と Redis を外部公開しない
- Cloudflare R2 Bucket は非公開を基本とする
- JWT を HttpOnly Cookie へ保存する
- CSRF 対策を実施する
- CORS 許可 Origin を限定する
- organization_id によるテナント分離を行う
- normalized_email に UNIQUE 制約を付与する
- ファイル拡張子だけを信用しない
- SVG を許可しない
- アップロード先を実行不可とする
- Secret は環境変数または Secret Manager で管理する

## 16. 可観測性アーキテクチャ

### 16.1 ログ

JSON形式の構造化ログを使用する。

主な記録項目:

- timestamp
- level
- service
- environment
- trace_id
- request_id
- user_id
- organization_id
- method
- path
- status
- duration_ms
- task_id
- task_name
- retry_count

### 16.2 メトリクス

- APIリクエスト数
- APIエラー率
- p95応答時間
- DB Query時間
- DB接続数
- Redis応答時間
- Celery待機タスク数
- Celery成功率
- Celery失敗率
- タスク処理時間
- 未処理Outbox数
- ファイル処理失敗数

### 16.3 Trace

Trace ID を Browser、Next.js、Django API、Celery Task 間で引き継ぐ。

## 17. 障害設計

### 17.1 PostgreSQL障害

- 更新処理を停止する
- API は 503 を返す
- Redis 上のキャッシュだけで更新処理を継続しない

### 17.2 Redis障害

- キャッシュ障害時は PostgreSQL へフォールバックする
- Redis 障害によって正規データを失わない
- Celery Broker が利用不能な場合は非同期処理受付を失敗させる
- 障害を 503 として通知する

### 17.3 Celery Worker停止

- APIで受け付けたタスクは Redis に待機する
- Worker 復旧後に処理を再開する
- タスク滞留数を監視する

### 17.4 ファイルストレージ障害

- ファイルアップロードを 503 とする
- ファイル object_key を DB へ確定しない
- 一時障害は Celery で再試行する

## 18. デプロイ・ローカル開発構成

### 18.1 デプロイ単位

- Next.js
- Django API
- Celery Worker
- PostgreSQL
- Redis
- Cloudflare R2

Celery Beat は定期メンテナンスが必要になった段階で導入する。

### 18.2 デプロイ順序

- PostgreSQL、Redis、R2 の疎通確認
- Django Migration
- Django API デプロイ
- Celery Worker デプロイ
- Next.js デプロイ
- Smoke Test

### 18.3 ローカル開発構成

フロントエンドは Docker Compose では起動せず、ホスト環境で Next.js 開発サーバーとして起動する。

flowance-web/
  npm run dev

Docker Compose ではバックエンド関連サービスだけを起動する。

- backend
- postgres
- redis
- celery-worker
- file-storage 用 Volume

必要に応じて Mailpit、Flower、Prometheus、Grafana を追加する。

## 19. CI/CD アーキテクチャ

Pull Request:

- Ruff Lint
- Ruff Format Check
- mypy
- Django System Check
- Migration 差分確認
- pytest
- PostgreSQL 統合テスト
- Redis 統合テスト
- Celery タスクテスト
- TypeScript 型チェック
- ESLint
- Next.js 本番ビルド
- Vitest
- Playwright
- Docker ビルド
- OpenAPI 仕様検証

main ブランチ:

- コンテナイメージ作成
- レジストリへ Push
- Django Migration
- 各サービスのデプロイ
- Smoke Test
- 失敗時のロールバック

## 20. アーキテクチャ制約

- バックエンド言語は Python とする
- Webフレームワークは Django とする
- API は Django REST Framework とする
- フロントエンドは Next.js App Router とする
- DB は PostgreSQL とする
- Redis を Phase1 から使用する
- Celery を Phase1 から使用する
- 本番ファイルストレージは Cloudflare R2 とする
- JWT を HttpOnly Cookie へ保存する
- 金額計算に float を使用しない
- 組織データを ID だけで取得しない
- 業務ロジックを View、ViewSet、Serializer へ実装しない
- 正規データを Redis だけへ保存しない
- ファイルのバイナリを PostgreSQL へ保存しない
- API仕様の正は OpenAPI とする
- DBスキーマの正は Django Migration とする

## 21. Architecture Decision Record

次の ADR を作成または管理する。

- ADR-001: Python / Django の採用
- ADR-002: Django REST Framework の採用
- ADR-003: Next.js App Router の採用
- ADR-004: クリーンアーキテクチャ相当の責務分離
- ADR-005: PostgreSQL の採用
- ADR-006: JWT の HttpOnly Cookie 保存
- ADR-007: Redis の採用
- ADR-008: Celery の採用
- ADR-009: Cloudflare R2 の採用
- ADR-010: Decimal による金額計算
- ADR-011: Outbox パターンの採用
- ADR-012: 予定と実績の分離
- ADR-013: 契約履歴の分離
- ADR-014: valid_from / valid_until + daterange expression による契約期間重複制約

## 22. Phase1 未対応事項

- 収支画面
- 請求書管理
- 入金管理
- 分析画面
- ACCOUNTANT ロール
- PDF生成
- 請求番号採番
- 請求残高更新
- 複数通貨
- 適格請求書対応
- 外部カレンダー同期
- 通知系処理
- 会計ソフト連携
- 決済サービス連携
- 高度なBIダッシュボード
- 稼働実績の DRAFT / CONFIRMED 厳密運用
- 稼働実績の承認フロー
- 確定済み稼働実績の編集制御
- 複雑な成果物承認ワークフロー
- マイクロサービス化
- Kubernetes

## 23. 未確定事項

| 論点 | 確認内容 |
| --- | --- |
| 本番ホスティングサービス | Next.js / Django / PostgreSQL / Redis / Worker の具体的な配置先 |
| CDN の利用有無 | R2 配信に CDN を併用するか |
| Redis の冗長化方式 | 本番運用前に決定 |
| Redis の永続化方式 | Broker用途中心のため要否を本番運用前に決定 |
| Celery Worker の初期並列数 | 実装後の負荷を見て決定 |
| Celery Result の保持期間 | background_tasks との役割分担を踏まえて決定 |
| PostgreSQL バックアップ方式 | 本番運用前に決定 |
| 性能目標 | p95応答時間、同時利用者数、バッチ処理時間 |
| 可用性SLA | 本番運用前に決定 |
| RPO / RTO | 本番運用前に決定 |
| 月内で契約が切り替わる場合の精算 | Phase1では月内1契約運用を基本とし、必要なら日割り・期間分割を検討 |
| 成果報酬契約の成果物承認フロー | Phase1では成果金額を明示入力または契約条件参照とし、承認ワークフローはPhase2以降 |

## 24. 変更履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-07-02 | 1.0 | 初版作成 |
| 2026-07-10 | 1.1 | Phase1用のシステムアーキテクチャ設計書へ全面更新。旧技術表記を Django / DRF / Django ORM / Django Migration 前提へ修正。請求書・入金・分析を Phase2 へ移動し、Redis / Celery / Cloudflare R2 / アイコン画像処理 / ローカル開発構成 / 未対応事項 / 未確定事項を反映 |

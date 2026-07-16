# バックエンドクリーンアーキテクチャ設計書

## 1. 文書概要

本書は Flowance Phase1 の Django / DRF バックエンドにおけるレイヤー構成、依存規則、モジュール境界、データ整合性、トランザクション、非同期処理、API境界を定義する。

Phase1 の対象は、認証、組織、クライアント、案件、アイコン、契約、予定、稼働実績、月次精算、監査ログ、冪等性、OpenAPI とする。請求書、入金、分析は Phase2 以降で扱う。

## 2. レイヤー構成

Presentation → Application → Domain を基本とし、Infrastructure は Application / Domain の Port を実装する。

依存規則:

- Domain は Django、DRF、Django ORM、PostgreSQL、Redis、Celery、Pillow、Storage、HTTP に依存しない
- Application はユースケースとトランザクション境界を定義する
- Presentation は HTTP 入出力と DTO 変換を担当する
- Infrastructure は外部技術との接続を担当する
- DRF View / ViewSet / Serializer に複雑な業務判断を置かない

## 3. Domain 層

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

主なドメインルール:

- 同一案件内の契約期間重複は禁止する
- 別案件同士の契約期間重複は許可する
- 契約種別は HOURLY、MONTHLY_RANGE、MONTHLY_FIXED、PERFORMANCE を扱う
- 月額精算幅契約は base_minutes 差分基準で控除・超過を計算する
- 税額は税率単位で1回だけ丸める
- 源泉徴収は1円未満切り捨てとする
- 稼働実績の actual_minutes、break_minutes、billable_minutes はバックエンドで計算する
- Phase1 の稼働実績は DRAFT 中心で運用する
- 初期アイコン色は安定IDベースで決定し、名称変更時は文字のみ更新する

## 4. Application 層

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

Phase2 以降の Use Case:

- 請求書下書き作成
- 請求書発行
- 入金登録
- 請求書PDF生成
- 請求残高更新

## 5. Infrastructure 層

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

## 6. Presentation 層

配置するもの:

- APIView / ViewSet
- Serializer
- Permission
- Filter
- Pagination
- URL
- Exception Handler
- OpenAPI 定義

Presentation 層の責務:

- HTTP入力の受け取り
- 境界入力検証
- Application DTO への変換
- Use Case 呼び出し
- HTTPレスポンスへの変換

## 7. バックエンドディレクトリ構成

flowance-api/
  config/
    settings/
    urls.py
    asgi.py
    wsgi.py
    celery.py
  flowance/
    accounts/
    organizations/
    clients/
    projects/
    contracts/
    work_schedules/
    work_records/
    settlements/
    audits/
    shared/
  tests/
    unit/
    integration/
    api/

機能モジュール内部:

projects/
  domain/
  application/
  infrastructure/
  presentation/api/
  apps.py

## 8. モジュール境界

### 8.1 Accounts

- 利用者
- JWT発行
- Token更新
- ログアウト
- パスワード
- normalized_email

### 8.2 Organizations

- 組織
- メンバー
- OWNER / ADMIN / MEMBER
- 組織設定
- テナント境界

### 8.3 Clients

- クライアント情報
- クライアントアイコン
- クライアント状態

### 8.4 Projects

- 案件
- 案件アイコン
- 案件状態
- クライアント関連

### 8.5 Contracts

- 契約履歴
- 契約種別
- 単価
- 精算条件
- 契約期間
- 同一案件内の契約期間重複禁止

### 8.6 Work Schedules

- 週次予定
- 個別予定
- 定期予定生成
- 個別上書き
- 予定重複警告

### 8.7 Work Records

- 稼働実績
- 休憩
- 実稼働時間
- 請求対象時間
- Phase1 は DRAFT 中心

### 8.8 Settlements

- 月次精算
- 契約種別別計算
- 税
- 源泉徴収
- 精算確定
- 未確定精算削除

### 8.9 Audits

- 監査ログ
- 操作履歴
- 変更前後データ

## 9. データ・整合性

- 正規データは PostgreSQL へ保存する
- Redis、Celery Result、ファイル名、フロントエンド状態を正規データとして扱わない
- organization_id によるテナント分離を徹底する
- 表示用 email と normalized_email を分けて保持する
- normalized_email に UNIQUE 制約を付与する
- 金額計算は decimal.Decimal / DecimalField / numeric を使用する
- 契約期間重複は Application 検証と PostgreSQL exclusion constraint の両方で防止する
- 契約期間は DateRangeField を通常カラムとして持たず、valid_from / valid_until と daterange expression を使う

## 10. トランザクション・排他制御

業務上不可分な処理は transaction.atomic 内で実行する。

楽観ロック対象:

- Client
- Project
- ProjectContract
- WorkSchedule
- WorkRecord
- MonthlyProjectSettlement

悲観ロック候補:

- 冪等性キー確定
- 精算確定時の二重確定防止

## 11. Redis / Celery / Outbox

Redis は Phase1 内で導入し、主に Celery Broker として利用する。正規データは Redis に保存しない。

Celery は Phase1 内で導入し、次を担当する。

- アイコン画像処理
- サムネイル生成
- 旧画像削除
- 孤立ファイル削除
- 一時ファイル削除
- Outbox処理
- 失敗タスク再実行

Phase1 の Queue:

- default
- images
- maintenance

invoices、notifications は Phase2 以降で追加する。

## 12. ファイル・画像

本番ファイルストレージは Cloudflare R2 を採用する。Application 層は Storage 実装へ直接依存しない。

保存対象:

- クライアントアイコン元画像
- クライアントアイコン表示用画像
- 案件アイコン元画像
- 案件アイコン表示用画像
- 一時生成ファイル

DB には original_object_key、processed_object_key、content_type、file_size、checksum、width、height などのメタデータを保存する。ファイルのバイナリデータは保存しない。

## 13. API / エラー

- Base Path は /api/v1
- JSON を基本とする
- ファイルは multipart/form-data
- 更新は version 必須
- 非同期処理受付は HTTP 202
- GET、HEAD、DELETE API では requestBody を使用しない
- OpenAPI を仕様の正とする

Phase1 主要API:

- 認証API
- クライアントAPI
- 案件API
- 契約API
- カレンダーAPI
- 週次予定API
- 個別予定API
- 稼働実績API
- 精算API

## 14. Phase1 未対応事項

- 請求書管理
- 入金管理
- 分析
- PDF生成
- 通知系処理
- 稼働実績の DRAFT / CONFIRMED 厳密運用
- 稼働実績の承認フロー
- 確定済み稼働実績の編集制御
- 複雑な成果物承認ワークフロー

## 15. 変更履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-07-10 | 1.0 | Phase1用に Django / DRF 前提のバックエンドクリーンアーキテクチャ設計書へ更新 |

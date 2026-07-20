# DB設計書

## 1. 文書概要

本書はFlowance Phase1で使用するPostgreSQLの論理データモデル、主要テーブル、制約、インデックス、データ保持方針を定義する。

Phase1の対象は、認証、組織、基本権限、クライアント、案件、アイコン、契約、スケジュール、稼働実績、月次精算、監査ログ、楽観ロック、冪等性、非同期処理である。

## 2. Phase1対象範囲

### 2.1 DB設計対象

- 認証、利用者、組織、組織メンバー
- クライアント、案件、案件メンバー
- クライアント/案件アイコン、ファイルメタデータ
- 契約、週次予定、個別予定、稼働実績、休憩時間
- 月次精算
- 監査ログ、冪等性キー、Outbox、バックグラウンドタスク
- SimpleJWTのRefresh Tokenブラックリスト

### 2.2 Phase1対象外

- 請求書、請求明細、請求番号採番、請求書PDF
- 入金、消込、請求残高、過入金
- 収支、分析、レポート用集計
- ACCOUNTANTロール
- 外部カレンダー連携
- 稼働実績の厳密な承認、締め、確定ワークフロー
- 組織別の消費税丸め設定

## 3. 基本方針

- DBはPostgreSQLを採用する。
- スキーマ管理はDjango ORMとDjango Migrationで行う。
- Migrationファイルは `apps/<app>/migrations/` にapp単位で配置し、中央の単一ディレクトリへ集約しない。
- 適用済みMigrationは履歴の一部として保持し、配置変更や内容の書き換えを行わない。
- Phase1では単一DB、共有スキーマ、organization_idによるテナント分離とする。
- 業務データは原則organization_idを持つ。
- 金額は整数の最小通貨単位で保持する。JPYでは円単位のintegerまたはbigintとする。
- 税率、源泉徴収率、稼働率など小数を含む値はdecimalで保持する。
- 業務上重要な整合性はApplication層の検証に加えてDB制約でも担保する。
- 更新競合が起きうる主要テーブルにはversionを持たせ、楽観ロックを行う。
- 利用者、組織、クライアント、案件、契約、予定、実績、ファイルは原則として論理削除を採用する。

## 4. 命名規則

- テーブル名はsnake_caseの複数形を基本とする。
- 主キーはid、型はuuidとする。
- 外部キーは参照先単数形_idとする。
- 作成日時はcreated_at、更新日時はupdated_at、論理削除日時はdeleted_atとする。
- 作成者、更新者はcreated_by_id、updated_by_idとする。
- オブジェクトストレージ上のキーはpathではなくobject_keyを使用する。
- 元画像はoriginal_object_key、変換後画像はprocessed_object_keyで保持する。

## 5. ER図

~~~mermaid
erDiagram
    USERS ||--o{ ORGANIZATION_MEMBERS : belongs_to
    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : has
    USERS ||--o{ PROJECT_MEMBERS : assigned
    ORGANIZATIONS ||--o{ PROJECT_MEMBERS : owns
    PROJECTS ||--o{ PROJECT_MEMBERS : has

    USERS ||--o{ ORGANIZATIONS : owns
    ORGANIZATIONS ||--o{ CLIENTS : owns
    ORGANIZATIONS ||--o{ PROJECTS : owns
    ORGANIZATIONS ||--o{ STORED_FILES : owns

    CLIENTS ||--o{ PROJECTS : has
    STORED_FILES ||--o{ CLIENTS : client_icon
    STORED_FILES ||--o{ PROJECTS : project_icon

    PROJECTS ||--o{ PROJECT_CONTRACTS : has
    PROJECTS ||--o{ PROJECT_WEEKLY_SCHEDULES : has
    PROJECTS ||--o{ WORK_SCHEDULES : has
    PROJECTS ||--o{ WORK_RECORDS : has
    PROJECTS ||--o{ MONTHLY_PROJECT_SETTLEMENTS : has

    USERS ||--o{ PROJECT_WEEKLY_SCHEDULES : scheduled_for
    USERS ||--o{ WORK_SCHEDULES : scheduled_for
    USERS ||--o{ WORK_RECORDS : worked_by

    PROJECT_WEEKLY_SCHEDULES ||--o{ WORK_SCHEDULES : generates
    WORK_SCHEDULES o|--o{ WORK_RECORDS : recorded_from
    WORK_RECORDS ||--o{ WORK_BREAKS : has

    PROJECT_CONTRACTS ||--o{ MONTHLY_PROJECT_SETTLEMENTS : calculated_by

    ORGANIZATIONS ||--o{ AUDIT_LOGS : records
    ORGANIZATIONS ||--o{ IDEMPOTENCY_KEYS : scopes
    ORGANIZATIONS ||--o{ OUTBOX_EVENTS : emits
    ORGANIZATIONS ||--o{ BACKGROUND_TASKS : runs
~~~

## 6. 共通カラム

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。原則としてアプリケーションでUUIDを採番する。 |
| organization_id | uuid | NO | 組織ID。一部の認証・組織テーブルを除き必須。 |
| version | integer | NO | 楽観ロック用。更新成功時に1増加する。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |
| deleted_at | timestamptz | YES | 論理削除日時。論理削除対象テーブルで使用する。 |
| created_by_id | uuid | YES | 作成者。usersテーブルのidを参照する。 |
| updated_by_id | uuid | YES | 更新者。usersテーブルのidを参照する。 |

## 7. テーブル一覧

| テーブル | Phase1 | 概要 |
|---|---|---|
| users | 対象 | 利用者 |
| organizations | 対象 | 組織 |
| organization_members | 対象 | 組織メンバー、基本権限 |
| project_members | 対象 | 案件単位メンバー。細分化はPhase3以降 |
| stored_files | 対象 | アイコン画像などのファイルメタデータ |
| clients | 対象 | クライアント |
| projects | 対象 | 案件 |
| project_contracts | 対象 | 案件契約 |
| project_weekly_schedules | 対象 | 週次予定テンプレート |
| work_schedules | 対象 | カレンダー表示対象の予定 |
| work_records | 対象 | 稼働実績 |
| work_breaks | 対象 | 稼働実績内の休憩時間 |
| monthly_project_settlements | 対象 | 月次精算 |
| audit_logs | 対象 | 監査ログ |
| idempotency_keys | 対象 | 冪等性キー |
| outbox_events | 対象 | 非同期イベント |
| background_tasks | 対象 | Celery等のバックグラウンド処理状態 |
| token_blacklist_outstandingtoken | 対象 | SimpleJWT outstanding token |
| token_blacklist_blacklistedtoken | 対象 | SimpleJWT blacklisted token |

## 8. 主要テーブル定義

### 8.1 users

利用者を管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| email | varchar(254) | NO | 表示・通知用メールアドレス。入力値の表記をできるだけ保持する。 |
| normalized_email | varchar(254) | NO | 重複判定用。trimと小文字化で生成。UNIQUE。 |
| password | varchar(128) | NO | Djangoハッシュ済みパスワード。平文は保持しない。 |
| display_name | varchar(100) | NO | 表示名。 |
| timezone | varchar(64) | NO | 利用者タイムゾーン。例: Asia/Tokyo。 |
| status | varchar(20) | NO | ACTIVE, SUSPENDED, DELETED。 |
| is_active | boolean | NO | Django互換。有効ユーザーか。 |
| is_staff | boolean | NO | Django管理画面用。 |
| is_superuser | boolean | NO | Django管理画面用。 |
| last_login | timestamptz | YES | 最終ログイン日時。 |
| token_valid_after | timestamptz | YES | 全トークン無効化境界。Phase1では任意。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |
| deleted_at | timestamptz | YES | 論理削除日時。 |


制約・方針:

- normalized_emailはemailから生成する。Gmail固有のドット除去など、プロバイダ依存の正規化は行わない。

### 8.2 organizations

組織を管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| name | varchar(150) | NO | 組織名。 |
| owner_user_id | uuid | NO | 初期OWNER。usersテーブルのidを参照。 |
| currency | char(3) | NO | 既定通貨。Phase1はJPY中心。 |
| timezone | varchar(64) | NO | 組織既定タイムゾーン。 |
| status | varchar(20) | NO | ACTIVE, SUSPENDED, DELETED。 |
| version | integer | NO | 楽観ロック用。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |
| deleted_at | timestamptz | YES | 論理削除日時。 |


制約・方針:

- 消費税丸め方式の組織別設定はPhase2以降とし、Phase1ではApplication層の固定ルールを使う。

### 8.3 organization_members

組織への所属と基本権限を管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | NO | organizationsテーブルのidを参照。 |
| user_id | uuid | NO | usersテーブルのidを参照。 |
| role | varchar(20) | NO | OWNER, ADMIN, MEMBER。Phase1ではACCOUNTANTを持たない。 |
| status | varchar(20) | NO | ACTIVE, INVITED, SUSPENDED。 |
| joined_at | timestamptz | YES | 参加日時。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |
| deleted_at | timestamptz | YES | 論理削除日時。 |


制約・方針:

- UNIQUE(organization_id, user_id) where deleted_at is null。
- OWNERは最低1名必要。削除、降格時はApplication層で検証する。

### 8.4 project_members

案件単位のメンバー割当を管理する。Phase1では基本的な割当のみとし、細かい権限分離はPhase3以降に拡張する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | NO | organizationsテーブルのidを参照。 |
| project_id | uuid | NO | projectsテーブルのidを参照。 |
| user_id | uuid | NO | usersテーブルのidを参照。 |
| role | varchar(20) | NO | MANAGER, MEMBER。 |
| can_view | boolean | NO | 閲覧可否。Phase1は基本true想定。 |
| can_edit_schedule | boolean | NO | 予定編集可否。 |
| can_edit_work_record | boolean | NO | 稼働実績編集可否。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |
| deleted_at | timestamptz | YES | 論理削除日時。 |


制約・方針:

- UNIQUE(project_id, user_id) where deleted_at is null。
- project_idの組織とuser_idの所属組織が一致することをApplication層で検証する。

### 8.5 stored_files

アイコン画像などのファイルメタデータを管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | NO | organizationsテーブルのidを参照。 |
| category | varchar(30) | NO | CLIENT_ICON, PROJECT_ICON, TEMPORARY。 |
| status | varchar(20) | NO | PENDING, PROCESSING, READY, FAILED, DELETED。 |
| storage_provider | varchar(30) | NO | LOCAL, CLOUDFLARE_R2。 |
| bucket_name | varchar(255) | YES | バケット名。LOCALではnull可。 |
| original_object_key | varchar(1024) | YES | アップロード元画像のオブジェクトキー。元画像保持用。 |
| processed_object_key | varchar(1024) | YES | WebP等へ変換後のオブジェクトキー。 |
| original_filename | varchar(255) | YES | 元ファイル名。 |
| content_type | varchar(100) | YES | MIME Type。 |
| file_size_bytes | bigint | YES | 元ファイルサイズ。0以上。 |
| checksum_sha256 | char(64) | YES | 元ファイルチェックサム。 |
| width | integer | YES | 変換後画像幅。READY時は正数。 |
| height | integer | YES | 変換後画像高さ。READY時は正数。 |
| variants | jsonb | YES | サムネイル等の派生情報。 |
| error_code | varchar(100) | YES | 失敗理由コード。 |
| error_message | text | YES | 失敗理由。 |
| created_by_id | uuid | YES | 作成者。usersテーブルのidを参照。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |
| deleted_at | timestamptz | YES | 論理削除日時。 |


制約・方針:

- Phase1のアップロード上限は5MB、最大4096px x 4096px、最大ピクセル数16,777,216とする。
- 本番ストレージはCloudflare R2、ローカル開発ではLOCALを使用できる。

### 8.6 clients

クライアントを管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | NO | organizationsテーブルのidを参照。 |
| name | varchar(150) | NO | クライアント名。組織内で論理削除されていない名前は一意。 |
| contact_name | varchar(100) | YES | 担当者名。 |
| email | varchar(254) | YES | 連絡先メール。 |
| phone | varchar(50) | YES | 電話番号。 |
| postal_code | varchar(20) | YES | 郵便番号。 |
| address | text | YES | 住所。 |
| status | varchar(20) | NO | ACTIVE, INACTIVE。 |
| notes | text | YES | 備考。 |
| icon_type | varchar(20) | NO | DEFAULT, UPLOADED。 |
| icon_status | varchar(20) | NO | READY, PENDING, PROCESSING, FAILED。 |
| icon_file_id | uuid | YES | stored_filesテーブルのidを参照。DEFAULT時はnull、UPLOADED時はnot null。 |
| default_icon_text | varchar(4) | NO | UUIDのSHA-256から決定する動物絵文字。 |
| default_icon_background_color | char(7) | NO | UUIDのSHA-256から決定する水色系以外の淡色背景。 |
| default_icon_text_color | char(7) | NO | 互換用文字色。Phase1は #294B5B。 |
| version | integer | NO | 楽観ロック用。 |
| created_by_id | uuid | YES | 作成者。 |
| updated_by_id | uuid | YES | 更新者。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |
| deleted_at | timestamptz | YES | 論理削除日時。 |


制約・方針:

- クライアント名変更時もUUIDベースの初期アイコン3項目は変更しない。

### 8.7 projects

案件を管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | NO | organizationsテーブルのidを参照。 |
| client_id | uuid | NO | clientsテーブルのidを参照。 |
| name | varchar(150) | NO | 案件名。クライアント内で論理削除されていない名前は一意。 |
| description | text | YES | 説明。 |
| label_color | char(7) | NO | カレンダー表示色。 |
| status | varchar(20) | NO | ACTIVE, INACTIVE, COMPLETED。 |
| start_date | date | YES | 案件管理上の開始日。契約期間ではない。 |
| end_date | date | YES | 案件管理上の終了日。契約期間ではない。 |
| workload_rate | numeric(5,2) | YES | 後方互換用の非推奨項目。0から100。Phase1 UIでは非表示。 |
| notes | text | YES | 備考。 |
| icon_type | varchar(20) | NO | DEFAULT, UPLOADED。 |
| icon_status | varchar(20) | NO | READY, PENDING, PROCESSING, FAILED。 |
| icon_file_id | uuid | YES | stored_filesテーブルのidを参照。DEFAULT時はnull、UPLOADED時はnot null。 |
| default_icon_text | varchar(4) | NO | UUIDのSHA-256から決定する動物絵文字。 |
| default_icon_background_color | char(7) | NO | UUIDのSHA-256から決定する水色系以外の淡色背景。 |
| default_icon_text_color | char(7) | NO | 互換用文字色。Phase1は #294B5B。 |
| version | integer | NO | 楽観ロック用。 |
| created_by_id | uuid | YES | 作成者。 |
| updated_by_id | uuid | YES | 更新者。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |
| deleted_at | timestamptz | YES | 論理削除日時。 |


制約・方針:

- 案件名変更時もUUIDベースの初期アイコン3項目は変更しない。
- start_date/end_dateは契約期間ではなく、案件管理上の表示、検索、計画用期間として保持する。

### 8.8 project_contracts

案件ごとの契約条件を管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | NO | organizationsテーブルのidを参照。 |
| project_id | uuid | NO | projectsテーブルのidを参照。 |
| contract_type | varchar(30) | NO | HOURLY, MONTHLY_RANGE, MONTHLY_FIXED, PERFORMANCE。 |
| currency | char(3) | NO | 通貨。Phase1はJPY中心。 |
| hourly_rate | bigint | YES | 時間単価。HOURLYで必須。 |
| monthly_rate | bigint | YES | 月額単価。MONTHLY_RANGE/MONTHLY_FIXEDで必須。 |
| performance_amount | bigint | YES | 成果報酬額。PERFORMANCEで必須。 |
| minimum_minutes | integer | YES | 月額精算幅の下限分。MONTHLY_RANGEで必須。 |
| maximum_minutes | integer | YES | 月額精算幅の上限分。MONTHLY_RANGEで必須。 |
| base_minutes | integer | YES | 控除・超過計算の基準分。MONTHLY_RANGEで必須。 |
| deduction_rate | bigint | YES | 控除単価。MONTHLY_RANGEで必須。 |
| overtime_rate | bigint | YES | 超過単価。MONTHLY_RANGEで必須。 |
| tax_rate | numeric(5,2) | NO | 消費税率。 |
| withholding_tax_rate | numeric(5,2) | NO | 源泉徴収率。 |
| rounding_unit_minutes | integer | YES | 丸め単位分。HOURLY/MONTHLY_RANGEで使用。 |
| rounding_method | varchar(20) | YES | ROUND_DOWN, ROUND_UP, ROUND_HALF_UP。 |
| closing_day | integer | YES | 締日。31は月末扱い。 |
| payment_terms_days | integer | YES | 支払サイト日数。 |
| valid_from | date | NO | 契約開始日。 |
| valid_until | date | YES | 契約終了日。nullは無期限。 |
| status | varchar(20) | NO | ACTIVE, INACTIVE。 |
| version | integer | NO | 楽観ロック用。 |
| created_by_id | uuid | YES | 作成者。 |
| updated_by_id | uuid | YES | 更新者。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |
| deleted_at | timestamptz | YES | 論理削除日時。 |


制約・方針:

- 同一案件内の契約期間重複は禁止し、別案件同士の契約期間重複は許可する。
- btree_gist拡張を有効化し、project_idとdaterange式によるexclusion constraintを設定する。
- DateRangeFieldは持たず、valid_from/valid_untilを正とする。
- 月額精算幅の控除、超過計算はbase_minutesとの差分を基準にする。
- 確定済み精算はcalculation_snapshotとcontract_id参照を保持したまま契約の論理削除を許可する。
- 未確定精算がcontract_idで参照する契約は論理削除を拒否する。

### 8.9 project_weekly_schedules

週次予定テンプレートを管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | NO | organizationsテーブルのidを参照。 |
| project_id | uuid | NO | projectsテーブルのidを参照。 |
| user_id | uuid | NO | 担当利用者。usersテーブルのidを参照。 |
| day_of_week | smallint | NO | 曜日。0から6。 |
| start_time | time | NO | 開始時刻。 |
| end_time | time | NO | 終了時刻。start_timeより後。 |
| break_minutes | integer | NO | 予定休憩分。0以上。 |
| valid_from | date | NO | 有効開始日。 |
| valid_until | date | YES | 有効終了日。nullは無期限。 |
| status | varchar(20) | NO | ACTIVE, INACTIVE。 |
| version | integer | NO | 楽観ロック用。 |
| created_by_id | uuid | YES | 作成者。 |
| updated_by_id | uuid | YES | 更新者。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |
| deleted_at | timestamptz | YES | 論理削除日時。 |

### 8.10 work_schedules

カレンダーに表示する予定を管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | NO | organizationsテーブルのidを参照。 |
| project_id | uuid | NO | projectsテーブルのidを参照。 |
| user_id | uuid | NO | 担当利用者。usersテーブルのidを参照。 |
| weekly_schedule_id | uuid | YES | 生成元週次予定。project_weekly_schedulesテーブルのidを参照。 |
| title | varchar(150) | NO | 表示タイトル。 |
| scheduled_start_at | timestamptz | NO | 予定開始日時。 |
| scheduled_end_at | timestamptz | NO | 予定終了日時。scheduled_start_atより後。 |
| break_minutes | integer | NO | 予定休憩分。0以上。 |
| status | varchar(20) | NO | PLANNED, CANCELLED。 |
| is_generated | boolean | NO | 週次予定から生成されたか。 |
| is_manually_overridden | boolean | NO | 手動上書きされたか。 |
| notes | text | YES | 備考。 |
| version | integer | NO | 楽観ロック用。 |
| created_by_id | uuid | YES | 作成者。 |
| updated_by_id | uuid | YES | 更新者。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |
| deleted_at | timestamptz | YES | 論理削除日時。 |


制約・方針:

- Phase1では予定重複をDB制約で禁止しない。同一ユーザーの時間重複はApplication層で検出し、警告表示ありで保存可能とする。

### 8.11 work_records

稼働実績を管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | NO | organizationsテーブルのidを参照。 |
| project_id | uuid | NO | projectsテーブルのidを参照。 |
| user_id | uuid | NO | 利用者。usersテーブルのidを参照。 |
| work_schedule_id | uuid | YES | 紐づく予定。work_schedulesテーブルのidを参照。 |
| actual_start_at | timestamptz | NO | 実績開始日時。 |
| actual_end_at | timestamptz | NO | 実績終了日時。actual_start_atより後。 |
| actual_minutes | integer | NO | 実働分。バックエンド計算。0以上。 |
| break_minutes | integer | NO | 休憩分合計。バックエンド計算。0以上。 |
| billable_minutes | integer | NO | 請求対象分。バックエンド計算。actual_minutes以下。 |
| is_billable | boolean | NO | 請求対象か。 |
| status | varchar(20) | NO | DRAFT, CONFIRMED。Phase1はDRAFT中心。 |
| notes | text | YES | 備考。 |
| version | integer | NO | 楽観ロック用。 |
| created_by_id | uuid | YES | 作成者。 |
| updated_by_id | uuid | YES | 更新者。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |
| deleted_at | timestamptz | YES | 論理削除日時。 |


制約・方針:

- Phase1ではDRAFT中心の運用とし、DRAFT/CONFIRMEDの厳密な締め運用はPhase2以降とする。
- actual_minutes、break_minutes、billable_minutesはフロントエンドから受け取らず、バックエンドで計算する。

### 8.12 work_breaks

稼働実績に含まれる休憩時間を管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | NO | organizationsテーブルのidを参照。 |
| work_record_id | uuid | NO | work_recordsテーブルのidを参照。 |
| start_at | timestamptz | NO | 休憩開始日時。 |
| end_at | timestamptz | NO | 休憩終了日時。start_atより後。 |
| break_minutes | integer | NO | 休憩分。バックエンド計算。0以上。 |
| sort_order | integer | NO | 表示順。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |


制約・方針:

- 休憩時間が実績時間内に収まること、休憩同士が重複しないことはApplication層で検証する。

### 8.13 monthly_project_settlements

案件単位の月次精算結果を管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | NO | organizationsテーブルのidを参照。 |
| project_id | uuid | NO | projectsテーブルのidを参照。 |
| contract_id | uuid | NO | project_contractsテーブルのidを参照。 |
| settlement_month | date | NO | 精算月。月初日で保持。 |
| calculation_basis | varchar(20) | NO | ACTUAL, SCHEDULED。 |
| scheduled_minutes | integer | NO | 予定分。0以上。 |
| actual_minutes | integer | NO | 実績分。0以上。 |
| billable_minutes | integer | NO | 請求対象分。0以上。 |
| base_amount | bigint | NO | 基本金額。 |
| deduction_amount | bigint | NO | 控除額。 |
| overtime_amount | bigint | NO | 超過額。 |
| tax_amount | bigint | NO | 消費税額。 |
| withholding_amount | bigint | NO | 源泉徴収額。 |
| total_amount | bigint | NO | 合計額。 |
| calculation_snapshot | jsonb | NO | 計算時の契約・税率・丸め条件のスナップショット。 |
| status | varchar(20) | NO | CALCULATED, FINALIZED。 |
| finalized_at | timestamptz | YES | 確定日時。 |
| finalized_by_id | uuid | YES | 確定者。usersテーブルのidを参照。 |
| version | integer | NO | 楽観ロック用。 |
| created_by_id | uuid | YES | 作成者。 |
| updated_by_id | uuid | YES | 更新者。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |
| deleted_at | timestamptz | YES | 論理削除日時。 |


制約・方針:

- UNIQUE(organization_id, project_id, settlement_month) where deleted_at is null。
- FINALIZED状態は削除不可、再計算不可とする。CALCULATED状態は削除可能とする。
- 税額は税率単位で一度だけ丸める。Phase1は消費税ROUND_DOWN、源泉徴収ROUND_DOWNを既定とする。

### 8.14 audit_logs

監査ログを管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | YES | organizationsテーブルのidを参照。認証など組織未確定操作ではnull可。 |
| actor_user_id | uuid | YES | 操作者。usersテーブルのidを参照。システム操作ではnull可。 |
| action | varchar(100) | NO | 操作種別。 |
| resource_type | varchar(100) | NO | 対象種別。 |
| resource_id | uuid | YES | 対象ID。 |
| before | jsonb | YES | 変更前。必要最小限の差分。 |
| after | jsonb | YES | 変更後。必要最小限の差分。 |
| ip_address | inet | YES | IPアドレス。 |
| user_agent | text | YES | User-Agent。 |
| trace_id | uuid | YES | トレースID。 |
| created_at | timestamptz | NO | 作成日時。 |


制約・方針:

- 認証、権限変更、契約変更、精算確定、削除操作は監査ログ対象とする。
- 個人情報を含む場合は必要最小限の差分にする。

### 8.15 idempotency_keys

冪等性キーを管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | NO | organizationsテーブルのidを参照。 |
| user_id | uuid | NO | usersテーブルのidを参照。 |
| idempotency_key | uuid | NO | クライアント指定キー。 |
| request_method | varchar(10) | NO | HTTPメソッド。 |
| request_path | varchar(255) | NO | リクエストパス。 |
| request_hash | char(64) | NO | リクエスト本文等のハッシュ。 |
| response_status | integer | YES | 保存済みレスポンスステータス。 |
| response_body | jsonb | YES | 保存済みレスポンス本文。 |
| status | varchar(20) | NO | PROCESSING, COMPLETED, FAILED。 |
| expires_at | timestamptz | NO | 有効期限。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |


制約・方針:

- UNIQUE(organization_id, idempotency_key)。
- 同一キーでrequest_hashが異なる場合は409 Conflictとする。

### 8.16 outbox_events

DB更新と非同期イベント発行の整合性を保つためのOutboxを管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | YES | organizationsテーブルのidを参照。組織に属さないイベントではnull可。 |
| event_type | varchar(100) | NO | イベント種別。 |
| aggregate_type | varchar(100) | NO | 集約種別。 |
| aggregate_id | uuid | NO | 集約ID。 |
| payload | jsonb | NO | ペイロード。 |
| status | varchar(20) | NO | PENDING, PROCESSING, PUBLISHED, FAILED。 |
| retry_count | integer | NO | リトライ回数。0以上。 |
| next_retry_at | timestamptz | YES | 次回リトライ日時。 |
| published_at | timestamptz | YES | 発行日時。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |


制約・方針:

- Phase1ではアイコン処理、監査補助、将来通知連携の入口として使用する。

### 8.17 background_tasks

Celery等の非同期処理状態を管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | uuid | NO | 主キー。 |
| organization_id | uuid | YES | organizationsテーブルのidを参照。 |
| task_type | varchar(100) | NO | IMAGE_PROCESSING, FILE_DELETE, OUTBOX_DISPATCH, CLEANUP。 |
| resource_type | varchar(100) | YES | 対象種別。 |
| resource_id | uuid | YES | 対象ID。 |
| celery_task_id | varchar(255) | YES | CeleryタスクID。 |
| status | varchar(20) | NO | PENDING, PROCESSING, SUCCEEDED, FAILED, CANCELLED。 |
| progress | integer | NO | 0から100。 |
| result | jsonb | YES | 処理結果。 |
| error_code | varchar(100) | YES | エラーコード。 |
| error_message | text | YES | エラー内容。 |
| retry_count | integer | NO | リトライ回数。0以上。 |
| started_at | timestamptz | YES | 開始日時。 |
| finished_at | timestamptz | YES | 終了日時。 |
| expires_at | timestamptz | YES | 表示期限。 |
| created_at | timestamptz | NO | 作成日時。 |
| updated_at | timestamptz | NO | 更新日時。 |


制約・方針:

- Phase1でCeleryとRedisを導入する。RedisはCelery Brokerとして使用する。
- Phase1キューはdefault、images、maintenanceを基本とする。

### 8.18 token_blacklist_outstandingtoken

SimpleJWTが発行済みRefresh Tokenを管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | bigint | NO | SimpleJWT標準の主キー。 |
| user_id | uuid | YES | usersテーブルのidを参照。 |
| jti | varchar(255) | NO | JWT ID。UNIQUE。 |
| token | text | NO | Refresh Token文字列。 |
| created_at | timestamptz | YES | 作成日時。 |
| expires_at | timestamptz | NO | 有効期限。 |


制約・方針:

- Django REST Framework SimpleJWTのtoken_blacklistアプリが提供する標準テーブルを使用する。

### 8.19 token_blacklist_blacklistedtoken

SimpleJWTが無効化済みRefresh Tokenを管理する。

| カラム | 型 | NULL | 制約・説明 |
|---|---|---|---|
| id | bigint | NO | SimpleJWT標準の主キー。 |
| token_id | bigint | NO | token_blacklist_outstandingtokenテーブルのidを参照。UNIQUE。 |
| blacklisted_at | timestamptz | NO | ブラックリスト登録日時。 |


制約・方針:

- ログアウト時にRefresh Tokenをブラックリスト登録する。

## 9. 主要インデックス方針

| テーブル | インデックス | 目的 |
|---|---|---|
| users | normalized_email unique | ログイン、重複防止 |
| organization_members | organization_id, user_id unique | 所属重複防止 |
| clients | organization_id, status, updated_at | 一覧検索 |
| clients | organization_id, name | 名前検索 |
| projects | organization_id, client_id, status | 案件一覧 |
| projects | organization_id, start_date, end_date | 期間検索 |
| project_contracts | project_id, valid_from, valid_until | 契約取得 |
| work_schedules | organization_id, user_id, scheduled_start_at, scheduled_end_at | カレンダー取得 |
| work_records | organization_id, user_id, actual_start_at, actual_end_at | 実績一覧 |
| monthly_project_settlements | organization_id, project_id, settlement_month unique | 精算重複防止 |
| audit_logs | organization_id, created_at | 監査検索 |
| idempotency_keys | organization_id, idempotency_key unique | 冪等性保証 |
| outbox_events | status, next_retry_at | 非同期処理 |
| background_tasks | status, created_at | タスク監視 |

## 10. 契約期間重複制約

同一案件内で契約期間が重複すると、精算時に適用契約が一意に決まらない。そのため、Application層の検証に加えてDB制約でも禁止する。

採用方針:

- DateRangeField専用カラムは持たない。
- valid_fromとvalid_untilを業務上の正とする。
- PostgreSQLのdaterange expressionを使ってexclusion constraintを作る。
- valid_untilは業務上「その日を含む」ため、DB制約ではvalid_until + 1 dayの半開区間に変換する。
- valid_untilがnullの場合はinfinityとして扱う。
- deleted_at is nullの行のみ制約対象にする。

論理式:

- project_idが同じ
- daterange(valid_from, valid_untilの翌日またはinfinity, half-open)が重なる
- deleted_at is null

この条件を満たす行をDBで拒否する。

## 11. 金額計算と丸め方針

Phase1のDBは計算結果を保持し、計算過程はcalculation_snapshotに保存する。

- 消費税は税率単位で一度だけ計算し、ROUND_DOWNを既定とする。
- 源泉徴収はROUND_DOWNを既定とする。
- 合計額は丸め済みの税額、源泉徴収額を使って算出する。
- 月額精算幅契約の控除、超過はbase_minutesとの差分で計算する。
- minimum_minutesとmaximum_minutesは契約上の精算幅、表示、警告、妥当性検証に使用する。
- 組織別の丸め方式設定はPhase2以降とする。

## 12. データ保持、バックアップ、メンテナンス

- PostgreSQLの自動バックアップ、PITR、RPO/RTOはインフラ設計で最終決定する。
- audit_logsは長期保持対象とするが、具体的な保持年数は未確定事項とする。
- idempotency_keysは短期保持とし、期限切れをmaintenanceキューで削除する。
- background_tasksはUI確認に必要な期間だけ保持し、期限切れをmaintenanceキューで削除する。
- stored_filesの削除はDB論理削除後、CeleryでCloudflare R2またはLOCALストレージ上のオブジェクトを非同期削除する。

## 13. Phase1未対応事項

以下はPhase1ではDB実装対象外とする。

- 請求書、請求明細、請求番号採番
- 請求書PDF生成、PDFファイルメタデータ
- 入金、消込、請求残高、過入金管理
- 収支、分析、レポート用集計テーブル
- ACCOUNTANTロール
- DAILY契約
- 外部カレンダー連携
- 稼働実績の厳密な確定、承認、締め処理
- 組織別消費税丸め方式設定
- 電子帳簿保存法、インボイス制度対応の詳細DB

## 14. 未確定事項

- 本番PostgreSQLの運用サービス、バックアップ方式、RPO/RTO
- Redisの永続化、冗長化、監視レベル
- Celery workerの並列数、リトライ間隔、タスク保持期限
- audit_logsの保持年数、アーカイブ方式
- idempotency_keysの具体的な保持期限
- background_tasksのUI表示期限
- 月途中契約変更時の日割り、按分ルール
- PERFORMANCE契約の成果承認フロー
- Cloudflare R2のバケット分割、ライフサイクルポリシー、CDN連携方式

## 15. 変更履歴

| 日付 | バージョン | 変更内容 |
|---|---|---|
| 2026-07-14 | 1.2 | 各テーブルの主なカラムを型、NULL、制約・説明付きの表形式へ変更。DB設計書内にER図章を追加。 |
| 2026-07-11 | 1.1 | Phase1対象へ全面整理。請求書、入金、ACCOUNTANTをPhase2へ移動。Django/DRF/PostgreSQL前提へ統一。normalized_email、Cloudflare R2、Celery/Redis、契約期間重複制約、月額固定契約、成果報酬契約、アイコン元画像保持、DRAFT中心の稼働実績方針を反映。 |
| 2026-07-09 | 1.0 | 初版作成。 |
| 2026-07-20 | 1.3 | project_contracts追加項目、期間重複制約、精算参照時の論理削除条件、workload_rate非推奨を反映 |
| 2026-07-20 | 1.4 | Django app単位のMigration配置と適用済みMigration不変方針を明記 |

## 21. Settings関連テーブル拡張（2026-07-21追加）

### users追加カラム

| カラム | 型 | NULL | 説明 |
|---|---|---|---|
| family_name | varchar(100) | NO | 姓。未設定は空文字。 |
| given_name | varchar(100) | NO | 名。未設定は空文字。 |
| phone_number | varchar(32) | NO | 電話番号。未設定は空文字。 |
| bio | text | NO | 自己紹介。未設定は空文字。 |
| week_starts_on | varchar(10) | NO | MONDAYまたはSUNDAY。 |
| time_format | varchar(3) | NO | H24またはH12。 |
| compact_mode | boolean | NO | コンパクト表示。 |
| version | positive integer | NO | profile/appearance共通の楽観ロック。 |

### organization_business_profiles

Organizationと1対1で、屋号、postal_code、prefecture、address、invoice_registration_number、default_tax_rate、version、created_at、updated_atを保持する。銀行口座はPhase2まで保持しない。default_tax_rateは将来請求用であり、契約・精算の計算元にはしない。

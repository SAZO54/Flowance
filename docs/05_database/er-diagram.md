# ER図

## 1. 概要

本書は、Flowance Phase1のDB設計に対応するER図を示す。

Phase1では、認証、組織、基本権限、クライアント、案件、アイコン、契約、スケジュール、稼働実績、月次精算、監査ログ、冪等性、非同期処理を対象とする。

請求書、請求明細、入金、収支、分析、ACCOUNTANTロールはPhase2以降の対象であり、このER図には含めない。

## 2. Phase1 ER図

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

## 3. 主要リレーション

### 3.1 認証、組織、権限

- usersとorganizationsはorganization_membersを介して多対多で関連する。
- organization_members.roleはOWNER、ADMIN、MEMBERのみをPhase1対象とする。
- ACCOUNTANTはPhase2以降とする。
- project_membersは案件単位の割当を表す。細かな編集権限分離はPhase3以降に拡張する。

### 3.2 クライアント、案件、アイコン

- organizationsは複数のclientsとprojectsを持つ。
- clientsは複数のprojectsを持つ。
- clientsとprojectsはアイコンとしてstored_filesを参照できる。
- DEFAULTアイコンではstored_filesを参照せず、default_icon_text、default_icon_background_color、default_icon_text_colorを使用する。
- UPLOADEDアイコンではstored_filesを参照し、original_object_keyとprocessed_object_keyで元画像と変換後画像を保持する。

### 3.3 契約

- projectsは複数のproject_contractsを持つ。
- 同一案件内の契約期間重複は禁止する。
- 別案件同士の契約期間重複は許可する。
- 契約期間制約はvalid_from、valid_untilから作るdaterange expressionとexclusion constraintで担保する。
- Phase1の契約種別はHOURLY、MONTHLY_RANGE、MONTHLY_FIXED、PERFORMANCEとする。

### 3.4 スケジュール、稼働実績

- project_weekly_schedulesは週次予定テンプレートを表す。
- work_schedulesはカレンダー表示対象の個別予定を表す。
- work_recordsは実際の稼働実績を表す。
- work_breaksはwork_recordsに属する休憩時間を表す。
- Phase1では予定重複をDBで禁止せず、Application層で検出して警告表示ありで保存可能とする。
- Phase1の稼働実績はDRAFT中心で運用し、厳密なDRAFT/CONFIRMED運用はPhase2以降とする。

### 3.5 月次精算

- monthly_project_settlementsはprojectとproject_contractに紐づく。
- settlement_monthは月初日で保持する。
- 同一organization、project、settlement_monthで重複を禁止する。
- FINALIZED状態の精算は削除、再計算不可とする。
- CALCULATED状態の精算は削除可能とする。

### 3.6 非同期処理、監査、冪等性

- audit_logsは重要操作を記録する。
- idempotency_keysは確定系APIの二重実行を防止する。
- outbox_eventsはDB更新と非同期イベント発行の整合性を保つ。
- background_tasksはCeleryタスクの処理状態を保持する。
- Phase1ではRedisとCeleryを導入し、画像処理、ファイル削除、Outbox処理、メンテナンス処理を対象とする。

## 4. Phase1対象外のER要素

以下はPhase2以降で追加する。

- invoices
- invoice_items
- payments
- invoice_number_sequences
- invoice_pdf_filesまたは請求書PDF用stored_filesカテゴリ
- analytics用集計テーブル
- external_calendar_accounts
- external_calendar_events

## 5. 変更履歴

| 日付 | バージョン | 変更内容 |
|---|---|---|
| 2026-07-14 | 1.2 | DB設計書内へのER図追加に合わせ、ER図ファイルの変更履歴を更新。 |
| 2026-07-11 | 1.1 | Phase1 DB設計に合わせてER図を更新。請求書、入金、ACCOUNTANTをPhase2対象外へ移動し、stored_files、background_tasks、project_members、月額固定契約、成果報酬契約、契約期間重複制約方針を反映。 |
| 2026-07-09 | 1.0 | 初版作成。 |

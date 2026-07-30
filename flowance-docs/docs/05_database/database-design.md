# DB設計書

- Status: Phase1
- Version: 1.5
- Updated: 2026-07-30
- Source: Notion「DB設計書」

## 採用DBと整合性

PostgreSQLを採用し、Django ORMとDjango Migrationで管理する。業務上重要な整合性はApplication層の検証とDB制約の両方で担保する。

同一案件内の契約期間重複は禁止し、Application検証に加えてPostgreSQLのdaterange expressionを使うexclusion constraintで防止する。別案件間の重複は許可する。

## users追加項目

| カラム | 型 | NULL | 制約 |
| --- | --- | --- | --- |
| display_name | varchar(100) | NO | 表示名 |
| last_name | varchar(50) | YES | 姓 |
| first_name | varchar(50) | YES | 名 |
| phone | varchar(20) | YES | 入力は数字のみ15桁以内 |
| bio | varchar(1000) | YES | 自己紹介 |

emailはvarchar(254) NOT NULL、normalized_emailはvarchar(254) NOT NULL UNIQUEとする。

## organizations追加項目

| カラム | 型 | NULL | 制約 |
| --- | --- | --- | --- |
| name | varchar(150) | NO | 組織名 |
| trade_name | varchar(150) | YES | 屋号 |
| postal_code | varchar(20) | YES | 郵便番号 |
| prefecture | varchar(20) | YES | 都道府県 |
| address | varchar(500) | YES | 住所 |
| version | integer | NO | 楽観ロック |

適格請求書発行事業者番号はPhase1では保持しない。

## projects

statusは次の4値へ統一する。

- ACTIVE
- PAUSED
- COMPLETED
- ARCHIVED

nameはvarchar(150) NOT NULL。descriptionとnotesはApplication / Serializerで1000文字以内に制限する。

## work_schedules

| カラム | 型 | NULL | 制約 |
| --- | --- | --- | --- |
| project_id | uuid | NO | 同一organizationの案件 |
| work_content | varchar(200) | NO | 作業内容 |
| scheduled_start_at | timestamptz | NO | 開始日時 |
| scheduled_end_at | timestamptz | NO | 終了日時、開始より後 |
| notes | varchar(1000) | YES | メモ |
| status | varchar(20) | NO | PLANNED / CANCELLED / COMPLETED |
| version | integer | NO | 楽観ロック |

## 画像メタデータ

Phase1のアップロード上限は5MB、最大4096px x 4096px、最大ピクセル数16,777,216とする。MIME Typeと実画像を検証する。

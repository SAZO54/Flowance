# バリデーション詳細設計書

- Status: Phase1
- Version: 1.2
- Source: Notion「バリデーション詳細設計書」
- Source URL: https://www.notion.so/3a4ff2dc6fe98143a9a3c7589bcd4b8a

## 1. 文書概要

### 1.1 目的

本書は、Flowance Phase1 における入力検証、業務ルール検証、整合性制約、エラー応答、フロントエンド制御、テスト観点を横断的に定義する。

既存のドメイン設計書、契約・売上計算詳細設計書、ADR に分散しているバリデーション方針を、実装時に参照しやすい形で集約する。

### 1.2 対象範囲

- 認証・登録
- クライアント管理
- 案件管理
- アイコン・画像アップロード
- 契約管理
- 週次予定・個別作業予定
- 稼働実績
- 月次精算
- 共通 API 制御
- エラー応答
- フロントエンド入力制御
- バックエンド最終検証
- DB 制約

### 1.3 前提

- フロントエンドバリデーションは UX 向上と不要な API 呼び出し削減を目的とする。
- セキュリティ、認可、業務ルール、整合性の最終判定はバックエンドで必ず実施する。
- DB 制約は同時実行や実装漏れに対する最終防衛として使用する。
- API の正は OpenAPI と DRF Serializer に同期する。

### 1.4 参照資料

- `docs/04_domain/domain-business-logic-design.md`
- `docs/15_contract-revenue/contract-revenue-calculation-design.md`
- `docs/adr/001-use-django.md`
- `docs/adr/002-use-jwt.md`
- `docs/adr/003-use-clean-architecture.md`
- `docs/adr/004-use-redis-celery.md`
- `docs/adr/005-use-decimal-for-money.md`

## 2. バリデーション責務分担

| レイヤー | 主な責務 | 例 |
| --- | --- | --- |
| Frontend | 入力補助、即時エラー表示、不要項目の送信抑止 | 必須、形式、日付前後、契約種別ごとの表示切替 |
| API / Serializer | HTTP 入力形式、型、required、enum、DTO 変換 | UUID、date、decimal、status、request body 形式 |
| Application | ユースケース単位の整合性、認可、テナント境界、トランザクション | organization 境界、version、契約期間重複の事前検証 |
| Domain | 業務ルール、不変条件、計算前提、状態遷移 | 契約種別ルール、時間丸め、精算状態遷移 |
| Infrastructure / DB | 永続化制約、同時実行時の最終防衛 | unique、foreign key、exclusion constraint |

## 3. 共通バリデーション

| 項目 | Frontend | Backend | DB | エラー方針 |
| --- | --- | --- | --- | --- |
| 認証 | 未ログイン時はログインへ誘導 | JWT / Cookie を検証 | - | 401 UNAUTHORIZED |
| 認可 | 操作 UI の出し分け | 権限を必ず検証 | - | 403 FORBIDDEN |
| CSRF | 変更系 API に X-CSRFToken を付与 | POST / PUT / PATCH / DELETE で検証 | - | 403 FORBIDDEN |
| organization 境界 | ユーザーに直接入力させない | 対象リソースがログイン利用者の organization に属することを検証 | organization_id を保持 | 403 または 404 |
| UUID | 原則、選択値・URL 由来のみ使用 | UUID 形式を検証 | uuid 型 | 400 VALIDATION_ERROR |
| 日付 | YYYY-MM-DD 入力 | date として検証 | date 型 | 400 VALIDATION_ERROR |
| 年月 | YYYY-MM 入力 | 月初日へ変換 | date 型 | 400 VALIDATION_ERROR |
| 日時 | 開始 &lt; 終了を即時検証 | ISO 8601 UTC と範囲を検証 | timestamp 型 | 400 / 422 |
| 金額 | 0 以上、数値のみ | Decimal として 0 以上を検証 | numeric / bigint | 422 |
| 分数 | 0 以上の整数 | integer として 0 以上を検証 | integer | 422 |
| 税率 | 0 以上 100 以下 | Decimal として範囲検証 | numeric | 422 |
| version | 更新・削除・確定時に保持して送信 | 現在値と一致することを検証 | integer | 409 CONCURRENT_MODIFICATION |
| Idempotency-Key | 重要操作で生成・保持 | 同一 key と request hash を検証 | idempotency_keys | 400 / 409 |

## 4. フロントエンドバリデーション方針

### 4.1 基本方針

- required、形式、範囲、日付前後、休憩重複など、ユーザーが即時修正できるものはフロントエンドで検証する。
- 契約種別により不要な項目は非表示、disabled、または送信 payload から除外する。
- フロントエンドで計算表示する actual_minutes、break_minutes、billable_minutes は参考値とし、API へ送信しない。
- 認可、organization 境界、DB 既存状態に依存する検証は、フロントエンドでは補助表示に留める。
- API エラーは field error と global error に分けて表示する。

### 4.2 共通 UI 制御

| 制御 | 内容 |
| --- | --- |
| 必須表示 | required 項目はラベルまたはフォーム状態で明示する |
| 送信ボタン制御 | 明らかな入力不備がある場合は送信不可にする |
| 不要項目制御 | 契約種別などにより不要な入力は送信しない |
| 数値入力 | マイナス不可、必要に応じて整数のみ |
| 日付入力 | date picker を使用し、範囲外選択を抑止する |
| API エラー反映 | details が項目に紐づく場合は該当フォームへ表示する |
| 競合エラー | 409 は再読み込み、差分確認、再実行導線を表示する |

## 5. 画面・領域別バリデーション

### 5.1 認証・登録

| 項目 | Frontend | Backend |
| --- | --- | --- |
| email | 必須、メール形式、小文字正規化 | 重複確認、形式検証 |
| password | 必須、12文字以上128文字以下。文字種の組み合わせは強制しない | Django標準バリデータで一般的な値、ユーザー属性類似値、数字のみを拒否。平文保存禁止 |
| displayName | 必須、trim後空不可、最大100文字 | `users.display_name` varchar(100) NOT NULL |

### 5.2 クライアント追加・編集

| 項目 | Frontend | Backend / DB |
| --- | --- | --- |
| アイコン | 任意。JPEG / PNG / WebP、最大5MB、最大4096px x 4096px、最大16,777,216 pixels。SVG不可 | MIME、実画像、容量、縦横、総画素数、icon_type と icon_file_id の整合性を検証 |
| 会社名・屋号 | 必須、trim後空不可、最大150文字 | `clients.name` varchar(150) NOT NULL。組織内の未削除データで名称重複不可 |
| 担当者名 | 任意、最大100文字 | `clients.contact_name` varchar(100) |
| ステータス | 必須、ACTIVE / INACTIVE のみ | enum と状態遷移を検証 |
| メールアドレス | 任意、メール形式、最大254文字 | `clients.email` varchar(254)。形式を再検証 |
| 電話番号 | 任意、数字のみ。国内番号は10から11桁を基本、国際番号は最大15桁。「-」は入力不可 | `clients.phone` varchar(50)。許容形式は API 仕様と統一 |
| 郵便番号 | 任意、数字のみ7桁を基本、最大20文字。「-」は入力不可 | `clients.postal_code` varchar(20)。許容形式は API 仕様と統一 |
| 住所 | 任意、最大500文字 | `clients.address` text。Application / Serializer で上限を検証 |
| 備考 | 任意、最大1000文字 | `clients.notes` text。Application / Serializer で最大1000文字を検証 |
| version | 編集時必須 | 現在値と一致すること。不一致は409 |

### 5.3 案件追加・編集

| 項目 | Frontend | Backend / DB |
| --- | --- | --- |
| アイコン | 任意。JPEG / PNG / WebP、最大5MB、最大4096px x 4096px、最大16,777,216 pixels。SVG不可 | MIME、実画像、容量、縦横、総画素数、icon_type と icon_file_id の整合性を検証 |
| 案件名 | 必須、trim後空不可、最大150文字 | `projects.name` varchar(150) NOT NULL。クライアント内の未削除データで名称重複不可 |
| クライアント | 選択必須 | `projects.client_id` uuid NOT NULL。同一 organization の client であることを検証 |
| ステータス | 必須。ACTIVE / PAUSED / COMPLETED / ARCHIVED | `projects.status` varchar(20) NOT NULL。enum と状態遷移を検証 |
| 説明 | 任意、最大1000文字 | `projects.description` text。Application / Serializer で最大1000文字を検証 |
| 開始日 | 任意、有効な日付。終了日がある場合は終了日以前 | `projects.start_date` date。期間整合を再検証 |
| 終了日 | 任意、有効な日付。開始日がある場合は開始日以後 | `projects.end_date` date。期間整合を再検証 |
| 備考 | 任意、最大1000文字 | `projects.notes` text。Application / Serializer で最大1000文字を検証 |
| version | 編集時必須 | 現在値と一致すること。不一致は409 |

### 5.4 アイコン・画像アップロード

| 項目 | Frontend | Backend |
| --- | --- | --- |
| file | アップロード操作時は必須 | ファイル存在を検証 |
| 形式 | JPEG / PNG / WebP のみ。SVG不可 | MIME Type、拡張子、実画像の内容を検証 |
| ファイルサイズ | 最大5MB | 最大5MBを再検証 |
| 画像サイズ | 最大4096px x 4096px、最大16,777,216 pixels | 縦横と総画素数を再検証 |
| 画像内容 | アップロード前に preview を表示し、破損画像は拒否 | Pillow で検証、トリミング、WebP 変換 |

### 5.5 設定更新

| 項目 | Frontend | Backend / DB |
| --- | --- | --- |
| 表示名 | 必須、trim後空不可、最大100文字 | `users.display_name` varchar(100) NOT NULL |
| 姓 / 名 | 任意、それぞれ最大50文字 | `users.last_name` / `users.first_name` varchar(50) |
| メールアドレス | 必須、メール形式、最大254文字 | `users.email` varchar(254) NOT NULL。正規化後の重複を検証 |
| 電話番号 | 任意、数字のみ、最大15桁 | `users.phone` varchar(20)。数字のみ最大15桁を再検証 |
| 自己紹介 | 任意、最大1000文字 | `users.bio` varchar(1000) |
| 組織名 | 必須、trim後空不可、最大150文字 | `organizations.name` varchar(150) NOT NULL |
| 屋号 | 任意、最大150文字 | `organizations.trade_name` varchar(150) |
| 郵便番号 | 任意、最大20文字 | `organizations.postal_code` varchar(20) |
| 都道府県 | 任意、最大20文字 | `organizations.prefecture` varchar(20) |
| 住所 | 任意、最大500文字 | `organizations.address` varchar(500) |
| 適格請求書発行事業者番号 | Phase1では入力項目を表示しない | Phase1対象外。インボイス制度対応時にDB / APIへ追加する |
| version | 組織更新時は必須 | 現在値と一致すること。不一致は409 |

## 6. 契約バリデーション

### 6.1 契約共通

| 項目 | Frontend | Backend | エラー |
| --- | --- | --- | --- |
| project_id | 画面文脈から設定し手入力させない | 同一 organization の有効案件であること | 404 / 403 |
| contract_type | Phase1 対応種別のみ選択 | HOURLY / MONTHLY_RANGE / MONTHLY_FIXED / PERFORMANCE | 422 |
| currency | JPY 固定 | JPY のみ | 422 |
| tax_rate | 0 以上 100 以下 | 0 以上 100 以下 | 422 |
| withholding_tax_rate | 0 以上 100 以下 | 0 以上 100 以下 | 422 |
| valid_from / valid_until | valid_until がある場合 valid_from &lt;= valid_until | 同左 | 422 |
| closing_day | 1 から 31 | 1 から 31。31 は月末扱い | 422 |
| payment_terms_days | 0 以上 | 0 以上 | 422 |
| status | ACTIVE / INACTIVE | ACTIVE / INACTIVE | 422 |
| version | 更新・削除時に必須 | 現在値と一致すること | 409 |

### 6.2 契約種別ごとの必須・不要項目

| 契約種別 | 必須項目 | 不要項目 |
| --- | --- | --- |
| HOURLY | hourly_rate, rounding_unit_minutes, rounding_method | monthly_rate, performance_amount, minimum_minutes, maximum_minutes, base_minutes, deduction_rate, overtime_rate |
| MONTHLY_RANGE | monthly_rate, minimum_minutes, maximum_minutes, base_minutes, deduction_rate, overtime_rate, rounding_unit_minutes, rounding_method | hourly_rate, performance_amount |
| MONTHLY_FIXED | monthly_rate | hourly_rate, performance_amount, minimum_minutes, maximum_minutes, base_minutes, deduction_rate, overtime_rate, rounding_unit_minutes, rounding_method |
| PERFORMANCE | performance_amount | hourly_rate, monthly_rate, minimum_minutes, maximum_minutes, base_minutes, deduction_rate, overtime_rate, rounding_unit_minutes, rounding_method |

不要項目はフロントエンドで非表示かつ送信対象外とし、バックエンドへ送信された場合は `422 INVALID_CONTRACT_CONDITION` とする。

### 6.3 金額・分数・丸め

| 項目 | 検証 |
| --- | --- |
| hourly_rate / monthly_rate / performance_amount | 0 以上 |
| minimum_minutes | 0 以上 |
| maximum_minutes | minimum_minutes 以上 |
| base_minutes | minimum_minutes 以上 maximum_minutes 以下 |
| deduction_rate / overtime_rate | 0 以上 |
| rounding_unit_minutes | 1, 5, 10, 15, 30, 60 のいずれか |
| rounding_method | ROUND_DOWN / ROUND_UP / ROUND_HALF_UP |

### 6.4 契約期間重複

- 同一案件内の契約期間重複は禁止する。
- 別案件同士の契約期間重複は許可する。
- `valid_until` は業務上終了日を含み、null は無期限として扱う。
- `deleted_at is null` の契約のみ重複判定対象とする。
- Application で事前検証し、DB exclusion constraint でも防止する。
- エラーは `409 CONTRACT_PERIOD_OVERLAP` とする。

## 7. 予定バリデーション

### 7.1 週次予定

| 項目 | Frontend | Backend |
| --- | --- | --- |
| is_active | boolean | boolean |
| valid_from / valid_until | valid_until がある場合 valid_from &lt;= valid_until | 期間を検証 |
| weekday | 有効な曜日のみ | 曜日一致を検証 |
| recurrence_source_id + generation_date | 画面では重複生成を避ける | 一意性で重複防止 |
| 手動変更済み予定 | 上書き警告 | 自動生成で上書きしない |

### 7.2 スケジュール登録・編集

| 項目 | Frontend | Backend / DB |
| --- | --- | --- |
| 案件 | 選択必須 | 同一 organization の有効な案件であることを検証 |
| 作業内容 | 必須、trim後空不可、最大200文字 | `work_schedules.work_content` varchar(200) NOT NULL。最大200文字を再検証 |
| 開始日時 | 必須、有効な日時。終了日時より前 | scheduled_start_at を日時として検証 |
| 終了日時 | 必須、有効な日時。開始日時より後 | scheduled_end_at と開始日時の前後関係を再検証 |
| メモ | 任意、最大1000文字 | `work_schedules.notes` varchar(1000)。最大1000文字を再検証 |
| 予定休憩時間 | 入力する場合は0以上、予定時間以下 | planned_break_minutes の型と範囲を再検証 |
| 状態 | PLANNED / CANCELLED / COMPLETED | enum と状態遷移を検証 |
| version | 編集時必須 | 現在値と一致すること。不一致は409 |

## 8. 稼働記録 登録・編集バリデーション

| 項目 | Frontend | Backend | 備考 |
| --- | --- | --- | --- |
| 案件 | 必須、選択式 | 同一 organization の有効な案件であることを検証 | 手入力不可 |
| 利用者 | 選択式またはログインユーザー | 権限と organization 境界を検証 | MEMBER 権限に注意 |
| 開始日時 | 必須、有効な日時。終了日時より前 | actual_start_at を日時として検証 | 未入力不可 |
| 終了日時 | 必須、有効な日時。開始日時より後 | actual_end_at と開始日時の前後関係を再検証 | 未入力不可 |
| 状態 | 必須、DRAFT / CONFIRMED のみ | enum と状態遷移を検証 | Phase1 は DRAFT 中心 |
| 備考 | 任意、最大1000文字 | Application / Serializer で最大1000文字を検証 | - |
| 休憩-開始 | 休憩行を追加した場合は必須、有効な日時 | start_at を日時として検証 | 実績時間内 |
| 休憩-終了 | 休憩行を追加した場合は必須、有効な日時。休憩開始より後 | end_at と開始の前後関係を再検証 | 実績時間内 |
| 休憩範囲 | 実績時間内に収める | 同左 | actual_start_at &lt;= break.start_at &lt; break.end_at &lt;= actual_end_at |
| 休憩重複 | 同一稼働記録内で重複不可 | 同左 | UI で即時表示 |
| 休憩合計 | 総実績時間未満 | 同左 | 休憩だけで実績全体を埋めない |
| 請求対象 | boolean | boolean | false の場合 billable_minutes = 0 |
| actual_minutes / break_minutes / billable_minutes | 送信しない | バックエンドで計算 | 画面表示は参考値 |
| version | 編集時必須 | 現在値と一致すること。不一致は409 | - |

## 9. 月次精算バリデーション

### 9.1 精算計算

| 項目 | Frontend | Backend | エラー |
| --- | --- | --- | --- |
| projectId | 画面文脈から設定 | organization 境界を検証 | 403 / 404 |
| settlementMonth | YYYY-MM | 月初日へ変換 | 400 |
| calculationBasis | ACTUAL / SCHEDULED | enum 検証 | 400 |
| 対象契約 | 既存契約から警告表示してもよい | 対象月内に有効契約が一意 | 422 |
| 既存精算 | 既存表示で警告してもよい | 未削除精算がないこと | 409 / 422 |
| total_amount | 表示のみ | 0 未満を拒否 | 422 INVALID_SETTLEMENT_AMOUNT |

### 9.2 精算再計算

- version は必須で、現在値と一致しない場合は409。
- status が CALCULATED の場合のみ再計算できる。
- 確定済みの場合は `409 SETTLEMENT_ALREADY_FINALIZED`。

### 9.3 精算確定

- version は必須で、現在値と一致しない場合は409。
- Idempotency-Key は必須。
- status が CALCULATED の場合のみ確定できる。
- 確定後は再計算・削除 UI を非表示とし、バックエンドでも拒否する。

### 9.4 未確定精算削除

- version を query parameter で送信し、現在値と一致すること。
- status が CALCULATED の場合のみ削除できる。

## 10. エラーコード対応

| 事象 | HTTP | code | Frontend 表示方針 |
| --- | --- | --- | --- |
| 入力不備 | 400 | VALIDATION_ERROR | 項目単位で表示 |
| 未認証 | 401 | UNAUTHORIZED | ログインへ誘導 |
| 権限不足 | 403 | FORBIDDEN | 操作不可メッセージ |
| 対象なし | 404 | NOT_FOUND | 一覧または前画面へ戻す導線 |
| 契約期間重複 | 409 | CONTRACT_PERIOD_OVERLAP | 契約期間欄に重複エラー表示 |
| version 不一致 | 409 | CONCURRENT_MODIFICATION | 最新状態の再取得を促す |
| Idempotency-Key 衝突 | 409 | IDEMPOTENCY_CONFLICT | 再送信内容の確認を促す |
| 契約条件不正 | 422 | INVALID_CONTRACT_CONDITION | 契約種別・該当項目へ表示 |
| 対象契約なし | 422 | SETTLEMENT_TARGET_NOT_FOUND | 契約登録を促す |
| 対象月に複数契約 | 422 | MULTIPLE_CONTRACTS_IN_MONTH | 契約期間の見直しを促す |
| 精算金額不正 | 422 | INVALID_SETTLEMENT_AMOUNT | 精算条件の確認を促す |
| 確定済み精算変更 | 409 | SETTLEMENT_ALREADY_FINALIZED | 操作不可として表示 |
| Idempotency-Key 不足 | 400 | IDEMPOTENCY_KEY_REQUIRED | 再実行導線を表示 |

## 11. DB 制約で担保する整合性

| 対象 | 制約 | 目的 |
| --- | --- | --- |
| project_contracts | organization_id, project_id 必須 | テナント境界と案件紐づけ |
| project_contracts | 同一案件内の契約期間重複を exclusion constraint で防止 | 同時実行時の最終防衛 |
| project_contracts | deleted_at is null の契約のみ重複対象 | 論理削除済み契約の除外 |
| monthly_project_settlements | UNIQUE(organization_id, project_id, settlement_month) where deleted_at is null | 同一月・同一案件の未削除精算重複防止 |
| monthly_project_settlements | status は CALCULATED / FINALIZED | 状態の正規化 |
| work_records | actual_minutes, break_minutes, billable_minutes を保存 | バックエンド計算結果の保持 |

## 12. テスト観点

### 12.1 Unit Test

- 契約種別ごとの必須項目検証
- 不要項目送信時の422
- valid_from / valid_until 検証
- 契約期間境界の重複判定
- 時間丸め
- actual_minutes / break_minutes / billable_minutes 計算
- 税額、源泉徴収、total_amount 計算
- 負の精算金額拒否

### 12.2 Application Test

- organization 境界違反
- 契約登録・更新・削除
- 同一案件内の契約期間重複409
- 別案件の契約期間重複許可
- 精算計算、再計算、確定
- Idempotency-Key 再実行・衝突
- FINALIZED 精算の再計算・削除不可
- 確定済み精算に含まれる WorkRecord 更新不可

### 12.3 API Test

- required 不足、型不一致、enum 不正、日付形式不正
- version 不一致
- CSRF 不足
- Idempotency-Key 不足
- エラーレスポンス形式 code / message / details / traceId

### 12.4 Frontend Test

- required 表示、送信ボタン disabled 条件
- 契約種別切り替え時の項目表示
- 不要項目が payload に含まれないこと
- クライアント名、案件名、表示名、組織名の必須・最大文字数
- メールアドレス形式と254文字上限
- 電話番号の数字のみ制御
- 郵便番号の形式・文字数制御
- アイコン画像の形式、5MB上限、4096px x 4096px上限、SVG拒否
- 稼働記録と休憩日時の必須、前後関係、範囲内、重複不可
- スケジュールの案件必須、作業内容必須、開始終了日時の前後関係
- 設定更新の各項目が確定した文字数・形式・権限で検証されること
- 409 / 422 エラーの画面反映

## 13. 対応結果

本章の論点はPhase1の採用方針として解消済みとし、各設計書へ直接反映する。

| 論点 | 採用結果 | 反映先 |
| --- | --- | --- |
| 技術方針 | Django / DRF / PostgreSQLへ統一。旧Spring Boot記述は採用しない | ドメイン・業務ロジック設計書、基本設計書 |
| 契約期間重複 | 同一案件内は禁止、別案件間は許可。Application検証とPostgreSQL exclusion constraintで担保 | ドメイン・業務ロジック設計書、契約・売上計算詳細設計書、DB設計書 |
| OpenAPI YAML | Phase1の8領域を正式YAMLとして管理し、本書の入力制約をschemaへ反映 | API設計書、`docs/06_api/openapi` |
| パスワード強度 | 12〜128文字。文字種組み合わせは強制せず、Django標準バリデータを適用。外部漏えいDB照合はPhase2で再検討 | 認証・認可設計書、API設計書、要件定義書 |
| 案件ステータス | ACTIVE / PAUSED / COMPLETED / ARCHIVEDへ統一 | DB設計書、API設計書、ドメイン・業務ロジック設計書 |
| 画像アップロード上限 | JPEG / PNG / WebP、最大5MB、最大4096px x 4096px、最大16,777,216 pixelsへ統一 | API設計書、DB設計書、ファイル・画像管理設計書 |
| スケジュール項目 | `work_content` varchar(200)必須、`notes` varchar(1000)任意、状態はPLANNED / CANCELLED / COMPLETED | DB設計書、API設計書 |
| 設定更新項目 | 姓・名・電話番号・自己紹介・屋号・組織住所をPhase1へ追加。適格請求書発行事業者番号はPhase1対象外 | 要件定義書、基本設計書、DB設計書、API設計書 |
| APIレート制限 | register 5回/時/IP、login 10回/5分/IPかつ5回/15分/normalized_email、refresh 30回/時。Redis管理、429とRetry-Afterを返す | 認証・認可設計書、インフラ・運用設計書、要件定義書 |
| MEMBER権限 | クライアント・案件・契約は閲覧可。自身の予定・稼働実績を操作可。マスタ・契約・精算変更はOWNER / ADMINのみ。案件単位の細粒度制御はPhase3 | 認証・認可設計書、ドメイン・業務ロジック設計書 |

## 14. 変更履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-07-21 | 1.0 | 既存設計資料を基に、Flowance Phase1 のバリデーション詳細設計書を新規作成 |
| 2026-07-23 | 1.1 | DB設計書・基本設計書を確認し、画面別フロントエンドバリデーション、文字数上限、連絡先形式、画像上限、DB未定義項目、資料間差異を既存章へ統合 |
| 2026-07-30 | 1.2 | 未確定事項の対応方針を採用し、パスワード、案件状態、画像上限、スケジュール、設定更新、レート制限、MEMBER権限を確定内容へ直接修正 |

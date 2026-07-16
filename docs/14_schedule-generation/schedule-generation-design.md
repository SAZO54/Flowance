# 予定生成詳細設計書

## 1. 文書概要

### 1.1 目的

本書は、Flowance Phase1 における予定生成処理の詳細設計を定義する。

予定生成処理は、週次予定テンプレートをもとに指定期間の個別作業予定を作成し、カレンダー表示、稼働実績登録、月次精算の前提となる予定データを整備する処理である。

本書では、要件定義、基本設計、システムアーキテクチャ、DB設計、API設計、認証・認可、エラーハンドリング、非同期処理、キャッシュ、運用設計、アイコン処理設計と整合する形で、Phase1 実装時に迷わない粒度まで予定生成のルールを整理する。

### 1.2 対象範囲

Phase1 の対象範囲は以下とする。

- 週次予定テンプレート登録
- 週次予定テンプレート更新
- 週次予定テンプレート削除
- 週次予定テンプレート一覧取得
- 選択曜日への一括適用
- 平日への一括適用
- 週次予定から個別作業予定を生成
- 指定期間への一括生成
- 個別作業予定の手動登録
- 個別作業予定の手動更新
- 個別作業予定の削除
- カレンダーイベント表示用データとの整合
- 予定重複警告
- 手動上書き済み予定の保護
- 楽観ロック
- 冪等性
- 監査ログ
- エラーハンドリング
- キャッシュ無効化方針
- クリーンアーキテクチャ / DDD 上の責務分離

### 1.3 Phase1 対象外

以下は Phase2 以降で検討する。

- Google Calendar / Outlook Calendar 連携
- 外部カレンダーへの双方向同期
- ドラッグ操作による高度な差分同期
- AI による予定提案
- 稼働率からの自動予定最適化
- 祝日カレンダー連動
- 会社休日カレンダー
- 個人休日・有給管理
- タイムゾーンをまたぐ複雑な繰り返し予定
- RRULE 互換の高度な繰り返し定義
- 予定生成の非同期化
- 生成履歴専用テーブル
- 予定承認フロー
- DRAFT / CONFIRMED による厳密な締め処理

## 2. 参照設計

本書は以下の設計書と整合させる。

- 要件定義書
- 基本設計書
- システムアーキテクチャ設計書
- バックエンド Clean Architecture 設計書
- フロントエンドアーキテクチャ設計書
- DB 設計書
- API 設計書
- 認証・認可設計書
- エラーハンドリング設計書
- 非同期処理設計書
- ファイル・画像管理設計書
- キャッシュ設計書
- インフラ・運用設計書
- アイコン処理詳細設計書

## 3. 基本方針

### 3.1 予定生成の原則

Flowance の予定生成は以下を原則とする。

1. 週次予定テンプレートは個別作業予定を生成するためのテンプレートである。
2. カレンダーに表示する正規データは work_schedules とする。
3. 予定と実績は別レコードとして保持する。
4. 週次予定テンプレートを更新しても、手動上書き済みの個別予定を自動上書きしない。
5. 予定重複は DB 制約で禁止しない。
6. 同一利用者の予定時間帯が重複する場合は Application 層で検出し、warning として返す。
7. warning があっても保存自体は許可する。
8. 予定生成は Phase1 では同期 API として処理する。
9. 生成期間に上限を設け、大量生成による DB 負荷を抑える。
10. POST 系の一括生成 API は Idempotency-Key を推奨する。
11. Domain 層は Django、DRF、ORM、Redis、Celery、HTTP に依存しない。
12. 業務上の正規データは PostgreSQL とし、Redis、ブラウザ状態、カレンダー表示状態を正規データにしない。

### 3.2 Phase1 で同期生成を採用する理由

Phase1 の予定生成は、週次テンプレートから指定期間の work_schedules を作成する DB 中心の処理である。

画像変換のような CPU / I/O 負荷の高い処理ではなく、生成期間に上限を設ければ API 同期処理として十分扱える。

そのため Phase1 では、予定生成を Celery の必須対象にしない。

ただし、将来的に以下が必要になった場合は非同期化を検討する。

- 生成期間が数か月から年単位に広がる
- 複数利用者・複数案件を横断した大量生成が必要になる
- 外部カレンダー連携と同時に生成する
- 生成履歴や進捗表示が必要になる

## 4. ドメインモデル

### 4.1 WeeklySchedule

WeeklySchedule は週次予定テンプレートを表す。

主な属性:

| 属性 | 説明 |
| --- | --- |
| id | 週次予定テンプレートID |
| organization_id | テナント境界 |
| project_id | 案件ID |
| user_id | 担当利用者ID |
| day_of_week | 曜日。0から6 |
| start_time | 開始時刻 |
| end_time | 終了時刻 |
| break_minutes | 標準休憩分 |
| valid_from | 有効開始日 |
| valid_until | 有効終了日。nullは無期限 |
| status | ACTIVE / INACTIVE |
| version | 楽観ロック用 |

WeeklySchedule はカレンダー表示対象ではない。

カレンダー表示対象は、WeeklySchedule から生成された WorkSchedule である。

### 4.2 WorkSchedule

WorkSchedule はカレンダーに表示する個別作業予定を表す。

主な属性:

| 属性 | 説明 |
| --- | --- |
| id | 個別予定ID |
| organization_id | テナント境界 |
| project_id | 案件ID |
| user_id | 担当利用者ID |
| weekly_schedule_id | 生成元週次予定ID。手動登録時は null |
| title | 表示タイトル |
| scheduled_start_at | 予定開始日時 |
| scheduled_end_at | 予定終了日時 |
| break_minutes | 予定休憩分 |
| status | PLANNED / CANCELLED |
| is_generated | 週次予定から生成されたか |
| is_manually_overridden | 手動上書きされたか |
| notes | 備考 |
| version | 楽観ロック用 |

### 4.3 ScheduleGenerationRequest

予定生成リクエストは、週次予定テンプレートを指定期間へ展開するための入力である。

主な属性:

| 属性 | 説明 |
| --- | --- |
| project_id | 対象案件 |
| from_date | 生成開始日 |
| to_date | 生成終了日 |
| weekly_schedule_ids | 対象週次予定ID。未指定時は対象案件の有効テンプレートすべて |
| overwrite_policy | 既存予定の扱い。Phase1 は SKIP_EXISTING を基本とする |
| dry_run | true の場合は保存せず生成候補と warning のみ返す |

### 4.4 ScheduleGenerationResult

予定生成結果は、作成件数、スキップ件数、warning を含む。

主な属性:

| 属性 | 説明 |
| --- | --- |
| created_count | 新規作成した予定数 |
| skipped_count | 既存予定などによりスキップした件数 |
| warning_count | warning 件数 |
| items | 作成または候補となった予定概要 |
| warnings | 重複などの警告 |

## 5. 週次予定テンプレート設計

### 5.1 登録ルール

週次予定テンプレート登録時は以下を検証する。

| 検証 | 方針 |
| --- | --- |
| project_id | 同一 organization に属する有効な案件であること |
| user_id | 同一 organization に所属する利用者であること |
| project member | Phase1 では OWNER / ADMIN は操作可。MEMBER は担当案件範囲で操作可 |
| day_of_week | 0から6であること |
| start_time / end_time | start_time < end_time |
| break_minutes | 0以上、予定時間未満 |
| valid_from / valid_until | valid_until がある場合は valid_from <= valid_until |
| status | ACTIVE / INACTIVE |

### 5.2 一括適用

選択曜日への一括適用、平日への一括適用は、複数 WeeklySchedule を作成または更新する操作として扱う。

平日の定義:

| 曜日 | day_of_week |
| --- | --- |
| 月 | 1 |
| 火 | 2 |
| 水 | 3 |
| 木 | 4 |
| 金 | 5 |

土日祝日判定は Phase1 の平日一括適用には含めない。

### 5.3 更新ルール

WeeklySchedule を更新しても、既に生成済みの WorkSchedule を自動で書き換えない。

理由:

- 個別予定が手動変更されている可能性があるため。
- 利用者が過去または近い将来の予定を調整済みの可能性があるため。
- テンプレート更新と個別予定更新を暗黙に結びつけると予期しない上書きが起きるため。

テンプレート更新後の予定へ反映したい場合は、利用者が再度「予定生成」を実行する。

### 5.4 削除ルール

WeeklySchedule 削除は論理削除とする。

削除しても、既に生成済みの WorkSchedule は自動削除しない。

既存の個別予定を削除したい場合は、個別予定削除または範囲指定削除機能で扱う。範囲指定削除は Phase2 以降で検討する。

## 6. 予定生成アルゴリズム

### 6.1 入力

予定生成 API の入力は以下を基本とする。

| 項目 | 必須 | 説明 |
| --- | --- | --- |
| projectId | 必須 | 対象案件 |
| fromDate | 必須 | 生成開始日 |
| toDate | 必須 | 生成終了日 |
| weeklyScheduleIds | 任意 | 対象週次予定。未指定時は対象案件の有効テンプレートすべて |
| dryRun | 任意 | true の場合は保存せず候補と警告のみ返す |

### 6.2 期間上限

Phase1 では、1回の生成期間上限の初期値を 100 日とする。

上限を超えた場合は 422 VALIDATION_ERROR を返す。

理由:

- 同期 API として処理するため。
- 誤操作による大量生成を防ぐため。
- レスポンスサイズと DB transaction 時間を抑えるため。

### 6.3 対象テンプレート抽出

以下の条件を満たす WeeklySchedule を対象にする。

- organization_id がログイン利用者の organization と一致する。
- project_id がリクエスト projectId と一致する。
- status = ACTIVE。
- deleted_at is null。
- valid_from <= 対象日。
- valid_until is null または 対象日 <= valid_until。
- weeklyScheduleIds 指定がある場合、そのIDに含まれる。

### 6.4 日付展開

fromDate から toDate までの日付を1日ずつ走査する。

各日付について、day_of_week が一致する WeeklySchedule を抽出し、scheduled_start_at / scheduled_end_at を生成する。

日時生成時は organization または user の timezone を基準にする。

保存時は UTC の timestamptz として保存する。

### 6.5 タイムゾーン方針

Phase1 では、予定入力は利用者の timezone を前提とする。

- UI は利用者 timezone で日付と時刻を入力する。
- API は date と time、または timezone 付き datetime を受け取る。
- DB は timestamptz として UTC 基準で保存する。
- カレンダー表示時はフロントエンドが利用者 timezone で表示する。

DST がある timezone では、存在しない時刻・曖昧な時刻が発生しうる。

Phase1 では Asia/Tokyo を主対象とし、DST の厳密な例外処理は Phase2 以降で強化する。

### 6.6 title 生成

生成される WorkSchedule の title は案件名を基本とする。

例:

- SaaSリニューアル
- API設計

Phase1 では WeeklySchedule に個別 title を持たない前提とし、案件名を title に設定する。

将来的にテンプレートごとの title が必要になった場合は WeeklySchedule に title カラム追加を検討する。

### 6.7 break_minutes

break_minutes は WeeklySchedule.break_minutes を WorkSchedule.break_minutes へコピーする。

break_minutes は予定時間未満でなければならない。

## 7. 既存予定との衝突処理

### 7.1 同一生成元予定の扱い

同じ weekly_schedule_id、同じ scheduled_start_at、同じ scheduled_end_at の WorkSchedule が既に存在する場合は、新規作成しない。

Phase1 の基本方針は SKIP_EXISTING とする。

### 7.2 手動上書き済み予定の保護

is_manually_overridden = true の WorkSchedule は、予定生成処理で上書きしない。

手動上書き済み予定が生成対象日・時間に存在する場合は skipped とし、必要に応じて warning を返す。

### 7.3 手動登録予定との関係

weekly_schedule_id = null の手動登録予定が同一時間帯に存在する場合でも、新規予定生成を禁止しない。

ただし、同一 user_id の時間帯重複として warning を返す。

### 7.4 CANCELLED 予定との関係

status = CANCELLED の WorkSchedule が同一生成元・同一時間帯に存在する場合、Phase1 では再作成しない。

理由:

- 利用者が明示的にキャンセルした予定を自動復活させないため。
- 自動生成による意図しない予定復活を避けるため。

再作成したい場合は、個別予定を手動登録する。

### 7.5 削除済み予定との関係

deleted_at is not null の WorkSchedule は生成重複判定から除外する。

ただし、監査ログ上は過去に削除された予定として追跡可能にする。

## 8. 予定重複警告

### 8.1 基本方針

予定重複は登録自体を許可する。

同一利用者の予定時間帯が重複する場合、Application 層で検出し、API レスポンスに warnings を含める。

DB 制約では予定重複を禁止しない。

### 8.2 重複判定条件

以下を満たす WorkSchedule を重複候補とする。

- organization_id が一致する。
- user_id が一致する。
- deleted_at is null。
- status = PLANNED。
- 既存予定の scheduled_start_at < 新予定 scheduled_end_at。
- 新予定 scheduled_start_at < 既存予定 scheduled_end_at。

同じ project_id に限定しない。

理由:

- 利用者の実時間が重複しているかを警告するため。
- 別案件同士でも同じ利用者の予定重複は UI 上注意すべきため。

### 8.3 warning 形式

warning は以下の形式を基本とする。

| 項目 | 説明 |
| --- | --- |
| code | WARNING_SCHEDULE_OVERLAP |
| message | 利用者向け警告文 |
| targetId | 生成または登録対象の予定ID。dryRun時は null 可 |
| conflictIds | 重複した既存予定ID配列 |
| severity | WARNING |

### 8.4 warning と保存可否

| 状況 | 保存 |
| --- | --- |
| 同一利用者の予定重複 | 許可 |
| 別利用者の予定重複 | warning なしで許可 |
| 同一生成元・同一時間帯の既存予定 | スキップ |
| 手動上書き済み予定 | スキップ |
| CANCELLED 予定の自動復活 | しない |

## 9. API 設計との整合

### 9.1 週次予定 API

Phase1 の週次予定 API は以下を基本とする。

- GET /api/v1/projects/{projectId}/weekly-schedules
- POST /api/v1/projects/{projectId}/weekly-schedules
- POST /api/v1/projects/{projectId}/weekly-schedules/bulk
- PATCH /api/v1/projects/{projectId}/weekly-schedules/{weeklyScheduleId}
- DELETE /api/v1/projects/{projectId}/weekly-schedules/{weeklyScheduleId}?version=1

DELETE は requestBody を使用せず、version は query parameter とする。

### 9.2 個別予定 API

Phase1 の個別予定 API は以下を基本とする。

- GET /api/v1/work-schedules
- POST /api/v1/work-schedules
- GET /api/v1/work-schedules/{workScheduleId}
- PATCH /api/v1/work-schedules/{workScheduleId}
- DELETE /api/v1/work-schedules/{workScheduleId}?version=1

個別予定の登録・更新でも予定重複 warning を返す。

### 9.3 予定生成 API

予定生成 API は以下を推奨する。

POST /api/v1/work-schedules/generate

Request:

- projectId: 対象案件ID
- fromDate: 生成開始日
- toDate: 生成終了日
- weeklyScheduleIds: 対象週次予定ID配列。任意
- dryRun: 保存せず候補と警告のみ返すか。任意

Response:

- createdCount: 作成件数
- skippedCount: スキップ件数
- warningCount: warning 件数
- items: 作成された予定概要
- warnings: 重複などの警告

### 9.4 dryRun

dryRun = true の場合は DB に WorkSchedule を作成しない。

Phase1 初期から dryRun を採用する。

dryRun は副作用なしの事前検証として扱い、保存処理と同じ Domain / Application 検証、権限検証、期間上限検証、重複 warning 判定、既存予定スキップ判定を実行する。

用途:

- 生成前の件数確認
- 作成予定候補の確認
- スキップ予定件数の確認
- 重複 warning の事前確認
- UI で「この内容で生成しますか？」を表示する

dryRun 実行時は WorkSchedule、audit_logs、idempotency result を作成しない。

ただし、認証・認可・入力検証・期間上限検証に失敗した場合は通常実行と同じ error を返す。

### 9.5 Idempotency-Key

予定生成 API は複数レコードを作成するため、Idempotency-Key の利用を推奨する。

同一 organization、同一 user、同一 endpoint、同一 Idempotency-Key、同一 request hash の再実行では、前回結果を返す。

request hash が異なる場合は 409 IDEMPOTENCY_KEY_CONFLICT を返す。

## 10. DB 設計との整合

### 10.1 project_weekly_schedules

project_weekly_schedules は週次予定テンプレートを保持する。

Phase1 では以下の制約を Application 層で検証する。

- project_id と user_id が同一 organization に属する。
- day_of_week は 0 から 6。
- start_time < end_time。
- break_minutes は 0 以上、予定時間未満。
- valid_until がある場合は valid_from <= valid_until。

### 10.2 work_schedules

work_schedules はカレンダー表示対象の個別予定を保持する。

予定生成時は以下を設定する。

| カラム | 設定値 |
| --- | --- |
| organization_id | project の organization_id |
| project_id | 対象 project_id |
| user_id | WeeklySchedule.user_id |
| weekly_schedule_id | 生成元 WeeklySchedule.id |
| title | 案件名 |
| scheduled_start_at | 対象日 + start_time |
| scheduled_end_at | 対象日 + end_time |
| break_minutes | WeeklySchedule.break_minutes |
| status | PLANNED |
| is_generated | true |
| is_manually_overridden | false |
| version | 1 |

### 10.3 予定重複制約

Phase1 では、work_schedules に予定重複禁止の DB 制約を設定しない。

重複は Application 層で warning として検出する。

### 10.4 生成履歴テーブル

Phase1 では schedule_generation_runs のような生成履歴専用テーブルは作成しない。

生成結果の追跡は以下で対応する。

- work_schedules.weekly_schedule_id
- work_schedules.is_generated
- work_schedules.created_by_id
- audit_logs
- idempotency_keys

生成進捗表示や再実行履歴の詳細管理が必要になった場合は Phase2 以降で専用テーブルを検討する。

## 11. 処理フロー

### 11.1 予定生成フロー

1. Next.js が予定生成 API を呼び出す。
2. DRF View が認証、認可、CSRF、Idempotency-Key を検証する。
3. Application Service が project を取得し、organization 境界を検証する。
4. Application Service が操作権限を検証する。
5. 生成期間上限を検証する。
6. 対象 WeeklySchedule を取得する。
7. fromDate から toDate まで日付を展開する。
8. WeeklySchedule の day_of_week と有効期間に合う候補を作成する。
9. 既存 WorkSchedule を取得する。
10. 同一生成元・同一時間帯の予定をスキップする。
11. 手動上書き済み予定をスキップする。
12. CANCELLED 予定の自動復活を防ぐ。
13. 同一 user_id の時間帯重複を検出し warnings を作成する。
14. dryRun の場合は保存せず候補、スキップ件数、warnings を返す。
15. dryRun でない場合のみ DB transaction 内で WorkSchedule を一括作成する。
16. audit_logs を作成する。
17. idempotency result を保存する。
18. 作成結果と warnings を返す。

### 11.2 個別予定手動登録フロー

1. Next.js が個別予定登録 API を呼び出す。
2. 認証、認可、CSRF を検証する。
3. project / user / organization 境界を検証する。
4. scheduled_start_at < scheduled_end_at を検証する。
5. break_minutes を検証する。
6. 同一 user_id の重複予定を検出する。
7. WorkSchedule を is_generated=false、is_manually_overridden=true として作成する。
8. warning があればレスポンスへ含める。
9. audit_logs を作成する。

### 11.3 個別予定手動更新フロー

1. Next.js が個別予定更新 API を呼び出す。
2. 認証、認可、CSRF、version を検証する。
3. WorkSchedule を取得する。
4. 更新後の時刻、休憩、状態を検証する。
5. is_manually_overridden = true にする。
6. 同一 user_id の重複予定を検出する。
7. version を更新する。
8. warning があればレスポンスへ含める。
9. audit_logs を作成する。

### 11.4 個別予定削除フロー

1. Next.js が DELETE API を呼び出す。
2. 認証、認可、CSRF、version を検証する。
3. WorkSchedule を論理削除する。
4. audit_logs を作成する。
5. 204 No Content を返す。

## 12. 権限設計

### 12.1 基本権限

| ロール | 週次予定 | 個別予定 | 予定生成 |
| --- | --- | --- | --- |
| OWNER | 操作可 | 操作可 | 操作可 |
| ADMIN | 操作可 | 操作可 | 操作可 |
| MEMBER | 担当案件範囲で操作可 | 担当案件範囲で操作可 | 担当案件範囲で操作可 |

### 12.2 project_members

MEMBER の操作可否は project_members を基準にする。

Phase1 では以下を基本とする。

- can_view = true の場合、予定閲覧可。
- can_edit_schedule = true の場合、予定登録・更新・削除・生成可。
- 細かな操作別権限は Phase3 以降で拡張する。

### 12.3 テナント境界

すべての予定操作で organization_id を検証する。

- project.organization_id
- weekly_schedule.organization_id
- work_schedule.organization_id
- user.organization_id
- login user's organization_id

これらが一致しない操作は 403 FORBIDDEN または 404 NOT_FOUND とする。

## 13. エラー処理

### 13.1 同期エラー

| 事象 | HTTP | error code |
| --- | --- | --- |
| 認証なし | 401 | UNAUTHORIZED |
| 権限不足 | 403 | FORBIDDEN |
| 対象案件なし | 404 | PROJECT_NOT_FOUND |
| 週次予定なし | 404 | WEEKLY_SCHEDULE_NOT_FOUND |
| 個別予定なし | 404 | WORK_SCHEDULE_NOT_FOUND |
| 入力不正 | 400 / 422 | VALIDATION_ERROR |
| 生成期間上限超過 | 422 | SCHEDULE_GENERATION_RANGE_TOO_LARGE |
| start >= end | 422 | INVALID_SCHEDULE_TIME_RANGE |
| break_minutes 不正 | 422 | INVALID_BREAK_MINUTES |
| version 不一致 | 409 | CONCURRENT_MODIFICATION |
| Idempotency-Key 衝突 | 409 | IDEMPOTENCY_KEY_CONFLICT |
| DB 一時障害 | 503 | DATABASE_UNAVAILABLE |

### 13.2 warning と error の違い

| 種別 | 保存可否 | 例 |
| --- | --- | --- |
| error | 保存しない | 時刻不正、権限不足、version 不一致 |
| warning | 保存する | 同一利用者の予定重複 |

予定重複は error ではなく warning とする。

### 13.3 エラーレスポンス

エラーレスポンスはエラーハンドリング設計書の共通形式に従う。

- code: INVALID_SCHEDULE_TIME_RANGE
- message: 予定終了日時は予定開始日時より後にしてください。
- details: []
- traceId: uuid

## 14. カレンダー表示との整合

### 14.1 表示 API の役割

カレンダー表示 API は表示用イベントを返す API とする。

案件詳細やユーザー詳細を過剰に返さず、projectId、userId などの識別子と表示に必要な最小限の情報に限定する。

### 14.2 CalendarEvent

予定生成された WorkSchedule は、GET /api/v1/calendar/events で以下の情報として返る。

- id
- type: SCHEDULE
- projectId
- userId
- title
- startAt
- endAt
- status: PLANNED
- isGenerated
- isManuallyOverridden
- sourceId
- version

sourceId には weekly_schedule_id を設定する。

### 14.3 予定と実績

予定と実績は別レコードとして保持する。

- WorkSchedule は予定。
- WorkRecord は実績。
- WorkRecord.work_schedule_id により予定と実績を関連付ける。
- 予定を変更しても既存実績を自動変更しない。
- 実績を登録しても予定を自動確定しない。

## 15. キャッシュ方針

### 15.1 基本方針

Phase1 では、複雑な業務データキャッシュを原則採用しない。

カレンダーイベント、予定一覧、予定詳細は認証済み業務 API のため private, no-store を基本とする。

### 15.2 無効化候補

将来、短時間キャッシュを導入する場合は、以下の操作で calendar events cache を無効化する。

- WeeklySchedule 登録
- WeeklySchedule 更新
- WeeklySchedule 削除
- WorkSchedule 生成
- WorkSchedule 登録
- WorkSchedule 更新
- WorkSchedule 削除
- WorkRecord 登録・更新・削除

## 16. 非同期処理との関係

### 16.1 Phase1 方針

予定生成は Phase1 では同期処理を基本とする。

非同期処理設計書における Celery の主対象は、アイコン画像処理、旧画像削除、孤立ファイル削除、Outbox dispatch、cleanup である。

予定生成は、生成期間上限を設けることで同期 API として扱う。

### 16.2 将来の非同期化

予定生成を非同期化する場合は、以下を追加検討する。

- task_type = SCHEDULE_GENERATION
- background_tasks に進捗を保存
- schedule_generation_runs テーブル
- 生成結果ファイルまたは結果 JSON
- キャンセル API
- 再実行 API

Phase1 では実装しない。

## 17. 監査ログ

### 17.1 記録対象

以下の操作を監査ログへ記録する。

- 週次予定登録
- 週次予定一括登録
- 週次予定更新
- 週次予定削除
- 予定生成
- 個別予定登録
- 個別予定更新
- 個別予定削除
- 予定重複 warning 発生

### 17.2 記録項目

- actor_user_id
- organization_id
- resource_type
- resource_id
- action
- before / after の概要
- project_id
- user_id
- weekly_schedule_id
- created_count
- skipped_count
- warning_count
- trace_id
- occurred_at

JWT、Cookie、認証情報、個人情報を含む検索文字列の生値は監査ログへ保存しない。

## 18. クリーンアーキテクチャ / DDD 責務分離

### 18.1 Domain 層

Domain 層は業務概念のみを扱う。

責務:

- WeeklySchedule の時刻妥当性
- WorkSchedule の時刻妥当性
- 休憩時間の妥当性
- 週次テンプレートから日付候補を生成する純粋ロジック
- 手動上書き済み予定を保護するルール
- CANCELLED 予定を自動復活しないルール
- 予定重複を warning として扱う業務判断

Domain 層が依存しないもの:

- Django
- DRF
- Django ORM
- PostgreSQL
- Redis
- Celery
- HTTP request
- Cookie
- Next.js

### 18.2 Application 層

Application 層はユースケースを制御する。

責務:

- 認可結果に基づく操作可否制御
- project / user / organization 境界検証
- WeeklySchedule の取得
- WorkSchedule の既存予定取得
- 予定生成ユースケース実行
- 重複 warning 組み立て
- DB transaction 制御
- idempotency 制御
- audit_logs 作成依頼
- DTO 組み立て

### 18.3 Infrastructure 層

Infrastructure 層は外部技術の詳細を扱う。

責務:

- Django ORM repository
- PostgreSQL transaction
- idempotency_keys 永続化
- audit_logs 永続化
- timezone ライブラリ連携
- DB index を使った期間重複検索

### 18.4 Presentation 層

Presentation 層は HTTP の入出力を扱う。

責務:

- DRF serializer validation
- Request / Response 変換
- Cookie 認証
- CSRF 検証
- HTTP status code 変換
- warning を含むレスポンス整形

## 19. パフォーマンス設計

### 19.1 生成件数上限

Phase1 では1回の予定生成件数に上限を設ける。

推奨上限:

| 項目 | 上限 |
| --- | --- |
| 生成期間 | 100日 |
| 生成予定候補 | 300件 |
| weeklyScheduleIds | 50件 |

上限を超える場合は 422 SCHEDULE_GENERATION_RANGE_TOO_LARGE または VALIDATION_ERROR を返す。

### 19.2 推奨 index

work_schedules では以下の index を利用する。

| index | 用途 |
| --- | --- |
| organization_id, user_id, scheduled_start_at, scheduled_end_at | 重複判定、カレンダー取得 |
| organization_id, project_id, scheduled_start_at | 案件別予定取得 |
| weekly_schedule_id, scheduled_start_at | 同一生成元の重複生成防止 |
| deleted_at | 論理削除除外 |

### 19.3 N+1 防止

予定生成では以下を避ける。

- 日付ごとに DB 検索する。
- テンプレートごとに既存予定を個別検索する。
- 作成予定を1件ずつ insert する。

推奨:

- 対象 WeeklySchedule を一括取得する。
- 対象期間の既存 WorkSchedule を一括取得する。
- 作成対象をメモリ上で判定する。
- bulk_create を利用する。

## 20. テスト方針

### 20.1 Unit Test

- WeeklySchedule の時刻検証
- break_minutes 検証
- valid_from / valid_until 検証
- day_of_week 展開
- 指定期間の日付展開
- 手動上書き済み予定の保護
- CANCELLED 予定を復活しないこと
- 重複 warning 判定

### 20.2 Application Test

- 週次予定登録
- 週次予定一括登録
- 週次予定更新
- 週次予定削除
- 指定期間への予定生成
- weeklyScheduleIds 指定時の生成
- 既存予定スキップ
- 手動上書き済み予定スキップ
- 予定重複 warning 付き保存
- dryRun で保存されないこと
- Idempotency-Key の再実行
- version 不一致時 409
- 権限不足時 403

### 20.3 API Test

- POST /api/v1/work-schedules/generate
- GET /api/v1/calendar/events
- GET /api/v1/projects/{projectId}/weekly-schedules
- POST /api/v1/projects/{projectId}/weekly-schedules
- PATCH /api/v1/projects/{projectId}/weekly-schedules/{weeklyScheduleId}
- DELETE /api/v1/projects/{projectId}/weekly-schedules/{weeklyScheduleId}
- POST /api/v1/work-schedules
- PATCH /api/v1/work-schedules/{workScheduleId}
- DELETE /api/v1/work-schedules/{workScheduleId}

### 20.4 Frontend Test

- 週次予定登録 UI
- 平日一括適用 UI
- 予定生成前確認
- 予定生成後のカレンダー反映
- 重複 warning 表示
- warning 確認後も保存できること
- 手動変更済み予定が上書きされないこと
- カレンダー表示で projectId / userId をもとに必要表示を解決すること

## 21. Phase1 未対応事項

以下は Phase1 では対応しない。

- 外部カレンダー連携
- 祝日・休日カレンダー連動
- RRULE 互換の高度な繰り返し定義
- 年単位の大量予定生成
- 予定生成の非同期化
- 生成履歴専用テーブル
- 生成キャンセル API
- 生成結果の進捗表示
- AI による予定提案
- 稼働率からの自動最適化
- 予定承認フロー
- DRAFT / CONFIRMED による厳密な予定確定運用
- 範囲指定による一括削除
- 手動トリミングのようなUI編集に相当する高度なドラッグ差分同期

## 22. 確定事項と未確定事項

### 22.1 確定事項

| 論点 | 確定内容 |
| --- | --- |
| day_of_week の曜日定義 | 0=日曜, 1=月曜, 2=火曜, 3=水曜, 4=木曜, 5=金曜, 6=土曜とする |
| 生成期間上限 | 初期値は100日とする |
| dryRun の初期実装 | Phase1 初期から採用し、副作用なしの事前検証・件数確認・warning確認に利用する |
| title の扱い | Phase1 では案件名を使用する |

### 22.2 未確定事項

| 論点 | 確認内容 |
| --- | --- |
| CANCELLED 予定の再生成 | Phase1 は自動復活しない。将来、明示的な regenerate オプションを検討する |

## 23. 変更履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-07-16 | 1.0 | Phase1用予定生成詳細設計書を新規作成。週次予定テンプレート、個別予定生成、手動上書き保護、予定重複 warning、同期生成、冪等性、API、DB、権限、エラー、監査、テスト方針、未対応事項、未確定事項を整理 |
| 2026-07-16 | 1.1 | day_of_week、生成期間上限、dryRun 初期実装、title の扱いを確定。dryRun を副作用なしの事前検証として Phase1 初期から採用する方針へ更新。予定生成 API の OpenAPI 反映事項を未確定事項から除外 |

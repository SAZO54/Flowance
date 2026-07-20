# テスト設計書

## 1. 文書概要

### 1.1 目的

本書は、Flowance Phase1 の品質を担保するためのテスト方針、テスト範囲、テスト種別、主要観点、CI/CD での実行方針、受入条件を定義する。

Phase1 では、認証、組織、基本権限、クライアント、案件、アイコン、契約、スケジュール、稼働実績、月次精算、監査ログ、楽観ロック、冪等性、OpenAPI、非同期処理を対象とする。

請求書、入金、収支、分析、ACCOUNTANT ロール、PDF 生成、外部連携は Phase2 以降の対象とし、Phase1 の主要テスト対象から除外する。

### 1.2 対象読者

- フロントエンド開発者
- バックエンド開発者
- QA 担当者
- レビュー担当者
- 運用・リリース担当者

### 1.3 参照設計

本書は、docs 配下の Phase1 設計書と整合する。

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
- 予定生成詳細設計書
- 契約・売上計算詳細設計書
- ADR

## 2. 基本方針

### 2.1 テストの原則

1. 業務ルールは Domain 層または Application 層のテストで重点的に検証する。
2. DRF View / Serializer は HTTP 入出力、認証、認可、形式検証、エラー変換を中心に検証する。
3. 金額計算、時間計算、契約期間重複、権限、テナント分離は必須テスト対象とする。
4. OpenAPI YAML は Swagger UI で読み込めることを検証する。
5. フロントエンドは UI 表示、フォーム、API エラー表示、レスポンシブ、主要操作を検証する。
6. E2E は Phase1 受入条件に直結する主要ユーザーフローに絞る。
7. CI で lint、type check、unit test、integration test、build、OpenAPI 検証を実行する。
8. 正規データは PostgreSQL にある前提で、Redis、Celery、CDN cache を正規データとして扱わない。

### 2.2 品質ゲート

| ゲート | 必須確認 |
| --- | --- |
| Pull Request | lint、format check、type check、unit test、API test、OpenAPI 検証、Next.js build |
| staging merge | PostgreSQL / Redis / Celery を含む統合テスト、Playwright、Smoke Test |
| main merge | migration check、build、主要 Smoke Test、本番承認 |

## 3. テスト対象範囲

### 3.1 Phase1 テスト対象

| 領域 | 主なテスト対象 |
| --- | --- |
| 認証・認可 | 利用者登録、ログイン、トークン更新、ログアウト、Cookie、JWT、CSRF、normalized_email、ロール権限、テナント分離 |
| クライアント | 一覧、登録、詳細、更新、楽観ロック、初期アイコン、アップロードアイコン、アイコン削除 |
| 案件 | 一覧、登録、詳細、更新、ステータス変更、期間、案件メンバー、案件アイコン |
| アイコン | 初期生成、アップロード、変換、EXIF 削除、R2 保存、CDN 配信、非同期処理、失敗時フォールバック |
| 契約 | HOURLY、MONTHLY_RANGE、MONTHLY_FIXED、PERFORMANCE、期間重複、金額・税率、削除制御 |
| スケジュール | 週次予定、個別予定、予定生成、dryRun、重複警告、手動上書き、キャンセル |
| 稼働実績 | 登録、一覧、詳細、更新、削除、休憩、actualMinutes / billableMinutes 計算、DRAFT 中心運用 |
| 月次精算 | 詳細、計算、再計算、確定、未確定削除、契約種別別計算、丸め、冪等性 |
| エラー | ErrorResponse、validation、permission、conflict、not found、rate limit、traceId |
| 非同期処理 | Celery task、Redis broker、リトライ、冪等性、タスク状態、補償処理 |
| API | OpenAPI 3.0.3、認証、Cookie、CSRF、エラー形式、Swagger UI 読み込み |
| フロントエンド | Next.js 画面、フォーム、一覧、詳細、カレンダー、ファイル選択、プレビュー、レスポンシブ |
| CI/CD | GitHub Actions、STG 自動デプロイ、本番承認、自動テスト、Smoke Test |

### 3.2 Phase1 対象外

- 請求書
- PDF 生成
- 入金
- 収支
- 分析
- ACCOUNTANT ロール
- 外部カレンダー連携
- SSO / OAuth / MFA
- 複数通貨
- 会計ソフト連携
- 複雑な成果物承認ワークフロー

## 4. テスト種別

### 4.1 Backend Unit Test

Domain / Application の業務ルールを最優先で検証する。

| 対象 | 主な観点 |
| --- | --- |
| メール正規化 | original email を保持し、normalized_email はログイン・重複判定に使用する |
| パスワード強度 | 最小文字数、複雑性、既知の弱い文字列拒否 |
| アイコン初期生成 | UUIDによる動物・水色系以外の淡色背景の決定性、独立したハッシュバイト、名前変更時の維持 |
| 契約検証 | 契約種別ごとの必須項目、不要項目拒否、期間、税率、源泉徴収率 |
| 契約期間重複 | 同一案件内の重複禁止、別案件間の重複許可、daterange expression 制約との整合 |
| 時間計算 | 実稼働時間、休憩控除、請求対象時間、端数処理 |
| 精算計算 | HOURLY、MONTHLY_RANGE、MONTHLY_FIXED、PERFORMANCE の計算、税、源泉徴収、合計額 |
| 予定生成 | day_of_week、生成期間上限 100 日、dryRun、既存予定スキップ、手動上書き維持 |
| エラー変換 | ドメイン例外から API エラーコードへのマッピング |

### 4.2 Backend Application Test

Use Case 単位で、トランザクション、権限、監査ログ、冪等性を検証する。

- RegisterUser
- Login
- RefreshToken
- Logout
- RegisterClient
- UpdateClient
- RegisterProject
- UpdateProject
- RegisterContract
- UpdateContract
- DeleteContract
- RegisterWeeklySchedule
- GenerateWorkSchedules
- RegisterWorkRecord
- UpdateWorkRecord
- CalculateSettlement
- RecalculateSettlement
- FinalizeSettlement
- DeleteUnfinalizedSettlement

重点観点は以下とする。

- organization_id によるテナント境界が破られないこと
- OWNER / ADMIN / MEMBER の権限が API と Use Case で一貫すること
- version 不一致時に 409 Conflict になること
- Idempotency-Key 対象 API が二重実行されないこと
- DB 更新と audit_logs / background_tasks / outbox_events の整合が保たれること
- DB 失敗時にファイル保存など外部副作用が補償されること

### 4.3 Backend Integration Test

PostgreSQL、Redis、Celery、Storage Adapter を含めた結合観点を検証する。

- Django Migration が適用できること
- Repository が PostgreSQL 制約と整合すること
- unique 制約、foreign key、check 制約、exclusion constraint が期待通り機能すること
- soft delete 対象で検索・一意制約の扱いが崩れないこと
- Celery task が enqueue、success、failure、retry を正しく記録すること
- Redis 障害時に正規データが破損しないこと
- R2 またはローカルストレージへの保存失敗時に業務データが不整合にならないこと
- audit_logs が主要変更操作で記録されること

### 4.4 API Test

DRF APIClient または同等の仕組みで、HTTP 契約を検証する。

- 未認証時は 401 Unauthorized
- 権限不足時は 403 Forbidden
- 他 organization のリソース参照は 404 または 403 の設計方針通り
- バリデーションエラーは共通 ErrorResponse で返ること
- 楽観ロック不一致は 409 Conflict
- GET / HEAD / DELETE に requestBody を持たせないこと
- JWT をレスポンス本文へ含めないこと
- access_token / refresh_token は HttpOnly Cookie として扱うこと
- CSRF 対象 API でトークン検証が機能すること
- OpenAPI の参照が解決でき、Swagger UI で読み込めること

### 4.5 Frontend Unit / Component Test

Next.js / React の画面部品単位で検証する。

- Server Component / Client Component の責務分離
- 入力フォームの validation 表示
- API エラーの表示
- 一覧、詳細、登録、更新画面の基本表示
- ファイル選択、プレビュー、アップロード中、失敗、削除、初期アイコン fallback
- カレンダー表示、予定作成、予定更新、予定削除
- 予定・実績が0件でも週間カレンダーの時間グリッドが表示されること
- 空き時間枠の上半分・下半分をクリックすると、開始日時が30分単位で補完され、終了日時が1時間後になること
- カレンダー上および日別予定一覧の WorkSchedule から、同じ編集・削除モーダルを開けること
- WorkRecord をクリックしても予定編集モーダルの対象にならないこと
- 自動生成予定の編集時に、以後の自動生成で上書きされない旨が表示されること
- 予定登録・更新の重複 warning と、更新・削除の version conflict が利用者に分かる形で表示されること
- 稼働実績フォームの休憩入力とエラー表示
- 精算結果表示
- PC / スマートフォンの主要レスポンシブ表示

### 4.6 E2E Test

Playwright で Phase1 の主要ユーザーフローを検証する。

1. 利用者登録後、Cookie 認証でログイン状態になる
2. ログイン、トークン更新、ログアウトができる
3. クライアントを登録し、一覧・詳細・更新ができる
4. クライアントアイコンをアップロードし、削除後に初期アイコンへ戻る
5. 案件を登録し、ステータス・期間・アイコンを更新できる
6. 契約を登録し、契約期間重複時にエラーが表示される
7. 週次予定を登録し、予定生成を実行できる
8. カレンダーで予定を確認し、個別予定を更新・削除できる
9. 稼働実績を登録し、actualMinutes / billableMinutes がバックエンド計算値として表示される
10. 月次精算を計算、再計算、確定できる
11. 権限不足や version conflict のエラーがユーザーに分かる形で表示される

### 4.7 Smoke Test

STG / Production デプロイ後に短時間で確認する。

- フロントエンドのトップ画面が表示されること
- Backend health endpoint が正常であること
- ログイン / ログアウトができること
- 認証必須 API が Cookie 認証で呼び出せること
- クライアント、案件、契約、スケジュール、稼働実績、精算の主要 API が 5xx を返さないこと
- Celery worker が起動していること
- Redis に接続できること
- R2 またはローカルストレージへのファイル保存ができること
- 重大なエラーログが発生していないこと

## 5. 領域別テスト設計

### 5.1 認証・認可

| ケース | 期待結果 |
| --- | --- |
| 利用者登録 | User、Organization、OWNER member が作成され、Cookie が設定される |
| normalized_email 重複 | 大文字小文字差分の同一メールは重複として拒否される |
| ログイン成功 | access_token / refresh_token が Cookie に設定され、本文に JWT は含まれない |
| トークン更新 | refresh token Cookie により新しい Cookie が再設定される |
| ログアウト | refresh token が blacklist 登録され、Cookie が削除される |
| CSRF 不正 | 対象 API で 403 になる |
| 権限不足 | MEMBER が管理操作を行うと 403 になる |
| テナント分離 | 他 organization のデータへアクセスできない |

### 5.2 クライアント・案件

- 一覧検索、status、pagination、sort が機能すること
- 登録時に 201 Created、Location、作成済み概要が返ること
- 詳細取得で必要な表示項目が返ること
- 更新時に version が必須で、不一致時は 409 になること
- status 変更が詳細画面から行えること
- 初期アイコンはUUIDから定義済み動物・水色系以外の淡色背景の範囲で決定的に生成されること
- 名前変更時は動物、背景色、互換用文字色がすべて維持されること
- 一覧・ダッシュボードの絵文字が 1.35rem、詳細・編集プレビューが 2rem で表示されること
- 絵文字表示に太字を適用せず、OS標準のカラー絵文字フォントを使用すること
- アップロードアイコンがある場合は icon.url が返ること
- アイコン削除後は DEFAULT / READY に戻ること

### 5.3 アイコン・ファイル

| ケース | 期待結果 |
| --- | --- |
| JPEG / PNG / WebP | 受け付け、WebP 派生画像を生成する |
| SVG / GIF / 実行形式 | 拒否される |
| 5MB 超過 | 拒否される |
| 最大縦横サイズ超過 | 拒否される |
| 拡張子と MIME 不一致 | 拒否される |
| 破損画像 | 拒否される |
| EXIF 付き画像 | EXIF が削除される |
| 正方形 / 縦長 / 横長 | 中央トリミングまたは設計通りの変換になる |
| DB 更新失敗 | 保存済みファイルが補償削除される |
| 旧画像差し替え | 新画像成功後に旧画像削除 task が登録される |
| 非同期失敗 | FAILED になり、再試行または初期アイコン fallback ができる |

### 5.4 契約

- HOURLY の必須項目が不足している場合は validation error
- MONTHLY_RANGE の minimumMinutes、maximumMinutes、baseMinutes の大小関係を検証する
- MONTHLY_FIXED は固定月額として計算できる
- PERFORMANCE は成果報酬として計算できる
- 契約種別に不要な金額項目が送られた場合は拒否する
- valid_from / valid_until の整合性を検証する
- 同一案件内で契約期間が重複する場合は 409 Conflict
- 別案件同士の契約期間重複は許可する
- 未確定精算に参照された契約の削除は409 CONTRACT_IN_USE、確定済み精算参照はsnapshotを保持して論理削除できる
- 案件登録・一覧・詳細・編集に稼働率目安が表示されず、編集時に既存workloadRateが保持される
- 契約API取得失敗時も案件詳細が表示され、契約パネルだけを再取得できる
- 契約なし、現在契約、validFrom降順履歴、登録・編集・削除後の案件詳細遷移を検証する
- 組織タイムゾーン基準のisCurrentを期間境界・無期限・INACTIVEで検証する
- OWNER/ADMINは契約登録・更新・削除可、MEMBERは閲覧のみ、別organizationは取得不可

### 5.5 スケジュール・予定生成

- day_of_week は 0=日曜、1=月曜、...、6=土曜として扱う
- 生成期間上限の初期値は 100 日とする
- dryRun は DB 保存せず、生成予定件数と警告を返す
- Phase1 の title は案件名を使用する
- 既存予定がある日は重複作成しない
- 手動上書き済み予定は再生成で上書きしない
- CANCELLED の予定を再生成で復活させない
- 予定重複は Phase1 では警告表示を行う
- Idempotency-Key により同一生成リクエストが二重実行されない

### 5.6 稼働実績

- actualStartAt / actualEndAt / breaks をリクエストで受け取る
- actualMinutes と billableMinutes はバックエンドで計算する
- 休憩が稼働時間外の場合は validation error
- 休憩が重複している場合は validation error
- actualEndAt が actualStartAt より前の場合は validation error
- isBillable=false の場合、billableMinutes が 0 になること
- Phase1 は DRAFT 中心運用とし、DRAFT / CONFIRMED の厳密運用は Phase2 以降とする
- 確定済み精算に含まれる実績は破壊的更新できない

### 5.7 月次精算・売上計算

- projectId と settlementMonth から対象契約を特定できること
- HOURLY は請求対象時間と hourlyRate から金額を計算する
- MONTHLY_RANGE は baseMinutes 差分基準で控除・超過を計算する
- MONTHLY_FIXED は固定月額で計算する
- PERFORMANCE は成果報酬額を計算対象にできる
- 税額、源泉徴収、合計額は Decimal を使用し、金額丸め方針に従う
- 計算過程で float を使用しない
- 再計算時に未確定精算のみ更新できる
- FINALIZED の精算は再計算・削除できない
- 精算確定 API は Idempotency-Key により二重確定されない
- 確定時に計算スナップショットが保持される

### 5.8 エラーハンドリング

- すべての API エラーが code、message、details、traceId を含む
- validation error は field 単位の details を返す
- 業務エラーは専用 code を返す
- 想定外エラーは内部詳細を返さない
- traceId がログとレスポンスで突合できる

## 6. OpenAPI テスト

### 6.1 対象ファイル

- docs/06_api/openapi/authentication_api.yaml
- docs/06_api/openapi/client_api.yaml
- docs/06_api/openapi/project_api.yaml
- docs/06_api/openapi/contract_api.yaml
- docs/06_api/openapi/schedule_api.yaml
- docs/06_api/openapi/work_records_api.yaml

### 6.2 検証観点

- OpenAPI 3.0.3 として parse できること
- Swagger UI で読み込めること
- components の参照が解決できること
- GET、HEAD、DELETE に requestBody を定義しないこと
- Cookie 認証と CSRF の記載が API 方針と一致すること
- エラーレスポンス形式が共通化されていること
- Phase2 対象の invoice / payment API が Phase1 主要 API に混入していないこと

## 7. CI/CD テスト設計

### 7.1 Pull Request

Pull Request では以下を自動実行する。

- Ruff lint / format check
- mypy
- Django System Check
- Django Migration diff check
- pytest unit / API test
- PostgreSQL integration test
- Redis / Celery を含む必要最小限の integration test
- TypeScript typecheck
- ESLint
- Next.js build
- Vitest / React Testing Library
- Playwright の主要 E2E
- Docker build
- OpenAPI syntax / Swagger UI compatibility check

### 7.2 Staging デプロイ

staging ブランチへ merge 後、STG 環境へ自動デプロイし、以下を確認する。

- migration が正常に適用されること
- web / worker / redis が起動すること
- health check が成功すること
- ログイン Smoke Test が成功すること
- 主要 API が 5xx を返さないこと
- R2 またはローカルストレージへのファイル保存が成功すること
- Celery task が処理されること

### 7.3 Production デプロイ

main ブランチへ merge 後、本番承認を経て Production へデプロイし、以下を確認する。

- migration check が成功すること
- デプロイ後 health check が成功すること
- ログイン Smoke Test が成功すること
- 重大なエラーログが発生していないこと

## 8. テストデータ方針

### 8.1 標準 fixture

- organization
- users: OWNER、ADMIN、MEMBER
- clients
- projects
- project_members
- contracts
- weekly_schedules
- work_schedules
- work_records
- settlements
- background_tasks
- audit_logs

### 8.2 テナント分離用 fixture

必ず複数 organization のデータを用意し、他 organization の ID を指定した場合に参照・更新・削除できないことを検証する。

### 8.3 金額・時間テストデータ

- 金額は Decimal または整数最小単位で期待値を定義する
- float に依存した期待値を作らない
- 端数処理は境界値を含める
- 0 分、1 分、丸め単位未満、丸め単位ちょうど、上限超過を含める

## 9. Phase1 受入条件

Phase1 完了時には、少なくとも以下がテストで確認されていること。

- 利用者登録、ログイン、トークン更新、ログアウトができる
- JWT は Cookie で扱われ、レスポンス本文へ含まれない
- normalized_email により同一メールの重複登録を防止できる
- クライアントと案件を登録、一覧、詳細、更新できる
- クライアント・案件のアイコンを初期表示、アップロード、削除できる
- 不正な画像ファイルを拒否できる
- 他 organization のデータへアクセスできない
- 契約を登録、更新、削除でき、同一案件内の契約期間重複を防止できる
- 週次予定と個別予定を扱い、予定生成ができる
- 稼働実績を登録、更新でき、時間はバックエンドで計算される
- 月次精算を計算、再計算、確定、未確定削除できる
- version conflict が 409 として扱われる
- 主要変更操作で audit_logs が記録される
- PC とスマートフォンの主要画面で操作できる
- Django Migration が適用できる
- PostgreSQL を使った integration test が通る
- OpenAPI YAML が Swagger UI で読み込める
- Next.js build が成功する

## 10. Phase1 未対応事項

以下は Phase1 のテスト対象外とし、Phase2 以降でテスト設計を追加する。

- 請求書 API / 画面
- PDF 生成
- 請求番号採番
- 入金管理
- 請求残高更新
- 収支画面
- 分析画面
- ACCOUNTANT ロール
- SSO / OAuth / MFA
- パスワードリセット
- チーム招待
- 外部カレンダー連携
- 会計ソフト連携
- 複数通貨
- 返金、相殺、マイナス精算
- 成果物承認ワークフロー
- 大規模負荷試験
- 本格的な脆弱性診断
- 本番 DR 訓練

## 11. 未確定事項

| 項目 | 現時点の扱い |
| --- | --- |
| E2E の実行頻度 | Pull Request では主要シナリオ、staging では広めの Smoke / E2E を想定する |
| テストカバレッジ閾値 | Phase1 初期は重要ドメインの網羅を優先し、数値閾値は導入後に決定する |
| R2 結合テスト | CI では mock / local adapter 中心、STG で R2 実接続確認を行う方針とする |
| Playwright 対象ブラウザ | Phase1 は Chromium を必須、Firefox / WebKit は必要に応じて追加する |

## 12. 変更履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-07-16 | 1.0 | Phase1 用テスト設計書を新規作成。docs 配下の要件、基本設計、アーキテクチャ、DB、API、認証・認可、エラー、非同期、ファイル、キャッシュ、運用、アイコン、予定生成、契約・売上計算の各設計と整合するように整理。 |
| 2026-07-20 | 1.1 | 週間カレンダーの空表示、時間枠クリック登録、予定編集・削除導線、予定と実績の責務分離、警告・楽観ロックの画面テスト観点を追加。 |
| 2026-07-20 | 1.2 | 契約4種、テナント・権限、isCurrent、論理削除、契約UI、稼働率互換値保持のテスト観点を追加 |

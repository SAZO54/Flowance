# 要件定義書

## 1. システム概要

Flowance は、フリーランサー向けの業務管理プラットフォームである。

Phase1 では、案件・契約・作業予定・稼働実績・月次精算を一つのサービスで管理し、フリーランサーが日々の稼働と売上見込みを正確に把握できる状態を作る。

Phase1 で解決する主な課題は次の通り。

- クライアントを管理する
- 案件を管理する
- 案件ごとの契約条件を管理する
- 曜日単位の定期予定を登録する
- 特定日の予定を個別に変更する
- カレンダーで予定と実績を確認する
- 予定時間と実績時間を分けて管理する
- 実際に働いた時間と休憩時間から稼働時間を計算する
- 契約条件に基づいて請求対象時間を計算する
- 月次・案件単位で精算金額を計算する
- クライアントと案件をアイコンで視覚的に識別する
- 認証、認可、トランザクション、排他制御、監査ログを備えた実践的なポートフォリオ製品として構築する

請求書、入金、分析は Phase2 対応とする。
Phase1 では、これらを実装対象から外し、必要なデータ構造や将来拡張ポイントのみ設計上考慮する。

## 2. Phase1 の対象範囲

### 2.1 Phase1 対象機能

Phase1 で実装対象とする機能は次の通り。

| 分類 | 対象 |
| --- | --- |
| 認証 | 利用者登録、ログイン、Token更新、ログアウト、ログイン利用者取得 |
| 組織 | 初期組織作成、OWNERメンバー作成、組織単位のテナント分離 |
| 権限 | OWNER、ADMIN、MEMBER の基本ロール制御 |
| クライアント | 一覧、登録、詳細、更新、状態管理、アイコン管理 |
| 案件 | 一覧、登録、詳細、更新、状態管理、案件期間、アイコン管理 |
| 契約 | 登録、詳細、更新、削除、契約期間重複制御 |
| スケジュール | 週次予定、個別予定、予定生成、カレンダー表示 |
| 稼働実績 | 登録、一覧、詳細、更新、削除、時間計算 |
| 精算 | 詳細取得、計算、再計算、確定、未確定精算削除 |
| ファイル | クライアント・案件アイコン画像のアップロード、変換、削除 |
| 監査 | 主要な更新操作の監査ログ |
| 排他制御 | version による楽観ロック |
| 冪等性 | 精算確定など副作用の大きい操作での Idempotency-Key 管理 |
| API仕様 | OpenAPI 3.0 YAML による API 定義 |

### 2.2 Phase1 対象外

Phase1 では次を対象外とする。

| 機能 | 扱い |
| --- | --- |
| 請求書管理 | Phase2 対応 |
| 入金管理 | Phase2 対応 |
| 分析画面 | Phase2 対応 |
| 収支画面 | Phase2 対応 |
| ACCOUNTANT ロール | Phase2 以降で検討 |
| 複数通貨 | Phase2 以降で検討。Phase1 は JPY 前提 |
| Google Calendar 同期 | Phase2 以降 |
| Stripe 決済 | Phase2 以降 |
| 会計ソフト連携 | Phase2 以降 |
| 高度なBIダッシュボード | Phase2 以降 |
| チーム招待 | Phase2 以降 |
| 細かな案件単位のMEMBER権限制御 | Phase3 対応 |

## 3. 採用技術

### 3.1 フロントエンド

Phase1 のフロントエンドでは次を使用する。

- Next.js 16
- React
- TypeScript
- App Router
- React Server Components
- Client Components
- lucide-react
- TanStack Query
- React Hook Form
- Zod
- FullCalendar
- Vitest
- React Testing Library
- Playwright

ページ、レイアウト、初期データ取得には Server Components を基本として使用する。

次の操作が必要な範囲のみ Client Components として実装する。

- カレンダー操作
- フォーム入力
- ファイル選択
- 画像プレビュー
- ドラッグ＆ドロップ
- モーダル、ダイアログ
- ブラウザAPIを使う処理
- クライアント側の一時的な状態管理

ページ全体を安易に Client Component にしてはならない。

### 3.2 バックエンド

Phase1 のバックエンドでは次を使用する。

- Python 3.13
- Django
- Django REST Framework
- Django ORM
- Django Authentication
- djangorestframework-simplejwt
- django-filter
- drf-spectacular
- Gunicorn
- Pillow
- pytest
- pytest-django
- factory_boy
- testcontainers-python
- Ruff
- mypy

バックエンドは Django / Django REST Framework を前提とする。Spring Boot、Spring Data JPA、Spring Security は使用しない。

### 3.3 データ・インフラ

Phase1 で使用する技術は次の通り。

- PostgreSQL
- Docker
- Docker Compose
- GitHub Actions
- ローカルファイルストレージ

必要に応じて導入または将来切り替え可能にする技術は次の通り。

- Redis
- Celery または Background Job Worker
- Amazon S3 などのオブジェクトストレージ
- AWS
- Terraform
- OpenTelemetry
- Prometheus
- Grafana
- Sentry

MVPではローカルファイルストレージを利用可能とする。ただし、保存処理は将来的に S3 へ切り替えられる構成とする。

## 4. 現行実装の状態

現行実装は、Next.js、React、TypeScript によるフロントエンド・プロトタイプである。

Vite から Next.js App Router への移行は完了している。

### 4.1 Next.js 移行済みの内容

- Next.js 16 系への移行
- App Router の導入
- ルートレイアウトの実装
- Metadata の設定
- トップページからダッシュボードへのリダイレクト
- 各画面のファイルベースルーティング
- React Strict Mode の有効化
- TypeScript Strict Mode の有効化
- パスエイリアスの設定
- TypeScript チェックの成功
- Next.js 本番ビルドの成功

### 4.2 Phase1 で利用する主な画面

- ダッシュボード
- スケジュール
- 案件
- 稼働実績
- クライアント
- 設定

### 4.3 Phase2 として扱う画面

次の画面は Phase2 対応とし、Phase1 ではサイドメニュー上でもコメントアウトまたは非表示とする。

- 収支
- 請求書
- 分析

## 5. システム構成

### 5.1 Next.js の責務

Next.js は UI とフロントエンド体験を担当する。

主な責務は次の通り。

- App Router によるルーティング
- ページ、レイアウトの表示
- Server Components による初期データ取得
- サーバー側での認証状態確認
- カレンダー操作
- フォーム管理
- ファイル選択
- アイコン画像プレビュー
- クライアント側入力検証
- Django REST API との通信
- ローディング、空、エラー状態の表示
- レスポンシブUI
- Metadata の管理
- 表示用状態の管理

Next.js は補助的な入力検証を行ってよい。ただし、契約計算、精算計算、権限判定、テナント分離などの業務ルールを Next.js 側のみに実装してはならない。

### 5.2 Django の責務

Django は認証、認可、業務ルール、永続化、整合性制御を担当する。

主な責務は次の通り。

- JWT 認証
- HttpOnly Cookie への Token 設定
- CSRF 検証
- 認可
- 組織単位のテナント分離
- 業務ルール
- データベース操作
- ファイルアップロード受付
- 画像形式、容量、実体の検証
- 画像保存、削除
- 契約条件検証
- 契約期間重複制御
- 稼働時間計算
- 請求対象時間計算
- 月次精算計算
- トランザクション管理
- 排他制御
- 監査ログ
- OpenAPI 仕様生成
- バックグラウンド処理

業務ルールを Next.js と Django の両方へ重複実装してはならない。

## 6. Django バックエンドアーキテクチャ

### 6.1 基本方針

Django バックエンドでは、Django の実用性を活かしつつ、責務分離を明確にする。

業務ルールは原則として Domain 相当層または Application 相当層へ配置する。

| レイヤー | Djangoでの配置例 | 責務 |
| --- | --- | --- |
| Presentation | DRF ViewSet / APIView / Serializer | HTTP入出力、形式検証、DTO変換 |
| Application | services / use_cases | ユースケース、トランザクション境界、権限・テナント検証 |
| Domain | domain services / value objects / model methods | 業務ルール、状態遷移、計算、業務例外 |
| Infrastructure | Django ORM / repositories / storage / worker | PostgreSQL、ファイル、Redis、外部サービス連携 |

DRF Serializer、View、ViewSet に複雑な業務ルールを実装してはならない。

### 6.2 Domain 相当層

Domain 相当層には次を配置する。

- Entity
- Value Object
- Domain Service
- Domain Exception
- 業務上の列挙値
- 契約検証ルール
- 契約期間重複ポリシー
- 稼働時間計算ルール
- 精算計算ルール
- 税額・源泉徴収計算ルール
- 状態遷移ルール
- アイコン種別と表示ルール

### 6.3 Application 相当層

Application 相当層にはユースケースを配置する。

Phase1 の代表的なユースケースは次の通り。

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

### 6.4 Infrastructure 相当層

Infrastructure 相当層には外部技術との接続を配置する。

- Django Model
- Django ORM Repository
- PostgreSQL
- Django Migration
- ファイルストレージ
- Pillow による画像処理
- Redis
- Celery または Background Worker
- JWT
- メール送信
- Repository Interface の実装

### 6.5 Presentation 層

Presentation 層は HTTP API の入出力を担当する。

- Django REST Framework View
- ViewSet
- Serializer
- URL
- Permission
- Pagination
- Filter
- Multipart Form Data
- Exception Handler
- HTTPレスポンス変換

## 7. 利用者と権限

### 7.1 OWNER

OWNER は組織の管理者であり、Phase1 の全機能を操作できる。

主な権限は次の通り。

- 組織設定
- メンバー管理の将来拡張
- クライアント管理
- 案件管理
- 契約管理
- 予定管理
- 稼働実績管理
- 精算管理
- アイコン登録、変更、削除

### 7.2 ADMIN

ADMIN は業務データ全般を操作できる。

主な権限は次の通り。

- クライアント作成、編集
- 案件作成、編集
- クライアント・案件アイコンの変更
- 契約管理
- 予定管理
- 稼働実績管理
- 精算管理

### 7.3 MEMBER

MEMBER は担当範囲の予定・稼働実績を操作できる。

主な権限は次の通り。

- 許可された案件の参照
- 自分の予定確認
- 自分の稼働実績登録、編集

Phase1 では OWNER / ADMIN / MEMBER の単純なロール制御を基本とする。
MEMBER 権限の案件単位・操作単位の細分化は Phase3 で扱う。

### 7.4 ACCOUNTANT

ACCOUNTANT ロールは Phase1 では実装しない。

請求書、入金、売上管理が Phase2 対応であるため、ACCOUNTANT は Phase2 以降に必要性を再検討する。

## 8. 機能要件

### 8.1 認証

Phase1 では次の認証機能を実装する。

- 利用者登録
- ログイン
- Token 更新
- ログアウト
- ログイン利用者取得

認証要件は次の通り。

- 認証基盤には Django Authentication を使用する
- API認証には JWT を使用する
- JWT には djangorestframework-simplejwt を使用する
- Access Token と Refresh Token を発行する
- Access Token の有効期限は 5〜15分を目安とする
- Refresh Token の有効期限は 7〜30日を目安とする
- 両 Token は HttpOnly Cookie へ保存する
- localStorage または sessionStorage へ保存してはならない
- Refresh Token Rotation を有効にする
- 使用済み Refresh Token を Blacklist へ登録する
- ログアウト時に Refresh Token を失効させる
- POST、PUT、PATCH、DELETE では CSRF 検証を行う
- カスタム User モデルを開発初期から定義する

メールアドレス要件は次の通り。

- 表示用の email と認証・一意制約用の normalized_email を分けて保持する
- normalized_email は trim + lowercase で生成する
- normalized_email に UNIQUE 制約を付与する
- Gmail 固有のドット除去や plus addressing 除去は行わない
- ログイン時は入力 email から normalized_email を生成して検索する

### 8.2 クライアント管理

Phase1 では次を実装する。

- クライアント一覧取得
- クライアント登録
- クライアント詳細取得
- クライアント更新
- クライアント状態管理
- クライアントアイコンの自動生成
- クライアントアイコン画像のアップロード
- 登録済みアイコンの変更
- 登録済みアイコンの削除
- 初期アイコンへの復元

管理項目は次の通り。

- クライアント名
- 担当者名
- メールアドレス
- 電話番号
- 郵便番号
- 住所
- 状態
- メモ
- アイコン
- version

クライアント一覧では次を表示できる。

- クライアント名
- 担当者名
- メールアドレス
- 状態
- 案件数
- 累計売上
- 未収金額
- アイコン

Phase1 では未収金額は請求書・入金機能と完全連動しない。
精算データをもとにした概算、または将来拡張項目として扱ってよい。

### 8.3 クライアントアイコン

クライアント作成時には初期アイコンを自動設定する。

初期アイコンの仕様は次の通り。

- client_id の UUID を SHA-256 でハッシュ化し、動物絵文字と背景色を決定する
- 動物絵文字は `🐶 🐱 🐰 🐻 🐼 🐨 🦊 🐯 🦁 🐸 🐵 🐧 🐦 🐙 🐳 🐢` の16種から選択する
- 背景色は水色系を除く `#F7D9C4 #F4C7C3 #E8D5F2 #F6E3A1 #DDE5B6 #E7D7C9 #F2CEDA #DCCFBF` の8色から選択する
- 動物と背景色はハッシュの異なるバイトを使って独立に選択する
- 互換用文字色は `#294B5B` とする
- 同じ UUID では常に同じ動物と背景色を再現する
- クライアント名を変更しても初期アイコンは変更しない
- 一覧・ダッシュボードでは動物絵文字を 1.35rem、詳細・編集プレビューでは 2rem を基準に表示する
- OS標準のカラー絵文字フォントを通常ウェイトで使用する

アップロード要件は次の通り。

- 対応形式は JPEG、PNG、WebP とする
- SVG は Phase1 では対象外とする
- 最大ファイルサイズは 5MB とする
- 画像の実体形式を検証する
- 拡張子だけで判定してはならない
- 正方形以外の画像も登録可能とする
- 表示時は中央を基準に正方形へトリミングする
- 元画像を直接公開せず、必要に応じて表示用画像を生成する
- アニメーション画像は静止画像として扱うか登録を拒否する
- 不正な画像や破損ファイルを拒否する
- アップロード前にプレビューを表示する
- 登録後にアイコンを変更できる
- 登録後にアイコンを削除できる
- 削除後は自動生成アイコンへ戻す

### 8.4 案件管理

Phase1 では次を実装する。

- 案件一覧取得
- 案件登録
- 案件詳細取得
- 案件更新
- 案件状態管理
- 案件アイコンの自動生成
- 案件アイコン画像のアップロード
- 登録済みアイコンの変更
- 登録済みアイコンの削除
- 初期アイコンへの復元

案件はクライアントに属する業務単位として管理する。

管理項目は次の通り。

- クライアント
- 案件名
- 案件説明
- ラベル色
- アイコン
- 状態
- 開始日
- 終了日
- メモ
- version

案件状態は次の通り。

- ACTIVE
- PAUSED
- COMPLETED
- ARCHIVED

案件の開始日・終了日は、契約期間ではなく案件管理上の期間として保持する。
稼働率目安はPhase1の画面では扱わない。後方互換のため案件API・DBのworkloadRate / workload_rateは非推奨項目として保持し、案件編集では既存値を維持する。

### 8.5 案件アイコン

案件作成時には初期アイコンを自動設定する。

初期アイコンの仕様は次の通り。

- project_id の UUID を SHA-256 でハッシュ化し、クライアントと同じ16種の動物絵文字と水色系を除く淡色8色から決定する
- 動物と背景色はハッシュの異なるバイトを使って独立に選択する
- 案件名を変更しても初期アイコンは変更しない
- 案件のラベル色と初期アイコン背景色は別の設定として保持する
- 案件一覧、カレンダー、稼働記録で共通して使用する

案件アイコンにもクライアントアイコンと同じファイル形式、容量、画像検証、プレビュー、変更、削除要件を適用する。

案件アイコンとラベル色は別の設定として保持する。画像アイコンを登録した場合でも、カレンダーの識別色としてラベル色を継続して使用する。

### 8.6 契約管理

Phase1 では、契約情報を案件本体と分離して管理する。

Phase1 で対応する契約種別は次の通り。
- HOURLY: 時間単価契約
- MONTHLY_RANGE: 月額精算幅契約
- MONTHLY_FIXED: 月額固定契約
- PERFORMANCE: 成果報酬契約
日額契約は Phase2 以降で検討する。

契約の管理項目は次の通り。

- 契約種別
- 通貨
- 時間単価
- 月額
- 最低時間
- 最大時間
- 基準時間
- 控除単価
- 超過単価
- 消費税率
- 源泉徴収率
- 丸め単位
- 丸め方式
- 締め日
- 支払期限
- 有効開始日
- 有効終了日
- version

契約の画面・権限・削除ルールは次の通り。
- 案件詳細に「現在の契約」と「契約履歴」を表示する
- 登録・編集は案件配下の専用ページで行い、案件登録画面には組み込まない
- 契約履歴はvalid_fromの降順で表示する
- 現在契約は組織タイムゾーンの当日が有効期間内かつACTIVEである契約とする
- MEMBERは閲覧のみ、OWNER/ADMINは登録・更新・削除を行える
- 未確定精算で使用中の契約は削除できない
- 確定済み精算は契約条件snapshotと参照を保持するため、契約の論理削除を許可する
契約期間のルールは次の通り。

- 別案件同士の契約期間重複は許可する
- 同一案件内の契約期間重複は禁止する
- Application 検証と PostgreSQL exclusion constraint の両方で制御する
- 契約期間は DateRangeField を通常カラムとして持たず、valid_from / valid_until を保持する
- DB 制約では daterange(valid_from, valid_until + 1日, '[)') expression を使う
- valid_until = null は無期限契約として扱う

### 8.7 週次予定管理

Phase1 では次を実装する。

- 週次予定登録
- 週次予定一覧取得
- 週次予定更新
- 週次予定削除
- 選択した曜日への一括適用
- 平日への一括適用
- 曜日ごとの開始時刻、終了時刻設定
- 標準休憩時間設定
- 指定期間への個別予定生成

手作業で変更された個別予定を自動的に上書きしてはならない。

### 8.8 個別予定・カレンダー

Phase1 では次を実装する。

- 個別予定登録
- 個別予定更新
- 個別予定削除
- カレンダーイベント取得
- 月表示
- 週表示
- 日表示
- 案件による絞り込み
- 利用者による絞り込み
- 予定／実績の切り替え
- 予定から実績への変換

カレンダー表示 API は、表示用イベントを返す API とする。案件詳細やユーザー詳細を過剰に返さず、project_id、user_id などの識別子と表示に必要な最小限の情報に限定する。

週間カレンダーの操作要件は次の通り。

- 表示期間に予定・実績が存在しない場合も、空の時間グリッドを表示する
- 初期表示時間帯は 8:00 から 20:00 とし、表示対象が範囲外にある場合はその時刻を含むよう拡張する
- 空き時間枠をクリックすると、クリック位置を30分単位に補正した開始日時で個別予定登録を開始する
- 個別予定登録時の終了日時初期値は、開始日時の1時間後とする
- カレンダー上の個別予定または日別予定一覧から、同じ編集・削除操作を開始できる
- WorkSchedule は予定編集の対象とし、WorkRecord は稼働実績画面で編集する
- 自動生成された予定を手動更新した場合は、以後の予定生成で上書きされないことを利用者へ示す
- 登録・更新時に重複 warning が返された場合は、保存結果と併せて画面へ表示する

月間カレンダーの操作要件は次の通り。

- 日付セルをクリックすると、その日付の個別予定登録モーダルを開く
- 開始日時初期値は、クリック時点の利用者時間帯における次の正時とし、終了日時初期値はその1時間後とする
- カレンダー上の WorkSchedule をクリックした場合は、日付セルの登録操作より優先して編集・削除モーダルを開く

### 8.9 稼働実績管理

Phase1 では、予定と実績を別データとして保持する。

稼働実績の管理項目は次の通り。

- 案件
- 関連する予定
- 実開始日時
- 実終了日時
- 休憩時間
- 実稼働時間
- 請求対象時間
- 請求対象フラグ
- 状態
- メモ
- 利用者
- version

フロントエンドから受け取る項目は次の通り。

- project_id
- work_schedule_id
- actual_start_at
- actual_end_at
- breaks
- is_billable
- status
- notes

フロントエンドから actual_minutes、break_minutes、billable_minutes は受け取らない。これらは Django 側で計算する。

稼働履歴一覧は案件、状態、稼働月で絞り込めるものとする。稼働月を指定した場合は、その月の月初から翌月月初までを一覧 API の `from` / `to` に指定し、未指定時は全期間を対象とする。

実績時間計算のルールは次の通り。

- actual_minutes = actual_end_at - actual_start_at - break_minutes
- break_minutes は breaks の合計
- 休憩は実績時間内でなければならない
- 休憩同士は重複してはならない
- is_billable = false の場合、billable_minutes は 0
- is_billable = true の場合、契約の丸めルールに従って billable_minutes を計算する

### 8.10 月次精算

Phase1 では次を実装する。

- 精算詳細取得
- 精算計算
- 精算再計算
- 精算確定
- 未確定精算の削除

精算の管理項目は次の通り。

- 案件
- 契約
- 精算月
- 予定時間
- 実績時間
- 請求対象時間
- 基本金額
- 控除金額
- 超過金額
- 税額
- 源泉徴収額
- 合計金額
- 状態
- 確定日時
- version

精算確定は冪等に処理する。

確定済み精算は再計算・削除できない。

Phase1 では精算一覧取得 API は必須としない。精算は案件と対象月の文脈で扱うため、詳細取得、計算、再計算、確定、未確定削除を優先する。

### 8.11 売上・金額計算

金額計算で Python の float 型を使用してはならない。

使用する型は次の通り。

- Python: decimal.Decimal
- Django: DecimalField
- PostgreSQL: numeric

Phase1 の計算方式は次の通り。

| 契約種別 | 計算方式 |
| --- | --- |
| 時間単価 | 丸め後の請求対象時間 × 時間単価 |
| 月額精算幅 | 月額 ± base_minutes との差分に基づく控除・超過 |

月額精算幅契約では base_minutes を基準に控除・超過を計算する。

- actual_minutes < base_minutes の場合、base_minutes - actual_minutes を控除対象差分とする
- actual_minutes > base_minutes の場合、actual_minutes - base_minutes を超過対象差分とする
- minimum_minutes / maximum_minutes は許容幅または警告・契約条件表示として扱う

消費税、源泉徴収、合計額の丸め方針は次の通り。

- 消費税は税率単位で1回だけ端数処理する
- 消費税の初期丸め方式は ROUND_DOWN とする
- 源泉徴収税額の1円未満は切り捨てる
- 源泉徴収の丸め方式は ROUND_DOWN 固定とする
- 合計額に対して二重の丸め処理は行わない

### 8.12 監査ログ

Phase1 では主要な更新操作を監査ログとして記録する。

監査対象は次の通り。

- ログイン
- ログアウト
- クライアント登録・更新
- クライアントアイコン登録・変更・削除
- 案件登録・更新
- 案件アイコン登録・変更・削除
- 契約登録・更新・削除
- 予定一括生成
- 個別予定登録・更新・削除
- 稼働実績登録・更新・削除
- 精算計算・再計算・確定・削除

監査ログには次を含める。

- organization_id
- actor_user_id
- action
- resource_type
- resource_id
- before
- after
- request_id
- created_at

ファイル本体を監査ログへ保存せず、ファイル識別子、操作、実行者、日時を記録する。

## 9. アイコンファイル管理要件

### 9.1 保存情報

クライアントおよび案件には次のアイコン情報を保持する。

- icon_type
- icon_status
- icon_file_id
- default_icon_text
- default_icon_background_color
- default_icon_text_color
- icon_updated_at
- version

icon_type は次の値を持つ。

- DEFAULT
- UPLOADED

icon_status は次の値を持つ。

- READY
- PENDING
- PROCESSING
- FAILED

### 9.2 保存先

開発環境では Django MEDIA_ROOT を利用する。

本番環境では Amazon S3 などのオブジェクトストレージを利用できる構成とする。

- 非公開 Bucket を基本とする
- 必要に応じて署名付き URL を使用する
- CDN 導入を検討する
- DB へ画像のバイナリデータを直接保存しない

### 9.3 ファイル名

保存時には利用者が指定したファイル名をそのまま使用しない。

- UUID などで内部ファイル名を生成する
- パスに organization_id を含める
- クライアントと案件で保存ディレクトリを分ける
- パストラバーサルを防止する
- 元のファイル名は表示用情報として別途保持する

保存例は次の通り。

- organizations/{organization_id}/clients/{client_id}/icons/{uuid}.webp
- organizations/{organization_id}/projects/{project_id}/icons/{uuid}.webp

### 9.4 画像変換

アップロード画像は必要に応じて WebP などの表示用形式へ変換する。

生成候補は次の通り。

- 64×64
- 128×128
- 256×256

EXIF 情報などの不要なメタデータは削除する。

画像処理に失敗した場合は登録処理を中止し、途中生成ファイルを残さない。

## 10. データベース要件

Phase1 では PostgreSQL を使用する。

主なテーブルは次の通り。

- users
- organizations
- organization_members
- clients
- projects
- project_members
- project_contracts
- project_weekly_schedules
- work_schedules
- work_records
- work_breaks
- monthly_project_settlements
- stored_files
- audit_logs
- idempotency_keys
- background_tasks
- outbox_events

Phase2 用の invoices、invoice_items、payments は将来拡張として設計上考慮するが、Phase1 の機能実装対象からは外す。

DB変更には Django Migration を使用する。

主要なDB制約は次の通り。

- normalized_email UNIQUE
- organization_id によるテナント分離
- organization_id + project_id + settlement_month UNIQUE
- valid_from <= valid_until の CHECK 制約
- 同一案件内の契約期間重複を防ぐ PostgreSQL exclusion constraint
- 各種外部キー
- version などの非負制約

## 11. 排他制御とトランザクション

### 11.1 楽観ロック

Phase1 では version による楽観ロックを採用する。

対象は次の通り。

- Client
- Project
- ProjectContract
- WorkSchedule
- WorkRecord
- MonthlyProjectSettlement

更新時にリクエスト version と現在 version が一致しない場合は 409 Conflict を返す。

### 11.2 トランザクション

トランザクション対象は次の通り。

- 利用者登録
- クライアント登録・更新
- 案件登録・更新
- 契約登録・更新・削除
- 週次予定登録・生成
- 個別予定登録・更新・削除
- 稼働実績登録・更新・削除
- 月次精算計算
- 月次精算確定
- 監査ログ記録
- 冪等性キー登録
- Outboxイベント登録

DB更新とファイル保存は完全な同一トランザクションにできないため、失敗時の補償処理を用意する。

- DB更新失敗時は新規アップロードファイルを削除する
- ファイル削除失敗時は削除対象として記録する
- 旧ファイルは新しいアイコンの保存成功後に削除する
- 必要に応じて孤立ファイルを定期削除する

## 12. API要件

API のベースパスは /api/v1 とする。

### 12.1 認証API

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/token/refresh
- POST /api/v1/auth/logout
- GET /api/v1/auth/me

JWT はレスポンス本文へ含めず、HttpOnly Cookie で扱う。

### 12.2 クライアントAPI

- GET /api/v1/clients
- POST /api/v1/clients
- GET /api/v1/clients/{clientId}
- PATCH /api/v1/clients/{clientId}
- PUT /api/v1/clients/{clientId}/icon
- DELETE /api/v1/clients/{clientId}/icon

クライアント登録 API は 201 Created、Location ヘッダー、作成済みクライアント概要を返す。

### 12.3 案件API

- GET /api/v1/projects
- POST /api/v1/projects
- GET /api/v1/projects/{projectId}
- PATCH /api/v1/projects/{projectId}
- PUT /api/v1/projects/{projectId}/icon
- DELETE /api/v1/projects/{projectId}/icon

### 12.4 契約API

- POST /api/v1/projects/{projectId}/contracts
- GET /api/v1/projects/{projectId}/contracts/{contractId}
- PATCH /api/v1/projects/{projectId}/contracts/{contractId}
- DELETE /api/v1/projects/{projectId}/contracts/{contractId}

### 12.5 スケジュール・カレンダーAPI

- GET /api/v1/calendar/events
- GET /api/v1/weekly-schedules
- POST /api/v1/weekly-schedules
- PATCH /api/v1/weekly-schedules/{weeklyScheduleId}
- DELETE /api/v1/weekly-schedules/{weeklyScheduleId}
- POST /api/v1/work-schedules/generate
- POST /api/v1/work-schedules
- PATCH /api/v1/work-schedules/{workScheduleId}
- DELETE /api/v1/work-schedules/{workScheduleId}

GET、HEAD、DELETE API では requestBody を使用しない。

### 12.6 稼働実績API

- GET /api/v1/work-records
- POST /api/v1/work-records
- GET /api/v1/work-records/{workRecordId}
- PATCH /api/v1/work-records/{workRecordId}
- DELETE /api/v1/work-records/{workRecordId}

### 12.7 精算API

- GET /api/v1/settlements/{settlementId}
- POST /api/v1/settlements/calculate
- POST /api/v1/settlements/{settlementId}/recalculate
- POST /api/v1/settlements/{settlementId}/finalize
- DELETE /api/v1/settlements/{settlementId}

精算削除は未確定精算のみ許可する。

## 13. 非機能要件

### 13.1 セキュリティ

- JWT を HttpOnly Cookie へ保存する
- 本番 Cookie に Secure 属性を設定する
- SameSite 属性を適切に設定する
- CSRF Protection を有効にする
- Permission で認可する
- 組織間のデータ分離を保証する
- ファイルの拡張子だけを信用しない
- ファイルの MIME Type と実体を検証する
- 最大ファイルサイズを制限する
- SVG を Phase1 では許可しない
- アップロードファイルを実行可能な場所へ保存しない
- 元ファイル名を保存パスへ使用しない
- ファイルURLから他組織の非公開ファイルを取得できないようにする
- 画像処理時のリソース消費を制限する
- 画像の最大縦横サイズを制限する

### 13.2 性能

- 一覧画面ではサムネイルを使用する
- 原寸画像を一覧で読み込まない
- ブラウザキャッシュを利用する
- ファイル名またはURLにバージョンを含める
- 必要に応じて CDN を使用できる設計にする
- 画像変換をバックグラウンド処理へ移行できるようにする
- 一覧APIはページネーションを必須とする

### 13.3 アクセシビリティ

- アイコンだけでクライアントや案件を識別させない
- 必要な箇所では名称を併記する
- 代替テキストを設定する
- 背景色と文字色のコントラストを確保する
- 画像取得失敗時も名称が確認できること

### 13.4 可観測性

Phase1 では最低限、次を実装または導入可能な構成にする。

- 構造化ログ
- request_id / trace_id
- 例外ログ
- 監査ログ
- ヘルスチェック

Sentry、OpenTelemetry、Prometheus、Grafana は必要に応じて Phase2 以降で導入する。

## 14. テスト要件

### 14.1 バックエンド単体テスト

- normalized_email 生成
- パスワード強度検証
- UUIDベースの動物絵文字・背景色生成
- 初期背景色生成
- 文字色のコントラスト判定
- 契約種別ごとの入力検証
- 契約期間重複判定
- 稼働時間計算
- 休憩時間計算
- 請求対象時間計算
- 時間丸め
- 月額精算幅計算
- 消費税計算
- 源泉徴収計算
- 精算確定の状態遷移

### 14.2 バックエンド統合テスト

- 利用者登録
- ログイン
- Token 更新
- ログアウト
- クライアント登録・更新
- 案件登録・更新
- クライアントアイコン登録
- 案件アイコン登録
- アイコン変更時の旧ファイル処理
- DB更新失敗時の補償処理
- 他組織データの参照・更新拒否
- 権限を持たない利用者の更新拒否
- JWT認証なしの更新拒否
- 競合更新時の HTTP 409
- 契約期間重複時のエラー
- 稼働実績登録・更新
- 精算計算・再計算・確定

### 14.3 画像アップロードテスト

- JPEG 登録
- PNG 登録
- WebP 登録
- 未対応形式の拒否
- 5MB 超過ファイルの拒否
- 拡張子と実体が異なるファイルの拒否
- 破損画像の拒否
- 正方形画像の変換
- 縦長画像の変換
- 横長画像の変換
- EXIF 情報の削除
- アイコン削除後の初期アイコン復元

### 14.4 フロントエンドテスト

- ファイル選択
- アップロード前プレビュー
- アップロード中表示
- アップロード失敗表示
- アイコン変更
- アイコン削除
- 初期アイコンへの復元
- 画像読み込み失敗時のフォールバック
- フォーム入力検証
- カレンダー表示
- 稼働実績登録フォーム
- レスポンシブ表示

## 15. CI/CD 要件

### 15.1 バックエンド

- Ruff Lint
- Ruff Format Check
- mypy
- Django System Check
- Migration 差分チェック
- pytest
- PostgreSQL 統合テスト
- 画像アップロードテスト

### 15.2 フロントエンド

- TypeScript 型チェック
- Next.js 本番ビルド
- ESLint
- Vitest
- React Testing Library
- Playwright

### 15.3 共通

- Docker ビルド検証
- 秘密情報の混入確認
- アップロード容量制限の確認
- OpenAPI 仕様の構文検証

## 16. Phase1 受入条件

Phase1 の受入条件は次の通り。

- 利用者登録と JWT ログインができる
- JWT が HttpOnly Cookie で管理される
- ログアウトで Refresh Token を失効できる
- normalized_email により大文字小文字違いのメール重複を防止できる
- クライアントを登録できる
- クライアント作成時に初期アイコンが設定される
- クライアントへ任意の画像アイコンを登録できる
- クライアントアイコンを変更、削除できる
- クライアントアイコン削除後に初期アイコンへ戻る
- 案件を登録できる
- 案件作成時に初期アイコンが設定される
- 案件へ任意の画像アイコンを登録できる
- 案件アイコンを変更、削除できる
- 案件アイコン削除後に初期アイコンへ戻る
- 不正ファイルを登録できない
- 他組織のデータを参照・更新できない
- 時間単価契約を登録できる
- 月額精算幅契約を登録できる
- 同一案件内の契約期間重複を防止できる
- 週次予定を登録できる
- 週次予定から個別予定を生成できる
- 個別予定を変更できる
- カレンダーで予定と実績を確認できる
- 実績を登録できる
- 実績時間と休憩時間から actual_minutes を計算できる
- 契約条件に基づいて billable_minutes を計算できる
- 契約条件に基づいて精算金額を計算できる
- 精算を再計算できる
- 精算を確定できる
- 確定済み精算を再計算・削除できない
- 競合更新を検出できる
- 主要更新操作が監査ログに記録される
- PC およびスマートフォンで利用できる
- Django Migration で DB を再構築できる
- PostgreSQL 統合テストが成功する
- OpenAPI 仕様を生成・検証できる
- Next.js 本番ビルドが成功する

## 17. Phase1 未対応事項

Phase1 では次を未対応とする。

- 請求書一覧
- 請求書下書き作成
- 請求書発行
- 請求書PDF生成
- 入金登録
- 一部入金
- 過入金
- 未収金の請求書連動管理
- 分析ダッシュボード
- 収支画面
- ACCOUNTANT ロール
- 日額契約
- 複数通貨
- 適格請求書対応
- 請求番号採番
- Google Calendar 同期
- Slack通知
- LINE通知
- 会計ソフト連携
- Stripe決済
- 高度なBIダッシュボード
- ストップウォッチ式タイムトラッキング
- AIによるアイコン生成
- SVGアイコンアップロード
- 画像編集機能
- マイクロサービス化
- Kubernetes

## 18. 未確定事項

Phase1 開発前または開発中に確認する事項は次の通り。

| 論点 | 候補・確認内容 |
| --- | --- |
| 月内で契約が切り替わる場合の精算 | Phase1では月内1契約運用を基本とし、必要なら日割り・期間分割を検討する |
| 予定重複の扱い | 禁止、警告のみ、許可のどれにするか → 許可とする |
| 稼働実績の確定フロー | DRAFT / CONFIRMED を厳密運用するか、Phase1ではDRAFT中心にするか |
| 消費税丸めの組織別設定 | Phase1から持つか、Phase2以降にするか |
| 初期アイコン色の具体アルゴリズム | 決定済み: UUID の SHA-256 と水色系を除く固定淡色8色パレットを使用する |
| クライアント名変更時の初期アイコン再生成 | 決定済み: UUIDベースの動物・背景色を維持する |
| 案件名変更時の初期アイコン再生成 | 決定済み: UUIDベースの動物・背景色を維持する |
| アップロード画像の最大縦横サイズ | 例: 4096px、8192px など |
| 元画像保持 | 表示用変換画像のみ保持するか、元画像も保持するか |
| 本番ストレージ | S3、Cloudflare R2、その他 |
| Celery導入時期 | Phase1内で導入するか、同期処理から開始するか |
| バックアップ、RPO、RTO | 本番運用前に決定 |

## 19. 変更履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-07-02 | 1.0 | 初版作成 |
| 2026-07-09 | 1.3 | Next.js / Django 構成、アイコン管理、API要件を整理 |
| 2026-07-10 | 1.4 | Phase1用要件定義書として再構成。請求書・入金・分析をPhase2へ移動。Spring Boot表記をDjango / DRFへ修正。normalized_email、契約期間重複制約、金額丸め、月額精算ルール、Phase1未対応事項を反映 |
| 2026-07-20 | 1.5 | 週間カレンダーの空表示、時間枠クリックによる予定登録、予定編集・削除導線、予定と実績の編集責務、重複警告表示を追加 |
| 2026-07-20 | 1.6 | 案件詳細内の契約管理、契約4種、権限・削除条件・isCurrent、稼働率目安UI非表示を反映 |

## 24. Phase1 設定管理（2026-07-30更新）

Phase1ではプロフィール設定と組織設定を更新できる。

| 区分 | 項目・制約 |
| --- | --- |
| プロフィール | displayName必須100文字以内、lastName / firstName各50文字以内、email 254文字以内かつメール形式、phone数字のみ15桁以内、bio 1000文字以内 |
| 組織 | name必須150文字以内、tradeName 150文字以内、postalCode 20文字以内、prefecture 20文字以内、address 500文字以内 |

- プロフィールは認証済み利用者本人が更新できる。
- 組織設定は OWNER / ADMIN が更新できる。
- 組織更新では version を必須とし、競合時は 409 を返す。
- 適格請求書発行事業者番号は Phase1 対象外とする。
- パスワードは12文字以上128文字以下とし、Django標準バリデータを適用する。
- registerは5回/時/IP、loginは10回/5分/IPかつ5回/15分/normalized_email、token refreshは30回/時を既定とする。
- 制限超過時は429 RATE_LIMITEDとRetry-Afterを返す。

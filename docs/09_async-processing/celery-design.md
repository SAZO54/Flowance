# 非同期処理設計書

## 1. 文書概要

### 1.1 目的

本書は、Flowance Phase1 における非同期処理の設計方針を定義する。

Phase1 では Redis / Celery を導入し、アイコン画像変換、表示用画像生成、旧画像削除、孤立ファイル削除、Outbox イベント処理など、同期 API のレスポンスを遅くしやすい処理をバックグラウンドで実行する。

非同期処理の状態は PostgreSQL の background_tasks を正とし、Redis や Celery の内部状態を業務上の正規データとして扱わない。

### 1.2 対象範囲

Phase1 の対象範囲は以下とする。

- Redis Broker
- Celery Worker
- Celery Beat または定期実行相当の maintenance 処理
- background_tasks によるタスク状態管理
- outbox_events による非同期イベント発行管理
- stored_files と連動したファイル処理
- クライアントアイコン画像処理
- 案件アイコン画像処理
- 旧画像削除
- 孤立ファイル削除
- タスク失敗時のエラー記録
- タスクの冪等性、再実行、リトライ

### 1.3 Phase1 対象外

以下は Phase2 以降で詳細設計する。

- 請求書 PDF 生成
- 請求書メール送信
- 入金・消込の非同期処理
- 分析用の大規模集計ジョブ
- AI によるアイコン生成
- SVG アイコンアップロード
- 画像編集機能
- 汎用非同期タスク状態取得 API
- WebSocket / SSE によるリアルタイムタスク通知
- 管理者向けタスク再実行 UI
- Celery Flower などの運用 UI 導入

## 2. 参照設計

本書は以下の設計方針と整合させる。

- 要件定義書
- 基本設計書
- システムアーキテクチャ設計書
- バックエンド Clean Architecture 設計書
- フロントエンドアーキテクチャ設計書
- DB 設計書
- API 設計書
- 認証・認可設計書
- エラーハンドリング設計書

## 3. 基本方針

### 3.1 非同期化する判断基準

以下に該当する処理は非同期化する。

1. 画像変換など CPU / I/O 負荷が高い処理。
2. Cloudflare R2 など外部ストレージへの書き込み・削除を伴う処理。
3. 失敗時にリトライすべき一時的な外部依存処理。
4. API レスポンスを待たせる必要がない処理。
5. DB 更新後に安全に後続実行できる補償処理。

以下は同期処理として扱う。

1. 入力値検証。
2. 認証・認可。
3. tenant 境界チェック。
4. ファイルサイズ上限、Content-Type、拡張子などの入口検証。
5. DB 上の正規状態更新。
6. API として即時に成否を返す必要がある業務ルール検証。

### 3.2 正規データの保存先

| データ | 正規保存先 | 方針 |
| --- | --- | --- |
| 業務データ | PostgreSQL | 正規データ。Redis / Celery Result を正としない |
| タスク状態 | PostgreSQL background_tasks | UI・API・調査で参照する正規タスク状態 |
| 非同期イベント | PostgreSQL outbox_events | DB 更新とイベント発行の整合性を確保 |
| Broker メッセージ | Redis | 一時データ。消失・遅延に備えて DB 側で復旧可能にする |
| Celery 内部状態 | Celery / Redis | 運用補助。業務 API へ直接露出しない |
| ファイル実体 | Local Storage / Cloudflare R2 | DB にはオブジェクトキーとメタデータのみ保存 |

### 3.3 Redis の位置づけ

Redis は Phase1 内で導入する。

主用途は Celery Broker とし、必要に応じて短時間キャッシュ、レート制限情報、一時的な処理状態にも利用する。

Redis の方針は以下とする。

- Redis を業務データの唯一の保存先にしない。
- Redis は外部公開しない。
- Redis に個人情報、認証 token、Cookie、署名付き URL を保存しない。
- 永続化が必要な状態は PostgreSQL に保存する。
- Redis 障害時も、DB に残った PENDING タスクまたは Outbox から再実行できる設計にする。

### 3.4 Celery の位置づけ

Celery は Phase1 内で導入する。

Celery Worker は Application 層の UseCase を直接肥大化させず、非同期実行用の Application Service を呼び出す薄い entrypoint として扱う。

Celery task から Domain 層へ直接依存させず、Application 層を経由して業務ルールを実行する。

## 4. システム構成

### 4.1 構成要素

| 構成要素 | 役割 |
| --- | --- |
| Next.js | 画面表示、アップロード UI、リソース状態ポーリング |
| Django REST Framework | API 受付、入力検証、DB 更新、非同期タスク登録 |
| PostgreSQL | 業務データ、stored_files、background_tasks、outbox_events |
| Redis | Celery Broker、短時間キャッシュ、レート制限補助 |
| Celery Worker | 画像変換、旧画像削除、Outbox dispatch、cleanup |
| Celery Beat | 定期 cleanup、期限切れタスク削除、孤立ファイル検知 |
| Local Storage | ローカル開発用ファイル保存先 |
| Cloudflare R2 | 本番ファイル保存先 |
| Pillow | 画像検証、EXIF 反映、トリミング、WebP 変換 |

### 4.2 処理の流れ

1. Next.js がアイコン登録または更新 API を呼び出す。
2. Django REST Framework が認証、認可、入力検証、業務検証を行う。
3. PostgreSQL transaction 内で stored_files、background_tasks、outbox_events を作成する。
4. API は 202 Accepted または対象リソースの更新レスポンスを返す。
5. Outbox dispatcher が PENDING の outbox_events を取得する。
6. Outbox dispatcher が Celery task を Redis Broker へ enqueue する。
7. Celery Worker が task を取得する。
8. Worker が background_tasks を PROCESSING に更新する。
9. Worker が Storage / R2 から元画像を取得し、Pillow で表示用画像を生成する。
10. Worker が変換後画像を Storage / R2 へ保存する。
11. Worker が stored_files と対象リソースの icon_status を READY に更新する。
12. Worker が background_tasks を SUCCEEDED に更新する。
13. Next.js はリソース詳細 API または一覧 API を再取得して icon.status を確認する。

## 5. キュー設計

### 5.1 キュー一覧

Phase1 の Celery キューは以下を基本とする。

| キュー | 用途 | 主な task_type |
| --- | --- | --- |
| default | 軽量な非同期処理、Outbox dispatch | OUTBOX_DISPATCH |
| images | 画像検証後の変換、表示用画像生成 | IMAGE_PROCESSING |
| maintenance | 旧画像削除、孤立ファイル削除、期限切れタスク削除 | FILE_DELETE, CLEANUP |

### 5.2 キュー分離方針

- 画像処理は CPU / I/O 負荷が高いため images キューへ分離する。
- ファイル削除や cleanup はユーザー操作の即時性が低いため maintenance キューへ分離する。
- Outbox dispatch は軽量処理として default キューを基本とする。
- Phase1 初期は worker 数を少なく開始し、負荷に応じて images worker を増やせる構成にする。

## 6. タスク種別

### 6.1 task_type

| task_type | 説明 | キュー | リトライ |
| --- | --- | --- | --- |
| IMAGE_PROCESSING | 元画像から表示用アイコン画像を生成する | images | 一時的な Storage / DB 障害のみリトライ |
| FILE_DELETE | 不要になったファイルを Storage から削除する | maintenance | リトライ対象 |
| OUTBOX_DISPATCH | outbox_events を Celery / 外部処理へ配送する | default | リトライ対象 |
| CLEANUP | 期限切れタスク、孤立ファイル、一時ファイルを整理する | maintenance | リトライ対象 |

### 6.2 Phase2 以降の候補

| task_type | 説明 |
| --- | --- |
| INVOICE_PDF_GENERATION | 請求書 PDF 生成 |
| INVOICE_EMAIL_DELIVERY | 請求書メール送信 |
| ANALYTICS_AGGREGATION | 分析用集計 |
| PAYMENT_RECONCILIATION | 入金消込補助 |

## 7. タスク状態設計

### 7.1 状態一覧

Flowance の業務タスク状態は background_tasks.status で管理する。

| status | 説明 | 終端状態 |
| --- | --- | --- |
| PENDING | 受付済み、まだ worker が処理していない | No |
| PROCESSING | worker が処理中 | No |
| SUCCEEDED | 正常終了 | Yes |
| FAILED | 失敗 | Yes |
| CANCELLED | キャンセル済み。Phase1 では内部運用のみ | Yes |

Celery の内部状態名をそのまま API や UI に露出しない。

既存の基本設計書と DB 設計書に合わせ、Phase1 の業務状態名は PROCESSING を採用する。

### 7.2 progress

background_tasks.progress は 0 から 100 の integer とする。

Phase1 では細かな進捗表示を必須とせず、以下の目安で更新する。

| progress | 状態 |
| --- | --- |
| 0 | PENDING |
| 10 | PROCESSING 開始 |
| 50 | 変換処理中 |
| 90 | DB 更新前 |
| 100 | SUCCEEDED |

## 8. background_tasks 設計

### 8.1 主なカラム

| カラム | 説明 |
| --- | --- |
| id | タスク ID。API レスポンスの taskId として使用可能 |
| organization_id | tenant 分離用。組織に紐づかない system task の場合のみ null 許可 |
| task_type | IMAGE_PROCESSING, FILE_DELETE, OUTBOX_DISPATCH, CLEANUP |
| resource_type | CLIENT, PROJECT, STORED_FILE など |
| resource_id | 対象リソース ID |
| celery_task_id | Celery 側の task id。enqueue 後に保存 |
| status | PENDING, PROCESSING, SUCCEEDED, FAILED, CANCELLED |
| progress | 0 から 100 |
| result | 処理結果 JSON |
| error_code | 失敗理由コード |
| error_message | 利用者または運用者向けの概要 |
| retry_count | リトライ回数 |
| started_at | 処理開始日時 |
| finished_at | 処理終了日時 |
| expires_at | UI 確認用の表示期限 |

### 8.2 保存方針

- background_tasks はタスク状態の正規データとする。
- Celery Result Backend の状態は業務画面へ直接利用しない。
- error_message に stack trace、SQL、token、Cookie、署名付き URL を保存しない。
- 詳細な例外情報は traceId とサーバーログで追跡する。
- expires_at を過ぎた古いタスクは maintenance 処理で削除またはアーカイブする。

## 9. Outbox 設計

### 9.1 目的

DB 更新と非同期イベント発行の整合性を保つため、Phase1 では outbox_events を利用する。

API 処理中に DB 更新だけ成功し、Celery enqueue だけ失敗する状態を避けるため、業務データ更新、background_tasks 作成、outbox_events 作成を同一 transaction で保存する。

### 9.2 基本フロー

1. API が入力検証、認証、認可、業務検証を行う。
2. DB transaction 内で業務データを更新する。
3. 同じ transaction 内で background_tasks を PENDING として作成する。
4. 同じ transaction 内で outbox_events を PENDING として作成する。
5. API は受付結果を返す。
6. Outbox dispatcher が PENDING event を取得する。
7. Celery task を enqueue し、celery_task_id を保存する。
8. enqueue 成功後、outbox_events を PUBLISHED にする。
9. enqueue 失敗時は retry_count / next_retry_at を更新する。

### 9.3 Redis 障害時の扱い

Outbox を使う処理では、Redis が一時的に利用できない場合でも DB に PENDING event が残るため、後続の dispatch で再実行できる。

ただし、システムが明確に非同期処理を受け付けられない状態、または Outbox へ保存できない状態では 503 Service Unavailable を返す。

## 10. アイコン画像処理

### 10.1 対象

Phase1 では以下の画像処理を非同期処理の主対象とする。

- クライアントアイコン画像変換
- 案件アイコン画像変換
- 表示用 WebP 画像生成
- 旧アイコン画像削除
- 孤立ファイル削除

### 10.2 入口検証

API 受付時に以下を同期的に検証する。

| 検証 | エラー |
| --- | --- |
| ファイル必須 | 400 VALIDATION_ERROR |
| 最大 5MB 超過 | 413 PAYLOAD_TOO_LARGE |
| Content-Type 不正 | 415 UNSUPPORTED_MEDIA_TYPE |
| 拡張子不正 | 415 UNSUPPORTED_MEDIA_TYPE |
| 画像として読み取れない | 422 IMAGE_PROCESSING_FAILED |
| 最大 4096 x 4096 超過 | 422 IMAGE_DIMENSION_TOO_LARGE |
| 総ピクセル数 16777216 超過 | 422 IMAGE_DIMENSION_TOO_LARGE |
| version 不一致 | 409 CONCURRENT_MODIFICATION |

入口検証で拒否できるものは API で拒否し、明らかに失敗するタスクをキューへ積まない。

### 10.3 画像変換フロー

1. API が元画像を一時保存または Storage へ保存する。
2. stored_files を PENDING または PROCESSING として作成する。
3. 対象の client / project の icon_status を PENDING にする。
4. background_tasks に IMAGE_PROCESSING を作成する。
5. Celery Worker が task を取得し、background_tasks.status を PROCESSING にする。
6. Worker が元画像を読み込む。
7. EXIF orientation を反映する。
8. 必要に応じて中央基準で正方形トリミングする。
9. 表示用サイズへリサイズする。
10. WebP 形式へ変換する。
11. 変換後画像を Storage へ保存する。
12. stored_files.processed_object_key、width、height、checksum、status を更新する。
13. client / project の icon_status を READY にする。
14. background_tasks.status を SUCCEEDED、progress を 100 にする。
15. 置き換えの場合は旧画像削除タスクを maintenance キューへ登録する。

### 10.4 変換失敗時

画像変換に失敗した場合は以下とする。

- background_tasks.status を FAILED にする。
- background_tasks.error_code に IMAGE_PROCESSING_FAILED を保存する。
- stored_files.status を FAILED にする。
- client / project の icon_status を FAILED にする。
- 画面では初期アイコンまたは失敗表示へフォールバックする。
- 一時生成ファイルは削除する。
- 破損画像、不正画像などの業務エラーは原則リトライしない。

## 11. 旧画像削除・補償処理

### 11.1 旧画像削除

アイコンを差し替える場合、旧画像は新しい画像の保存と DB 更新が成功した後に削除する。

旧画像削除はユーザー操作の成否に直結させず、maintenance キューの FILE_DELETE として非同期実行する。

### 11.2 アイコン削除

アイコン削除時は、client / project を初期アイコン状態へ戻し、旧 uploaded file を削除対象として扱う。

API 上は汎用 DELETE の requestBody を使わず、既存のクライアント更新 API / 案件更新 API の iconAction=DELETE または設計済みの更新形式で扱う。

### 11.3 孤立ファイル削除

以下のファイルは cleanup 対象とする。

- DB transaction 失敗後に残った一時ファイル。
- stored_files が FAILED のまま一定期間経過したファイル。
- stored_files が DELETED だが Storage 上に残っているファイル。
- processed 生成後に不要になった一時生成ファイル。

## 12. リトライ設計

### 12.1 リトライ対象

| エラー種別 | リトライ | 例 |
| --- | --- | --- |
| 一時的な Storage 障害 | Yes | R2 timeout, 503 |
| 一時的な DB 接続障害 | Yes | connection timeout |
| 一時的な Redis / Broker 障害 | Yes | enqueue 失敗、broker timeout |
| 外部 API の一時障害 | Yes | Phase2 以降のメール送信など |
| 入力不正 | No | ファイル形式不正、破損画像 |
| 業務ルール違反 | No | version 不一致、権限不足 |
| 画像変換不能 | No | Pillow で読み取り不能 |

### 12.2 リトライ方式

- 指数バックオフを基本とする。
- 最大リトライ回数を設定する。
- リトライごとに background_tasks.retry_count を更新する。
- 最終失敗時は FAILED とし、error_code と error_message を保存する。
- 業務エラーは自動リトライしない。

### 12.3 冪等性

非同期 task は少なくとも 1 回実行される可能性を前提に、冪等に設計する。

- 同じ task が複数回実行されても同じ最終状態になるようにする。
- background_tasks.status が SUCCEEDED の task は再処理しない。
- stored_files.status が READY で processed_object_key が存在する場合は再生成を避ける、または安全に上書きできるキー設計にする。
- ファイル削除は、対象ファイルが既に存在しない場合も成功扱いにできる。
- DB 更新は organization_id と resource_id を必ず条件に含める。

## 13. API 連携方針

### 13.1 受付レスポンス

非同期処理を伴う API は、処理受付後に 202 Accepted または対象リソースの更新レスポンスを返す。

レスポンスには必要に応じて taskId、対象リソース ID、現在 status、version を含める。

### 13.2 汎用タスク状態取得 API

Phase1 では汎用非同期タスク状態取得 API は対象外とする。

画面は以下のいずれかで状態を確認する。

- クライアント詳細 API で icon.status を確認する。
- 案件詳細 API で icon.status を確認する。
- 一覧 API の icon.status を確認する。

汎用 tasks API は Phase2 以降で検討する。

### 13.3 フロントエンドのポーリング

Phase1 ではリアルタイム通知を行わず、リソース API のポーリングを基本とする。

- PENDING / PROCESSING の場合、短い間隔で再取得する。
- READY / FAILED になったらポーリングを停止する。
- 長時間 PENDING / PROCESSING のままの場合は、画面上で再読み込み案内を表示する。
- 画像読み込み失敗時は初期アイコンへフォールバックする。

## 14. エラーハンドリング

### 14.1 エラーコード

| 状況 | HTTP / タスク | code |
| --- | --- | --- |
| Redis 利用不可 | 503 または Outbox retry | REDIS_UNAVAILABLE |
| Celery Worker 利用不可 | 503 または Outbox retry | ASYNC_WORKER_UNAVAILABLE |
| R2 アップロード失敗 | task FAILED | STORAGE_UNAVAILABLE |
| 画像変換失敗 | task FAILED | IMAGE_PROCESSING_FAILED |
| ファイルサイズ超過 | 413 | PAYLOAD_TOO_LARGE |
| 未対応画像形式 | 415 | UNSUPPORTED_MEDIA_TYPE |
| 画像縦横超過 | 422 | IMAGE_DIMENSION_TOO_LARGE |
| version 不一致 | 409 | CONCURRENT_MODIFICATION |

### 14.2 レスポンスに含めない情報

以下は API レスポンス、background_tasks.error_message、stored_files.error_message に含めない。

- stack trace
- SQL
- 内部例外名の詳細
- access token
- refresh token
- Cookie
- CSRF token
- 署名付き URL の署名部分
- Storage credential

詳細調査は traceId とサーバーログで行う。

## 15. セキュリティ設計

### 15.1 tenant 分離

非同期 task は必ず organization_id を保持し、DB 更新時も organization_id を条件に含める。

Worker は task payload の resource_id だけを信用せず、DB から organization_id と対象リソースを再取得して検証する。

### 15.2 payload 最小化

Celery task payload には以下のみを含める。

- background_task_id
- organization_id
- task_type
- resource_type
- resource_id

ファイルの実体、認証情報、Cookie、ユーザー入力全文は payload に含めない。

### 15.3 Storage 権限

- R2 Bucket は非公開を基本とする。
- 表示用画像の公開方式は、署名付き URL または CDN のアクセス制御を採用する。
- 元画像 original_object_key は直接公開しない。
- Worker は必要最小限の Storage 権限で動作する。

## 16. ログ・監視

### 16.1 ログ出力

非同期処理では以下をログへ出力する。

- traceId
- backgroundTaskId
- celeryTaskId
- organizationId
- taskType
- resourceType
- resourceId
- status
- retryCount
- duration
- errorCode

### 16.2 メトリクス

Phase1 では最低限、以下を計測できるようにする。

- task_type 別の成功件数
- task_type 別の失敗件数
- task_type 別の平均処理時間
- キュー滞留数
- retry_count の増加
- FAILED の件数

外部監視サービスとの本格連携は Phase2 以降で検討する。

## 17. ローカル開発構成

### 17.1 起動構成

ローカル開発では以下を基本とする。

| 構成要素 | 起動方針 |
| --- | --- |
| Next.js frontend | Docker Compose ではなく Next.js として直接起動する |
| Django API | ローカルまたは Docker Compose で起動可能 |
| PostgreSQL | Docker Compose を基本とする |
| Redis | Docker Compose を基本とする |
| Celery Worker | Django backend 環境から起動する |
| Celery Beat | 必要に応じて起動する |

### 17.2 代表コマンド

実際のコマンド名は実装時の Django project 構成に合わせて確定する。

- celery -A config worker -Q default,images,maintenance --loglevel=info
- celery -A config beat --loglevel=info

### 17.3 ローカル Storage

ローカル開発では Django MEDIA_ROOT または Local Storage Adapter を使用する。

本番では Cloudflare R2 を使用するが、Application 層は Storage 実装へ直接依存しない。

## 18. 実装方針

### 18.1 Django / Celery 構成

Phase1 では以下を追加する。

- config/celery.py
- Celery app 初期化
- 各 Django app の tasks.py
- images queue 用 task
- maintenance queue 用 task
- Outbox dispatcher
- background_tasks repository
- stored_files repository

### 18.2 transaction 境界

API 側は DB 更新、background_tasks 作成、outbox_events 作成を同一 transaction に含める。

Worker 側は task の処理開始、リソース更新、タスク完了更新を適切な transaction に分け、途中失敗時に中途半端な正規状態を残さない。

### 18.3 Worker の責務

Worker は以下を行う。

1. background_task_id からタスクを取得する。
2. organization_id と対象リソースを検証する。
3. 既に SUCCEEDED の場合は何もしない。
4. status を PROCESSING に更新する。
5. 非同期処理を実行する。
6. 成功時は対象リソース、stored_files、background_tasks を更新する。
7. 失敗時は error_code、error_message、retry_count を更新する。

## 19. テスト方針

### 19.1 単体テスト

- 画像検証ロジック
- 画像変換ロジック
- オブジェクトキー生成
- task payload 生成
- リトライ判定
- 冪等性判定
- エラーコード変換

### 19.2 結合テスト

- アイコン登録 API で background_tasks が作成されること。
- outbox_events が作成されること。
- Worker 実行後に icon.status が READY になること。
- 変換失敗時に icon.status が FAILED になること。
- 旧画像削除 task が作成されること。
- Redis 停止時に Outbox retry 可能な状態が残ること。
- 同一 task を複数回実行しても最終状態が壊れないこと。

### 19.3 フロントエンドテスト

- icon.status PENDING / PROCESSING の表示。
- READY 後の画像表示。
- FAILED 時のフォールバック表示。
- ポーリング停止条件。
- 画像読み込み失敗時の初期アイコン表示。

## 20. Phase1 未対応事項

以下は Phase1 では対応しない、または簡易対応に留める。

1. 汎用非同期タスク状態取得 API。
2. WebSocket / SSE によるリアルタイム通知。
3. 管理者向けタスク監視・再実行 UI。
4. Celery Flower などの本格的な運用 UI。
5. 請求書 PDF 生成。
6. 請求書メール送信。
7. 分析用大規模集計。
8. 外部監視サービスとの詳細連携。
9. 複数リージョン構成での worker 運用。
10. タスク優先度の詳細制御。

## 21. 未確定事項

| 項目 | 方針 |
| --- | --- |
| Celery worker 並列数 | Phase1 実装・負荷確認時に決定する |
| リトライ回数・間隔 | task_type ごとに実装時に具体値を決める |
| background_tasks 保持期間 | UI 確認に必要な期間を実装時に決める |
| stored_files cleanup 期限 | 失敗ファイル、削除済みファイルの保持期間を実装時に決める |
| R2 バケット分割 | Phase1 初期は単一 bucket を基本とし、環境別分割を検討する |
| CDN 連携 | Phase1 では必須とせず、必要に応じて導入する |
| Celery Beat 導入範囲 | cleanup の実装方式に合わせて確定する |
| Redis 永続化・冗長化 | 本番インフラ設計時に確定する |

## 22. 変更履歴

| 日付 | ver | 変更内容 |
| --- | --- | --- |
| 2026-07-16 | 1.0 | Phase1 用非同期処理設計書を新規作成。Redis / Celery、background_tasks、outbox_events、キュー設計、アイコン画像処理、旧画像削除、リトライ、冪等性、API 連携、セキュリティ、ログ・監視、ローカル開発構成、未対応事項を定義。 |

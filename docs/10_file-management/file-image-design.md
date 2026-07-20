# ファイル・画像管理設計書

## 1. 文書概要

### 1.1 目的

本書は、Flowance Phase1 におけるファイル・画像管理の設計方針を定義する。

Phase1 では、ファイル管理の対象をクライアントアイコン画像および案件アイコン画像に限定する。画像のアップロード、検証、保存、変換、表示、削除、補償処理、セキュリティ、非同期処理との連携を明確にし、安全で拡張しやすいファイル管理を実現する。

### 1.2 対象範囲

Phase1 の対象範囲は以下とする。

- クライアントアイコン画像
- 案件アイコン画像
- 初期アイコン生成
- アップロード画像の検証
- 元画像の保持
- 表示用画像の生成
- Cloudflare R2 への保存
- ローカル開発用ストレージ
- stored_files によるファイルメタデータ管理
- Celery による画像変換、旧画像削除、孤立ファイル削除
- ファイル取得失敗時のフォールバック
- ファイル関連の監査ログ

### 1.3 Phase1 対象外

以下は Phase2 以降で扱う。

- 請求書 PDF 生成
- 請求書 PDF 保管
- 入金証憑ファイル
- 契約書ファイル
- AI によるアイコン生成
- SVG アイコンアップロード
- 画像編集機能
- ユーザー任意ファイル添付
- ファイルのバージョン履歴管理
- CDN 構成の詳細最適化
- ウイルススキャン基盤の本格導入

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
- 非同期処理設計書

## 3. 基本方針

### 3.1 ファイル管理の原則

Flowance のファイル管理は以下を原則とする。

1. ファイルのバイナリデータを PostgreSQL へ保存しない。
2. DB には object_key、content_type、file_size、checksum、width、height などのメタデータを保存する。
3. 保存先は Storage Adapter 経由で抽象化する。
4. Application 層は Local Storage や Cloudflare R2 に直接依存しない。
5. 利用者が指定した元ファイル名を保存パスに使用しない。
6. ファイル拡張子だけを信用しない。
7. MIME Type、画像実体、画像サイズを検証する。
8. 元画像は original_object_key として保持する。
9. 表示用画像は processed_object_key として保持する。
10. 元画像を直接公開しない。
11. 一覧表示では原寸画像を読み込まない。
12. 旧画像は新画像の保存成功後に非同期削除する。
13. ファイル保存と DB 更新は完全な同一 transaction にできないため、補償処理を用意する。

### 3.2 保存対象

| 対象 | Phase1 | 保存方針 |
| --- | --- | --- |
| クライアントアイコン元画像 | 対象 | original_object_key に保存 |
| クライアントアイコン表示用画像 | 対象 | processed_object_key に保存 |
| 案件アイコン元画像 | 対象 | original_object_key に保存 |
| 案件アイコン表示用画像 | 対象 | processed_object_key に保存 |
| 一時生成ファイル | 対象 | cleanup 対象 |
| 請求書 PDF | 対象外 | Phase2 |
| 契約書ファイル | 対象外 | Phase2 以降 |
| 任意添付ファイル | 対象外 | Phase2 以降 |

## 4. アイコン設計

### 4.1 アイコン種別

Flowance では以下のアイコン種別を扱う。

| type | 説明 |
| --- | --- |
| DEFAULT | システムが自動生成する初期アイコン |
| UPLOADED | 利用者がアップロードした画像アイコン |

### 4.2 DEFAULT アイコン

DEFAULT アイコンは、クライアントまたは案件の作成時に自動生成する。

保持する主な情報は以下とする。

| 項目 | 説明 |
| --- | --- |
| default_icon_text | UUIDのSHA-256から決定する固定16種の動物絵文字 |
| default_icon_background_color | UUIDのSHA-256から決定する水色系を除く固定淡色8色の背景 |
| default_icon_text_color | 互換用文字色 `#294B5B` |

動物絵文字と背景色は、client_id または project_id の SHA-256 ハッシュの異なるバイトから独立に決定する。同じ UUID では常に同じ組み合わせを再現する。

名称変更時は以下とする。

| 対象 | 方針 |
| --- | --- |
| クライアント名変更 | UUIDベースの動物、背景色、互換用文字色を維持する |
| 案件名変更 | UUIDベースの動物、背景色、互換用文字色を維持する |
| UPLOADED の場合 | アップロード画像とフォールバック用初期アイコンを維持する |

### 4.3 UPLOADED アイコン

UPLOADED アイコンは、利用者がアップロードした画像を元に表示用画像を生成して使用する。

- 元画像を保持する。
- 表示用画像を生成する。
- 表示用画像は正方形を基本とする。
- 画像取得失敗時は DEFAULT アイコンへフォールバックできるようにする。

### 4.4 アイコン状態

| status | 説明 |
| --- | --- |
| READY | 表示可能 |
| PENDING | アップロード受付済み、処理待ち |
| PROCESSING | Celery Worker が処理中 |
| FAILED | 画像処理または保存に失敗 |

初期アイコンは READY とする。

UPLOADED アイコンは、アップロード直後に PENDING、Worker 処理中に PROCESSING、変換成功後に READY、失敗時に FAILED とする。

## 5. 画像アップロード仕様

### 5.1 対応形式

Phase1 の対応形式は以下とする。

| 形式 | 対応 |
| --- | --- |
| JPEG | 対応 |
| PNG | 対応 |
| WebP | 対応 |
| GIF | Phase1 では原則対象外。アニメーション画像は登録拒否または静止画像扱いを実装時に確定 |
| SVG | 対象外 |
| HEIC | 対象外 |

### 5.2 サイズ制限

| 項目 | 上限 |
| --- | --- |
| ファイルサイズ | 5MB |
| 最大幅 | 4096px |
| 最大高さ | 4096px |
| 総ピクセル数 | 16777216 |

Pillow の Decompression Bomb 対策を有効にし、巨大画像によるメモリ消費を防ぐ。

### 5.3 入力検証

API 受付時に以下を検証する。

| 検証 | 不正時の扱い |
| --- | --- |
| ファイル必須 | 400 VALIDATION_ERROR |
| multipart/form-data | 415 UNSUPPORTED_MEDIA_TYPE |
| Content-Type | 415 UNSUPPORTED_MEDIA_TYPE |
| 拡張子 | 415 UNSUPPORTED_MEDIA_TYPE |
| 画像実体 | 422 IMAGE_PROCESSING_FAILED |
| 破損画像 | 422 IMAGE_PROCESSING_FAILED |
| ファイルサイズ | 413 PAYLOAD_TOO_LARGE |
| 画像縦横 | 422 IMAGE_DIMENSION_TOO_LARGE |
| 総ピクセル数 | 422 IMAGE_DIMENSION_TOO_LARGE |
| version | 409 CONCURRENT_MODIFICATION |

拡張子と Content-Type が正しくても、画像として読み取れないファイルは拒否する。

## 6. 画像変換仕様

### 6.1 変換方針

アップロード画像は、元画像を保持したうえで表示用画像へ変換する。

表示用画像は Phase1 では WebP を基本とする。

### 6.2 処理内容

Pillow と Celery Worker で以下を処理する。

1. 画像実体の読み取り。
2. EXIF Orientation の反映。
3. 不要な EXIF などのメタデータ削除。
4. 必要に応じた中央基準の正方形トリミング。
5. 表示用サイズへのリサイズ。
6. WebP 変換。
7. checksum 算出。
8. width / height の記録。
9. processed_object_key への保存。

### 6.3 表示用サイズ

Phase1 では、UI 表示に必要なアイコン用途を想定し、表示用画像は正方形の単一サイズを基本とする。

具体的なピクセルサイズは実装時に UI デザインと合わせて確定する。

将来、一覧用、詳細用、高解像度用など複数サイズが必要になった場合は processed variants を追加できる設計とする。

## 7. ストレージ設計

### 7.1 Storage Adapter

ファイル保存は Storage Adapter を通じて行う。

| Adapter | 用途 |
| --- | --- |
| LocalFileStorage | ローカル開発用 |
| CloudflareR2Storage | 本番用 |

Application 層は Storage 実装へ直接依存しない。

Infrastructure 層で LocalFileStorage と CloudflareR2Storage を実装する。

### 7.2 ローカル開発

ローカル開発では Django MEDIA_ROOT または Local Storage Adapter を使用する。

ローカル環境では、開発効率を優先しつつ、本番 R2 と同じ object_key 設計で保存する。

`flowance-api/media/` 配下はアップロードや画像変換によって生成される実行時データであり、Git の管理対象外とする。ローカル環境間で画像ファイルを共有せず、必要なファイルは各環境の Local Storage に保存する。

### 7.3 本番環境

本番ストレージは Cloudflare R2 を採用する。

方針は以下とする。

- Cloudflare R2 の S3 互換 API を Django Storage API 経由で利用する。
- Bucket は非公開を基本とする。
- 元画像は直接公開しない。
- 表示用画像のみ配信対象にする。
- 必要に応じて署名付き URL を発行する。
- CDN 連携は Phase1 では必須とせず、必要に応じて導入する。

## 8. オブジェクトキー設計

### 8.1 基本方針

保存時には利用者が指定したファイル名をそのまま使用しない。

UUID ベースの object_key を生成し、tenant とリソース種別が分かる構造にする。

### 8.2 object_key 形式

Phase1 の object_key は以下を基本とする。

| 対象 | object_key |
| --- | --- |
| クライアント元画像 | organizations/{organization_id}/clients/{client_id}/icons/original/{file_id}.{ext} |
| クライアント表示用画像 | organizations/{organization_id}/clients/{client_id}/icons/processed/{file_id}.webp |
| 案件元画像 | organizations/{organization_id}/projects/{project_id}/icons/original/{file_id}.{ext} |
| 案件表示用画像 | organizations/{organization_id}/projects/{project_id}/icons/processed/{file_id}.webp |
| 一時ファイル | organizations/{organization_id}/tmp/{file_id} |

### 8.3 元ファイル名

元ファイル名は保存パスへ使用しない。

必要な場合のみ、表示用メタデータとして original_filename に保持する。

## 9. DB 設計

### 9.1 stored_files

ファイル実体のメタデータは stored_files で管理する。

| カラム | 説明 |
| --- | --- |
| id | ファイル ID |
| organization_id | tenant 分離用 |
| owner_type | CLIENT または PROJECT など |
| owner_id | 対象リソース ID |
| file_category | ICON_ORIGINAL, ICON_PROCESSED など |
| status | PENDING, PROCESSING, READY, FAILED, DELETED |
| storage_provider | LOCAL, CLOUDFLARE_R2 |
| bucket_name | 保存先 bucket |
| original_object_key | 元画像の object_key |
| processed_object_key | 表示用画像の object_key |
| original_filename | 元ファイル名。保存パスには使わない |
| content_type | MIME Type |
| file_size | ファイルサイズ |
| checksum | 改ざん検知・重複確認用 |
| width | 変換後画像幅 |
| height | 変換後画像高さ |
| error_code | 失敗理由コード |
| error_message | 失敗理由概要 |

### 9.2 client / project 側の参照

clients / projects は、アイコン表示に必要な最小情報を保持する。

| 項目 | 説明 |
| --- | --- |
| icon_type | DEFAULT または UPLOADED |
| icon_status | READY, PENDING, PROCESSING, FAILED |
| icon_file_id | stored_files への参照 |
| default_icon_text | DEFAULT 表示文字 |
| default_icon_background_color | DEFAULT 背景色 |
| default_icon_text_color | DEFAULT 文字色 |

ファイル実体の詳細は stored_files に保持する。

## 10. API 連携方針

### 10.1 クライアントアイコン

クライアントアイコンは、クライアント登録 API またはクライアント更新 API の multipart/form-data で扱う。

削除は iconAction=DELETE などの更新操作として扱い、初期アイコンへ戻す。

### 10.2 案件アイコン

案件アイコンもクライアントアイコンと同じ形式で扱う。

案件の labelColor はカレンダー表示用の識別色として維持し、画像アイコンとは別に管理する。

### 10.3 レスポンス方針

非同期画像処理を伴う場合、API は受付成功を返し、画面は icon.status を見て表示を切り替える。

Phase1 では汎用タスク状態取得 API は対象外のため、クライアント詳細、案件詳細、一覧 API の icon.status を再取得する。

## 11. 非同期処理連携

### 11.1 対象タスク

| task_type | 説明 |
| --- | --- |
| IMAGE_PROCESSING | 元画像から表示用画像を生成する |
| FILE_DELETE | 不要になった旧画像を削除する |
| CLEANUP | 孤立ファイル、一時ファイル、期限切れファイルを削除する |

### 11.2 画像処理フロー

1. API が入口検証を行う。
2. 元画像を Storage へ保存する。
3. stored_files を PENDING または PROCESSING で作成する。
4. 対象リソースの icon_status を PENDING にする。
5. background_tasks を作成する。
6. outbox_events を作成する。
7. Celery Worker が IMAGE_PROCESSING を実行する。
8. 表示用画像を生成して processed_object_key へ保存する。
9. stored_files を READY にする。
10. 対象リソースの icon_status を READY にする。
11. 旧画像があれば FILE_DELETE を登録する。

### 11.3 失敗時

画像処理に失敗した場合は以下とする。

- stored_files.status を FAILED にする。
- 対象リソースの icon_status を FAILED にする。
- background_tasks.status を FAILED にする。
- error_code と error_message を保存する。
- 一時生成ファイルを削除する。
- 画面では DEFAULT アイコンへフォールバックする。

破損画像や形式不正などの業務エラーはリトライしない。

R2 timeout など一時的な Storage 障害はリトライ対象とする。

## 12. 削除・補償処理

### 12.1 旧画像削除

アイコン変更時、旧画像は新画像の保存と DB 更新が成功した後に削除する。

旧画像削除は FILE_DELETE タスクとして maintenance キューで実行する。

削除対象ファイルが既に存在しない場合は成功扱いにできる。

### 12.2 アイコン削除

アイコン削除時は以下を行う。

1. 対象リソースの icon_type を DEFAULT に戻す。
2. icon_status を READY に戻す。
3. default_icon_text、default_icon_background_color、default_icon_text_color を表示に利用する。
4. 旧 UPLOADED 画像を削除対象として登録する。
5. stored_files は DELETED または削除予約状態へ更新する。

### 12.3 DB 更新失敗時

ファイル保存後に DB 更新が失敗した場合は、保存済みファイルを削除対象として記録する。

可能であれば同期的に削除し、失敗した場合は CLEANUP タスクで削除する。

### 12.4 孤立ファイル削除

以下を孤立ファイル削除対象とする。

- DB に参照されていない一時ファイル。
- FAILED のまま保持期限を過ぎたファイル。
- DELETED 状態だが Storage に残っているファイル。
- 処理途中で残った temporary object。

## 13. セキュリティ設計

### 13.1 アップロードセキュリティ

- ファイル拡張子だけを信用しない。
- MIME Type と画像実体を検証する。
- 最大ファイルサイズを制限する。
- 最大縦横サイズと総ピクセル数を制限する。
- アップロードファイルを実行可能な場所へ保存しない。
- 元ファイル名を保存パスへ使用しない。
- 画像処理時のリソース消費を制限する。

### 13.2 アクセス制御

- ファイルは organization_id に紐づける。
- tenant 外のファイル参照は 404 として扱う。
- object_key を推測されても他組織のファイルを取得できないようにする。
- R2 Bucket は非公開を基本とする。
- 署名付き URL を使う場合は短い有効期限を設定する。

### 13.3 保存してはいけない情報

以下を stored_files、background_tasks、ログ、レスポンスへ保存しない。

- access token
- refresh token
- Cookie
- CSRF token
- Storage credential
- 署名付き URL の署名部分
- stack trace
- SQL

## 14. 表示・フォールバック方針

### 14.1 表示優先順位

| 状態 | 表示 |
| --- | --- |
| icon_type=UPLOADED かつ icon_status=READY | processed_object_key の表示用画像 |
| icon_status=PENDING | 処理中表示または DEFAULT アイコン |
| icon_status=PROCESSING | 処理中表示または DEFAULT アイコン |
| icon_status=FAILED | DEFAULT アイコンまたは失敗表示 |
| icon_type=DEFAULT | DEFAULT アイコン |

### 14.2 アクセシビリティ

アイコンだけでクライアントや案件を識別させない。

画面上では名称や補助テキストも確認できるようにする。

画像読み込み失敗時も名称が確認できることを必須とする。

## 15. エラーハンドリング

### 15.1 主なエラー

| 状況 | HTTP / status | code |
| --- | --- | --- |
| ファイルサイズ超過 | 413 | PAYLOAD_TOO_LARGE |
| 未対応形式 | 415 | UNSUPPORTED_MEDIA_TYPE |
| 画像実体不正 | 422 | IMAGE_PROCESSING_FAILED |
| 最大縦横超過 | 422 | IMAGE_DIMENSION_TOO_LARGE |
| version 不一致 | 409 | CONCURRENT_MODIFICATION |
| R2 障害 | 503 または task FAILED | STORAGE_UNAVAILABLE |
| 画像変換失敗 | task FAILED | IMAGE_PROCESSING_FAILED |

### 15.2 エラー時の状態

- API 入口検証で失敗した場合、stored_files は作成しない。
- 元画像保存後に変換で失敗した場合、stored_files を FAILED にする。
- 表示用画像保存後に DB 更新で失敗した場合、補償削除対象にする。
- ファイル削除失敗時は FILE_DELETE をリトライ対象にする。

## 16. 監査ログ

ファイル本体を監査ログへ保存しない。

監査ログには以下を記録する。

- 操作種別
- 実行者 user_id
- organization_id
- 対象 resource_type
- 対象 resource_id
- stored_file_id
- icon_type の変更
- icon_status の変更
- 実行日時
- traceId

Phase1 の監査対象は以下とする。

- クライアントアイコン登録
- クライアントアイコン変更
- クライアントアイコン削除
- 案件アイコン登録
- 案件アイコン変更
- 案件アイコン削除

## 17. ログ・監視

### 17.1 ログ

ファイル処理では以下をログに記録する。

- traceId
- organizationId
- storedFileId
- resourceType
- resourceId
- objectKey 種別
- taskId
- status
- errorCode
- duration

ただし、署名付き URL の署名部分、Storage credential、Cookie、token はログに出力しない。

### 17.2 メトリクス

Phase1 では以下を計測できるようにする。

- アップロード成功数
- アップロード失敗数
- 画像変換成功数
- 画像変換失敗数
- ファイル削除失敗数
- Storage 503 件数
- 画像処理時間
- ファイルサイズ分布

## 18. テスト方針

### 18.1 バックエンドテスト

- JPEG 登録
- PNG 登録
- WebP 登録
- 5MB 超過ファイルの拒否
- 拡張子と実体が異なるファイルの拒否
- 破損画像の拒否
- 最大縦横超過の拒否
- 正方形画像の変換
- 縦長画像の変換
- 横長画像の変換
- EXIF Orientation 反映
- EXIF メタデータ削除
- stored_files 作成
- processed_object_key 更新
- 旧画像削除タスク作成
- アイコン削除後の DEFAULT 復元
- tenant 外ファイル参照の 404

### 18.2 非同期処理テスト

- IMAGE_PROCESSING 成功
- IMAGE_PROCESSING 失敗
- FILE_DELETE 成功
- FILE_DELETE リトライ
- CLEANUP 対象抽出
- 同一 task 複数回実行時の冪等性

### 18.3 フロントエンドテスト

- ファイル選択
- 画像プレビュー
- アップロード中表示
- PENDING / PROCESSING 表示
- READY 後の画像表示
- FAILED 時のフォールバック表示
- アイコン削除後の DEFAULT 表示
- 画像読み込み失敗時の名称表示

## 19. Phase1 未対応事項

以下は Phase1 では対応しない、または簡易対応に留める。

1. 請求書 PDF 生成・保管。
2. 契約書・証憑ファイル管理。
3. 任意添付ファイル管理。
4. AI によるアイコン生成。
5. SVG アイコンアップロード。
6. 画像編集機能。
7. 複数サイズの表示用画像生成。
8. ファイルのバージョン履歴管理。
9. 管理者向けファイル管理 UI。
10. ウイルススキャン基盤の本格導入。
11. CDN の詳細設計。
12. R2 ライフサイクルポリシーの詳細設計。

## 20. 未確定事項

| 項目 | 方針 |
| --- | --- |
| 表示用画像サイズ | UI 実装時に最終決定する |
| GIF の扱い | Phase1 実装時に登録拒否または静止画化を決める |
| CDN 連携 | Phase1 では必須とせず、必要に応じて導入する |
| R2 bucket 分割 | Phase1 初期は単一 bucket を基本とし、環境別分割を検討する |
| 署名付き URL の有効期限 | 実装時にセキュリティと UX のバランスで決定する |
| stored_files 保持期限 | FAILED / DELETED の保持期間を実装時に決定する |
| ウイルススキャン | Phase2 以降で導入方式を検討する |

## 21. 変更履歴

| 日付 | ver | 変更内容 |
| --- | --- | --- |
| 2026-07-16 | 1.0 | Phase1 用ファイル・画像管理設計書を新規作成。クライアント・案件アイコン、DEFAULT / UPLOADED、画像検証、元画像保持、表示用画像生成、stored_files、Cloudflare R2、Local Storage、非同期画像処理、削除・補償処理、セキュリティ、監査ログ、未対応事項を定義。 |

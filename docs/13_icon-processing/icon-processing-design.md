# アイコン処理詳細設計書

## 1. 文書概要

### 1.1 目的

本書は、Flowance Phase1 におけるクライアントアイコンおよび案件アイコンの詳細処理設計を定義する。

アイコン処理は、クライアント・案件の視覚的識別、画像アップロード、初期アイコン生成、画像変換、Cloudflare R2 保存、Cloudflare CDN 配信、Celery による非同期処理、DB メタデータ管理、監査ログ、エラーハンドリングにまたがる。

本書では、既存の要件定義、基本設計、アーキテクチャ、DB、API、セキュリティ、エラーハンドリング、非同期処理、ファイル・画像管理、キャッシュ、インフラ・運用設計と整合する形で、Phase1 実装時に迷わない粒度まで処理方針を整理する。

### 1.2 対象範囲

Phase1 の対象範囲は以下とする。

- クライアント初期アイコン生成
- 案件初期アイコン生成
- クライアントアイコン画像アップロード
- 案件アイコン画像アップロード
- アイコン画像更新
- アイコン画像削除と初期アイコン復元
- 名称変更時のUUIDベース初期アイコン維持
- アップロード画像の検証
- 元画像保持
- 表示用 WebP 画像生成
- サムネイルまたは variants 生成の拡張余地
- stored_files によるメタデータ管理
- clients / projects のアイコン関連カラム管理
- background_tasks による非同期処理状態管理
- Celery による画像処理、旧画像削除、孤立ファイル削除
- Cloudflare R2 保存
- Cloudflare CDN 配信
- エラー時のフォールバック
- 監査ログ記録
- クリーンアーキテクチャ / DDD 上の責務分離

### 1.3 Phase1 対象外

以下は Phase2 以降で検討する。

- AI によるアイコン生成
- SVG アイコンアップロード
- HEIC 対応
- GIF アニメーション対応
- 利用者による画像編集 UI
- 任意位置の手動トリミング
- 複数画像履歴管理
- アイコン世代の復元機能
- ウイルススキャン基盤の本格導入
- 顔検出や被写体検出による自動トリミング
- 請求書、契約書、入金証憑などアイコン以外のファイル管理
- CDN の高度なチューニング
- 管理画面からの手動 CDN purge

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

## 3. 基本方針

### 3.1 アイコン処理の原則

Flowance のアイコン処理は以下を原則とする。

1. クライアントと案件は必ず表示可能なアイコン情報を持つ。
2. 画像未登録時は DEFAULT アイコンを表示する。
3. 画像登録時は UPLOADED アイコンとして扱う。
4. 元画像は original_object_key として保持する。
5. 表示用画像は processed_object_key として WebP を基本に保持する。
6. ファイルのバイナリは PostgreSQL に保存しない。
7. ファイルメタデータは stored_files に保存する。
8. 正規データは PostgreSQL とし、Redis / Celery Result / CDN cache を正規データにしない。
9. 画像変換は Celery Worker で非同期処理する。
10. 非同期処理状態は background_tasks を正とする。
11. Domain 層は R2、CDN、Pillow、Celery、Django Storage に依存しない。
12. R2、CDN、Cache-Control、署名付き URL は Infrastructure 層の責務とする。
13. 表示用画像の URL は versioned object key を前提にし、同一 URL 上書きに依存しない。
14. 画像処理失敗時も DEFAULT アイコンまたは失敗表示へフォールバックし、画面全体を壊さない。

### 3.2 アイコン種別

| 種別 | 説明 |
| --- | --- |
| DEFAULT | システムがUUIDから自動生成する動物絵文字と水色系以外の淡色背景の初期アイコン |
| UPLOADED | 利用者がアップロードした画像を変換して表示するアイコン |

### 3.3 アイコン状態

| 状態 | 説明 | 表示方針 |
| --- | --- | --- |
| READY | 表示可能 | DEFAULT または processed image を表示する |
| PENDING | アップロード受付済み、処理待ち | DEFAULT または処理中表示へフォールバックする |
| PROCESSING | Celery Worker 処理中 | DEFAULT または処理中表示へフォールバックする |
| FAILED | 画像処理または保存失敗 | DEFAULT または失敗表示へフォールバックする |

DEFAULT アイコンは原則 READY とする。

UPLOADED アイコンは、アップロード受付時に PENDING、Worker 処理開始時に PROCESSING、変換成功時に READY、変換失敗時に FAILED とする。

## 4. ドメインモデル

### 4.1 Icon Value Object

Domain 層では、アイコンを R2 や URL ではなく業務概念として扱う。

主な属性:

| 属性 | 説明 |
| --- | --- |
| icon_type | DEFAULT / UPLOADED |
| icon_status | READY / PENDING / PROCESSING / FAILED |
| icon_file_id | UPLOADED 時の stored_files 参照。DEFAULT 時は null |
| default_icon_text | DEFAULT 表示文字 |
| default_icon_background_color | DEFAULT 背景色 |
| default_icon_text_color | DEFAULT 文字色 |
| icon_updated_at | アイコン更新日時 |

Domain 層では URL、bucket、object key、CDN domain、Cache-Control を扱わない。

### 4.2 DefaultIcon

DEFAULT アイコンは client_id または project_id の UUID から生成する。

- 動物絵文字はSHA-256ハッシュの第1バイトから固定16種の範囲で決定する。
- 背景色は同じハッシュの第2バイトから水色系を除く固定淡色8色の範囲で決定する。
- 互換用文字色は #294B5B とする。
- 生成した3項目は DB に保存する。
- 名称変更時に3項目を再生成しない。

### 4.3 UploadedIcon

UPLOADED アイコンは stored_files と関連して扱う。

- icon_file_id は stored_files.id を参照する。
- 元画像は stored_files.original_object_key に保持する。
- 表示用画像は stored_files.processed_object_key に保持する。
- 表示用 URL は Infrastructure 層の AssetUrlResolver が生成する。

## 5. 初期アイコン生成

### 5.1 生成タイミング

DEFAULT アイコンは以下のタイミングで生成する。

| 対象 | タイミング |
| --- | --- |
| クライアント | クライアント登録時 |
| 案件 | 案件登録時 |
| アイコン削除 | UPLOADED から DEFAULT へ戻す時 |
| 欠損補正 | default_icon_* が欠損している既存データを補正する時 |

### 5.2 動物絵文字生成

動物絵文字は名称ではなく安定 ID から生成する。

生成方針:

1. client_id または project_id の UUID を小文字ハイフン付き文字列へ変換する。
2. UTF-8 バイト列の SHA-256 を計算する。
3. ハッシュの第1バイトを16で剰余し、固定配列 `🐶 🐱 🐰 🐻 🐼 🐨 🦊 🐯 🦁 🐸 🐵 🐧 🐦 🐙 🐳 🐢` の index とする。
4. 選択した動物絵文字を default_icon_text に保存する。

### 5.3 背景色生成

背景色も同じ UUID の SHA-256 から決定する。

生成方針:

1. ハッシュの第2バイトを8で剰余する。
2. 水色系を除く固定配列 `#F7D9C4 #F4C7C3 #E8D5F2 #F6E3A1 #DDE5B6 #E7D7C9 #F2CEDA #DCCFBF` の index とする。
3. 背景色を default_icon_background_color に保存する。
4. 動物とは異なるハッシュバイトを使い、選択を独立させる。

### 5.4 互換用文字色

default_icon_text_color は既存DB・APIとの互換性のため保持し、Phase1では `#294B5B` に固定する。カラー絵文字自体の色はOS標準の絵文字フォントで描画する。
- 一覧・ダッシュボードでは 1.35rem、詳細・編集プレビューでは 2rem を基準に動物絵文字を表示する。
- OS標準のカラー絵文字フォントを通常ウェイトで使用する。

### 5.5 名称変更時の扱い

| 対象 | icon_type | 方針 |
| --- | --- | --- |
| クライアント名変更 | DEFAULT | 動物、背景色、互換用文字色を変更しない |
| クライアント名変更 | UPLOADED | アップロード画像とフォールバック値を変更しない |
| 案件名変更 | DEFAULT | 動物、背景色、互換用文字色を変更しない |
| 案件名変更 | UPLOADED | アップロード画像とフォールバック値を変更しない |

## 6. アップロード仕様

### 6.1 対応形式

Phase1 の対応形式は以下とする。

| 形式 | 対応 | 備考 |
| --- | --- | --- |
| JPEG | 対応 | EXIF Orientation を反映する |
| PNG | 対応 | 透過情報は WebP 変換時に保持できる範囲で扱う |
| WebP | 対応 | 再変換して表示用 WebP を生成する |
| GIF | 対象外 | Phase1 ではアニメーション対応しない |
| SVG | 対象外 | XSS 等のリスクを避ける |
| HEIC | 対象外 | Phase2 以降で検討 |

### 6.2 サイズ制限

| 項目 | 上限 |
| --- | --- |
| ファイルサイズ | 5MB |
| 最大幅 | 4096px |
| 最大高さ | 4096px |
| 総ピクセル数 | 16,777,216 |

Pillow の Decompression Bomb 対策を有効にし、巨大画像によるメモリ消費を防ぐ。

### 6.3 同期検証

API 受付時に、明らかに失敗する画像は Celery へ積まず同期的に拒否する。

| 検証 | 不正時の HTTP | error code |
| --- | --- | --- |
| ファイル必須 | 400 | VALIDATION_ERROR |
| multipart/form-data 以外 | 415 | UNSUPPORTED_MEDIA_TYPE |
| Content-Type 不正 | 415 | UNSUPPORTED_MEDIA_TYPE |
| 拡張子不正 | 415 | UNSUPPORTED_MEDIA_TYPE |
| 画像として読み取れない | 422 | IMAGE_PROCESSING_FAILED |
| 破損画像 | 422 | IMAGE_PROCESSING_FAILED |
| ファイルサイズ超過 | 413 | PAYLOAD_TOO_LARGE |
| 最大縦横超過 | 422 | IMAGE_DIMENSION_TOO_LARGE |
| 総ピクセル数超過 | 422 | IMAGE_DIMENSION_TOO_LARGE |
| version 不一致 | 409 | CONCURRENT_MODIFICATION |
| 権限不足 | 403 | FORBIDDEN |

### 6.4 セキュリティ検証

- 拡張子だけを信用しない。
- Content-Type だけを信用しない。
- Pillow で画像実体を検証する。
- EXIF 等のメタデータは表示用画像から削除する。
- SVG は受け付けない。
- 元ファイル名を object key に使わない。
- 署名付き URL の署名部分をログに出さない。
- R2 credential をログに出さない。

## 7. API 設計との整合

### 7.1 クライアント API

Phase1 では、クライアント登録 / 更新 API の multipart/form-data でアイコンを扱う。

- 登録時に iconFile が指定された場合、クライアント作成と同時にアイコン処理を受け付ける。
- 登録時に iconFile がない場合、DEFAULT アイコンを READY で作成する。
- 更新時に iconFile が指定された場合、UPLOADED アイコンとして画像更新する。
- 更新時に iconAction=DELETE が指定された場合、UPLOADED アイコンを削除し DEFAULT へ戻す。
- 更新時に iconAction=KEEP または未指定の場合、既存アイコンを維持する。
- 更新時は version による楽観ロックを必須とする。

### 7.2 案件 API

案件 API もクライアント API と同じ方針でアイコンを扱う。

- 登録時に iconFile が指定された場合、案件作成と同時にアイコン処理を受け付ける。
- 登録時に iconFile がない場合、DEFAULT アイコンを READY で作成する。
- 更新時に iconFile が指定された場合、UPLOADED アイコンとして画像更新する。
- 更新時に iconAction=DELETE が指定された場合、UPLOADED アイコンを削除し DEFAULT へ戻す。
- 案件の labelColor はアイコンとは別概念として保持する。
- 画像アイコンを登録しても、カレンダー識別色として labelColor を継続して使用する。

### 7.3 独立アイコン API の扱い

Phase1 の主要方針は、クライアント / 案件の登録・更新 API にアイコン操作を統合することである。

過去案の PUT / DELETE icon API は、Phase1 の主要 API としては採用しない。

理由:

- クライアント / 案件更新と iconAction を同一 version で制御できる。
- DELETE requestBody の曖昧さを避けられる。
- 画面の登録・詳細更新フローと整合しやすい。
- 楽観ロックと監査ログを一貫させやすい。

## 8. DB 設計

### 8.1 clients / projects のアイコン関連カラム

clients と projects は同等のアイコン関連カラムを持つ。

| カラム | 説明 |
| --- | --- |
| icon_type | DEFAULT / UPLOADED |
| icon_status | READY / PENDING / PROCESSING / FAILED |
| icon_file_id | stored_files.id。DEFAULT 時は null |
| icon_updated_at | アイコン更新日時 |
| default_icon_text | 初期アイコン文字 |
| default_icon_background_color | 初期アイコン背景色 |
| default_icon_text_color | 初期アイコン文字色 |
| version | 楽観ロック用 version |

### 8.2 stored_files

stored_files はファイルメタデータを保持する。

| カラム | 説明 |
| --- | --- |
| id | 主キー |
| organization_id | テナント境界 |
| category | CLIENT_ICON / PROJECT_ICON / TEMPORARY |
| status | PENDING / PROCESSING / READY / FAILED / DELETED |
| storage_provider | LOCAL / CLOUDFLARE_R2 |
| bucket_name | R2 bucket 名。LOCAL では null 可 |
| original_object_key | 元画像 object key |
| processed_object_key | 表示用画像 object key |
| original_filename | 元ファイル名。表示や監査用であり path には使わない |
| content_type | MIME Type |
| file_size_bytes | 元画像ファイルサイズ |
| checksum_sha256 | 元画像または処理済み画像の checksum |
| width | 表示用画像幅 |
| height | 表示用画像高さ |
| variants | サムネイルなど派生画像情報 |
| error_code | 失敗理由コード |
| error_message | 失敗理由。内部詳細は保存しすぎない |
| created_by_id | 作成者 |
| deleted_at | 論理削除日時 |

### 8.3 background_tasks

アイコン非同期処理の状態は background_tasks を正とする。

| カラム | 用途 |
| --- | --- |
| task_type | IMAGE_PROCESSING / FILE_DELETE / ORPHAN_FILE_CLEANUP |
| status | PENDING / PROCESSING / SUCCEEDED / FAILED / CANCELED |
| resource_type | CLIENT / PROJECT / STORED_FILE |
| resource_id | 対象 ID |
| progress | 0 から 100 |
| error_code | 失敗コード |
| error_message | 利用者向けに安全な失敗理由 |
| celery_task_id | Celery task id |

Celery 内部状態は業務 API や UI の正規状態として利用しない。

## 9. Object Key 設計

### 9.1 基本方針

- 利用者が指定したファイル名を object key に使わない。
- organization_id を path に含める。
- client_id / project_id を path に含める。
- original と processed を分離する。
- 更新ごとに UUID を発行し、同一 URL 上書きを避ける。
- 表示用画像は versioned object key とする。

### 9.2 Object Key 例

クライアント:

- organizations/{organization_id}/clients/{client_id}/icons/original/{file_id}.{ext}
- organizations/{organization_id}/clients/{client_id}/icons/processed/{file_id}.webp
- organizations/{organization_id}/clients/{client_id}/icons/variants/{file_id}_64.webp
- organizations/{organization_id}/clients/{client_id}/icons/variants/{file_id}_128.webp

案件:

- organizations/{organization_id}/projects/{project_id}/icons/original/{file_id}.{ext}
- organizations/{organization_id}/projects/{project_id}/icons/processed/{file_id}.webp
- organizations/{organization_id}/projects/{project_id}/icons/variants/{file_id}_64.webp
- organizations/{organization_id}/projects/{project_id}/icons/variants/{file_id}_128.webp

### 9.3 CDN URL

表示用 URL は AssetUrlResolver が生成する。

- Domain 層は URL を生成しない。
- Application 層は DTO 組み立て時に AssetUrlResolver を呼び出す。
- Infrastructure 層の CloudflareCdnUrlResolver が CDN custom domain と processed_object_key から URL を生成する。

例:

- https://assets.example.com/organizations/{organization_id}/clients/{client_id}/icons/processed/{file_id}.webp

## 10. 画像変換処理

### 10.1 変換内容

Celery Worker と Pillow で以下を処理する。

1. 元画像を Storage から読み込む。
2. 画像実体を再検証する。
3. EXIF Orientation を反映する。
4. 不要なメタデータを削除する。
5. 中央基準で正方形トリミングする。
6. 表示用サイズへリサイズする。
7. WebP へ変換する。
8. checksum を算出する。
9. width / height を記録する。
10. processed_object_key へ保存する。
11. variants が必要な場合は variants に派生画像情報を保存する。

### 10.2 表示用サイズ

Phase1 では単一の表示用 WebP を基本とする。

推奨:

- processed: 256 x 256 WebP
- variants: 64 x 64、128 x 128 は必要になった時点で追加可能

一覧画面では原寸元画像を読み込まない。

### 10.3 WebP 変換方針

- 表示用画像は WebP を基本とする。
- 透過 PNG は可能な範囲で透過を維持する。
- EXIF や不要なメタデータは削除する。
- 画質は UI 表示品質と容量のバランスで設定する。
- 画質値は Infrastructure の画像処理設定として管理する。

## 11. 非同期処理フロー

### 11.1 アイコン登録 / 更新フロー

1. Next.js がクライアントまたは案件の登録 / 更新 API を multipart/form-data で呼び出す。
2. DRF View が認証、認可、CSRF、version を検証する。
3. Application Service が入力検証と業務ルールを実行する。
4. API が元画像を一時保存または Storage へ保存する。
5. 同一 DB transaction 内で stored_files を PENDING として作成する。
6. 対象 client / project の icon_type を UPLOADED、icon_status を PENDING、icon_file_id を新 stored_file に更新する。
7. background_tasks を IMAGE_PROCESSING / PENDING として作成する。
8. outbox_events を作成する。
9. transaction commit 後、Outbox dispatcher が Celery task を enqueue する。
10. API は 202 Accepted またはリソース概要を返す。
11. Worker が task を取得し、background_tasks を PROCESSING にする。
12. Worker が画像変換を実行する。
13. processed_object_key と variants を保存する。
14. stored_files.status を READY にする。
15. client / project の icon_status を READY にする。
16. background_tasks を SUCCEEDED、progress を 100 にする。
17. 旧画像がある場合は FILE_DELETE タスクを maintenance queue へ登録する。
18. Next.js は詳細 API または一覧 API を再取得し、icon.status と icon.url を更新する。

### 11.2 アイコン削除フロー

1. Next.js が更新 API で iconAction=DELETE を指定する。
2. DRF View が認証、認可、CSRF、version を検証する。
3. Application Service が対象 client / project を取得する。
4. UPLOADED の場合、現在の icon_file_id を削除対象として控える。
5. client / project の icon_type を DEFAULT、icon_status を READY、icon_file_id を null にする。
6. 保存済みのUUIDベース初期アイコン3項目をそのまま利用する。
7. 欠損がある場合のみUUIDベースのアルゴリズムで3項目を再生成する。
8. 名称からの再生成や文字色の再計算は行わない。
9. version を更新する。
10. 旧 stored_file は論理削除または削除予定へ更新する。
11. FILE_DELETE タスクを maintenance queue へ登録する。
12. API は更新後リソース概要を返す。

### 11.3 名称変更フロー

DEFAULT / UPLOADED のどちらも名称と初期アイコンを分離して扱う。

1. 名称変更 API で name を更新する。
2. default_icon_text、default_icon_background_color、default_icon_text_color は変更しない。
3. UPLOADED の場合は icon_file_id とアップロード済み画像も変更しない。
4. version を更新する。

## 12. エラー処理

### 12.1 同期エラー

| 事象 | HTTP | error code |
| --- | --- | --- |
| ファイルサイズ超過 | 413 | PAYLOAD_TOO_LARGE |
| 未対応形式 | 415 | UNSUPPORTED_MEDIA_TYPE |
| 画像実体不正 | 422 | IMAGE_PROCESSING_FAILED |
| 画像寸法超過 | 422 | IMAGE_DIMENSION_TOO_LARGE |
| version 不一致 | 409 | CONCURRENT_MODIFICATION |
| 権限不足 | 403 | FORBIDDEN |
| 対象なし | 404 | CLIENT_NOT_FOUND / PROJECT_NOT_FOUND |
| Storage 障害 | 503 | STORAGE_UNAVAILABLE |
| Celery enqueue 不可 | 503 | ASYNC_WORKER_UNAVAILABLE |

### 12.2 非同期エラー

画像変換に失敗した場合:

- background_tasks.status を FAILED にする。
- background_tasks.error_code に IMAGE_PROCESSING_FAILED を保存する。
- stored_files.status を FAILED にする。
- client / project の icon_status を FAILED にする。
- 画面では DEFAULT アイコンまたは失敗表示へフォールバックする。
- 一時生成ファイルは削除する。
- 破損画像、不正画像などの業務エラーは原則リトライしない。
- R2 や DB の一時障害は retry 対象とする。

### 12.3 リトライ方針

| 失敗種別 | リトライ |
| --- | --- |
| R2 一時障害 | する |
| DB 一時障害 | する |
| Redis / Broker 一時障害 | enqueue 前は 503、Worker 側は再試行 |
| Pillow が画像を読み取れない | しない |
| 未対応形式 | しない |
| Decompression Bomb 検知 | しない |
| 権限不足 | しない |

## 13. 表示仕様

### 13.1 API レスポンス

アイコン情報は以下の形で返す。

DEFAULT:

- type: DEFAULT
- status: READY
- url: null
- defaultText
- backgroundColor
- textColor

UPLOADED:

- type: UPLOADED
- status: READY / PENDING / PROCESSING / FAILED
- url: READY の場合は CDN URL
- defaultText
- backgroundColor
- textColor

PENDING / PROCESSING / FAILED の場合も、フロントエンドがフォールバック表示できるよう defaultText、backgroundColor、textColor を返す。

### 13.2 フロントエンド表示

- DEFAULT は defaultText、backgroundColor、textColor で表示する。
- UPLOADED かつ READY は url の画像を表示する。
- PENDING / PROCESSING は DEFAULT または処理中表示へフォールバックする。
- FAILED は DEFAULT または失敗表示へフォールバックする。
- 画像読み込み失敗時も DEFAULT へフォールバックする。
- 一覧画面ではサムネイルまたは processed image を使用し、元画像を読み込まない。

### 13.3 カレンダー表示との関係

案件アイコンと labelColor は別概念である。

- 案件アイコンは視覚的な補助として扱う。
- カレンダー上の識別色は labelColor を継続して使用する。
- 画像アイコンを登録しても labelColor は変更しない。

## 14. Cloudflare R2 / CDN 配信

### 14.1 R2 保存方針

- 本番ストレージは Cloudflare R2 とする。
- 開発環境は LOCAL Storage を利用できる。
- R2 bucket は非公開を基本とする。
- 元画像は原則公開しない。
- 表示用画像は CDN custom domain 経由で配信する。
- r2.dev は開発・検証用途に限定し、本番では使用しない。

### 14.2 CDN 配信方針

本番画像配信では、Cloudflare R2 にカスタムドメインを接続し、Cloudflare CDN を併用する。

- 表示用画像は assets.example.com のような専用サブドメインで配信する。
- 表示用画像は versioned object key とする。
- 同一 URL 上書きではなく、更新ごとに新しい object key を発行する。
- Cache-Control は public, max-age を長めに設定する。
- エラー応答は長期キャッシュしない。
- 認証が必要なファイルは CDN 公開対象にしない。
- 古い object は Celery の補償処理または定期削除で削除する。

### 14.3 Cache-Control

| 対象 | 方針 |
| --- | --- |
| 表示用画像 | public, max-age を長めに設定 |
| 元画像 | 原則公開しない |
| 署名付き URL | 短命にする |
| エラー応答 | 長期キャッシュしない |
| 認証が必要なファイル | CDN 公開対象外 |

## 15. クリーンアーキテクチャ / DDD 責務分離

### 15.1 Domain 層

Domain 層は業務概念のみを扱う。

責務:

- アイコン種別の整合性
- アイコン状態の遷移ルール
- UUIDベースの動物絵文字生成ルール
- 背景色生成ルール
- 名称変更時の初期アイコン維持ルール
- UPLOADED / DEFAULT の切り替えルール

Domain 層が依存しないもの:

- Django
- DRF
- ORM
- Redis
- Celery
- Pillow
- R2
- CDN
- URL
- Cache-Control
- HTTP request

### 15.2 Application 層

Application 層はユースケースを制御する。

責務:

- クライアント登録時のアイコン初期化
- 案件登録時のアイコン初期化
- アイコンアップロード受付
- アイコン削除
- version による楽観ロック
- stored_files 作成依頼
- background_tasks 作成
- outbox_events 作成
- 監査ログ記録依頼
- DTO 組み立て時の URL 解決依頼

### 15.3 Infrastructure 層

Infrastructure 層は外部技術の詳細を扱う。

責務:

- Django ORM repository
- Django Storage adapter
- Cloudflare R2 adapter
- Cloudflare CDN URL resolver
- Pillow image processor
- Celery task entrypoint
- Redis broker
- Cache-Control 設定
- 署名付き URL 生成
- 旧ファイル削除

### 15.4 推奨抽象

| 抽象 | 実装例 | 用途 |
| --- | --- | --- |
| ImageStorage | LocalImageStorage / CloudflareR2ImageStorage | 元画像・表示用画像の保存、取得、削除 |
| ImageProcessor | PillowImageProcessor | 検証、EXIF 反映、トリミング、WebP 変換 |
| AssetUrlResolver | LocalAssetUrlResolver / CloudflareCdnUrlResolver | 表示用 URL 生成 |
| BackgroundTaskPort | DjangoBackgroundTaskRepository | background_tasks 作成・更新 |
| IconRepository | Django ORM Repository | clients / projects のアイコン更新 |

## 16. 監査ログ

### 16.1 記録対象

以下の操作を監査ログへ記録する。

- クライアントアイコン登録
- クライアントアイコン変更
- クライアントアイコン削除
- 案件アイコン登録
- 案件アイコン変更
- 案件アイコン削除
- 画像処理失敗
- 旧画像削除失敗

### 16.2 記録項目

- actor_user_id
- organization_id
- resource_type
- resource_id
- action
- before / after の概要
- stored_file_id
- task_id
- trace_id
- occurred_at

ファイル本体、JWT、Cookie、署名付き URL の署名部分、R2 credential は監査ログへ保存しない。

## 17. 補償処理

### 17.1 旧画像削除

アイコン更新時、旧画像は新画像の保存成功後に削除する。

- 新画像変換成功前に旧画像を削除しない。
- 旧 stored_file は DELETED または削除予定状態にする。
- 物理削除は FILE_DELETE task で非同期実行する。
- 削除失敗時は retry し、最終失敗時は運用監視対象とする。

### 17.2 孤立ファイル削除

DB 更新失敗や Worker 失敗により孤立ファイルが発生する可能性がある。

対応方針:

- 一時ファイルには TTL または cleanup 対象フラグを付与する。
- maintenance queue で孤立ファイルを検出する。
- stored_files に紐づかない object は削除候補とする。
- 削除前に猶予期間を設ける。

## 18. 監視・運用

### 18.1 監視項目

| 領域 | 監視項目 |
| --- | --- |
| API | アイコンアップロード失敗数、413/415/422/409 件数 |
| Celery | IMAGE_PROCESSING の失敗数、処理時間、滞留数 |
| R2 | upload / download / delete 失敗数 |
| CDN | cache hit ratio、cache miss、配信エラー、オリジン到達増加 |
| DB | stored_files / background_tasks の FAILED 件数 |
| UI | 画像読み込み失敗、fallback 表示率 |

### 18.2 アラート候補

- IMAGE_PROCESSING 失敗率の急増
- Celery images queue の滞留増加
- R2 アップロード失敗増加
- R2 削除失敗増加
- CDN 配信エラー増加
- FAILED 状態の stored_files 増加
- 孤立ファイル削除失敗

## 19. テスト方針

### 19.1 Unit Test

- UUIDベース動物絵文字生成の安定性
- 背景色生成の安定性
- 動物と背景色が異なるハッシュバイトから選択されること
- 名称変更時に初期アイコン3項目が維持されること
- UPLOADED 時に画像が維持されること
- iconAction=DELETE の状態遷移
- Icon Value Object の不正状態拒否

### 19.2 Application Test

- クライアント登録時の DEFAULT アイコン作成
- 案件登録時の DEFAULT アイコン作成
- アイコンアップロード受付
- version 不一致時の 409
- iconAction=DELETE 時の DEFAULT 復元
- background_tasks 作成
- outbox_events 作成
- 監査ログ記録

### 19.3 Integration Test

- JPEG / PNG / WebP アップロード
- 5MB 超過拒否
- 4096px 超過拒否
- 総ピクセル数超過拒否
- 破損画像拒否
- SVG 拒否
- Pillow による WebP 変換
- R2 または Local Storage 保存
- Celery task 成功時の READY 遷移
- Celery task 失敗時の FAILED 遷移
- 旧ファイル削除 task

### 19.4 Frontend Test

- DEFAULT アイコン表示
- UPLOADED READY 画像表示
- PENDING / PROCESSING 時のフォールバック表示
- FAILED 時のフォールバック表示
- 画像読み込み失敗時のフォールバック
- クライアント一覧でのアイコン表示
- 案件一覧でのアイコン表示
- カレンダーで labelColor が維持されること

## 20. Phase1 未対応事項

以下は Phase1 では対応しない。

- AI によるアイコン生成
- SVG アイコンアップロード
- HEIC 対応
- GIF アニメーション対応
- 利用者による手動トリミング UI
- 画像編集機能
- アイコン履歴管理
- 過去アイコンへの復元
- 複数画像選択
- ウイルススキャン基盤の本格導入
- CDN の高度なチューニング
- 管理画面からの CDN purge
- 外部画像 URL 取り込み

## 21. 未確定事項

| 論点 | 確認内容 |
| --- | --- |
| 表示用画像の最終サイズ | Phase1 初期は 256 x 256 を推奨。UI 実装時に最終確定する |
| variants の初期生成数 | 64 / 128 / 256 をすべて生成するか、256 のみから開始するか |
| 画像処理の画質値 | WebP quality の具体値。UI 表示品質と容量を見て決定する |
| CDN custom domain | assets.example.com 等の実ドメイン名 |
| 孤立ファイル削除の猶予期間 | 本番運用前に決定する |
| background_tasks の保持期間 | UI 表示・監査・運用コストを踏まえて決定する |

## 22. 変更履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-07-16 | 1.0 | Phase1用アイコン処理詳細設計書を新規作成。DEFAULT / UPLOADED、初期アイコン生成、画像アップロード、非同期変換、R2/CDN配信、DB、API、エラー、監査、補償処理、テスト方針、未対応事項、未確定事項を整理 |

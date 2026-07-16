# キャッシュ設計書

## 1. 文書概要

### 1.1 目的

本書は、Flowance Phase1 におけるキャッシュ設計方針を定義する。

Phase1 では Redis を導入するが、Redis は主に Celery Broker、短時間キャッシュ、レート制限情報、一時的な処理状態に利用する。業務上の正規データは PostgreSQL に保存し、Redis、ブラウザキャッシュ、Celery Result、フロントエンド状態を正規データとして扱わない。

### 1.2 対象範囲

Phase1 の対象範囲は以下とする。

- Redis を利用した短時間キャッシュ
- Redis を利用したレート制限
- Redis を利用した一時的な処理状態
- Celery Broker としての Redis 利用
- ブラウザキャッシュ
- Next.js / フロントエンドの一時状態
- API レスポンスの Cache-Control 方針
- アイコン表示用画像のキャッシュ方針
- キャッシュキー設計
- キャッシュ無効化方針
- Redis 障害時のフォールバック

### 1.3 Phase1 対象外

以下は Phase2 以降で詳細設計する。

- 分析画面向けの大規模集計キャッシュ
- 請求書 PDF 配信キャッシュ
- CDN の詳細設計
- Redis Cluster / Sentinel の本格冗長化設計
- 多段キャッシュ構成
- Edge Cache / CDN Cache の細かな invalidation
- 検索インデックスキャッシュ
- 管理者向けキャッシュクリア UI
- キャッシュヒット率に基づく自動チューニング

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
- ファイル・画像管理設計書

## 3. 基本方針

### 3.1 キャッシュの原則

Flowance のキャッシュは以下を原則とする。

1. 正規データは PostgreSQL に保存する。
2. Redis を業務データの唯一の保存先にしない。
3. Redis 障害によって正規データを失わない。
4. 認証・認可・権限判定はキャッシュだけで確定しない。
5. 更新系 API は Redis 上のキャッシュだけを根拠に処理しない。
6. tenant 境界を越えてキャッシュを共有しない。
7. キャッシュキーには organization_id または用途に応じた安全なスコープを含める。
8. 個人情報、JWT、Refresh Token、Cookie、CSRF Token、署名付き URL の署名部分を Redis に保存しない。
9. キャッシュは TTL を必ず設定する。
10. キャッシュ障害時は PostgreSQL へフォールバックできる範囲に限定する。
11. フロントエンドの localStorage / sessionStorage に認証情報を保存しない。

### 3.2 キャッシュ対象の考え方

Phase1 では、整合性が重要な業務データの長期キャッシュは行わない。

キャッシュ対象は、短時間で失効しても業務整合性に影響しにくい情報、または再計算・再取得可能な情報に限定する。

| 種別 | Phase1 方針 |
| --- | --- |
| 認証済み API レスポンス | 原則キャッシュしない |
| 一覧・詳細 API | 原則 PostgreSQL から取得する |
| 権限判定 | キャッシュだけで確定しない |
| レート制限カウンタ | Redis に短期保存する |
| Celery Broker | Redis を利用する |
| 非同期タスク正規状態 | PostgreSQL background_tasks を正とする |
| 表示用画像 | object_key / URL のバージョン化でブラウザキャッシュ可能 |
| 静的アセット | Next.js のビルド成果物として長期キャッシュ可能 |

## 4. Redis の位置づけ

### 4.1 用途

Phase1 の Redis 用途は以下とする。

| 用途 | 説明 |
| --- | --- |
| Celery Broker | Celery task の配送 |
| 短時間キャッシュ | DB へフォールバック可能な短期データ |
| レート制限 | 認証 API などの試行回数管理 |
| 一時状態 | 短時間の処理状態、重複防止補助 |

### 4.2 Redis に保存しないもの

以下は Redis に保存しない。

- 業務データの正本
- パスワード
- JWT
- Refresh Token
- Cookie
- CSRF Token
- 署名付き URL の署名部分
- Storage credential
- 個人情報を含む request body 全体
- 精算結果の正本
- idempotency_keys の正本
- background_tasks の正本
- audit_logs

### 4.3 Redis 障害時の基本方針

| 用途 | Redis 障害時の扱い |
| --- | --- |
| 短時間キャッシュ | PostgreSQL へフォールバックする |
| レート制限 | 安全側に倒す。認証 API は制限不能時の扱いを実装時に決める |
| Celery Broker | 非同期処理受付を失敗させる、または Outbox に PENDING を残す |
| 一時状態 | 正規データに影響させない |

Redis 障害時でも PostgreSQL の正規データは失われない設計とする。

## 5. キャッシュ種別

### 5.1 サーバーサイド短時間キャッシュ

Django / DRF 側で、必要に応じて Redis Cache を利用する。

Phase1 では以下のような情報のみ候補とする。

| 候補 | 方針 |
| --- | --- |
| 短時間の参照用マスタ相当データ | 候補。ただし Phase1 では必要時のみ |
| 権限一覧の派生結果 | 原則 DB 参照。キャッシュする場合も短 TTL とし、最終判定は DB と整合させる |
| rate limit counter | 対象 |
| UI 用一時状態 | 原則フロントエンド state。Redis 正本化しない |

### 5.2 API レスポンスキャッシュ

認証済み API の JSON レスポンスは、Phase1 では原則として HTTP キャッシュしない。

理由は以下の通り。

- tenant ごとの分離が必要である。
- Cookie 認証を利用する。
- クライアント、案件、契約、予定、実績、精算は更新頻度があり、古い表示が業務判断に影響しうる。
- 楽観ロック version と整合させる必要がある。

API レスポンスの基本ヘッダーは以下とする。

| API 種別 | Cache-Control 方針 |
| --- | --- |
| 認証 API | no-store |
| 認証済み業務 API | private, no-store または private, no-cache |
| ファイル署名 URL 発行 API | no-store |
| 静的な公開アセット | public, max-age 長め, immutable |

### 5.3 ブラウザキャッシュ

ブラウザキャッシュは以下に限定して活用する。

| 対象 | 方針 |
| --- | --- |
| Next.js 静的アセット | build hash 付き URL で長期キャッシュ |
| 表示用アイコン画像 | object_key / URL が変わる前提でキャッシュ可能 |
| 認証済み API JSON | 原則キャッシュしない |
| HTML | 認証状態に応じるため長期キャッシュしない |

### 5.4 フロントエンド状態

フロントエンドでは、一時的な UI 状態は useState / useReducer などで管理する。

認証状態、JWT、Refresh Token を localStorage / sessionStorage に保存しない。

フォーム入力途中の状態、モーダル表示状態、選択中タブなどはブラウザメモリ上の状態として扱い、正規データにしない。

## 6. レート制限キャッシュ

### 6.1 対象 API

Phase1 では最低限、以下をレート制限対象とする。

| API | 方針 |
| --- | --- |
| POST /api/v1/auth/login | IP 単位と normalized_email hash 単位を併用 |
| POST /api/v1/auth/token/refresh | IP 単位、必要に応じて user/session 単位 |
| POST /api/v1/auth/register | IP 単位、必要に応じて normalized_email hash 単位 |

### 6.2 キー設計

レート制限キーには生の email を含めず、normalized_email をハッシュ化した値を利用する。

| 対象 | キー例 |
| --- | --- |
| login by IP | flowance:{env}:rate:auth_login:ip:{ip_hash} |
| login by email | flowance:{env}:rate:auth_login:email:{email_hash} |
| refresh by IP | flowance:{env}:rate:auth_refresh:ip:{ip_hash} |
| register by IP | flowance:{env}:rate:auth_register:ip:{ip_hash} |

### 6.3 TTL

具体的な制限回数と TTL は環境変数で調整可能にする。

Phase1 では以下を初期目安とし、実装時に確定する。

| 対象 | TTL 目安 |
| --- | --- |
| login 失敗回数 | 15分 |
| refresh 試行回数 | 15分 |
| register 試行回数 | 1時間 |

ユーザー列挙につながらないよう、ログイン失敗時のレスポンスは email 存在有無に関係なく同一表現とする。

## 7. Celery / 非同期処理との関係

### 7.1 Broker と Result の扱い

Redis は Celery Broker として利用する。

Celery Result を業務状態の正本として扱わない。

非同期タスク状態の正本は PostgreSQL の background_tasks とする。

### 7.2 Outbox との関係

DB 更新と非同期 task enqueue の整合性は outbox_events で担保する。

Redis 障害や Celery Broker 障害が発生しても、PostgreSQL 側に PENDING の outbox_events を残し、後続処理で再配送できるようにする。

### 7.3 タスク一時状態

Worker 内部の一時状態を Redis に置く場合でも、UI や API が参照する正規状態は background_tasks とする。

## 8. ファイル・画像キャッシュ

### 8.1 表示用画像

表示用画像は processed_object_key に保存する。

アイコン画像が変更された場合は、新しい processed_object_key を発行することでブラウザキャッシュを自然に無効化する。

### 8.2 元画像

元画像 original_object_key は直接公開しない。

元画像に対してブラウザキャッシュや CDN キャッシュを前提にしない。

### 8.3 Cache-Control

表示用画像の Cache-Control は、配信方式に応じて決定する。

| 配信方式 | 方針 |
| --- | --- |
| 署名付き URL | URL 有効期限に合わせた短〜中 TTL |
| アプリ経由配信 | private, max-age 短め |
| CDN 配信 | Phase2 以降で詳細設計 |

Phase1 では R2 Bucket を非公開とし、必要に応じて署名付き URL を発行する。

## 9. キャッシュキー設計

### 9.1 命名規則

Redis のキーは以下を基本とする。

flowance:{env}:{purpose}:{scope}:{identifier}

| 要素 | 説明 |
| --- | --- |
| flowance | アプリケーション識別子 |
| env | local, dev, staging, prod など |
| purpose | rate, cache, lock, temp など |
| scope | auth_login, org, project など |
| identifier | hash 化した識別子または UUID |

### 9.2 tenant 分離

組織に紐づくキャッシュでは organization_id をキーに含める。

例:

flowance:{env}:cache:org:{organization_id}:projects:list:{query_hash}

ただし Phase1 では、業務 API の一覧・詳細キャッシュは原則採用しない。将来導入時の命名規則として定義する。

### 9.3 禁止事項

キャッシュキーには以下を含めない。

- 生の email
- パスワード
- token
- Cookie
- 署名付き URL 全体
- 個人情報を含む検索文字列の生値

検索条件をキーに含める場合は hash 化する。

## 10. キャッシュ無効化

### 10.1 基本方針

Phase1 では、複雑な無効化が必要な業務データキャッシュを原則採用しない。

キャッシュする場合は TTL による自然失効を基本とする。

### 10.2 明示的な無効化

将来、業務 API の短時間キャッシュを導入する場合は、以下の更新時に対象キャッシュを明示的に削除する。

| 更新対象 | 無効化対象候補 |
| --- | --- |
| クライアント更新 | client detail, client list |
| 案件更新 | project detail, project list, calendar view |
| 契約更新 | contract detail, settlement calculation candidate |
| スケジュール更新 | calendar events |
| 稼働実績更新 | work record list, settlement candidate |
| 精算更新 | settlement detail |

Phase1 ではこの仕組みを実装必須とはせず、必要になった場合の拡張方針とする。

## 11. HTTP キャッシュヘッダー

### 11.1 API

| API 種別 | Cache-Control |
| --- | --- |
| /api/v1/auth/* | no-store |
| 認証済み業務 API | private, no-store |
| 署名 URL 発行 API | no-store |
| 非同期 task 受付 API | no-store |

### 11.2 静的アセット

Next.js の hash 付き静的アセットは長期キャッシュ可能とする。

| 対象 | Cache-Control |
| --- | --- |
| JS / CSS / font / build asset | public, max-age=31536000, immutable |
| HTML | private, no-cache または環境に応じた短 TTL |

## 12. セキュリティ設計

### 12.1 認証情報

以下はキャッシュしない。

- JWT
- Refresh Token
- password
- CSRF Token
- Cookie
- セッション識別子の生値

JWT は HttpOnly Cookie で扱い、レスポンス本文や localStorage / sessionStorage に保存しない。

### 12.2 権限情報

権限情報を Redis に長期保存しない。

Phase1 では、認可判定は DB 上の organization_memberships と role / permission 定義を基に行う。

短時間キャッシュを導入する場合も、ロール変更やメンバー削除時に古い権限が残らないよう短 TTL と明示的無効化を併用する。

### 12.3 tenant 境界

キャッシュキーには organization_id を含め、tenant 間でキャッシュを共有しない。

tenant 外リソース参照はキャッシュヒットの有無に関係なく 404 として扱う。

## 13. 障害時設計

### 13.1 Redis キャッシュ障害

短時間キャッシュ用途の Redis 障害時は PostgreSQL へフォールバックする。

Redis 障害を理由に、参照系 API 全体を停止させない。

### 13.2 Redis Broker 障害

Celery Broker としての Redis が利用不能な場合、非同期処理受付は失敗させる、または outbox_events に PENDING を残して再配送可能にする。

画像処理など非同期処理を伴う API では、受付できない状態を 503 として扱う。

### 13.3 レート制限 Redis 障害

レート制限に使う Redis が利用不能な場合の fail open / fail closed は API 種別ごとに決める。

Phase1 初期方針は以下とする。

| API | 方針 |
| --- | --- |
| login | セキュリティ優先。障害継続時は制限不能をログ出力し、必要に応じて fail closed を検討 |
| refresh | UX とセキュリティのバランスを見て実装時に確定 |
| register | セキュリティ優先。大量登録防止の観点で fail closed を検討 |

## 14. ログ・監視

### 14.1 ログ

キャッシュ関連では以下をログ出力する。

- traceId
- cache purpose
- cache key prefix
- hit / miss
- fallback 発生有無
- Redis error code
- latency
- API path

ただし、キャッシュキーに個人情報が含まれる可能性がある場合は hash 化済みキーまたは prefix のみを記録する。

### 14.2 メトリクス

Phase1 では以下を計測できるようにする。

- Redis 応答時間
- Redis エラー数
- cache hit / miss
- rate limit 発動回数
- Redis fallback 回数
- Celery Broker 接続エラー数
- Redis memory 使用量
- Redis key eviction 数

外部監視サービスとの詳細連携は Phase2 以降で検討する。

## 15. テスト方針

### 15.1 バックエンドテスト

- Redis 接続成功時の cache hit / miss
- Redis 障害時の PostgreSQL フォールバック
- レート制限カウンタの増加
- レート制限 TTL
- login の IP 単位制限
- login の normalized_email hash 単位制限
- キャッシュキーに生 email が含まれないこと
- tenant ごとにキャッシュキーが分離されること
- 認証済み API に no-store が付与されること
- 静的アセットに長期 cache header が付与されること

### 15.2 フロントエンドテスト

- 認証情報を localStorage / sessionStorage に保存しないこと
- API 再取得時に古い業務データを表示し続けないこと
- アイコン URL 変更時に新しい画像が表示されること
- 画像読み込み失敗時に DEFAULT アイコンへフォールバックすること

### 15.3 障害テスト

- Redis 停止時に参照系 API が DB フォールバックできること
- Redis 停止時に非同期処理受付が適切に 503 または Outbox PENDING になること
- Redis 復旧後に Outbox dispatch が再開できること
- Redis 障害時に正規データが失われないこと

## 16. Phase1 未対応事項

以下は Phase1 では対応しない、または簡易対応に留める。

1. 分析画面向けの大規模集計キャッシュ。
2. 請求書 PDF 配信キャッシュ。
3. CDN の詳細設計。
4. Redis Cluster / Sentinel の本格冗長化。
5. 管理者向けキャッシュクリア UI。
6. API レスポンスの広範な Redis キャッシュ。
7. 権限情報の長期キャッシュ。
8. Edge Cache / CDN Cache の自動 invalidation。
9. キャッシュヒット率に基づく自動チューニング。
10. 複数リージョン間のキャッシュ整合性制御。

## 17. 未確定事項

| 項目 | 方針 |
| --- | --- |
| Redis 冗長化方式 | 本番インフラ設計時に決定する |
| Redis 永続化方式 | Broker / cache 用途中心のため本番運用前に決定する |
| レート制限回数 | 実装時に環境変数で調整可能にする |
| レート制限 fail open / fail closed | API 種別ごとに実装時に確定する |
| 業務 API の短時間キャッシュ導入有無 | Phase1 初期は原則導入せず、性能問題が出た場合に検討する |
| アイコン画像 Cache-Control | 署名付き URL / アプリ配信 / CDN の採用方式に合わせて確定する |
| CDN 採用時期 | Phase2 以降で検討する |

## 18. 変更履歴

| 日付 | ver | 変更内容 |
| --- | --- | --- |
| 2026-07-16 | 1.0 | Phase1 用キャッシュ設計書を新規作成。Redis の位置づけ、短時間キャッシュ、レート制限、Celery Broker、API / ブラウザ / 画像キャッシュ、キャッシュキー、無効化、セキュリティ、障害時設計、未対応事項を定義。 |

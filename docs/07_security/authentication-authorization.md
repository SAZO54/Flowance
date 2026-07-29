# 認証・認可設計書

## 1. 文書概要

本書は Flowance Phase1 における認証、認可、Cookie、CSRF、テナント分離、権限判定、監査、関連 API の設計方針を定義する。

Phase1 では、フリーランサー向け業務管理として、認証済み利用者が所属組織の範囲内でクライアント、案件、契約、予定、稼働実績、月次精算を安全に操作できる状態を対象とする。

請求書、入金、分析、ACCOUNTANT ロール、チーム招待、パスワードリセット、メール認証、MFA、外部 OAuth は Phase2 以降で扱う。

## 2. 参照方針

本書は次の Phase1 設計と整合する。

- 要件定義書: `docs/01_requirements/requirements.md`
- 基本設計書: `docs/02_basic-design/basic-design.md`
- システムアーキテクチャ設計書: `docs/03_architecture/system-architecture.md`
- バックエンド Clean Architecture 設計書: `docs/03_architecture/backend-clean-architecture.md`
- DB 設計書: `docs/05_database/database-design.md`
- API 設計書: `docs/06_api/api-policy.md`
- 認証 API OpenAPI: `docs/06_api/openapi/authentication_api.yaml`

## 3. Phase1 対象範囲

### 3.1 対象

- 利用者登録
- ログイン
- Access Token 更新
- ログアウト
- ログイン利用者取得
- JWT 認証
- HttpOnly Cookie による Token 管理
- CSRF 対策
- OWNER / ADMIN / MEMBER の基本ロール制御
- 組織単位のテナント分離
- normalized_email によるメール一意制約
- 主要な認証・認可イベントの監査ログ

### 3.2 対象外

- チーム招待
- メールアドレス認証
- パスワードリセット
- パスワード変更
- MFA
- OAuth / Social Login
- SSO
- ACCOUNTANT ロール
- 案件単位の細かな MEMBER 権限制御
- 請求書・入金・分析向け権限
- 全端末ログアウト
- Refresh Token 一覧管理画面

## 4. 認証方式

### 4.1 基本方針

Phase1 の認証は Django Authentication と djangorestframework-simplejwt を基盤とする。

- API 認証には JWT を使用する。
- Access Token と Refresh Token はレスポンス本文へ含めない。
- Token は HttpOnly Cookie に保存する。
- フロントエンド JavaScript から Token を直接読ませない。
- Next.js は認証状態を `/api/v1/auth/me` で確認する。
- 認証状態をフロントエンドの localStorage / sessionStorage に保存しない。

### 4.2 Token 種別

| Token | 用途 | 有効期限 | 保存先 |
| --- | --- | --- | --- |
| Access Token | API 認証 | 15分 | HttpOnly Cookie `access_token` |
| Refresh Token | Access Token 更新 | 14日 | HttpOnly Cookie `refresh_token` |

Access Token の期限切れ時は、Next.js から `/api/v1/auth/token/refresh` を呼び出して再発行する。

## 5. Cookie 設計

### 5.1 Access Token Cookie

| 項目 | 値 |
| --- | --- |
| Name | `access_token` |
| HttpOnly | True |
| Secure | 本番 True。ローカル開発では環境に応じて False を許容 |
| SameSite | Lax |
| Path | `/api/` |
| Max-Age | 15分 |

### 5.2 Refresh Token Cookie

| 項目 | 値 |
| --- | --- |
| Name | `refresh_token` |
| HttpOnly | True |
| Secure | 本番 True。ローカル開発では環境に応じて False を許容 |
| SameSite | Lax |
| Path | `/api/v1/auth/` |
| Max-Age | 14日 |

Refresh Token Cookie の Path は認証 API 配下に限定する。Token 更新とログアウトでは送信されるが、通常の業務 API には送信されない。

### 5.3 CSRF Cookie

| 項目 | 値 |
| --- | --- |
| Name | `csrftoken` |
| HttpOnly | False |
| Secure | 本番 True |
| SameSite | Lax |
| Path | `/` |

Next.js は `csrftoken` を読み取り、POST / PUT / PATCH / DELETE などの変更系 API に `X-CSRFToken` として送信する。

## 6. CSRF / CORS

Cookie により JWT を送信するため、変更系 API では CSRF 検証を必須とする。

- Django CSRF Protection を有効にする。
- POST / PUT / PATCH / DELETE で `X-CSRFToken` を検証する。
- GET / HEAD / OPTIONS は原則として状態変更を行わない。
- `CSRF_TRUSTED_ORIGINS` に Next.js のオリジンを明示する。
- CORS は許可オリジンを明示し、ワイルドカード許可を避ける。
- `credentials: include` を使う API クライアントに限定する。

## 7. メールアドレス正規化

### 7.1 基本方針

表示用の `email` と、認証・一意制約用の `normalized_email` を分けて保持する。

- `email` は利用者が入力した表示用メールアドレスとして保持する。
- `normalized_email` は trim + lowercase で生成する。
- `normalized_email` に UNIQUE 制約を付与する。
- ログイン時は入力された email から `normalized_email` を生成して検索する。
- Gmail のドット除去や plus addressing 除去など、プロバイダ依存の正規化は行わない。

### 7.2 例

| 入力 | normalized_email |
| --- | --- |
| `Akari@example.com` | `akari@example.com` |
| ` akari@example.com ` | `akari@example.com` |
| `akari+test@example.com` | `akari+test@example.com` |

## 8. 認証 API

### 8.1 利用者登録

`POST /api/v1/auth/register`

認証は不要。

処理概要:

1. 入力 email から `normalized_email` を生成する。
2. `normalized_email` の重複を確認する。
3. パスワード強度を検証する。
4. User を作成する。
5. Organization を作成する。
6. OrganizationMember を OWNER として作成する。
7. Access Token / Refresh Token を発行する。
8. Token を HttpOnly Cookie に設定する。
9. user / organization の概要を返す。

レスポンス本文に JWT は含めない。

### 8.2 ログイン

`POST /api/v1/auth/login`

認証は不要。

処理概要:

1. 入力 email から `normalized_email` を生成する。
2. User を検索する。
3. パスワードを検証する。
4. 有効な OrganizationMember を取得する。
5. Access Token / Refresh Token を発行する。
6. Token を HttpOnly Cookie に設定する。
7. user / organization の概要を返す。

認証失敗時は、メールアドレス存在有無を推測できないよう、同一の `401 Unauthorized` を返す。

### 8.3 Token 更新

`POST /api/v1/auth/token/refresh`

Refresh Token Cookie を使用する。

処理概要:

1. Refresh Token Cookie を検証する。
2. Blacklist 登録済み Token でないことを確認する。
3. 新しい Access Token / Refresh Token を発行する。
4. Cookie を更新する。

レスポンス本文に JWT は含めない。

### 8.4 ログアウト

`POST /api/v1/auth/logout`

処理概要:

1. Refresh Token を Blacklist へ登録する。
2. Access Token Cookie を削除する。
3. Refresh Token Cookie を削除する。
4. `204 No Content` を返す。

Phase1 では現在端末ログアウトを対象とする。全端末ログアウトは Phase2 以降で検討する。

フロントエンドは共通サイドバーの利用者表示をクリックして開くプロフィールメニュー内に、設定画面とログアウトの導線を置く。メニューは外側クリックまたはEscapeキーで閉じられるものとする。ログアウト操作中は再送を防止し、成功時はクライアントの認証コンテキストを破棄して`/login`へ遷移する。失敗時は認証状態を維持し、プロフィールメニュー内へ再試行可能なエラーを表示する。

### 8.5 ログイン利用者取得

`GET /api/v1/auth/me`

現在ログイン中の user、organization、permissions を返す。

Phase1 の permissions は、OWNER / ADMIN / MEMBER のロールから導出する。請求書・入金・分析関連 permission は Phase1 では返さない。

## 9. 認可設計

### 9.1 基本方針

認可は Django / DRF / Application 層で実施する。

- DRF Permission で API 単位の入口制御を行う。
- Application 層でテナント境界と業務操作権限を検証する。
- QuerySet は必ず `organization_id` で絞り込む。
- フロントエンドの表示制御は UX 補助であり、認可の正にはしない。

### 9.2 ロール

Phase1 のロールは次の3種類とする。

| ロール | 説明 |
| --- | --- |
| OWNER | 組織所有者。Phase1 の全機能を操作可能 |
| ADMIN | 業務データ全般を操作可能。ただし組織所有者専用操作は不可 |
| MEMBER | 自身の予定・稼働実績を中心に操作可能。マスタ更新は制限 |

ACCOUNTANT は Phase1 では実装しない。

### 9.3 権限マトリクス

| 機能 | OWNER | ADMIN | MEMBER |
| --- | --- | --- | --- |
| ログイン / ログアウト | 可 | 可 | 可 |
| ログイン利用者取得 | 可 | 可 | 可 |
| クライアント閲覧 | 可 | 可 | 可 |
| クライアント作成 / 更新 / 無効化 | 可 | 可 | 不可 |
| 案件閲覧 | 可 | 可 | 可 |
| 案件作成 / 更新 / 無効化 | 可 | 可 | 不可 |
| 契約閲覧 | 可 | 可 | 可 |
| 契約作成 / 更新 / 削除 | 可 | 可 | 不可 |
| カレンダー閲覧 | 可 | 可 | 可 |
| 週次予定作成 / 更新 / 削除 | 可 | 可 | 原則不可 |
| 個別予定作成 / 更新 / 削除 | 可 | 可 | 自身分のみ可 |
| 稼働実績閲覧 | 可 | 可 | 自身分中心 |
| 稼働実績作成 / 更新 / 削除 | 可 | 可 | 自身分のみ可 |
| 精算計算 / 再計算 / 確定 / 削除 | 可 | 可 | 不可 |
| 組織設定 | 可 | 制限付き | 不可 |

Phase1 では MEMBER の案件単位・操作単位の細分化は行わない。必要になった場合は Phase3 で ProjectMember / Permission を拡張する。

### 9.4 permission 例

`GET /api/v1/auth/me` で返す permissions は例として次のようにする。

OWNER / ADMIN:

- `clients:read`
- `clients:create`
- `clients:update`
- `projects:read`
- `projects:create`
- `projects:update`
- `contracts:read`
- `contracts:create`
- `contracts:update`
- `schedules:read`
- `schedules:create`
- `schedules:update`
- `workRecords:read`
- `workRecords:create`
- `workRecords:update`
- `settlements:calculate`
- `settlements:finalize`

MEMBER:

- `clients:read`
- `projects:read`
- `contracts:read`
- `schedules:read`
- `schedules:createOwn`
- `schedules:updateOwn`
- `workRecords:readOwn`
- `workRecords:createOwn`
- `workRecords:updateOwn`

## 10. テナント分離

Flowance は Organization 単位で業務データを分離する。

- User は OrganizationMember を通じて Organization に所属する。
- Phase1 は原則として1ユーザー1組織運用から開始する。
- 業務テーブルは `organization_id` を持つ。
- API ではログイン利用者の OrganizationMember から `organization_id` を決定する。
- リクエスト body の `organizationId` は信用しない。
- 他組織の UUID を指定された場合は `404 Not Found` または `403 Forbidden` とする。存在推測を避けるため、原則 `404 Not Found` を優先する。

## 11. DB 設計との対応

主な認証・認可関連テーブルは次の通り。

| テーブル | 用途 |
| --- | --- |
| users | 利用者、表示用 email、normalized_email、パスワードハッシュ |
| organizations | 組織 |
| organization_members | 利用者と組織の所属、OWNER / ADMIN / MEMBER ロール |
| refresh_token_blacklist | ログアウト済み Refresh Token の無効化管理 |
| audit_logs | 認証・認可を含む主要イベントの監査 |

`users.normalized_email` には UNIQUE 制約を付与する。

## 12. 監査ログ

Phase1 では主要な認証・認可イベントを監査ログとして記録する。

記録対象:

- 利用者登録成功
- ログイン成功
- ログイン失敗
- Token 更新失敗
- ログアウト
- 権限不足による拒否
- 他組織リソースアクセス拒否
- 精算確定など重要操作

監査ログには、可能な範囲で user_id、organization_id、action、resource_type、resource_id、ip_address、user_agent、trace_id、created_at を記録する。

パスワード、JWT、Refresh Token の生値は監査ログへ保存しない。

## 13. レート制限

- `POST /api/v1/auth/register`: IP単位で5回/時。
- `POST /api/v1/auth/login`: IP単位で10回/5分、かつnormalized_email単位で5回/15分。
- `POST /api/v1/auth/token/refresh`: IP単位またはToken Subject単位で30回/時。
- カウンタはRedisに保持し、閾値は環境変数で変更可能にする。
- 超過時は429 `RATE_LIMITED` と `Retry-After` を返す。

## 14. パスワード方針

- Django の password hasher を使用し、平文パスワードを保存しない。
- 12文字以上128文字以下とする。
- 文字種の組み合わせは強制しない。
- CommonPasswordValidator、UserAttributeSimilarityValidator、NumericPasswordValidatorを適用する。
- 外部の漏えいパスワードDB照合はPhase2で再検討する。
- パスワード変更、パスワードリセットは Phase2 以降で扱う。

## 15. フロントエンド連携

Next.js 側の方針:

- API 呼び出しでは `credentials: include` を使用する。
- JWT は JavaScript で読まない。
- 認証状態は `/api/v1/auth/me` の結果で判断する。
- 変更系 API では `X-CSRFToken` を送信する。
- 401 を受けた場合は Token 更新を試行し、失敗時はログイン画面へ遷移する。
- 403 は権限不足として扱い、再ログインではなく権限エラーを表示する。

## 16. API エラー方針

| HTTP | 用途 |
| --- | --- |
| 400 | 入力形式不正 |
| 401 | 未認証、Token 無効 |
| 403 | 権限不足、CSRF 失敗 |
| 404 | リソースなし、または他組織リソースの存在秘匿 |
| 409 | 楽観ロック、冪等性競合 |
| 422 | 業務規則違反 |
| 429 | レート制限 |

認証失敗時は、メールアドレスが存在するかどうかを推測できるメッセージを返さない。

## 17. 実装配置

| 層 | 主な責務 |
| --- | --- |
| Presentation / DRF | Cookie 入出力、Serializer、Permission、HTTP エラー変換 |
| Application | 利用者登録、ログイン、ログアウト、権限検証、テナント検証、トランザクション境界 |
| Domain | ロール、権限、テナント境界、認証・認可の業務ルール |
| Infrastructure | Django ORM、Simple JWT、Password Hasher、Blacklist、AuditLog 永続化 |

Serializer は形式検証と DTO 変換を主責務とし、最終的な権限判定とテナント境界検証は Application / Domain 側で行う。

## 18. テスト方針

Phase1 では次のテストを実施する。

- 利用者登録時に User / Organization / OWNER メンバーが作成されること
- normalized_email により大文字小文字違いの重複を防止できること
- ログイン成功時に Cookie が設定され、本文に JWT が含まれないこと
- ログイン失敗時に 401 が返ること
- Token 更新で Cookie が更新されること
- ログアウトで Refresh Token が Blacklist 登録され、Cookie が削除されること
- 未認証 API 呼び出しが 401 になること
- 権限不足が 403 になること
- 他組織リソースへアクセスできないこと
- MEMBER が管理系 API を操作できないこと
- 変更系 API で CSRF Token が必須であること

## 19. 未対応事項

Phase1 では次を未対応とする。

- メール認証
- パスワードリセット
- パスワード変更
- MFA
- OAuth / Social Login
- SSO
- チーム招待
- 全端末ログアウト
- ACCOUNTANT ロール
- 請求書・入金・分析向け権限
- 案件単位の細かな MEMBER 権限制御
- 管理画面からの Refresh Token セッション一覧
- 監査ログ検索 UI

## 20. 変更履歴

| 日付 | 版 | 内容 |
| --- | --- | --- |
| 2026-07-15 | 1.0 | Phase1 用の認証・認可設計書を新規作成。JWT HttpOnly Cookie、CSRF、normalized_email、OWNER / ADMIN / MEMBER、テナント分離、認証 API、監査ログ、未対応事項を定義。 |

## 17. Settings権限（2026-07-30更新）

| 操作 | OWNER | ADMIN | MEMBER |
|---|---|---|---|
| 設定取得 | 可 | 可 | 可 |
| 自身のプロフィール更新 | 可 | 可 | 可 |
| 組織設定更新 | 可 | 可 | 不可 |

MEMBERはクライアント・案件・契約を閲覧し、自身の予定・稼働実績を操作できる。マスタ、契約、精算の変更はOWNER / ADMINのみに許可する。案件単位の細粒度権限はPhase3で扱う。

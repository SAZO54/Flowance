# エラーハンドリング設計書

## 1. 文書概要

### 1.1 目的

本書は、Flowance Phase1 における API、バックエンド、フロントエンド、非同期処理、ログ出力のエラーハンドリング方針を定義する。

エラー発生時のレスポンス形式、HTTP ステータス、エラーコード、ログ・監査ログの扱い、画面表示方針を統一し、利用者にとって分かりやすく、開発・運用時に追跡しやすい状態を実現する。

### 1.2 対象範囲

Phase1 の対象範囲は以下とする。

- 認証・認可
- 組織・利用者
- クライアント
- 案件
- アイコン
- 契約
- スケジュール
- 稼働実績
- 月次精算
- 監査ログ
- 楽観ロック
- 冪等性
- 非同期タスク
- OpenAPI / DRF API エラー

### 1.3 Phase1 対象外

以下は Phase2 以降で詳細設計する。

- 請求書発行・PDF 生成に関する業務エラー
- 入金・消込に関する業務エラー
- 収支・分析画面の集計エラー
- ACCOUNTANT ロール固有の権限制御エラー
- 管理者向けエラーログ閲覧画面
- Sentry / OpenTelemetry / APM などの外部監視連携
- 多言語化されたエラーメッセージ管理

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

## 3. 基本方針

### 3.1 エラーハンドリングの原則

Flowance のエラーハンドリングは以下を原則とする。

1. API エラーは共通レスポンス形式で返す。
2. フロントエンドは HTTP ステータスと error.code を基に表示・遷移・再試行を制御する。
3. 利用者には業務上理解できるメッセージを返す。
4. スタックトレース、SQL、内部例外名、トークン、Cookie、パスワード、署名付き URL の内部情報はレスポンスに含めない。
5. 予期しない例外は 500 として扱い、詳細はサーバーログへ出力する。
6. DB、Redis、Cloudflare R2、Celery などの外部依存障害は原則 503 とする。
7. tenant 境界を越えるリソース参照は、存在有無を漏らさないため 404 として扱う。
8. 楽観ロックの version 不一致は 409 Conflict とする。
9. 業務ルール違反は 422 Unprocessable Entity を基本とし、現在状態との競合が主因の場合は 409 Conflict とする。
10. GET / HEAD / DELETE では requestBody を使用しない。

### 3.2 レイヤー別責務

| レイヤー | 主な責務 |
| --- | --- |
| Presentation 層 | HTTP 入出力、DRF Serializer 検証、例外から HTTP レスポンスへの変換 |
| Application 層 | UseCase 単位の業務フロー、権限確認、冪等性、トランザクション、楽観ロック検証 |
| Domain 層 | 契約期間重複、精算計算、稼働時間計算などの業務ルール検証 |
| Infrastructure 層 | DB、Redis、R2、Celery、外部サービス障害の検知とアプリケーション例外への変換 |
| Frontend | エラー表示、再認証、フォーム項目エラー表示、競合時の再取得導線 |

### 3.3 例外変換方針

バックエンドでは、各層で発生した例外を Presentation 層の共通 Exception Handler で API エラー形式へ変換する。

| 例外種別 | 例 | HTTP ステータス |
| --- | --- | --- |
| Validation Error | 必須項目不足、形式不正 | 400 |
| Authentication Error | 未ログイン、トークン不正 | 401 |
| Authorization Error | 権限不足、CSRF 不正 | 403 |
| Not Found Error | リソース未存在、tenant 外リソース | 404 |
| Conflict Error | version 不一致、冪等性キー競合、確定済み状態への変更 | 409 |
| Domain Error | 契約条件不正、時間範囲不正、精算対象不正 | 422 |
| Infrastructure Error | DB、Redis、R2、Celery 障害 | 503 |
| Unexpected Error | 想定外例外 | 500 |

## 4. 共通エラーレスポンス

### 4.1 レスポンス形式

すべての JSON API エラーは以下の形式で返す。

```json
{
  "code": "VALIDATION_ERROR",
  "message": "入力内容を確認してください。",
  "details": [
    {
      "field": "name",
      "code": "REQUIRED",
      "message": "名前は必須です。"
    }
  ],
  "traceId": "111e8400-e29b-41d4-a716-446655440000"
}
```

### 4.2 フィールド定義

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| code | string | 必須 | 機械判定用のエラーコード |
| message | string | 必須 | 利用者向けの概要メッセージ |
| details | array | 必須 | 項目別・条件別の詳細。該当なしの場合は空配列 |
| traceId | string | 必須 | サーバーログと突合するための追跡 ID |

### 4.3 details の形式

details は以下の形式を基本とする。

```json
{
  "field": "version",
  "code": "VERSION_MISMATCH",
  "message": "他の操作によりデータが更新されています。最新の内容を取得し直してください。",
  "submittedVersion": 3,
  "currentVersion": 4
}
```

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| field | string | 任意 | 対象フィールド。対象がリクエスト全体の場合は省略可能 |
| code | string | 必須 | 詳細エラーコード |
| message | string | 必須 | 詳細メッセージ |
| submittedVersion | integer | 任意 | 楽観ロック時の送信 version |
| currentVersion | integer | 任意 | 楽観ロック時の現在 version |
| limit | integer | 任意 | サイズ上限など |
| allowedValues | array | 任意 | 許可値 |
| resource | string | 任意 | 対象リソース名 |

### 4.4 traceId

- リクエストごとに traceId を生成する。
- クライアントから `X-Request-ID` が送信された場合は、形式検証後にログ相関 ID として利用できる。
- API レスポンスには `traceId` を必ず含める。
- レスポンスヘッダーにも `X-Trace-ID` を設定する。
- traceId はエンドユーザーへの詳細説明ではなく、問い合わせ・調査用の識別子として扱う。

## 5. HTTP ステータス設計

| HTTP ステータス | 用途 | 主な code |
| --- | --- | --- |
| 400 Bad Request | JSON 形式不正、型不正、必須パラメータ不足、DELETE の version クエリ不足 | BAD_REQUEST, VALIDATION_ERROR, MALFORMED_JSON |
| 401 Unauthorized | 未ログイン、Access Token 期限切れ、Refresh Token 不正 | UNAUTHORIZED, TOKEN_EXPIRED, TOKEN_INVALID |
| 403 Forbidden | 権限不足、CSRF 検証失敗 | FORBIDDEN, CSRF_FAILED |
| 404 Not Found | リソース未存在、tenant 外リソース | NOT_FOUND, CLIENT_NOT_FOUND, PROJECT_NOT_FOUND |
| 409 Conflict | 楽観ロック不一致、冪等性キー競合、現在状態との競合 | CONCURRENT_MODIFICATION, IDEMPOTENCY_CONFLICT, SETTLEMENT_ALREADY_FINALIZED |
| 413 Payload Too Large | アップロードファイルサイズ超過 | PAYLOAD_TOO_LARGE |
| 415 Unsupported Media Type | 未対応 Content-Type、未対応画像形式 | UNSUPPORTED_MEDIA_TYPE |
| 422 Unprocessable Entity | 業務ルール違反、契約条件不正、時間範囲不正 | BUSINESS_RULE_VIOLATION, INVALID_CONTRACT_CONDITION |
| 429 Too Many Requests | レート制限 | RATE_LIMITED |
| 500 Internal Server Error | 想定外例外 | INTERNAL_SERVER_ERROR |
| 503 Service Unavailable | DB、Redis、R2、Celery などの一時障害 | SERVICE_UNAVAILABLE |

## 6. エラーコード設計

### 6.1 共通エラーコード

| code | HTTP | 説明 |
| --- | --- | --- |
| BAD_REQUEST | 400 | リクエスト全体が不正 |
| MALFORMED_JSON | 400 | JSON 構文不正 |
| VALIDATION_ERROR | 400 | 入力形式・必須項目エラー |
| UNAUTHORIZED | 401 | 認証されていない |
| TOKEN_EXPIRED | 401 | Access Token 期限切れ |
| TOKEN_INVALID | 401 | Token 不正 |
| FORBIDDEN | 403 | 操作権限がない |
| CSRF_FAILED | 403 | CSRF 検証失敗 |
| NOT_FOUND | 404 | リソースが存在しない |
| CONCURRENT_MODIFICATION | 409 | version 不一致 |
| IDEMPOTENCY_KEY_REQUIRED | 400 | 冪等性キーが必要 |
| IDEMPOTENCY_CONFLICT | 409 | 同一キーで異なる内容のリクエスト |
| PAYLOAD_TOO_LARGE | 413 | ファイルサイズ超過 |
| UNSUPPORTED_MEDIA_TYPE | 415 | 未対応メディアタイプ |
| BUSINESS_RULE_VIOLATION | 422 | 業務ルール違反 |
| RATE_LIMITED | 429 | レート制限 |
| INTERNAL_SERVER_ERROR | 500 | 想定外エラー |
| SERVICE_UNAVAILABLE | 503 | 一時的にサービス利用不可 |

### 6.2 Phase1 業務エラーコード

| code | HTTP | 説明 |
| --- | --- | --- |
| EMAIL_ALREADY_REGISTERED | 409 | normalized_email が既に登録済み |
| CLIENT_NOT_FOUND | 404 | クライアントが存在しない |
| PROJECT_NOT_FOUND | 404 | 案件が存在しない |
| CONTRACT_NOT_FOUND | 404 | 契約が存在しない |
| WORK_SCHEDULE_NOT_FOUND | 404 | スケジュールが存在しない |
| WORK_RECORD_NOT_FOUND | 404 | 稼働実績が存在しない |
| SETTLEMENT_NOT_FOUND | 404 | 精算が存在しない |
| CONTRACT_PERIOD_OVERLAP | 409 | 同一案件内で契約期間が重複している |
| INVALID_CONTRACT_CONDITION | 422 | 契約種別と金額・時間条件の組み合わせが不正 |
| INVALID_WORK_TIME_RANGE | 422 | 開始日時・終了日時の範囲が不正 |
| INVALID_BREAK_RANGE | 422 | 休憩時間が稼働時間外、または休憩同士が重複 |
| SETTLEMENT_TARGET_NOT_FOUND | 422 | 精算対象となる契約・実績が不足している |
| SETTLEMENT_NOT_CALCULATED | 422 | 確定前に精算計算が完了していない |
| SETTLEMENT_ALREADY_FINALIZED | 409 | 確定済み精算に対する変更・削除 |
| IMAGE_DIMENSION_TOO_LARGE | 422 | 画像の縦横または総ピクセル数が上限を超過 |
| IMAGE_PROCESSING_FAILED | 422 | 画像変換に失敗 |
| BACKGROUND_TASK_FAILED | 422 | 非同期タスクが業務エラーで失敗 |

## 7. API 別エラー方針

### 7.1 認証 API

| API | 主なエラー | HTTP | code |
| --- | --- | --- | --- |
| 利用者登録 | メールアドレス登録済み | 409 | EMAIL_ALREADY_REGISTERED |
| 利用者登録 | パスワード強度不足 | 400 | VALIDATION_ERROR |
| ログイン | メールアドレスまたはパスワード不一致 | 401 | UNAUTHORIZED |
| Token 更新 | Refresh Token 不正・期限切れ | 401 | TOKEN_INVALID |
| ログアウト | 未ログイン | 401 | UNAUTHORIZED |
| ログイン利用者取得 | Access Token 不正 | 401 | TOKEN_INVALID |

ログイン失敗時は、メールアドレスの存在有無を推測できないように、同一の 401 レスポンスを返す。

### 7.2 クライアント API

| API | 主なエラー | HTTP | code |
| --- | --- | --- | --- |
| 一覧取得 | 認証なし | 401 | UNAUTHORIZED |
| 登録 | 権限不足 | 403 | FORBIDDEN |
| 登録 | 入力不正 | 400 | VALIDATION_ERROR |
| 更新 | クライアント未存在 | 404 | CLIENT_NOT_FOUND |
| 更新 | version 不一致 | 409 | CONCURRENT_MODIFICATION |
| アイコン登録 | ファイルサイズ超過 | 413 | PAYLOAD_TOO_LARGE |
| アイコン登録 | 未対応形式 | 415 | UNSUPPORTED_MEDIA_TYPE |
| アイコン登録 | 縦横・総ピクセル数超過 | 422 | IMAGE_DIMENSION_TOO_LARGE |
| アイコン登録 | version 不一致 | 409 | CONCURRENT_MODIFICATION |

アイコンアップロードは Phase1 では最大 5MB、最大 4096 x 4096、総ピクセル数 16,777,216 を上限とする。

### 7.3 案件 API

| API | 主なエラー | HTTP | code |
| --- | --- | --- | --- |
| 一覧取得 | 認証なし | 401 | UNAUTHORIZED |
| 登録 | クライアント未存在 | 404 | CLIENT_NOT_FOUND |
| 登録 | 入力不正 | 400 | VALIDATION_ERROR |
| 詳細取得 | 案件未存在 | 404 | PROJECT_NOT_FOUND |
| 更新 | 案件未存在 | 404 | PROJECT_NOT_FOUND |
| 更新 | version 不一致 | 409 | CONCURRENT_MODIFICATION |
| アイコン登録 | ファイルサイズ超過 | 413 | PAYLOAD_TOO_LARGE |
| アイコン登録 | 未対応形式 | 415 | UNSUPPORTED_MEDIA_TYPE |
| アイコン登録 | 縦横・総ピクセル数超過 | 422 | IMAGE_DIMENSION_TOO_LARGE |

案件の開始日・終了日は案件ライフサイクル管理用であり、契約の有効期間とは別に扱う。

### 7.4 契約 API

| API | 主なエラー | HTTP | code |
| --- | --- | --- | --- |
| 契約登録 | 案件未存在 | 404 | PROJECT_NOT_FOUND |
| 契約登録 | 同一案件内の契約期間重複 | 409 | CONTRACT_PERIOD_OVERLAP |
| 契約登録 | 契約種別と項目の組み合わせ不正 | 422 | INVALID_CONTRACT_CONDITION |
| 契約更新 | 契約未存在 | 404 | CONTRACT_NOT_FOUND |
| 契約更新 | version 不一致 | 409 | CONCURRENT_MODIFICATION |
| 契約削除 | 契約未存在 | 404 | CONTRACT_NOT_FOUND |
| 契約削除 | version クエリ不足 | 400 | VALIDATION_ERROR |

契約期間重複は、同一案件内では禁止し、別案件同士では許可する。DB では `valid_from / valid_until` から daterange expression を作る exclusion constraint を採用する。

### 7.5 スケジュール API

| API | 主なエラー | HTTP | code |
| --- | --- | --- | --- |
| イベント取得 | from / to 不足 | 400 | VALIDATION_ERROR |
| 個別登録 | 案件未存在 | 404 | PROJECT_NOT_FOUND |
| 個別登録 | 時間範囲不正 | 422 | INVALID_WORK_TIME_RANGE |
| 更新 | スケジュール未存在 | 404 | WORK_SCHEDULE_NOT_FOUND |
| 更新 | version 不一致 | 409 | CONCURRENT_MODIFICATION |
| 削除 | version クエリ不足 | 400 | VALIDATION_ERROR |

予定重複は Phase1 では登録自体を禁止せず、警告表示の対象とする。そのため、予定重複のみを理由に API エラーとはしない。

重複警告が必要な場合は、正常レスポンスに `warnings` を含める。

```json
{
  "warnings": [
    {
      "code": "SCHEDULE_OVERLAP",
      "message": "同じ時間帯に別の予定があります。"
    }
  ]
}
```

### 7.6 稼働実績 API

| API | 主なエラー | HTTP | code |
| --- | --- | --- | --- |
| 登録 | 案件未存在 | 404 | PROJECT_NOT_FOUND |
| 登録 | 紐づくスケジュール未存在 | 404 | WORK_SCHEDULE_NOT_FOUND |
| 登録 | 実績時間範囲不正 | 422 | INVALID_WORK_TIME_RANGE |
| 登録 | 休憩時間不正 | 422 | INVALID_BREAK_RANGE |
| 更新 | 稼働実績未存在 | 404 | WORK_RECORD_NOT_FOUND |
| 更新 | version 不一致 | 409 | CONCURRENT_MODIFICATION |
| 削除 | version クエリ不足 | 400 | VALIDATION_ERROR |

actualMinutes と billableMinutes はリクエストでは受け取らず、actualStartAt、actualEndAt、breaks、契約条件、丸め条件を基にバックエンドで計算する。

Phase1 では DRAFT 中心で運用し、DRAFT / CONFIRMED の厳密な確定フローは Phase2 以降で強化する。

### 7.7 精算 API

| API | 主なエラー | HTTP | code |
| --- | --- | --- | --- |
| 詳細取得 | 精算未存在 | 404 | SETTLEMENT_NOT_FOUND |
| 精算計算 | 案件未存在 | 404 | PROJECT_NOT_FOUND |
| 精算計算 | 対象契約なし | 422 | SETTLEMENT_TARGET_NOT_FOUND |
| 精算再計算 | 精算未存在 | 404 | SETTLEMENT_NOT_FOUND |
| 精算再計算 | 確定済み | 409 | SETTLEMENT_ALREADY_FINALIZED |
| 精算確定 | Idempotency-Key 不足 | 400 | IDEMPOTENCY_KEY_REQUIRED |
| 精算確定 | version 不一致 | 409 | CONCURRENT_MODIFICATION |
| 精算確定 | 同一キーで異なるリクエスト | 409 | IDEMPOTENCY_CONFLICT |
| 未確定精算削除 | 確定済み | 409 | SETTLEMENT_ALREADY_FINALIZED |

精算確定は副作用を伴うため、`Idempotency-Key` を必須とする。

## 8. 楽観ロック

### 8.1 基本方針

更新・削除・確定など、既存データの状態を変更する API では version による楽観ロックを行う。

- PATCH / PUT / POST action 系 API では request body に version を含める。
- DELETE API では requestBody を使用せず、query parameter の version を利用する。
- version 不一致時は 409 Conflict を返す。

### 8.2 レスポンス例

```json
{
  "code": "CONCURRENT_MODIFICATION",
  "message": "他の操作によりデータが更新されています。最新の内容を取得し直してください。",
  "details": [
    {
      "field": "version",
      "code": "VERSION_MISMATCH",
      "message": "送信された version が現在の version と一致しません。",
      "submittedVersion": 3,
      "currentVersion": 4
    }
  ],
  "traceId": "111e8400-e29b-41d4-a716-446655440000"
}
```

## 9. 冪等性

### 9.1 対象 API

Phase1 では、以下のような副作用が大きい API に Idempotency-Key を必須とする。

- 精算確定
- 将来の請求書発行、入金登録などの外部的な副作用を伴う API

### 9.2 挙動

| 条件 | 挙動 |
| --- | --- |
| 同一キー・同一リクエスト | 保存済みレスポンスを返す |
| 同一キー・異なるリクエスト | 409 IDEMPOTENCY_CONFLICT |
| 必須 API でキーなし | 400 IDEMPOTENCY_KEY_REQUIRED |
| 処理中の同一キー | 処理完了後の結果、または 409/202 を API 性質に応じて返す |

### 9.3 レスポンス例

```json
{
  "code": "IDEMPOTENCY_CONFLICT",
  "message": "同じ Idempotency-Key で異なる内容のリクエストが送信されています。",
  "details": [],
  "traceId": "111e8400-e29b-41d4-a716-446655440000"
}
```

## 10. 非同期処理エラー

### 10.1 対象

Phase1 では Celery / Redis を導入し、以下の処理を非同期処理の候補とする。

- クライアントアイコン画像変換
- 案件アイコン画像変換
- 将来の PDF 生成
- 将来の集計処理

### 10.2 方針

- 受付成功時は 202 Accepted を返す。
- 非同期タスクの状態は background_tasks で管理する。
- 業務エラーは原則リトライしない。
- 一時的なインフラエラーはリトライ対象とする。
- タスク失敗時は `error_code` と `error_message` を保存する。
- スタックトレースや内部例外詳細は background_tasks の利用者向け項目には保存しない。

### 10.3 タスク状態

| status | 説明 |
| --- | --- |
| PENDING | 受付済み・未処理 |
| RUNNING | 処理中 |
| SUCCEEDED | 成功 |
| FAILED | 失敗 |

### 10.4 代表エラー

| 状況 | HTTP / タスク | code |
| --- | --- | --- |
| Redis 利用不可 | 503 | REDIS_UNAVAILABLE |
| Celery Worker 利用不可 | 503 | ASYNC_WORKER_UNAVAILABLE |
| R2 アップロード失敗 | タスク FAILED | STORAGE_UNAVAILABLE |
| 画像変換失敗 | タスク FAILED | IMAGE_PROCESSING_FAILED |

## 11. セキュリティ関連エラー

### 11.1 認証エラー

認証エラーでは、利用者情報や token の内部状態を推測できる情報を返さない。

```json
{
  "code": "UNAUTHORIZED",
  "message": "認証が必要です。",
  "details": [],
  "traceId": "111e8400-e29b-41d4-a716-446655440000"
}
```

### 11.2 権限エラー

権限不足は 403 を返す。ただし、tenant 外リソースへのアクセスはリソース存在有無を隠すため 404 を返す。

### 11.3 CSRF エラー

POST / PUT / PATCH / DELETE では CSRF 検証を行う。CSRF token 不足・不一致は 403 とする。

```json
{
  "code": "CSRF_FAILED",
  "message": "リクエストの検証に失敗しました。画面を再読み込みしてから再度お試しください。",
  "details": [],
  "traceId": "111e8400-e29b-41d4-a716-446655440000"
}
```

## 12. ログ・監査ログ

### 12.1 アプリケーションログ

アプリケーションログには以下を記録する。

- traceId
- userId
- organizationId
- HTTP method
- path
- statusCode
- errorCode
- latency
- userAgent
- client IP
- 例外クラス名
- スタックトレース

ただし、以下はログへ出力しない。

- password
- access_token
- refresh_token
- Cookie 全体
- CSRF token
- 署名付き URL の署名部分
- 個人情報を含む request body 全体

### 12.2 監査ログ

監査ログは、業務上重要な操作の記録に使用する。技術的な例外ログとは分離する。

Phase1 で監査ログ対象とする主な操作は以下とする。

- ログイン成功・失敗
- ログアウト
- クライアント登録・更新・削除相当操作
- 案件登録・更新・削除相当操作
- 契約登録・更新・削除
- 稼働実績登録・更新・削除
- 精算計算・再計算・確定・削除
- 権限不足による拒否

### 12.3 5xx エラー

5xx エラーは必ず error レベルでログ出力する。フロントエンドには共通メッセージのみを返す。

```json
{
  "code": "INTERNAL_SERVER_ERROR",
  "message": "予期しないエラーが発生しました。時間をおいて再度お試しください。",
  "details": [],
  "traceId": "111e8400-e29b-41d4-a716-446655440000"
}
```

## 13. フロントエンド表示方針

### 13.1 共通表示

| HTTP | フロントエンドの扱い |
| --- | --- |
| 400 | フォーム項目にエラー表示。項目に紐づかない場合は画面上部に表示 |
| 401 | Token refresh を試行。失敗時はログイン画面へ遷移 |
| 403 | 権限不足メッセージを表示 |
| 404 | 対象データが存在しない旨を表示し、一覧へ戻る導線を出す |
| 409 | 最新データの再取得導線を表示 |
| 413 | ファイルサイズ上限を表示 |
| 415 | 対応形式を表示 |
| 422 | 業務ルール違反として画面上部または該当項目に表示 |
| 429 | 時間をおいて再試行するよう表示 |
| 500 | 一時的なエラーとして表示 |
| 503 | サービス一時停止または混雑として表示 |

### 13.2 フォーム項目エラー

`details[].field` が指定されている場合は、対応するフォーム項目にエラーを表示する。

`field` がないエラーはフォーム全体エラーとして表示する。

### 13.3 楽観ロックエラー

409 CONCURRENT_MODIFICATION を受け取った場合、フロントエンドは以下を行う。

1. 画面上部に競合メッセージを表示する。
2. 「最新の内容を読み込む」導線を表示する。
3. 必要に応じて現在入力中の内容を保持したまま再取得できるようにする。

## 14. DRF 実装方針

### 14.1 Exception Handler

Django REST Framework の custom exception handler を用意し、DRF 標準例外、Django 例外、アプリケーション例外、ドメイン例外を共通形式へ変換する。

### 14.2 Serializer Validation

Serializer validation のエラーは 400 VALIDATION_ERROR とする。

業務ルールに依存する検証は Serializer に寄せすぎず、Application 層または Domain 層で検証し、422 または 409 として返す。

### 14.3 トランザクション

DB 更新を伴う UseCase は transaction.atomic を基本とする。途中で例外が発生した場合はロールバックし、中途半端な状態を残さない。

### 14.4 Infrastructure 例外

DB、Redis、Cloudflare R2、Celery などの例外は、Infrastructure 層でアプリケーション向け例外へ変換する。

内部例外をそのまま Presentation 層へ漏らさない。

## 15. テスト方針

### 15.1 バックエンドテスト

以下をテスト対象とする。

- 共通 Exception Handler の変換結果
- validation error の details 形式
- 認証エラーの 401 応答
- 権限エラーの 403 応答
- tenant 外リソース参照時の 404 応答
- 楽観ロック不一致時の 409 応答
- 契約期間重複時の 409 応答
- 業務ルール違反時の 422 応答
- Idempotency-Key の再送・競合
- 非同期タスク失敗時の status / error_code 保存

### 15.2 フロントエンドテスト

以下をテスト対象とする。

- フォーム項目エラー表示
- 401 時の refresh / ログイン遷移
- 403 表示
- 404 表示
- 409 競合時の再取得導線
- 413 / 415 のファイルアップロードエラー表示
- 500 / 503 の共通エラー表示

## 16. Phase1 未対応事項

以下は Phase1 では対応しない、または簡易対応に留める。

1. 請求書、入金、収支、分析に関する詳細な業務エラー設計。
2. 管理者向けのエラーログ閲覧 UI。
3. Sentry / OpenTelemetry / APM など外部監視サービスとの連携。
4. エラー文言の多言語化管理。
5. エラーコード一覧から OpenAPI components を自動生成する仕組み。
6. ユーザー別・組織別の詳細なレート制限設計。
7. 障害通知の Slack / Email 連携。
8. 非同期タスクのリアルタイム通知。Phase1 ではポーリングを基本とする。

## 17. 未確定事項

| 項目 | 方針 |
| --- | --- |
| 外部監視サービス | Phase2 以降で Sentry / OpenTelemetry / APM の採用を検討する |
| エラーコード自動生成 | Phase2 以降で OpenAPI と実装の同期方法を検討する |
| レート制限値 | Phase1 実装時に認証 API、更新 API、アップロード API ごとに具体値を決める |
| 障害通知 | Phase2 以降で通知先と閾値を設計する |
| 非同期タスク通知 | Phase1 はポーリング、Phase2 以降でリアルタイム通知を検討する |

## 18. 変更履歴

| 日付 | ver | 変更内容 |
| --- | --- | --- |
| 2026-07-15 | 1.0 | Phase1 用エラーハンドリング設計書を新規作成。共通エラーレスポンス、HTTP ステータス、エラーコード、API 別エラー、楽観ロック、冪等性、非同期処理、ログ・監査ログ、フロントエンド表示方針、未対応事項を定義。 |

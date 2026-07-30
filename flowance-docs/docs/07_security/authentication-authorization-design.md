# 認証・認可設計書

- Status: Phase1
- Version: 1.1
- Updated: 2026-07-30
- Source: Notion「認証・認可設計書」

## パスワード

- 12文字以上128文字以下とする。
- 大文字・小文字・数字・記号の組み合わせは強制しない。
- Django標準のCommonPasswordValidator、UserAttributeSimilarityValidator、NumericPasswordValidatorを適用する。
- Phase1では外部の漏えいパスワードDB照合を行わず、Phase2で再検討する。
- 平文パスワードを保存しない。

## レート制限

| API | 既定値 | キー |
| --- | --- | --- |
| POST /api/v1/auth/register | 5回/時 | IP |
| POST /api/v1/auth/login | 10回/5分 | IP |
| POST /api/v1/auth/login | 5回/15分 | normalized_email |
| POST /api/v1/auth/token/refresh | 30回/時 | IPまたはToken Subject |

カウンタはRedisに保持し、閾値は環境変数で変更可能にする。超過時は429 `RATE_LIMITED` とRetry-Afterを返す。認証失敗時の応答は一律とし、ユーザー列挙を防ぐ。

## MEMBER権限

- クライアント、案件、契約は閲覧可。
- 自身の予定、稼働実績は操作可。
- マスタ、契約、精算の変更はOWNER / ADMINのみ。
- 案件単位の細粒度権限はPhase3。

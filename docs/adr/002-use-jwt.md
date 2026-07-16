# ADR-002: JWT を HttpOnly Cookie で扱う

## ステータス

採用

## 日付

2026-07-16

## 背景

Flowance Phase1 では、Next.js フロントエンドから Django REST API を利用する。

認証 API では、ログイン時に access token / refresh token を Cookie に設定し、JWT をレスポンス本文へ含めない方針としている。

また、POST / PUT / PATCH / DELETE などの変更系 API では CSRF 検証を行う。

## 決定

API 認証には JWT を使用し、access token / refresh token は HttpOnly Cookie で扱う。

- JWT ライブラリは djangorestframework-simplejwt を基本とする。
- access token は短寿命とする。
- refresh token は access token より長寿命とする。
- JWT はレスポンス本文へ含めない。
- 本番 Cookie には Secure 属性を付与する。
- SameSite はフロントエンド / API のデプロイ構成に合わせて設定する。
- 変更系 API では CSRF Token を検証する。
- ログアウト時は refresh token を Blacklist へ登録し、Cookie を削除する。

## 理由

- HttpOnly Cookie により、JavaScript から token を直接読み取れないようにできる。
- JWT により、API 側でステートレスに近い認証判断ができる。
- refresh token blacklist により、ログアウト後の refresh token 再利用を抑止できる。
- CSRF 対策を併用することで、Cookie 認証の弱点を補える。
- JWT をレスポンス本文へ含めないことで、フロントエンドの token 取り扱いを単純化できる。

## 影響

### 良い影響

- token を localStorage に保存しないため、XSS 時の token 直接漏洩リスクを下げられる。
- Next.js 側は Cookie 同送を前提に API を呼び出せる。
- 認証 API のレスポンス形式が安定する。

### 注意点

- Cookie 認証では CSRF 対策が必須となる。
- CORS / CSRF_TRUSTED_ORIGINS / SameSite / Secure の環境別設定が必要になる。
- refresh token の blacklist 管理が必要になる。
- access token 期限切れ時の refresh フローをフロントエンドで適切に扱う必要がある。

## 採用しない選択肢

| 選択肢 | 採用しない理由 |
| --- | --- |
| localStorage に JWT を保存 | XSS 時に token を読み取られるリスクが高い |
| Session 認証のみ | API 利用や将来拡張時の柔軟性で JWT を優先する |
| JWT をレスポンス本文へ返す | フロントエンドが token を保持・管理する必要が出るため採用しない |

## Phase1 未対応事項

- SSO / OAuth 連携
- MFA
- デバイス別セッション管理
- 管理者による全端末ログアウト
- ACCOUNTANT ロール向けの高度な権限分離

## 変更履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-07-16 | 1.0 | JWT を HttpOnly Cookie で扱い、変更系 API で CSRF を検証する ADR を作成 |

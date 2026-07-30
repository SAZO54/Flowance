# API設計書

- Status: Phase1
- Version: 1.4
- Updated: 2026-07-30
- Source: Notion「API設計書」

## 基本方針

- Base Pathは `/api/v1`。
- JSONを基本とし、画像を含む登録・更新は `multipart/form-data`。
- OpenAPI 3.0.3を正としてDRF Serializerと同期する。
- 項目エラーは400 `VALIDATION_ERROR` の `fieldErrors` で返す。

## 設定API

| API | 権限 |
| --- | --- |
| GET /settings/profile | 認証済み利用者 |
| PATCH /settings/profile | 認証済み利用者本人 |
| GET /settings/organization | 組織メンバー |
| PATCH /settings/organization | OWNER / ADMIN |

## 入力バリデーション契約

- パスワードは12〜128文字。Django標準バリデータを適用する。
- クライアントはname必須150文字以内、contactName 100文字以内、email 254文字以内、phone数字のみ15桁以内、postalCode 20文字以内、address 500文字以内、notes 1000文字以内。
- 案件はname、clientId、status必須。statusはACTIVE / PAUSED / COMPLETED / ARCHIVED。descriptionとnotesは1000文字以内。endDateはstartDate以降。
- 稼働実績はprojectId、actualStartAt、actualEndAt、status必須。終了は開始より後。notesは1000文字以内。休憩は実績内かつ相互重複不可。
- スケジュールはprojectId、workContent、scheduledStartAt、scheduledEndAt必須。workContentは200文字以内、notesは1000文字以内、終了は開始より後。
- プロフィールと組織設定の制約は基本設計書に従う。
- 文字列は前後空白を除去してから必須・文字数を判定する。

## アイコン

許可形式はJPEG、PNG、WebP。MIME Typeとファイルシグネチャを検証し、5MB、4096px x 4096px、16,777,216 pixelsを上限とする。

## OpenAPIファイル

- authentication_api.yaml
- client_api.yaml
- project_api.yaml
- contract_api.yaml
- schedule_api.yaml
- work_records_api.yaml
- settlement_api.yaml
- settings_api.yaml

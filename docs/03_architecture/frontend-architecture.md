# フロントエンドアーキテクチャ設計書

## 1. 文書概要

本書は Flowance Phase1 の Next.js フロントエンドにおける画面構成、レイヤー構成、状態管理、API通信、認証Cookie、ローカル開発構成を定義する。

Phase1 では、認証、ダッシュボード、スケジュール、案件、クライアント、稼働記録、設定を対象とする。収支、請求書、分析は Phase2 以降とし、Phase1 ではサイドメニューから非表示またはコメントアウトする。

## 2. 基本構成

Next.js App Router を採用する。

```text
flowance-web/src/
  app/                              # Route、layout、page entry
  domain/                           # UI非依存の型・表示ルール
  application/                      # 画面ユースケース
  infrastructure/                  # API Adapter
  presentation/
    components/                     # 共有UI
    features/
      clients/
        styles/                     # クライアント固有のglobal CSS
      projects/
        styles/                     # 案件固有のglobal CSS
      contracts/
        styles/                     # 契約固有のglobal CSS
      schedules/
        styles/                     # スケジュール固有のglobal CSS
      workRecords/
        styles/                     # 稼働実績固有のglobal CSS
  shared/
  styles/
    globals.css                     # 全画面の基礎スタイル
    shared/                         # 複数機能で共有するUIスタイル
```

## 3. レイヤー方針

- app はルーティング、レイアウト、ページエントリを担当する
- presentation は画面UI、フォーム、カレンダー、モーダルを担当する
- application は画面ユースケース、状態遷移、フォーム送信フローを担当する
- domain はフロントエンド側で共有する型、列挙値、軽量な表示ルールを担当する
- infrastructure は API Adapter、Cookie / CSRF 連携、外部I/Oを担当する
- shared は共通UI、hooks、utils、定数を担当する

### 3.1 CSS配置方針

- 全画面の基礎スタイルは `src/styles/globals.css` に置き、root layout から読み込む。
- フォーム、一覧、日時入力、カードなど複数機能で使うスタイルは `src/styles/shared/` に置く。
- 特定機能だけが所有するスタイルは `src/presentation/features/<feature>/styles/` に置き、対象Routeから読み込む。
- 単一コンポーネントに閉じる新規スタイルは、コンポーネントと同じ場所の `*.module.css` を優先する。
- `domain/` にはCSSを置かず、React、Next.js、CSSへの依存を持ち込まない。
- 一時的な修正名の `*-override.css` を増やさず、安定した責務を持つ既存ファイルへ統合する。

## 4. Server Components

次の用途で Server Components を優先する。

- ルートページ
- ログイン後レイアウト
- 初期データ取得
- 読み取り専用サマリー
- Metadata
- サーバー側認証状態確認

## 5. Client Components

次の用途で Client Components を使用する。

- フォーム
- カレンダー
- ドラッグ＆ドロップ
- モーダル
- ファイル選択
- 画像プレビュー
- API Mutation
- ローカル状態
- 競合更新メッセージ表示
- 非同期タスク状態表示

Client Components は必要な範囲だけに限定する。

## 6. 状態管理

- サーバー状態は TanStack Query を使用する
- フォーム状態は React Hook Form を使用する
- 入力検証は Zod を使用する
- 共有可能な絞り込み条件は URL Search Parameters へ保存する
- 一時的なUI状態は useState または useReducer を使用する
- Redux は採用しない

## 7. API Adapter

API通信は infrastructure 層に集約する。

src/infrastructure/api/
  apiClient.ts
  authApi.ts
  clientApi.ts
  projectApi.ts
  contractApi.ts
  scheduleApi.ts
  workRecordApi.ts
  settlementApi.ts

Phase2 以降で追加する API Adapter:

- invoiceApi.ts
- paymentApi.ts
- analyticsApi.ts

共通 API Client は次を担当する。

- Base URL 設定
- Cookie 送信
- CSRF Token 送信
- JSON 変換
- multipart/form-data 送信
- エラー変換
- Token 更新
- Trace ID 取得
- HTTP 409 の競合処理
- HTTP 401 時の再認証導線

## 8. 認証・Cookie

- Access Token / Refresh Token は HttpOnly Cookie に保存する
- localStorage / sessionStorage へ JWT を保存しない
- 変更系リクエストでは X-CSRFToken を送信する
- HTTP 401 時は Token 更新を試行する
- Token 更新失敗時はログイン画面へ遷移する

## 9. Phase1 画面

| 画面 | URL | 主な責務 |
| --- | --- | --- |
| トップ | / | ダッシュボードへ遷移 |
| ログイン | /login | ログイン |
| 利用者登録 | /register | アカウント作成、初期組織作成 |
| ダッシュボード | /dashboard | 当日予定、稼働状況、案件サマリー |
| スケジュール | /schedule | 月／週／日カレンダー、予定・実績表示 |
| 案件一覧 | /case | 案件検索、絞り込み、登録導線 |
| 案件詳細 | /case/{id} | 案件、契約、予定、稼働、精算確認 |
| 契約登録 | /case/{id}/contracts/new | 契約形態別フォーム、登録 |
| 契約編集 | /case/{id}/contracts/{contractId}/edit | 契約取得、更新、論理削除 |
| 稼働記録 | /timelog | 実績一覧、実績登録・編集 |
| クライアント一覧 | /client | 顧客検索、登録、編集導線 |
| クライアント詳細 | /client/{id} | 顧客情報、関連案件確認 |
| 設定 | /setting | 利用者、組織、表示設定 |

契約画面は案件詳細を入口にするが、責務は次のように独立させる。
- domain/contract.ts: 契約型・列挙値・表示ラベル
- application/contracts.ts: 一覧・取得・登録・更新・削除のユースケース境界
- infrastructure/api/contractApi.ts: Contracts API Adapter
- presentation/features/contracts: 契約パネル、契約形態別フォーム、再取得・削除確認UI
## 10. Phase2 画面

Phase1 では次の画面をサイドメニューから非表示またはコメントアウトする。

- 収支 /balance
- 請求書 /invoice
- 分析 /analytics

## 11. カレンダー表示

カレンダー表示 API は表示用イベントを返す。フロントエンドは、案件詳細やユーザー詳細をカレンダーイベントだけで完結させようとせず、必要な詳細は専用APIで取得する。

表示イベントは project_id、user_id、title、start_at、end_at、status、version など最小限の情報を扱う。

予定重複は登録自体を許可し、同一利用者の時間帯重複がある場合は警告表示する。

## 12. アイコン表示

- DEFAULT アイコンは default_icon_text、default_icon_background_color、default_icon_text_color を使って表示する
- UPLOADED アイコンは処理済み画像URLを表示する
- icon_status が PENDING / PROCESSING の場合は初期アイコンまたは処理中表示へフォールバックする
- icon_status が FAILED の場合は初期アイコンまたは失敗表示を出す

## 13. エラーハンドリング

- HTTP 400 は入力エラーとしてフォームへ反映する
- HTTP 401 は Token 更新またはログイン遷移で処理する
- HTTP 403 は権限不足として表示する
- HTTP 404 は対象なしとして表示する
- HTTP 409 は競合更新として再取得導線を表示する
- HTTP 413 はアップロード容量超過として表示する
- HTTP 415 は未対応ファイル形式として表示する
- HTTP 422 は業務規則違反として表示する
- HTTP 500 / 503 は一時的な障害として表示する

## 14. ローカル開発構成

フロントエンドは Docker Compose では起動せず、ホスト環境で Next.js 開発サーバーとして起動する。

flowance-web/
  npm run dev

起動先:

- http://localhost:3000

Django API には localhost:8000 で接続する。

## 15. Phase1 未対応事項

- 収支画面
- 請求書画面
- 分析画面
- 入金画面
- PDFプレビュー
- 請求書発行フロー
- 入金登録フロー
- 高度なグラフ分析
- ストップウォッチ式タイムトラッキング
- 稼働実績の承認フロー

## 16. 変更履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-07-10 | 1.0 | Phase1用のフロントエンドアーキテクチャ設計書へ更新。Next.js App Router、Phase1画面、API Adapter、認証Cookie、ローカル開発構成を整理 |
| 2026-07-20 | 1.1 | Contracts機能のレイヤー分離と案件配下の契約登録・編集ルートを追加 |
| 2026-07-20 | 1.2 | CSSを全体・共有・機能固有へ分離する配置方針とCSS Modulesの優先規則を追加 |

## 18. Settings 機能構成（2026-07-21追加）

Settingsはdomain/settings、application/settings、infrastructure/api/settingsApi、presentation/features/settingsへ分離する。App Routerの/settingはComposition RootでSettings APIとContainerを組み立て、任意のUIコンポーネントから直接APIを呼ばない。

AppShellは認証セッションProviderから/auth/meの表示設定を受け取り、サイドバーと表示密度へ反映する。日時表示は利用者タイムゾーンと12/24時間設定、カレンダー範囲は利用者タイムゾーンと週開始曜日を利用する。

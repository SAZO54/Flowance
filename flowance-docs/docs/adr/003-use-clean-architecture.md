# ADR-003: Django で Clean Architecture / DDD の責務分離を採用する

## ステータス

採用

## 日付

2026-07-16

## 背景

Flowance Phase1 では、契約期間重複、稼働実績計算、月次精算、税額・源泉徴収、アイコン処理、予定生成など、画面入力だけでは完結しない業務ルールが多い。

これらを DRF View / Serializer / Django Model に直接詰め込むと、テストしにくく、変更時の影響範囲も広がる。

一方で、Django の実用性は活かしたいため、Django を避けるのではなく、Django app の中で責務分離を明確にする。

## 決定

Django バックエンドでは、Clean Architecture / DDD の考え方を採用し、以下の責務分離を行う。

| 層 | 主な責務 |
| --- | --- |
| Presentation | DRF View / Serializer、HTTP 入出力、Cookie 認証、CSRF、HTTP status 変換 |
| Application | ユースケース制御、認可結果に基づく操作可否、トランザクション、DTO 組み立て |
| Domain | 業務ルール、契約計算、精算計算、時間丸め、状態遷移、不変条件 |
| Infrastructure | Django ORM、PostgreSQL、Redis、Celery、Storage、Cloudflare R2、外部技術詳細 |

Domain 層は Django / DRF / Django ORM / PostgreSQL / Redis / Celery / HTTP / Cookie / Next.js に依存しない。

## 理由

- 契約・精算などの重要な業務ルールを UI や API 入出力から独立させられる。
- Domain logic を Unit Test しやすくなる。
- DRF Serializer を形式検証と DTO 変換に集中させられる。
- Django ORM の便利さを使いつつ、業務判断を ORM 実装へ密結合させない。
- Phase2 以降の請求書、入金、分析への拡張時に責務が破綻しにくい。

## 影響

### 良い影響

- 業務ルールの所在が明確になる。
- 税額・源泉徴収・契約期間重複などの重要ロジックをテストしやすい。
- Presentation 層の肥大化を防げる。
- Infrastructure 差し替え時の影響を抑えやすい。

### 注意点

- 小規模機能でも過度に抽象化しすぎない。
- Django の実装慣習から離れすぎると開発速度が落ちる。
- Repository / Service の粒度は機能ごとに調整する。
- Domain 層へ ORM Model を直接渡さない設計を意識する。

## 採用しない選択肢

| 選択肢 | 採用しない理由 |
| --- | --- |
| Fat Model | 契約・精算・予定生成などのロジックが肥大化しやすい |
| Fat View / ViewSet | HTTP と業務ルールが混在し、テスト・保守が難しくなる |
| 完全な別ドメインパッケージ化を最初から徹底 | Phase1 の速度を落とすため、Django app 内で現実的に分離する |

## Phase1 未対応事項

- イベントソーシング
- CQRS の全面採用
- マイクロサービス分割
- Domain Event の外部公開
- 厳密な集約境界の完全実装

## 変更履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-07-16 | 1.0 | Django 内で Clean Architecture / DDD の責務分離を採用する ADR を作成 |

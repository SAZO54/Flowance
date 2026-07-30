# ADR-001: Django / Django REST Framework を採用する

## ステータス

採用

## 日付

2026-07-16

## 背景

Flowance Phase1 では、認証、組織、クライアント、案件、契約、予定、稼働実績、月次精算、監査ログ、冪等性、ファイル管理を単一のバックエンドで扱う。

既存設計では、バックエンドは Python / Django / Django REST Framework / Django ORM / Django Migration を前提としている。

過去の Spring Boot / Java / JPA / Flyway 表記は Phase1 設計から除外し、Django 系の構成へ統一する。

## 決定

Flowance Phase1 のバックエンドには Django / Django REST Framework を採用する。

- API 層は Django REST Framework を使用する。
- 認証基盤は Django Authentication を使用する。
- 永続化は Django ORM を使用する。
- DB 変更管理は Django Migration を使用する。
- PostgreSQL を業務データ、認証データ、監査ログ、冪等性、Outbox の正規データストアとする。

## 理由

- Python / Django は Flowance の要件規模に対して実装速度と保守性のバランスがよい。
- Django Authentication、Django ORM、Django Migration を利用でき、Phase1 の認証・DB・管理系の実装を効率化できる。
- DRF により OpenAPI と整合した REST API を実装しやすい。
- 単一プロダクトの Phase1 では、マイクロサービス化よりも単一 Django バックエンドのほうが運用負荷を抑えられる。
- 契約計算、精算計算、権限判定、テナント境界検証などを Django 側に集約できる。

## 影響

### 良い影響

- バックエンド技術スタックが Python / Django に統一される。
- Django ORM と PostgreSQL の組み合わせで、業務データの整合性を保ちやすい。
- Django Migration により DB 変更をアプリケーションコードと合わせて管理できる。
- DRF Serializer / View / Permission を利用して API 実装を標準化できる。

### 注意点

- DRF View / Serializer に業務ルールを詰め込みすぎない。
- Domain 相当層、Application 相当層を明確に分ける。
- Django ORM へ依存する処理を Domain 層へ持ち込まない。
- 複雑な集計・制約は PostgreSQL の特性も活用する。

## 採用しない選択肢

| 選択肢 | 採用しない理由 |
| --- | --- |
| Spring Boot / Java | 現行 Phase1 設計は Python / Django 前提であり、再設計コストが大きい |
| FastAPI | 軽量だが、Django Authentication / ORM / Admin / Migration をまとめて使える利点を優先する |
| Node.js API | フロントエンドと責務が混ざりやすく、契約・精算などの業務ルールをバックエンドへ集約する方針と合わない |

## Phase1 未対応事項

- マイクロサービス分割
- GraphQL API
- Django Admin を本格的な業務管理画面として使う設計
- 複数バックエンド言語の併用

## 変更履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-07-16 | 1.0 | Phase1 バックエンドとして Django / DRF / Django ORM / Django Migration を採用する ADR を作成 |

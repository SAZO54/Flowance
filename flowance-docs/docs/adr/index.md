---
title: ADR
sidebar_label: ADR概要
---

## 🧭 文書概要

- Status: Phase1
- Version: 1.0
- Source: Notion「ADR」
- Notion: https://app.notion.com/p/393ff2dc6fe980e29145d55064417a1b

ADR は Architecture Decision Record の略で、Flowance Phase1 の重要な技術判断を1件ずつ記録する。

## 📚 ADR一覧

| ADR | タイトル | ステータス | 主な決定 |
| --- | --- | --- | --- |
| ADR-001 | Django / Django REST Framework を採用する | 採用 | Backend は Django / DRF / Django ORM / Django Migration |
| ADR-002 | JWT を HttpOnly Cookie で扱う | 採用 | JWT は本文へ含めず access / refresh token を Cookie で扱う |
| ADR-003 | Django で Clean Architecture / DDD の責務分離を採用する | 採用 | Presentation / Application / Domain / Infrastructure を分離 |
| ADR-004 | Redis / Celery を Phase1 で採用する | 採用 | Redis を Broker、Celery を画像処理・補償処理に使う |
| ADR-005 | 金額計算に Decimal を使用する | 採用 | float を使わず Decimal / numeric / bigint を使う |

## 🧩 ADRの読み方

- 背景: その判断が必要になった文脈。
- 決定: 採用した方式。
- 理由: 採用判断の根拠。
- 採用しない選択肢: 比較したが採用しなかった方式。
- Phase1 未対応事項: 将来検討に送るもの。

## 🚫 Phase1 未対応事項まとめ

- マイクロサービス分割
- GraphQL API
- SSO / OAuth / MFA
- イベントソーシング
- CQRS の全面採用
- 予定生成の非同期化
- 精算計算の非同期化
- 外貨対応
- 組織別の消費税丸め方式設定
- 返金、相殺、負の精算

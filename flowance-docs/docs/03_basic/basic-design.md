# 基本設計書

- Status: Phase1
- Version: 1.7
- Updated: 2026-07-30
- Source: Notion「基本設計書」

## 技術方針

- Frontend: Next.js
- Backend: Django / Django REST Framework
- Database: PostgreSQL
- Cache / Broker: Redis
- Async Worker: Celery
- Object Storage: Cloudflare R2

## アカウント・組織設定

プロフィール設定は認証済み利用者本人が更新できる。

| 項目 | 制約 |
| --- | --- |
| displayName | 必須、100文字以内 |
| lastName / firstName | 各50文字以内 |
| email | 254文字以内、メール形式、normalized_emailで一意 |
| phone | 数字のみ15桁以内 |
| bio | 1000文字以内 |

組織設定はOWNER / ADMINのみ更新でき、楽観ロック用versionを必須とする。

| 項目 | 制約 |
| --- | --- |
| name | 必須、150文字以内 |
| tradeName | 150文字以内 |
| postalCode | 20文字以内 |
| prefecture | 20文字以内 |
| address | 500文字以内 |

適格請求書発行事業者番号はPhase1対象外とする。

## 権限

MEMBERはクライアント・案件・契約を閲覧し、自身の予定・稼働実績を操作できる。マスタ、契約、精算の変更はOWNER / ADMINに限定する。

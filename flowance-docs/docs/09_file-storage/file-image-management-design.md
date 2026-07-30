---
title: ファイル・画像管理設計書
sidebar_label: ファイル・画像管理
---

## 🧭 文書概要

- Status: Phase1
- Version: 1.0
- Source: Notion「ファイル・画像管理設計書」
- Notion: https://app.notion.com/p/393ff2dc6fe9804f9729e9ce4618d9f9

本書はファイル保存、画像アップロード、R2 / local storage、CDN 配信、メタデータ、補償処理を定義する。

## 🧱 基本方針

- ファイル本体は PostgreSQL に保存しない。
- PostgreSQL には stored_files としてメタデータ、object key、状態を保存する。
- 本番は Cloudflare R2 を採用する。
- ローカル開発は Django MEDIA_ROOT または volume を使用できる。
- 署名付き URL は派生値であり正規データではない。
- 元画像と表示用画像を分離する。

## 🖼️ 画像アップロード制約

| 項目 | 方針 |
| --- | --- |
| 許可形式 | JPEG / PNG / WebP |
| 不許可 | SVG / GIF / 実行形式 / 破損画像 |
| ファイルサイズ | 最大5MB |
| 最大縦横 | 4096px x 4096px |
| 最大総画素数 | 16,777,216 pixels |
| EXIF | 削除する |
| 表示形式 | WebP 派生画像を生成 |

Frontend でも事前検証するが、Backend で MIME type、拡張子、実画像内容、容量、縦横、総画素数を必ず再検証する。

## 🗂️ stored_files

| 項目 | 内容 |
| --- | --- |
| organization_id | テナント境界 |
| owner_type / owner_id | Client または Project などの所有者 |
| storage_backend | local / r2 |
| original_object_key | 元画像の object key |
| display_object_key | 表示用画像の object key |
| mime_type | 検証済み MIME |
| size_bytes | 容量 |
| width / height | 画像サイズ |
| status | PENDING / READY / FAILED / DELETED |
| version | 楽観ロックや URL versioning 補助 |

## ☁️ Cloudflare R2 / CDN

- R2 bucket は private を基本とする。
- 本番画像配信は R2 custom domain + Cloudflare CDN を採用する。
- r2.dev は開発・検証用途に限定し、本番配信では使用しない。
- 表示用画像は versioned object key で長期キャッシュする。
- 画像更新時は同一 URL 上書きではなく、新しい object key を発行する。
- 元画像は原則 CDN 公開対象にしない。

## 🔁 処理フロー

1. API が画像を受け取る。
2. 認証、認可、tenant、version を検証する。
3. MIME、容量、画像内容、縦横を検証する。
4. 元画像を storage に保存する。
5. stored_files と icon 状態を PENDING として保存する。
6. Celery task を登録する。
7. Worker が EXIF 削除、WebP 変換、表示用画像生成を行う。
8. 成功時に READY、失敗時に FAILED を保存する。
9. 旧画像があれば削除 task を登録する。

## 🧹 整合性・補償

- DB 更新失敗時は保存済み object を削除対象にする。
- 旧画像は新画像成功後に削除する。
- 削除処理は冪等にする。
- 孤立ファイルは定期または手動補償処理で削除する。
- R2 障害時は task を retry または FAILED にし、利用者向けに再試行導線を出す。

---
title: アイコン処理詳細設計書
sidebar_label: アイコン処理
---

## 🧭 文書概要

- Status: Phase1
- Version: 1.0
- Source: Notion「アイコン処理詳細設計書」
- Notion: https://app.notion.com/p/393ff2dc6fe9803f8d7aeeea515572f4

本書はクライアント・案件アイコンの初期生成、アップロード、画像変換、状態管理、表示、テスト観点を定義する。

## 🐾 基本方針

- Client と Project は共通の Icon 概念を持つ。
- 初期アイコンは UUID から決定的に生成する。
- アップロード画像がある場合は UPLOADED を表示し、削除時は初期アイコンへ戻す。
- 画像処理は Celery で非同期化する。
- 画像ファイル本体は DB に保存しない。

## 🎨 初期アイコン

| 項目 | 方針 |
| --- | --- |
| 動物 | UUID hash の第1バイトから固定16種を選択 |
| 背景色 | hash の第2バイトから水色系を除く淡色8色を選択 |
| 互換文字色 | #294B5B |
| 生成タイミング | Client / Project 作成時 |
| 名前変更 | 動物、背景、文字色は変えない |

## 🖼️ アップロード制約

| 項目 | 方針 |
| --- | --- |
| 許可形式 | JPEG / PNG / WebP |
| 不許可 | SVG / GIF / 実行形式 / 破損画像 |
| 最大容量 | 5MB |
| 最大縦横 | 4096px x 4096px |
| 最大画素数 | 16,777,216 pixels |
| EXIF | 削除 |
| 派生画像 | WebP 生成 |

## 🚦 状態

| 状態 | 意味 |
| --- | --- |
| READY | 表示可能 |
| PENDING | アップロード受付済み |
| PROCESSING | Worker 処理中 |
| FAILED | 処理失敗 |

## 🔁 処理フロー

1. API がファイル、version、対象IDを受け取る。
2. 認証、認可、tenant、version を検証する。
3. MIME、拡張子、ファイル内容、容量、縦横を検証する。
4. 元画像を storage に保存する。
5. icon_status を PENDING にする。
6. Celery task を enqueue する。
7. Worker が EXIF 削除と WebP 変換を行う。
8. 成功時に READY、失敗時に FAILED を保存する。
9. 差し替え時は旧画像削除 task を登録する。

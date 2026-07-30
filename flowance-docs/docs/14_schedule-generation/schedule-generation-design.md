---
title: 予定生成詳細設計書
sidebar_label: 予定生成
---

## 🧭 文書概要

- Status: Phase1
- Version: 1.1
- Source: Notion「予定生成詳細設計書」
- Notion: https://app.notion.com/p/393ff2dc6fe980a7a754e1d451a019d1

本書は週次予定、個別予定、予定生成、dryRun、重複警告、手動上書き、カレンダー表示を定義する。

## 🗓️ 基本概念

| 概念 | 内容 |
| --- | --- |
| ProjectWeeklySchedule | 曜日・時刻・案件・利用者を持つ週次テンプレート |
| WorkSchedule | 実日付に展開された個別作業予定 |
| WorkRecord | 実際に働いた稼働実績 |
| Calendar Event | WorkSchedule と WorkRecord を表示用に統合したイベント |

## 📅 曜日・期間

- day_of_week は 0=日曜、1=月曜、2=火曜、3=水曜、4=木曜、5=金曜、6=土曜。
- 生成期間 from / to は必須。
- 生成期間上限の初期値は 100 日とする。
- valid_from / valid_until がある場合は範囲内の日付だけ生成する。

## 🔁 生成方針

- Phase1 の title は案件名を使用する。
- 既存予定がある日は重複作成しない。
- 手動変更済み予定は再生成で上書きしない。
- CANCELLED の予定を再生成で復活させない。
- dryRun は DB 保存せず、生成予定件数と warnings を返す。
- Idempotency-Key により同一生成リクエストの二重実行を防ぐ。

## 🖥️ カレンダー UI

- 予定と実績を同じ週次カレンダーに表示する。
- 予定をクリックすると予定編集・削除モーダルを開く。
- 実績をクリックしても予定編集モーダルの対象にしない。
- 予定が0件でも時間グリッドを表示する。
- 自動生成予定の編集時は、以後の自動生成で上書きされない旨を表示する。

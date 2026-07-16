# 契約・売上計算詳細設計書

## 1. 文書概要

### 1.1 目的

本書は、Flowance Phase1 における契約管理、稼働実績に基づく請求対象時間計算、月次精算、売上金額計算の詳細設計を定義する。

Flowance では、案件の管理期間、契約の有効期間、作業予定、稼働実績、月次精算を分離して扱う。

契約・売上計算は、請求書作成前の金額確定に近い業務領域であり、Phase1 では請求書・入金・分析を対象外としつつ、案件単位・月単位で売上見込みと精算結果を正しく算出できる状態を目標とする。

### 1.2 対象範囲

Phase1 の対象範囲は以下とする。

- 契約登録
- 契約一覧取得
- 契約詳細取得
- 契約更新
- 契約削除
- 契約種別ごとの入力検証
- 同一案件内の契約期間重複制御
- 稼働実績の actual_minutes 計算
- 稼働実績の billable_minutes 計算
- 月次精算計算
- 月次精算再計算
- 月次精算確定
- 未確定精算の削除
- 消費税計算
- 源泉徴収計算
- 金額丸め
- 計算スナップショット保存
- 楽観ロック
- 冪等性
- 監査ログ
- エラーハンドリング
- クリーンアーキテクチャ / DDD 上の責務分離

### 1.3 Phase1 対象外

以下は Phase2 以降で検討する。

- 請求書作成
- 請求書発行
- PDF 生成
- 入金管理
- 請求残高管理
- 売上分析
- 収支分析
- ACCOUNTANT ロール
- 日額契約
- 組織別の消費税丸め方式設定
- 複雑な成果物承認ワークフロー
- 月途中で契約が切り替わる場合の日割り・按分精算
- 複数契約を同一月内で自動分割する精算
- 外貨対応
- 複数税率混在の請求書明細生成
- 会計ソフト連携

## 2. 参照設計

本書は以下の設計書と整合させる。

- 要件定義書
- 基本設計書
- システムアーキテクチャ設計書
- バックエンド Clean Architecture 設計書
- フロントエンドアーキテクチャ設計書
- DB 設計書
- API 設計書
- 認証・認可設計書
- エラーハンドリング設計書
- 非同期処理設計書
- ファイル・画像管理設計書
- キャッシュ設計書
- インフラ・運用設計書
- アイコン処理詳細設計書
- 予定生成詳細設計書

## 3. 基本方針

### 3.1 契約と案件期間の分離

案件の start_date / end_date は案件管理上の期間であり、契約の有効期間ではない。

契約期間は project_contracts.valid_from / valid_until で管理する。

これにより、以下を分離できる。

- 案件としての管理期間
- 契約条件が有効な期間
- 実際に作業した期間
- 精算対象となる月

### 3.2 金額計算の原則

金額計算は以下を原則とする。

1. 金額計算はバックエンドで行う。
2. フロントエンドから calculated amount を信頼しない。
3. Python では decimal.Decimal を使用する。
4. Django では DecimalField または整数金額を使用する。
5. PostgreSQL では numeric または bigint を使用する。
6. float は使用しない。
7. JPY の最終金額は 1 円単位の整数で保持する。
8. 消費税、源泉徴収、合計額は二重丸めしない。
9. 計算時点の契約条件は calculation_snapshot に保存する。

### 3.3 正規データ

契約・精算領域の正規データは PostgreSQL に保持する。

Redis、画面表示状態、ブラウザ状態、キャッシュ値は正規データにしない。

### 3.4 Phase1 の契約種別

Phase1 で扱う契約種別は以下とする。

| 契約種別 | 説明 | Phase1 方針 |
| --- | --- | --- |
| HOURLY | 時間単価契約 | 実績分または予定分を契約丸めし、時間単価で計算する |
| MONTHLY_RANGE | 月額精算幅契約 | monthly_rate を基準に、base_minutes 差分で控除・超過を計算する |
| MONTHLY_FIXED | 月額固定契約 | 対象月に有効な契約の monthly_rate を基本金額とする |
| PERFORMANCE | 成果報酬契約 | performance_amount を基本金額とする |

日額契約は Phase2 以降とする。

## 4. ドメインモデル

### 4.1 ProjectContract

ProjectContract は案件に紐づく契約条件を表す。

主な属性:

| 属性 | 説明 |
| --- | --- |
| id | 契約ID |
| organization_id | テナント境界 |
| project_id | 案件ID |
| contract_type | HOURLY / MONTHLY_RANGE / MONTHLY_FIXED / PERFORMANCE |
| currency | 通貨。Phase1 は JPY |
| hourly_rate | 時間単価 |
| monthly_rate | 月額単価 |
| performance_amount | 成果報酬額 |
| minimum_minutes | 月額精算幅の下限分 |
| maximum_minutes | 月額精算幅の上限分 |
| base_minutes | 月額精算幅の控除・超過基準分 |
| deduction_rate | 控除単価 |
| overtime_rate | 超過単価 |
| tax_rate | 消費税率 |
| withholding_tax_rate | 源泉徴収率 |
| rounding_unit_minutes | 丸め単位分 |
| rounding_method | ROUND_DOWN / ROUND_UP / ROUND_HALF_UP |
| closing_day | 締日。31 は月末扱い |
| payment_terms_days | 支払サイト日数 |
| valid_from | 契約開始日 |
| valid_until | 契約終了日。null は無期限 |
| status | ACTIVE / INACTIVE |
| version | 楽観ロック用 |

### 4.2 WorkRecord

WorkRecord は実際に働いた稼働実績を表す。

契約・売上計算に関係する主な属性:

| 属性 | 説明 |
| --- | --- |
| project_id | 案件ID |
| work_schedule_id | 関連する作業予定ID。任意 |
| actual_start_at | 実作業開始日時 |
| actual_end_at | 実作業終了日時 |
| actual_minutes | 実稼働分。バックエンド計算 |
| break_minutes | 休憩合計分。バックエンド計算 |
| billable_minutes | 請求対象分。バックエンド計算 |
| is_billable | 請求対象か |
| status | DRAFT / CONFIRMED / CANCELLED |
| version | 楽観ロック用 |

Phase1 では DRAFT 中心の運用とし、DRAFT / CONFIRMED の厳密な締め運用は Phase2 以降で強化する。

ただし、確定済み精算に含まれる WorkRecord は更新・削除できない。

### 4.3 MonthlyProjectSettlement

MonthlyProjectSettlement は案件単位・月単位の精算結果を表す。

主な属性:

| 属性 | 説明 |
| --- | --- |
| id | 精算ID |
| organization_id | テナント境界 |
| project_id | 案件ID |
| contract_id | 適用契約ID |
| settlement_month | 精算月。DBでは月初日、APIでは YYYY-MM |
| calculation_basis | ACTUAL / SCHEDULED |
| scheduled_minutes | 予定分 |
| actual_minutes | 実績分 |
| billable_minutes | 請求対象分 |
| base_amount | 基本金額 |
| deduction_amount | 控除額 |
| overtime_amount | 超過額 |
| tax_amount | 消費税額 |
| withholding_amount | 源泉徴収額 |
| total_amount | 合計額 |
| calculation_snapshot | 計算時点の契約・税率・丸め条件 |
| status | CALCULATED / FINALIZED |
| finalized_at | 確定日時 |
| finalized_by_id | 確定者 |
| version | 楽観ロック用 |

## 5. 契約検証

### 5.1 共通検証

契約登録・更新時は以下を検証する。

| 検証 | 方針 |
| --- | --- |
| project_id | 同一 organization に属する有効な案件であること |
| contract_type | Phase1 対応種別であること |
| currency | Phase1 は JPY のみ |
| tax_rate | 0 以上 100 以下 |
| withholding_tax_rate | 0 以上 100 以下 |
| valid_from / valid_until | valid_until がある場合は valid_from <= valid_until |
| closing_day | 1 から 31。31 は月末扱い |
| payment_terms_days | 0 以上 |
| status | ACTIVE / INACTIVE |
| version | 更新・削除時に必須 |

### 5.2 契約種別ごとの必須項目

| 契約種別 | 必須項目 | 不要項目の扱い |
| --- | --- | --- |
| HOURLY | hourly_rate, rounding_unit_minutes, rounding_method | monthly_rate, performance_amount, minimum_minutes, maximum_minutes, base_minutes, deduction_rate, overtime_rate は null |
| MONTHLY_RANGE | monthly_rate, minimum_minutes, maximum_minutes, base_minutes, deduction_rate, overtime_rate, rounding_unit_minutes, rounding_method | hourly_rate, performance_amount は null |
| MONTHLY_FIXED | monthly_rate | hourly_rate, performance_amount, minimum_minutes, maximum_minutes, base_minutes, deduction_rate, overtime_rate, rounding_unit_minutes, rounding_method は null |
| PERFORMANCE | performance_amount | hourly_rate, monthly_rate, minimum_minutes, maximum_minutes, base_minutes, deduction_rate, overtime_rate, rounding_unit_minutes, rounding_method は null |

不要項目が送られた場合の扱いは、Phase1 では 422 INVALID_CONTRACT_CONDITION とする。

理由:

- API 利用者の意図しない入力を黙って破棄しないため。
- 計算条件の曖昧さをなくすため。
- calculation_snapshot の意味を明確に保つため。

### 5.3 金額・分数の検証

| 項目 | 検証 |
| --- | --- |
| hourly_rate | 0 以上 |
| monthly_rate | 0 以上 |
| performance_amount | 0 以上 |
| minimum_minutes | 0 以上 |
| maximum_minutes | minimum_minutes 以上 |
| base_minutes | minimum_minutes 以上 maximum_minutes 以下を推奨。Phase1 ではこの範囲外は 422 |
| deduction_rate | 0 以上 |
| overtime_rate | 0 以上 |
| rounding_unit_minutes | 1, 5, 10, 15, 30, 60 のいずれか |
| rounding_method | ROUND_DOWN / ROUND_UP / ROUND_HALF_UP |

## 6. 契約期間重複制約

### 6.1 基本方針

同一案件内の契約期間重複は禁止する。

別案件同士の契約期間重複は許可する。

理由:

- 同一案件内で契約が重複すると、精算時に適用契約を一意に決定できないため。
- 別案件は別の業務契約であり、同期間に複数存在してよいため。

### 6.2 採用方式

契約期間重複は、Application 層の事前検証と PostgreSQL exclusion constraint の両方で制御する。

DB では DateRangeField 専用カラムを持たず、valid_from / valid_until を正とし、daterange expression を使う。

採用理由:

- 業務上の正規値は valid_from / valid_until として読みやすく保持できる。
- 重複禁止は DB 制約で最終防衛できる。
- 同時リクエストによる競合を Application 層だけに依存しない。
- Django ORM では通常カラムとして扱いやすい。

### 6.3 期間境界

valid_until は業務上「その日を含む」終了日とする。

DB の daterange では半開区間として扱うため、valid_until がある場合は valid_until + 1 day を上限にする。

valid_until が null の場合は infinity とする。

例:

| 契約A | 契約B | 判定 |
| --- | --- | --- |
| 2026-07-01 〜 2026-07-31 | 2026-08-01 〜 null | 重複なし |
| 2026-07-01 〜 2026-07-31 | 2026-07-31 〜 null | 重複あり |
| 2026-07-01 〜 null | 2026-08-01 〜 2026-08-31 | 重複あり |

### 6.4 論理削除との関係

deleted_at is null の契約のみ重複制約対象とする。

論理削除済み契約は重複判定から除外する。

## 7. 稼働実績の分数計算

### 7.1 actual_minutes

actual_minutes はバックエンドで計算する。

計算式:

actual_minutes = actual_end_at - actual_start_at - break_minutes

break_minutes は breaks 配列の start_at / end_at からバックエンドで合計する。

フロントエンドから actual_minutes は受け取らない。

### 7.2 break_minutes

breaks は以下を検証する。

| 検証 | 方針 |
| --- | --- |
| start_at / end_at | start_at < end_at |
| 実績範囲内 | actual_start_at <= break.start_at < break.end_at <= actual_end_at |
| 休憩重複 | 同一 WorkRecord 内の休憩時間帯は重複不可 |
| 合計 | break_minutes < 総実績分 |

### 7.3 billable_minutes

billable_minutes は is_billable と契約条件に基づきバックエンドで計算する。

| 条件 | billable_minutes |
| --- | --- |
| is_billable = false | 0 |
| is_billable = true かつ HOURLY | actual_minutes に契約の丸めルールを適用 |
| is_billable = true かつ MONTHLY_RANGE | actual_minutes に契約の丸めルールを適用 |
| is_billable = true かつ MONTHLY_FIXED | actual_minutes。金額計算には直接使わないが稼働表示用に保持 |
| is_billable = true かつ PERFORMANCE | actual_minutes。金額計算には直接使わないが稼働表示用に保持 |

Phase1 では、WorkRecord 登録・更新時点で対象日時に有効な契約を解決し、丸めが必要な契約では billable_minutes を計算する。

契約が未登録の場合、is_billable = true の実績登録は 422 SETTLEMENT_TARGET_NOT_FOUND または INVALID_CONTRACT_CONDITION とする。

## 8. 時間丸め

### 8.1 丸め対象

丸め対象は、休憩控除後の actual_minutes とする。

丸めは WorkRecord 単位で行う。

月次合計後にまとめて丸める方式は採用しない。

理由:

- 実績1件ごとの請求対象分が説明しやすい。
- 実績更新時の再計算範囲が限定される。
- calculation_snapshot に残す粒度が明確になる。

### 8.2 丸め方式

| rounding_method | 説明 |
| --- | --- |
| ROUND_DOWN | 丸め単位未満を切り捨て |
| ROUND_UP | 丸め単位未満を切り上げ |
| ROUND_HALF_UP | 丸め単位の半分以上を切り上げ |

例: rounding_unit_minutes = 15 の場合

| actual_minutes | ROUND_DOWN | ROUND_UP | ROUND_HALF_UP |
| --- | --- | --- | --- |
| 61 | 60 | 75 | 60 |
| 68 | 60 | 75 | 75 |
| 75 | 75 | 75 | 75 |

## 9. 月次精算対象の決定

### 9.1 精算月

API では settlementMonth を YYYY-MM で受け取る。

DB では対象月の月初日として settlement_month に保持する。

例:

- API: 2026-07
- DB: 2026-07-01

### 9.2 対象契約

Phase1 では、対象月に対して有効な契約が一意に決まることを前提とする。

対象月の契約は以下で判定する。

- contract.status = ACTIVE
- contract.deleted_at is null
- contract.valid_from <= 対象月末日
- contract.valid_until is null または 対象月初日 <= contract.valid_until

同一月内で契約が切り替わる場合の日割り・按分は Phase1 未対応とする。

対象月内に複数契約が該当する場合は 422 MULTIPLE_CONTRACTS_IN_MONTH を返す。

対象契約が存在しない場合は 422 SETTLEMENT_TARGET_NOT_FOUND を返す。

### 9.3 対象実績

calculation_basis = ACTUAL の場合、対象月に含まれる WorkRecord を集計する。

対象条件:

- organization_id が一致
- project_id が一致
- deleted_at is null
- status in DRAFT / CONFIRMED
- is_billable = true
- actual_start_at が対象月内

Phase1 では DRAFT 中心運用のため、DRAFT も精算計算対象に含める。

ただし、FINALIZED 済み精算に含まれる WorkRecord は更新・削除不可とする。

### 9.4 対象予定

calculation_basis = SCHEDULED の場合、対象月に含まれる WorkSchedule を集計する。

対象条件:

- organization_id が一致
- project_id が一致
- deleted_at is null
- status = PLANNED
- scheduled_start_at が対象月内

SCHEDULED は売上見込み計算や概算確認に利用する。

精算確定は原則 ACTUAL を推奨する。

## 10. 契約種別ごとの金額計算

### 10.1 共通出力

すべての契約種別で以下を出力する。

| 項目 | 説明 |
| --- | --- |
| scheduled_minutes | 対象月の予定分 |
| actual_minutes | 対象月の実績分 |
| billable_minutes | 請求対象分 |
| base_amount | 基本金額 |
| deduction_amount | 控除額 |
| overtime_amount | 超過額 |
| tax_amount | 消費税額 |
| withholding_amount | 源泉徴収額 |
| total_amount | 合計額 |

### 10.2 HOURLY

時間単価契約では、請求対象分に時間単価を乗算する。

計算式:

billable_hours = billable_minutes / 60

base_amount = floor_to_yen(billable_hours * hourly_rate)

deduction_amount = 0

overtime_amount = 0

時間単価の途中計算は Decimal で行い、JPY の base_amount は 1 円未満を ROUND_DOWN する。

### 10.3 MONTHLY_RANGE

月額精算幅契約では、base_minutes を基準に控除・超過を計算する。

計算式:

deduction_minutes = max(base_minutes - billable_minutes, 0)

overtime_minutes = max(billable_minutes - base_minutes, 0)

deduction_amount = floor_to_yen(deduction_minutes / 60 * deduction_rate)

overtime_amount = floor_to_yen(overtime_minutes / 60 * overtime_rate)

base_amount = monthly_rate - deduction_amount + overtime_amount

minimum_minutes / maximum_minutes は契約条件表示・警告・妥当性検証に使う。

Phase1 の金額計算では、控除・超過とも base_minutes 差分を基準にする。

### 10.4 MONTHLY_FIXED

月額固定契約では、対象月に契約が有効であれば monthly_rate を基本金額とする。

計算式:

base_amount = monthly_rate

deduction_amount = 0

overtime_amount = 0

actual_minutes / billable_minutes は稼働表示や実績管理のために集計するが、金額には直接反映しない。

月途中開始・終了の日割りは Phase1 未対応とする。

### 10.5 PERFORMANCE

成果報酬契約では、performance_amount を基本金額とする。

計算式:

base_amount = performance_amount

deduction_amount = 0

overtime_amount = 0

Phase1 では成果物承認フローを持たない。

成果金額は契約登録時に明示する。

精算時に成果金額を上書き入力する方式は Phase1 では採用せず、必要になった場合は Phase2 以降で settlement line item または performance milestone を検討する。

## 11. 税額・源泉徴収・合計額

### 11.1 消費税

消費税は税率単位で 1 回だけ計算し、1 円未満を ROUND_DOWN する。

Phase1 では組織別丸め設定を持たず、消費税の初期丸め方式は ROUND_DOWN 固定とする。

計算式:

tax_amount = floor_to_yen(base_amount * tax_rate / 100)

### 11.2 源泉徴収

源泉徴収は 1 円未満を ROUND_DOWN する。

Phase1 では源泉徴収の丸め方式は ROUND_DOWN 固定とする。

計算式:

withholding_amount = floor_to_yen(base_amount * withholding_tax_rate / 100)

源泉徴収の対象金額は Phase1 では base_amount とする。

消費税を含めた金額を源泉徴収対象にするケースは Phase2 以降で組織・契約設定として検討する。

### 11.3 合計額

合計額は丸め済みの税額・源泉徴収額を使って算出する。

計算式:

total_amount = base_amount + tax_amount - withholding_amount

total_amount に対して追加の丸め処理は行わない。

### 11.4 負数の扱い

Phase1 では total_amount が 0 未満になる精算は 422 INVALID_SETTLEMENT_AMOUNT とする。

理由:

- 請求書・返金・相殺が Phase1 対象外であるため。
- 負の精算を扱うには会計・請求・入金との整合が必要になるため。

## 12. 精算計算フロー

### 12.1 新規計算

POST /api/v1/settlements/calculate

処理:

1. 認証、認可、CSRF を検証する。
2. projectId と organization 境界を検証する。
3. settlementMonth を月初日へ変換する。
4. 対象契約を取得する。
5. 対象月内に有効契約が一意であることを検証する。
6. calculationBasis に応じて WorkRecord または WorkSchedule を取得する。
7. scheduled_minutes / actual_minutes / billable_minutes を集計する。
8. 契約種別ごとの base_amount / deduction_amount / overtime_amount を計算する。
9. tax_amount / withholding_amount / total_amount を計算する。
10. calculation_snapshot を作成する。
11. 既存の未削除精算がないことを検証する。
12. MonthlyProjectSettlement を CALCULATED として作成する。
13. audit_logs を作成する。
14. 精算結果を返す。

### 12.2 再計算

POST /api/v1/settlements/{settlementId}/recalculate

処理:

1. 認証、認可、CSRF、version を検証する。
2. 精算を取得する。
3. status = CALCULATED であることを検証する。
4. 元の project_id / settlement_month / calculation_basis を使って再計算する。
5. calculation_snapshot を更新する。
6. version を更新する。
7. audit_logs を作成する。
8. 精算結果を返す。

FINALIZED の精算は再計算できない。

### 12.3 確定

POST /api/v1/settlements/{settlementId}/finalize

精算確定は副作用が大きいため Idempotency-Key を必須とする。

処理:

1. 認証、認可、CSRF、Idempotency-Key、version を検証する。
2. idempotency_keys を確認する。
3. 精算を取得する。
4. status = CALCULATED であることを検証する。
5. status を FINALIZED に変更する。
6. finalized_at / finalized_by_id を設定する。
7. version を更新する。
8. idempotency result を保存する。
9. audit_logs を作成する。
10. 確定結果を返す。

同一 organization、同一 user、同一 endpoint、同一 Idempotency-Key、同一 request hash の再実行では前回結果を返す。

request hash が異なる場合は 409 IDEMPOTENCY_CONFLICT とする。

### 12.4 未確定精算の削除

DELETE /api/v1/settlements/{settlementId}?version=1

処理:

1. 認証、認可、CSRF、version を検証する。
2. 精算を取得する。
3. status = CALCULATED であることを検証する。
4. 論理削除する。
5. audit_logs を作成する。
6. 204 No Content を返す。

FINALIZED の精算は削除できない。

## 13. calculation_snapshot

### 13.1 目的

calculation_snapshot は、精算計算時点の契約条件と計算根拠を保存する。

契約が後から更新されても、過去に計算・確定した精算の根拠を説明できるようにする。

### 13.2 保存内容

calculation_snapshot には以下を保存する。

| 項目 | 内容 |
| --- | --- |
| contract | 契約種別、単価、税率、源泉徴収率、丸め条件、有効期間 |
| calculationBasis | ACTUAL / SCHEDULED |
| period | 精算月の開始日・終了日 |
| minutes | scheduled_minutes, actual_minutes, billable_minutes |
| amountBreakdown | base_amount, deduction_amount, overtime_amount, tax_amount, withholding_amount, total_amount |
| rounding | 時間丸め、金額丸めの方式 |
| sourceCounts | 対象 WorkRecord 件数、WorkSchedule 件数 |
| calculatedAt | 計算日時 |
| calculatedBy | 計算者ID |

JWT、Cookie、個人情報を含む入力値の生値は保存しない。

## 14. 状態遷移

### 14.1 契約

| 状態 | 説明 |
| --- | --- |
| ACTIVE | 精算対象として利用可能 |
| INACTIVE | 新規精算対象にしない |

削除は論理削除とする。

確定済み精算で参照されている契約は物理削除しない。

### 14.2 精算

| 現在状態 | 操作 | 次状態 |
| --- | --- | --- |
| なし | 計算 | CALCULATED |
| CALCULATED | 再計算 | CALCULATED |
| CALCULATED | 確定 | FINALIZED |
| CALCULATED | 削除 | deleted |
| FINALIZED | 再計算 | 不可 |
| FINALIZED | 削除 | 不可 |

## 15. 権限設計

### 15.1 基本権限

| ロール | 契約 | 精算 |
| --- | --- | --- |
| OWNER | 操作可 | 操作可 |
| ADMIN | 操作可 | 操作可 |
| MEMBER | 担当案件範囲で閲覧可。編集は can_edit_contract / can_edit_settlement による |

Phase1 では OWNER / ADMIN を主要操作対象とし、MEMBER の細分化権限は最小限に留める。

細かな案件単位の編集権限は Phase3 以降で拡張する。

### 15.2 テナント境界

契約・精算操作では以下の organization_id を検証する。

- login user's organization_id
- project.organization_id
- contract.organization_id
- work_record.organization_id
- work_schedule.organization_id
- settlement.organization_id

organization_id が一致しない操作は 403 FORBIDDEN または 404 NOT_FOUND とする。

## 16. API 設計との整合

### 16.1 契約 API

Phase1 の契約 API は以下を基本とする。

- GET /api/v1/projects/{projectId}/contracts
- POST /api/v1/projects/{projectId}/contracts
- GET /api/v1/projects/{projectId}/contracts/{contractId}
- PATCH /api/v1/projects/{projectId}/contracts/{contractId}
- DELETE /api/v1/projects/{projectId}/contracts/{contractId}?version=1

DELETE は requestBody を使用せず、version は query parameter とする。

### 16.2 精算 API

Phase1 の精算 API は以下を基本とする。

- POST /api/v1/settlements/calculate
- GET /api/v1/settlements/{settlementId}
- POST /api/v1/settlements/{settlementId}/recalculate
- POST /api/v1/settlements/{settlementId}/finalize
- DELETE /api/v1/settlements/{settlementId}?version=1

精算一覧 API は Phase1 主要対象外とする。

理由:

- Phase1 の精算は案件と対象月の文脈で操作するため。
- 一覧よりも詳細取得、計算、再計算、確定、未確定削除を優先するため。

## 17. DB 設計との整合

### 17.1 project_contracts

project_contracts は案件ごとの契約条件を保持する。

重要制約:

- organization_id, project_id は必須。
- contract_type ごとの必須項目を Application 層で検証する。
- 同一案件内の契約期間重複は Application 層と DB exclusion constraint で防止する。
- valid_from / valid_until を正とし、DateRangeField 専用カラムは持たない。
- deleted_at is null の行のみ契約期間重複制約の対象とする。

### 17.2 work_records

work_records は稼働実績を保持する。

actual_minutes、break_minutes、billable_minutes はバックエンド計算結果を保存する。

確定済み精算に含まれる WorkRecord は更新・削除不可とする。

### 17.3 monthly_project_settlements

monthly_project_settlements は月次精算結果を保持する。

重要制約:

- UNIQUE(organization_id, project_id, settlement_month) where deleted_at is null。
- status は CALCULATED / FINALIZED。
- FINALIZED は再計算・削除不可。
- calculation_snapshot は jsonb で保持する。

## 18. エラー処理

### 18.1 契約 API エラー

| 事象 | HTTP | error code |
| --- | --- | --- |
| 認証なし | 401 | UNAUTHORIZED |
| 権限不足 | 403 | FORBIDDEN |
| 案件なし | 404 | PROJECT_NOT_FOUND |
| 契約なし | 404 | CONTRACT_NOT_FOUND |
| 契約期間重複 | 409 | CONTRACT_PERIOD_OVERLAP |
| version 不一致 | 409 | CONCURRENT_MODIFICATION |
| 契約条件不正 | 422 | INVALID_CONTRACT_CONDITION |

### 18.2 精算 API エラー

| 事象 | HTTP | error code |
| --- | --- | --- |
| 精算なし | 404 | SETTLEMENT_NOT_FOUND |
| 対象契約なし | 422 | SETTLEMENT_TARGET_NOT_FOUND |
| 対象月に複数契約 | 422 | MULTIPLE_CONTRACTS_IN_MONTH |
| 計算金額不正 | 422 | INVALID_SETTLEMENT_AMOUNT |
| 確定済み精算の変更 | 409 | SETTLEMENT_ALREADY_FINALIZED |
| Idempotency-Key 不足 | 400 | IDEMPOTENCY_KEY_REQUIRED |
| Idempotency-Key 衝突 | 409 | IDEMPOTENCY_CONFLICT |
| version 不一致 | 409 | CONCURRENT_MODIFICATION |

### 18.3 エラーレスポンス

エラーレスポンスは共通形式に従う。

- code
- message
- details
- traceId

## 19. クリーンアーキテクチャ / DDD 責務分離

### 19.1 Domain 層

Domain 層は契約・計算の業務ルールを扱う。

責務:

- 契約種別ごとの必須項目検証
- 契約期間の意味づけ
- 時間丸め
- 月額精算幅計算
- 月額固定計算
- 成果報酬計算
- 税額計算
- 源泉徴収計算
- 合計額計算
- 精算状態遷移ルール

Domain 層は以下に依存しない。

- Django
- DRF
- Django ORM
- PostgreSQL
- Redis
- Celery
- HTTP request
- Cookie
- Next.js

### 19.2 Application 層

Application 層はユースケースを制御する。

責務:

- 認可結果に基づく操作可否制御
- organization 境界検証
- Project / Contract / WorkRecord / WorkSchedule / Settlement の取得
- 契約期間重複の事前検証
- 精算計算ユースケース実行
- DB transaction 制御
- 楽観ロック制御
- idempotency 制御
- audit_logs 作成依頼
- DTO 組み立て

### 19.3 Infrastructure 層

Infrastructure 層は外部技術の詳細を扱う。

責務:

- Django ORM repository
- PostgreSQL transaction
- PostgreSQL exclusion constraint
- idempotency_keys 永続化
- audit_logs 永続化
- calculation_snapshot 永続化

### 19.4 Presentation 層

Presentation 層は HTTP の入出力を扱う。

責務:

- DRF serializer validation
- Request / Response 変換
- Cookie 認証
- CSRF 検証
- HTTP status code 変換
- OpenAPI との整合

## 20. 監査ログ

### 20.1 記録対象

以下を監査ログへ記録する。

- 契約登録
- 契約更新
- 契約削除
- 精算計算
- 精算再計算
- 精算確定
- 未確定精算削除
- 契約期間重複エラー
- 精算確定時の冪等性衝突

### 20.2 記録項目

- actor_user_id
- organization_id
- resource_type
- resource_id
- action
- before / after の概要
- project_id
- contract_id
- settlement_id
- settlement_month
- base_amount
- total_amount
- status
- trace_id
- occurred_at

JWT、Cookie、認証情報、個人情報を含む検索文字列の生値は監査ログへ保存しない。

## 21. キャッシュ・非同期処理との関係

### 21.1 キャッシュ

契約・精算 API は認証済み業務 API のため private, no-store を基本とする。

Phase1 では契約・精算計算結果の Redis キャッシュは採用しない。

### 21.2 非同期処理

契約登録、契約更新、精算計算、精算再計算、精算確定は Phase1 では同期処理とする。

Celery の主対象は、アイコン画像処理、旧画像削除、孤立ファイル削除、Outbox dispatch、cleanup である。

将来、大量明細や外部会計連携が必要になった場合は、精算計算の非同期化を検討する。

## 22. テスト方針

### 22.1 Unit Test

- 契約種別ごとの必須項目検証
- 不要項目送信時の 422
- valid_from / valid_until 検証
- 契約期間境界の重複判定
- 時間丸め
- actual_minutes 計算
- billable_minutes 計算
- HOURLY 金額計算
- MONTHLY_RANGE 金額計算
- MONTHLY_FIXED 金額計算
- PERFORMANCE 金額計算
- 消費税計算
- 源泉徴収計算
- total_amount 計算
- 負の精算金額拒否

### 22.2 Application Test

- 契約登録
- 契約更新
- 契約削除
- 同一案件内の契約期間重複 409
- 別案件の契約期間重複許可
- 精算計算
- 精算再計算
- 精算確定
- Idempotency-Key 再実行
- Idempotency-Key 衝突
- 未確定精算削除
- FINALIZED 精算の再計算不可
- FINALIZED 精算の削除不可
- 確定済み精算に含まれる WorkRecord 更新不可

### 22.3 API Test

- POST /api/v1/projects/{projectId}/contracts
- GET /api/v1/projects/{projectId}/contracts
- GET /api/v1/projects/{projectId}/contracts/{contractId}
- PATCH /api/v1/projects/{projectId}/contracts/{contractId}
- DELETE /api/v1/projects/{projectId}/contracts/{contractId}?version=1
- POST /api/v1/settlements/calculate
- GET /api/v1/settlements/{settlementId}
- POST /api/v1/settlements/{settlementId}/recalculate
- POST /api/v1/settlements/{settlementId}/finalize
- DELETE /api/v1/settlements/{settlementId}?version=1

## 23. Phase1 未対応事項

以下は Phase1 では対応しない。

- 請求書作成
- 請求書発行
- PDF 生成
- 入金管理
- 請求残高管理
- 売上分析
- 収支分析
- ACCOUNTANT ロール
- 日額契約
- 外貨対応
- 組織別の消費税丸め方式設定
- 源泉徴収対象を税込金額にする契約別設定
- 月途中契約変更時の日割り・按分
- 複数契約を同一精算月で自動分割する計算
- 成果報酬契約の成果物承認フロー
- 成果報酬契約のマイルストーン管理
- 負の精算、返金、相殺処理
- 会計ソフト連携
- 精算計算の非同期化

## 24. 未確定事項

| 論点 | 内容 |
| --- | --- |
| 月途中契約変更時の日割り | Phase1 では未対応。対象月に複数契約が該当する場合は 422 とし、Phase2 以降で按分ルールを検討する |
| 源泉徴収対象金額 | Phase1 では base_amount を対象とする。税込金額を対象にする契約別設定は Phase2 以降 |
| 成果報酬の承認フロー | Phase1 では performance_amount を契約に持つ。成果物承認、マイルストーン、検収日は Phase2 以降 |
| 精算確定後の会計連携 | Phase1 では監査ログと精算状態のみ。外部会計連携は Phase2 以降 |

## 25. 変更履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-07-16 | 1.0 | Phase1用契約・売上計算詳細設計書を新規作成。契約種別、契約期間重複、稼働分数計算、時間丸め、月次精算、税額・源泉徴収、calculation_snapshot、状態遷移、API、DB、権限、エラー、監査、テスト方針、未対応事項、未確定事項を整理 |

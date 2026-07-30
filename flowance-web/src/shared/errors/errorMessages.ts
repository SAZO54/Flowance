import {ERROR_CODE, VALIDATION_CODE} from './errorCodes'

export const ERROR_MESSAGE: Record<string, string> = {
  [ERROR_CODE.BAD_REQUEST]: 'リクエストを処理できません。',
  [ERROR_CODE.MALFORMED_JSON]: '送信内容の形式が正しくありません。',
  [ERROR_CODE.VALIDATION_ERROR]: '入力内容を確認してください。',
  [ERROR_CODE.UNAUTHORIZED]: '認証が必要です。',
  [ERROR_CODE.TOKEN_EXPIRED]: '認証の有効期限が切れています。',
  [ERROR_CODE.TOKEN_INVALID]: '認証情報が正しくありません。',
  [ERROR_CODE.FORBIDDEN]: 'この操作を実行する権限がありません。',
  [ERROR_CODE.CSRF_FAILED]: '画面を再読み込みしてから再度お試しください。',
  [ERROR_CODE.NOT_FOUND]: '対象のデータが見つかりません。',
  [ERROR_CODE.CONFLICT]: '現在の状態と競合したため処理できません。',
  [ERROR_CODE.CONCURRENT_MODIFICATION]:
    '他の操作により更新されています。最新の内容を取得してください。',
  [ERROR_CODE.IDEMPOTENCY_KEY_REQUIRED]: '再実行に必要な識別子がありません。',
  [ERROR_CODE.IDEMPOTENCY_CONFLICT]:
    '同じ操作として異なる内容が送信されています。',
  [ERROR_CODE.PAYLOAD_TOO_LARGE]: 'ファイルサイズが上限を超えています。',
  [ERROR_CODE.UNSUPPORTED_MEDIA_TYPE]: '対応していないファイル形式です。',
  [ERROR_CODE.BUSINESS_RULE_VIOLATION]:
    '入力内容が業務ルールを満たしていません。',
  [ERROR_CODE.RATE_LIMITED]:
    '操作回数が上限を超えました。時間をおいて再度お試しください。',
  [ERROR_CODE.INTERNAL_SERVER_ERROR]:
    '予期しないエラーが発生しました。時間をおいて再度お試しください。',
  [ERROR_CODE.SERVICE_UNAVAILABLE]:
    '一時的にサービスを利用できません。時間をおいて再度お試しください。',
  [ERROR_CODE.CONTRACT_PERIOD_OVERLAP]: '同じ案件の契約期間が重複しています。',
  [ERROR_CODE.INVALID_CONTRACT_CONDITION]: '契約条件を確認してください。',
  [ERROR_CODE.INVALID_WORK_RECORD_TIME_RANGE]:
    '実績終了日時は実績開始日時より後にしてください。',
  [ERROR_CODE.INVALID_BREAK_PERIOD]:
    '休憩終了日時は休憩開始日時より後にしてください。',
  [ERROR_CODE.BREAK_OUTSIDE_WORK_RECORD]: '休憩時間は実績時間内に指定してください。',
  [ERROR_CODE.BREAK_PERIOD_OVERLAP]: '休憩時間同士を重複させることはできません。',
  [ERROR_CODE.NETWORK_ERROR]:
    'APIに接続できませんでした。通信環境を確認してください。',
}

export const VALIDATION_MESSAGE: Record<string, string> = {
  [VALIDATION_CODE.REQUIRED]: '必須項目です。',
  [VALIDATION_CODE.INVALID]: '入力内容が正しくありません。',
  [VALIDATION_CODE.INVALID_FORMAT]: '形式が正しくありません。',
  [VALIDATION_CODE.PHONE_INVALID_FORMAT]:
    '電話番号は先頭の+を除き、数字のみ10〜15桁で入力してください。',
  [VALIDATION_CODE.SETTINGS_PHONE_INVALID_FORMAT]:
    '電話番号は数字のみ15桁以内で入力してください。',
  [VALIDATION_CODE.POSTAL_CODE_INVALID_FORMAT]:
    '郵便番号はハイフンなしの数字7桁で入力してください。',
  [VALIDATION_CODE.MAX_LENGTH]: '入力できる文字数の上限を超えています。',
  [VALIDATION_CODE.MIN_LENGTH]: '必要な文字数を満たしていません。',
  [VALIDATION_CODE.MIN_VALUE]: '指定できる最小値を下回っています。',
  [VALIDATION_CODE.MAX_VALUE]: '指定できる最大値を超えています。',
  [VALIDATION_CODE.INVALID_CHOICE]: '選択肢から指定してください。',
  [VALIDATION_CODE.INVALID_DATE_RANGE]: '日付の前後関係を確認してください。',
  [VALIDATION_CODE.INVALID_TIME_RANGE]: '開始日時と終了日時を確認してください。',
  [VALIDATION_CODE.INVALID_CONTRACT_RANGE]:
    '最低時間・最大時間・基準時間の範囲を確認してください。',
  [VALIDATION_CODE.BREAK_OUTSIDE_WORK_RECORD]:
    '休憩時間は実績時間内に指定してください。',
  [VALIDATION_CODE.BREAK_PERIOD_OVERLAP]:
    '休憩時間同士を重複させることはできません。',
  [VALIDATION_CODE.BREAK_TOTAL_TOO_LARGE]:
    '休憩合計は総実績時間未満にしてください。',
  [VALIDATION_CODE.FILE_TOO_LARGE]: '画像は5MB以下にしてください。',
  [VALIDATION_CODE.UNSUPPORTED_FILE_TYPE]:
    'JPG、PNG、WebPのいずれかを選択してください。',
  [VALIDATION_CODE.IMAGE_DIMENSION_TOO_LARGE]:
    '画像は4096×4096px、総画素数16,777,216以内にしてください。',
  [VALIDATION_CODE.VERSION_MISMATCH]: '最新の内容を取得し直してください。',
}

export function errorMessage(code: string, fallback?: string): string {
  return ERROR_MESSAGE[code] ?? fallback ?? ERROR_MESSAGE[ERROR_CODE.BAD_REQUEST]
}

export function validationMessage(code: string, fallback?: string): string {
  return (
    VALIDATION_MESSAGE[code] ??
    fallback ??
    VALIDATION_MESSAGE[VALIDATION_CODE.INVALID]
  )
}
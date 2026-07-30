from __future__ import annotations

from apps.common.error_codes import ErrorCode, ValidationCode

ERROR_MESSAGES: dict[str, str] = {
    ErrorCode.BAD_REQUEST: "リクエストを処理できません。",
    ErrorCode.MALFORMED_JSON: "JSONの形式が正しくありません。",
    ErrorCode.VALIDATION_ERROR: "入力内容を確認してください。",
    ErrorCode.UNAUTHORIZED: "認証が必要です。",
    ErrorCode.TOKEN_EXPIRED: "認証の有効期限が切れています。",
    ErrorCode.TOKEN_INVALID: "認証情報が正しくありません。",
    ErrorCode.FORBIDDEN: "この操作を実行する権限がありません。",
    ErrorCode.CSRF_FAILED: (
        "リクエストの検証に失敗しました。画面を再読み込みしてから再度お試しください。"
    ),
    ErrorCode.NOT_FOUND: "対象のリソースが見つかりません。",
    ErrorCode.CONFLICT: "現在の状態と競合したため処理できません。",
    ErrorCode.CONCURRENT_MODIFICATION: (
        "他の操作によりデータが更新されています。最新の内容を取得し直してください。"
    ),
    ErrorCode.IDEMPOTENCY_KEY_REQUIRED: "Idempotency-Keyを指定してください。",
    ErrorCode.IDEMPOTENCY_CONFLICT: (
        "同じIdempotency-Keyで異なる内容のリクエストが送信されています。"
    ),
    ErrorCode.IDEMPOTENCY_KEY_CONFLICT: (
        "同じIdempotency-Keyで異なる内容のリクエストが送信されています。"
    ),
    ErrorCode.PAYLOAD_TOO_LARGE: "ファイルサイズが上限を超えています。",
    ErrorCode.UNSUPPORTED_MEDIA_TYPE: "対応していないファイル形式です。",
    ErrorCode.BUSINESS_RULE_VIOLATION: "業務ルールにより処理できません。",
    ErrorCode.RATE_LIMITED: (
        "リクエスト回数が上限を超えました。時間をおいて再度お試しください。"
    ),
    ErrorCode.INTERNAL_SERVER_ERROR: (
        "予期しないエラーが発生しました。時間をおいて再度お試しください。"
    ),
    ErrorCode.SERVICE_UNAVAILABLE: (
        "一時的にサービスを利用できません。時間をおいて再度お試しください。"
    ),
    ErrorCode.EMAIL_ALREADY_REGISTERED: "このメールアドレスは既に登録されています。",
    ErrorCode.USER_NOT_FOUND: "利用者が見つかりません。",
    ErrorCode.CLIENT_NOT_FOUND: "クライアントが見つかりません。",
    ErrorCode.CLIENT_NAME_ALREADY_EXISTS: "同名のクライアントが既に登録されています。",
    ErrorCode.PROJECT_NOT_FOUND: "案件が見つかりません。",
    ErrorCode.PROJECT_NAME_ALREADY_EXISTS: "同名の案件が既に登録されています。",
    ErrorCode.CONTRACT_NOT_FOUND: "契約が見つかりません。",
    ErrorCode.CONTRACT_PERIOD_OVERLAP: "同じ案件の契約期間が重複しています。",
    ErrorCode.CONTRACT_IN_USE: "未確定の精算で使用中の契約は削除できません。",
    ErrorCode.INVALID_CONTRACT_CONDITION: "契約条件を確認してください。",
    ErrorCode.WEEKLY_SCHEDULE_NOT_FOUND: "週次予定が見つかりません。",
    ErrorCode.WORK_SCHEDULE_NOT_FOUND: "予定が見つかりません。",
    ErrorCode.INVALID_SCHEDULE_TIME_RANGE: "予定の開始時刻と終了時刻を確認してください。",
    ErrorCode.INVALID_BREAK_MINUTES: "休憩時間を確認してください。",
    ErrorCode.INVALID_SCHEDULE_DATE_RANGE: "予定の有効期間を確認してください。",
    ErrorCode.SCHEDULE_GENERATION_RANGE_TOO_LARGE: "予定生成期間は100日以内で指定してください。",
    ErrorCode.SCHEDULE_GENERATION_LIMIT_EXCEEDED: "生成できる予定件数の上限を超えています。",
    ErrorCode.WORK_RECORD_NOT_FOUND: "稼働実績が見つかりません。",
    ErrorCode.WORK_RECORD_INCLUDED_IN_FINALIZED_SETTLEMENT: (
        "確定済み精算に含まれる稼働実績は変更できません。"
    ),
    ErrorCode.INVALID_WORK_RECORD_TIME_RANGE: (
        "実績終了日時は実績開始日時より後にしてください。"
    ),
    ErrorCode.INVALID_BREAK_PERIOD: "休憩終了日時は休憩開始日時より後にしてください。",
    ErrorCode.BREAK_OUTSIDE_WORK_RECORD: "休憩時間は実績時間内に指定してください。",
    ErrorCode.BREAK_PERIOD_OVERLAP: "休憩時間同士を重複させることはできません。",
    ErrorCode.INVALID_ROUNDING_RULE: "契約の時間丸め設定が正しくありません。",
    ErrorCode.SETTLEMENT_NOT_FOUND: "精算が見つかりません。",
    ErrorCode.SETTLEMENT_TARGET_NOT_FOUND: "精算対象が見つかりません。",
    ErrorCode.MULTIPLE_CONTRACTS_FOUND: "対象期間に複数の契約が見つかりました。",
    ErrorCode.SETTLEMENT_ALREADY_EXISTS: "対象月の精算は既に存在します。",
    ErrorCode.SETTLEMENT_NOT_CALCULATED: "未計算の精算は確定できません。",
    ErrorCode.SETTLEMENT_ALREADY_FINALIZED: "確定済みの精算は変更できません。",
    ErrorCode.INVALID_CONTRACT_CONFIGURATION: "精算に使用する契約条件が正しくありません。",
    ErrorCode.NEGATIVE_SETTLEMENT_TOTAL: "精算合計を0未満にはできません。",
    ErrorCode.IMAGE_DIMENSION_TOO_LARGE: "画像サイズが上限を超えています。",
    ErrorCode.IMAGE_PROCESSING_FAILED: "画像を処理できませんでした。",
    ErrorCode.BACKGROUND_TASK_FAILED: "バックグラウンド処理に失敗しました。",
    ErrorCode.AUDIT_LOG_IMMUTABLE: "監査ログは変更または削除できません。",
    ErrorCode.NETWORK_ERROR: (
        "APIに接続できませんでした。通信環境を確認して再度お試しください。"
    ),
}

VALIDATION_MESSAGES: dict[str, str] = {
    ValidationCode.REQUIRED: "必須項目です。",
    ValidationCode.INVALID: "入力内容が正しくありません。",
    ValidationCode.INVALID_FORMAT: "形式が正しくありません。",
    ValidationCode.PHONE_INVALID_FORMAT: (
        "電話番号は先頭の+を除き、数字のみ10〜15桁で入力してください。"
    ),
    ValidationCode.SETTINGS_PHONE_INVALID_FORMAT: (
        "電話番号は数字のみ15桁以内で入力してください。"
    ),
    ValidationCode.POSTAL_CODE_INVALID_FORMAT: (
        "郵便番号はハイフンなしの数字7桁で入力してください。"
    ),
    ValidationCode.MUTUALLY_EXCLUSIVE: "同時に指定できない項目が含まれています。",
    ValidationCode.SCHEDULE_BREAK_TOO_LONG: (
        "休憩時間は予定時間以下で指定してください。"
    ),
    ValidationCode.GENERATION_RANGE_TOO_LARGE: (
        "生成期間は100日以内で指定してください。"
    ),
    ValidationCode.MAX_LENGTH: "入力できる文字数の上限を超えています。",
    ValidationCode.MIN_LENGTH: "必要な文字数を満たしていません。",
    ValidationCode.MIN_VALUE: "指定できる最小値を下回っています。",
    ValidationCode.MAX_VALUE: "指定できる最大値を超えています。",
    ValidationCode.INVALID_CHOICE: "選択肢から指定してください。",
    ValidationCode.INVALID_DATE_RANGE: "日付の前後関係を確認してください。",
    ValidationCode.INVALID_TIME_RANGE: "開始日時と終了日時を確認してください。",
    ValidationCode.VERSION_MISMATCH: (
        "送信されたversionが現在のversionと一致しません。"
    ),
    ValidationCode.NULL_NOT_ALLOWED: "値を入力してください。",
    ValidationCode.DUPLICATE: "同じ値が既に登録されています。",
    ValidationCode.READ_ONLY: "この項目は送信できません。",
    ValidationCode.NOT_APPLICABLE: "この条件では指定できません。",
    ValidationCode.FILE_TOO_LARGE: "画像は5MB以下にしてください。",
    ValidationCode.UNSUPPORTED_FILE_TYPE: "JPG、PNG、WebPのいずれかを選択してください。",
}


def error_message(code: str) -> str:
    return ERROR_MESSAGES.get(code, ERROR_MESSAGES[ErrorCode.BAD_REQUEST])


def validation_message(code: str, fallback: str | None = None) -> str:
    return VALIDATION_MESSAGES.get(
        code, fallback or VALIDATION_MESSAGES[ValidationCode.INVALID]
    )

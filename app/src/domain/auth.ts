// 認証関連の型定義とドメインロジック

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface AuthToken {
  token: string;
  expiresAt?: Date;
}

export interface LoginEmailRequest {
  email: string;
}

export interface LoginDigitRequest {
  email: string;
  digit: string;
}

export interface LoginResponse {
  token: string;
  name: string;
  role?: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
}

// バリデーション結果
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// 認証結果
export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  errors?: string[];
}

// バリデーション関数（純粋関数）
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email) {
    errors.push('メールアドレスを入力してください');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('正しいメールアドレスを入力してください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateDigit(digit: string): ValidationResult {
  const errors: string[] = [];

  if (!digit) {
    errors.push('認証コードを入力してください');
  } else if (!/^\d{4}$/.test(digit)) {
    errors.push('認証コードは4桁の数字で入力してください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateLoginInput(
  email: string,
  digit: string
): ValidationResult {
  const emailValidation = validateEmail(email);
  const digitValidation = validateDigit(digit);

  return {
    isValid: emailValidation.isValid && digitValidation.isValid,
    errors: [...emailValidation.errors, ...digitValidation.errors],
  };
}

export function validateName(name: string): ValidationResult {
  const errors: string[] = [];

  if (!name) {
    errors.push('名前を入力してください');
  } else if (name.length < 1 || name.length > 50) {
    errors.push('名前は1文字以上50文字以下で入力してください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// エラータイプ
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ValidationError extends AuthError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class NetworkError extends AuthError {
  constructor(message: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR', statusCode);
  }
}

export class ExpiredDigitError extends AuthError {
  constructor() {
    super('認証コードの有効期限が切れています', 'EXPIRED_DIGIT');
  }
}

export class InvalidDigitError extends AuthError {
  constructor() {
    super('認証コードが間違っています', 'INVALID_DIGIT');
  }
}

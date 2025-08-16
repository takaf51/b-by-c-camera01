// 認証ユースケース - ビジネスロジック・フロー制御
import type {
  AuthRepository,
  TokenStorage,
} from '../repositories/AuthRepository';
import type {
  LoginEmailRequest,
  LoginDigitRequest,
  RegisterRequest,
  AuthResult,
  User,
  ValidationResult,
} from '../domain/auth';
import {
  validateEmail,
  validateDigit,
  validateLoginInput,
  validateName,
  AuthError,
  ValidationError,
  NetworkError,
  ExpiredDigitError,
  InvalidDigitError,
} from '../domain/auth';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export class AuthUseCase {
  constructor(
    private authRepository: AuthRepository,
    private tokenStorage: TokenStorage
  ) {}

  // メール送信（ログイン）
  async sendLoginMail(email: string): Promise<AuthResult> {
    // バリデーション
    const validation = validateEmail(email);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const response = await this.authRepository.sendLoginMail({ email });
      return {
        success: true,
        // メール送信成功時は特別なフラグやメッセージを返すことも可能
      };
    } catch (error) {
      return this.handleAuthError(error);
    }
  }

  // メール送信（登録）
  async sendRegisterMail(email: string, name: string): Promise<AuthResult> {
    // バリデーション
    const emailValidation = validateEmail(email);
    const nameValidation = validateName(name);

    const errors = [...emailValidation.errors, ...nameValidation.errors];
    if (errors.length > 0) {
      return { success: false, errors };
    }

    try {
      const response = await this.authRepository.sendRegisterMail({
        email,
        name,
      });
      return { success: true };
    } catch (error) {
      return this.handleAuthError(error);
    }
  }

  // 4桁コード認証
  async verifyDigit(email: string, digit: string): Promise<AuthResult> {
    // バリデーション
    const validation = validateLoginInput(email, digit);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const response = await this.authRepository.verifyDigit({ email, digit });

      // トークン保存
      await this.tokenStorage.save(response.token);

      // ユーザー情報の構築
      const user: User = {
        id: 0, // API側で返されない場合の仮値
        email,
        name: response.name,
        role: response.role || 'user',
      };

      return {
        success: true,
        user,
        token: response.token,
      };
    } catch (error) {
      return this.handleAuthError(error);
    }
  }

  // 自動ログイン（トークンからの復元）
  async restoreSession(): Promise<AuthResult> {
    try {
      const token = await this.tokenStorage.get();
      if (!token) {
        return { success: false, errors: ['トークンが見つかりません'] };
      }

      // トークンの有効性チェック
      const authCheck = await this.authRepository.checkAuth();
      if (!authCheck.auth) {
        // 無効なトークンは削除
        await this.tokenStorage.remove();
        return { success: false, errors: ['セッションが無効です'] };
      }

      // トークンが有効な場合、ユーザー情報は別途取得が必要
      // 今回は簡単な構造にしておく
      return {
        success: true,
        token,
        // user: ... // 実際のAPIではユーザー情報取得エンドポイントを叩く
      };
    } catch (error) {
      await this.tokenStorage.remove();
      return this.handleAuthError(error);
    }
  }

  // ログアウト
  async logout(): Promise<AuthResult> {
    try {
      // APIに通知（オプション）
      try {
        await this.authRepository.logout();
      } catch {
        // ログアウトAPIの失敗は無視（トークン削除を優先）
      }

      // ローカルトークン削除
      await this.tokenStorage.remove();

      return { success: true };
    } catch (error) {
      return this.handleAuthError(error);
    }
  }

  // 現在のトークンを取得
  async getCurrentToken(): Promise<string | null> {
    return this.tokenStorage.get();
  }

  // エラーハンドリング
  private handleAuthError(error: unknown): AuthResult {
    if (error instanceof ValidationError) {
      return { success: false, errors: [error.message] };
    }

    if (error instanceof AuthError) {
      // API仕様に応じてエラーメッセージを分類
      switch (error.code) {
        case 'VALIDATION_ERROR':
          return { success: false, errors: ['入力内容を確認してください'] };
        case 'UNAUTHORIZED':
          return { success: false, errors: ['認証に失敗しました'] };
        case 'EXPIRED_DIGIT':
          return {
            success: false,
            errors: [
              '認証コードの有効期限が切れています。再度認証コードを取得してください。',
            ],
          };
        case 'INVALID_DIGIT':
          return { success: false, errors: ['認証コードが間違っています'] };
        default:
          return { success: false, errors: [error.message] };
      }
    }

    if (error instanceof NetworkError) {
      return {
        success: false,
        errors: ['ネットワークエラーが発生しました。接続を確認してください。'],
      };
    }

    // 予期しないエラー
    console.error('Unexpected auth error:', error);
    return { success: false, errors: ['予期しないエラーが発生しました'] };
  }

  // バリデーションヘルパー（UIで利用）
  validateEmailInput(email: string): ValidationResult {
    return validateEmail(email);
  }

  validateDigitInput(digit: string): ValidationResult {
    return validateDigit(digit);
  }

  validateNameInput(name: string): ValidationResult {
    return validateName(name);
  }
}

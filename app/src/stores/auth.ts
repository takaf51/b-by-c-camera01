// 認証状態のSvelte Store
import { writable, derived, get } from 'svelte/store';
import type { User } from '../domain/auth';
import { AuthUseCase } from '../usecases/AuthUseCase';
import {
  HttpAuthRepository,
  LocalStorageTokenStorage,
} from '../repositories/AuthRepository';
import { createHttpClient } from '../lib/http';

// 認証状態の型
interface AuthStoreState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

// 初期状態
const initialState: AuthStoreState = {
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

// 内部状態Store
const authState = writable<AuthStoreState>(initialState);

// 依存性注入のためのインスタンス作成
function createAuthUseCase(): AuthUseCase {
  const tokenStorage = new LocalStorageTokenStorage();

  // HTTPクライアント作成（トークン取得関数を渡す）
  const httpClient = createHttpClient(
    () => get(authState).token, // 現在のトークンを取得
    () => import.meta.env.VITE_EVENT_CODE,
    () => import.meta.env.VITE_PLAN_CODE
  );

  const authRepository = new HttpAuthRepository(httpClient);

  return new AuthUseCase(authRepository, tokenStorage);
}

// UseCaseインスタンス
const authUseCase = createAuthUseCase();

// パブリックなStore（読み取り専用）
export const auth = derived(authState, $state => ({
  isAuthenticated: $state.isAuthenticated,
  user: $state.user,
  isLoading: $state.isLoading,
  error: $state.error,
}));

// アクション関数群
export const authActions = {
  // ローディング状態の設定
  setLoading(loading: boolean) {
    authState.update(state => ({ ...state, isLoading: loading, error: null }));
  },

  // エラー状態の設定
  setError(error: string | null) {
    authState.update(state => ({ ...state, error, isLoading: false }));
  },

  // 認証状態の設定
  setAuthenticated(user: User, token: string) {
    authState.update(state => ({
      ...state,
      isAuthenticated: true,
      user,
      token,
      isLoading: false,
      error: null,
    }));
  },

  // 認証状態のクリア
  clearAuthentication() {
    authState.update(state => ({
      ...state,
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,
    }));
  },

  // メール送信（ログイン）
  async sendLoginMail(email: string): Promise<boolean> {
    this.setLoading(true);

    try {
      const result = await authUseCase.sendLoginMail(email);

      if (result.success) {
        this.setError(null);
        return true;
      } else {
        this.setError(result.errors?.[0] || '送信に失敗しました');
        return false;
      }
    } catch {
      this.setError('予期しないエラーが発生しました');
      return false;
    }
  },

  // メール送信（登録）
  async sendRegisterMail(email: string, name: string): Promise<boolean> {
    this.setLoading(true);

    try {
      const result = await authUseCase.sendRegisterMail(email, name);

      if (result.success) {
        this.setError(null);
        return true;
      } else {
        this.setError(result.errors?.[0] || '送信に失敗しました');
        return false;
      }
    } catch {
      this.setError('予期しないエラーが発生しました');
      return false;
    }
  },

  // 4桁コード認証
  async verifyDigit(email: string, digit: string): Promise<boolean> {
    this.setLoading(true);

    try {
      const result = await authUseCase.verifyDigit(email, digit);

      if (result.success && result.user && result.token) {
        this.setAuthenticated(result.user, result.token);
        return true;
      } else {
        this.setError(result.errors?.[0] || '認証に失敗しました');
        return false;
      }
    } catch {
      this.setError('予期しないエラーが発生しました');
      return false;
    }
  },

  // セッション復元
  async restoreSession(): Promise<boolean> {
    this.setLoading(true);

    try {
      const result = await authUseCase.restoreSession();

      if (result.success && result.token) {
        // ユーザー情報が取得できた場合
        if (result.user) {
          this.setAuthenticated(result.user, result.token);
        } else {
          // トークンだけの場合は部分的な認証状態に
          authState.update(state => ({
            ...state,
            isAuthenticated: true,
            token: result.token!,
            isLoading: false,
            error: null,
          }));
        }
        return true;
      } else {
        this.setError(null); // セッション復元失敗はエラーではない
        authState.update(state => ({ ...state, isLoading: false }));
        return false;
      }
    } catch {
      this.setError(null); // セッション復元失敗はエラーではない
      authState.update(state => ({ ...state, isLoading: false }));
      return false;
    }
  },

  // ログアウト
  async logout(): Promise<void> {
    this.setLoading(true);

    try {
      await authUseCase.logout();
      this.clearAuthentication();
    } catch {
      // ログアウトエラーでも状態はクリア
      this.clearAuthentication();
    }
  },

  // エラークリア
  clearError() {
    authState.update(state => ({ ...state, error: null }));
  },
};

// 初期化（アプリ起動時にセッション復元を試行）
export async function initializeAuth() {
  await authActions.restoreSession();
}

// バリデーションヘルパー（UI用）
export const authValidation = {
  validateEmail: (email: string) => authUseCase.validateEmailInput(email),
  validateDigit: (digit: string) => authUseCase.validateDigitInput(digit),
  validateName: (name: string) => authUseCase.validateNameInput(name),
};

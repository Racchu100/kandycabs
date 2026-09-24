import {
  SendOtpResponse,
  VerifyOtpResponse,
  UserProfile,
  AuthUserResponse,
  LogoutResponse,
} from '../auth/types';

export interface TokenStorage {
  getToken(): Promise<string | null> | string | null;
  setToken(token: string): Promise<void> | void;
  removeToken(): Promise<void> | void;
}

// In-memory / Browser localStorage token adapter
export class DefaultTokenStorage implements TokenStorage {
  private memoryToken: string | null = null;

  getToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('kandy_token') || this.memoryToken;
    }
    return this.memoryToken;
  }

  setToken(token: string): void {
    this.memoryToken = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('kandy_token', token);
    }
  }

  removeToken(): void {
    this.memoryToken = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('kandy_token');
    }
  }
}

export interface KandyApiClientOptions {
  baseUrl?: string;
  tokenStorage?: TokenStorage;
}

export class KandyApiClient {
  private baseUrl: string;
  public tokenStorage: TokenStorage;

  constructor(options: KandyApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || (typeof window !== 'undefined' ? '' : 'http://localhost:3000');
    this.tokenStorage = options.tokenStorage || new DefaultTokenStorage();
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async fetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers = new Headers(options.headers || {});

    // Automatically attach Bearer token if available
    const token = await this.tokenStorage.getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // send cookies across origins (admin on :3001, web on :3000)
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const text = await response.text();
        if (text) {
          try {
            const errorBody = JSON.parse(text);
            errorMessage = errorBody.message || errorBody.error || errorMessage;
          } catch {
            errorMessage = text;
          }
        }
      } catch (_) {
        // Ignore parsing error
      }
      const error: any = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  // Authentication API endpoints
  public auth = {
    sendOtp: async (phone: string, role?: string): Promise<SendOtpResponse> => {
      return this.fetch<SendOtpResponse>('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, role }),
      });
    },

    verifyOtp: async (phone: string, otp: string, fullName?: string): Promise<VerifyOtpResponse> => {
      const result = await this.fetch<VerifyOtpResponse>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp, fullName }),
      });
      if (result?.token) {
        await this.tokenStorage.setToken(result.token);
      }
      return result;
    },

    getMe: async (): Promise<UserProfile | null> => {
      // Retry once on failure to prevent false logged-out flicker on page refreshes
      let attempts = 0;
      while (attempts < 2) {
        try {
          const res = await this.fetch<AuthUserResponse>('/api/auth/me', {
            method: 'GET',
          });
          return res.user;
        } catch (error: any) {
          attempts++;
          if (error?.status === 401) {
            // Truly unauthenticated (invalid or missing token)
            await this.tokenStorage.removeToken();
            return null;
          }
          if (attempts >= 2) {
            return null;
          }
          // Small backoff before retrying once
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
      return null;
    },

    logout: async (): Promise<LogoutResponse> => {
      try {
        const res = await this.fetch<LogoutResponse>('/api/auth/logout', {
          method: 'POST',
        });
        return res;
      } finally {
        await this.tokenStorage.removeToken();
      }
    },
  };
}

// Global default instance
export const apiClient = new KandyApiClient();

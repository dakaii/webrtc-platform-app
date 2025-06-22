import type {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  User,
} from "@/types";
import { apiService } from "./api";

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiService.post<AuthResponse>("/auth/login", credentials);
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    return apiService.post<AuthResponse>("/auth/register", credentials);
  }

  async getProfile(): Promise<User> {
    return apiService.get<User>("/auth/profile");
  }

  async refreshToken(): Promise<AuthResponse> {
    return apiService.post<AuthResponse>("/auth/refresh");
  }
}

export const authService = new AuthService();

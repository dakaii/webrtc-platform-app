import { defineStore } from "pinia";
import { ref, computed, readonly } from "vue";
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
} from "@/types";
import { authService } from "@/services/auth";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem("auth_token"));

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const response: AuthResponse = await authService.login(credentials);
      token.value = response.access_token;
      user.value = response.user;

      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("user", JSON.stringify(response.user));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<void> => {
    try {
      const response: AuthResponse = await authService.register(credentials);
      token.value = response.access_token;
      user.value = response.user;

      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("user", JSON.stringify(response.user));
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    user.value = null;
    token.value = null;

    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  };

  const initializeAuth = (): void => {
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      token.value = storedToken;
      try {
        user.value = JSON.parse(storedUser);
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        logout();
      }
    }
  };

  // Initialize auth on store creation
  initializeAuth();

  return {
    user: readonly(user),
    token: readonly(token),
    isAuthenticated,
    login,
    register,
    logout,
    initializeAuth,
  };
});

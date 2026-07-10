import { apiClient, clearAuthTokens, getRefreshToken, setAuthTokens } from "./client";

export interface ApiCompany {
  id: string;
  code: "MM" | "FZ" | string;
  name: string;
}

export interface ApiUser {
  id: string;
  username: string;
  displayName: string;
  role?: string;
  roles?: string[];
  organizationId?: string;
  companies?: ApiCompany[];
}

export async function loginRequest(username: string, password: string) {
  const response = await apiClient.post("/auth/login", { username, password });
  setAuthTokens(response.data.accessToken, response.data.refreshToken);
  return response.data.user as ApiUser;
}

export async function meRequest() {
  const response = await apiClient.get("/auth/me");
  return response.data.user as ApiUser;
}

export async function logoutRequest() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await apiClient.post("/auth/logout", { refreshToken });
    }
  } finally {
    clearAuthTokens();
  }
}

export async function myCompaniesRequest() {
  const response = await apiClient.get("/companies/mine");
  return response.data as ApiCompany[];
}

export async function usersRequest() {
  const response = await apiClient.get("/users");
  return response.data as ApiUser[];
}

export async function createUserRequest(dto: any) {
  const response = await apiClient.post("/users", dto);
  return response.data as ApiUser;
}

export async function updateUserRequest(id: string, dto: any) {
  const response = await apiClient.put(`/users/${id}`, dto);
  return response.data as ApiUser;
}

export async function deleteUserRequest(id: string) {
  const response = await apiClient.delete(`/users/${id}`);
  return response.data;
}

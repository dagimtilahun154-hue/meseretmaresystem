import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { clearAuthTokens, getAccessToken } from "@/lib/api/client";
import { ApiCompany, ApiUser, loginRequest, logoutRequest, meRequest, usersRequest, createUserRequest, updateUserRequest, deleteUserRequest } from "@/lib/api/auth";
import { toast } from "sonner";

export type UserRole = "manager" | "finance" | "storekeeper" | "fieldwork" | "attendance";

export interface AppUser {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  roles?: UserRole[];
  displayName: string;
  organizationId?: string;
  companies?: ApiCompany[];
  reportsToId?: string | null;
  department?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: AppUser | null;
  users: AppUser[];
  authReady: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  verifySecurityCode: (code: string) => boolean;
  addUser: (user: AppUser) => Promise<void>;
  updateUser: (user: AppUser) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  hasAccess: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SECURITY_CODE = import.meta.env.VITE_SECURITY_CODE || "admin123";

function normalizeApiUser(user: ApiUser): AppUser {
  const roles = ((user.roles?.length ? user.roles : [user.role || "manager"]) as UserRole[]).filter(Boolean);
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: roles[0] || "manager",
    roles,
    organizationId: user.organizationId,
    companies: user.companies || [],
    reportsToId: user.reportsToId,
    department: user.department,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      if (!getAccessToken()) {
        setAuthReady(true);
        return;
      }
      try {
        const user = normalizeApiUser(await meRequest());
        if (!mounted) return;
        setCurrentUser(user);
        sessionStorage.setItem("solar_auth_uid", user.id);
      } catch {
        clearAuthTokens();
        sessionStorage.removeItem("solar_auth_uid");
      } finally {
        if (mounted) setAuthReady(true);
      }
    }
    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    async function loadBackendUsers() {
      if (!currentUser || !currentUser.roles?.includes("manager")) return;
      try {
        const backendUsers = await usersRequest();
        setUsers(backendUsers.map(normalizeApiUser));
      } catch {
        setUsers([]);
      }
    }
    loadBackendUsers();
  }, [currentUser]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const apiUser = await loginRequest(username, password);
      const user = normalizeApiUser(apiUser);
      setCurrentUser(user);
      sessionStorage.setItem("solar_auth_uid", user.id);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Token cleanup happens inside logoutRequest when possible.
    }
    setCurrentUser(null);
    sessionStorage.removeItem("solar_auth_uid");
  };

  const verifySecurityCode = (code: string): boolean => code === SECURITY_CODE;

  const hasAccess = (allowedRoles: UserRole[]): boolean => {
    if (!currentUser) return false;
    const roles = currentUser.roles?.length ? currentUser.roles : [currentUser.role];
    if (roles.includes("manager")) return true;
    return roles.some((role) => allowedRoles.includes(role));
  };

  const addUser = async (user: AppUser) => {
    try {
      const newUser = normalizeApiUser(await createUserRequest(user));
      setUsers((prev) => [...prev, newUser]);
      toast.success("User added successfully");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to add user");
    }
  };

  const updateUser = async (user: AppUser) => {
    try {
      const updatedUser = normalizeApiUser(await updateUserRequest(user.id, user));
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
      if (currentUser?.id === user.id) {
        setCurrentUser(updatedUser);
      }
      toast.success("User updated successfully");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update user");
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await deleteUserRequest(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("User deleted successfully");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete user");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!currentUser,
        currentUser,
        users,
        authReady,
        login,
        logout,
        verifySecurityCode,
        addUser,
        updateUser,
        deleteUser,
        hasAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  manager: "Manager",
  finance: "Finance",
  storekeeper: "Store Keeper",
  fieldwork: "Field Work Controller",
  attendance: "Attendance Officer",
};

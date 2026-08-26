import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { clearAuthTokens, getAccessToken } from "@/lib/api/client";
import { ApiCompany, ApiUser, loginRequest, logoutRequest, meRequest, usersRequest, createUserRequest, updateUserRequest, deleteUserRequest } from "@/lib/api/auth";
import { toast } from "sonner";

export type UserRole = 
  | "admin"
  | "manager"
  | "fieldwork"
  | "ttl"
  | "finance"
  | "storekeeper"
  | "sales"
  | "technician"
  | "attendance"
  | "hr";

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
  const rawRoles = user.roles?.length ? user.roles : (user.role ? [user.role] : []);
  const roles = (rawRoles.length ? rawRoles : ["storekeeper"])
    .map((r: any) => (typeof r === "string" ? r : r?.name || r?.role?.name))
    .filter(Boolean) as UserRole[];

  const userRole = roles[0] || (typeof user.role === "string" && user.role ? (user.role as UserRole) : "storekeeper");
  const finalRoles = roles.length ? roles : [userRole];

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: userRole,
    roles: finalRoles,
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
      if (!currentUser) return;
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
    } catch (err: any) {
      const msg = err?.response?.data?.message || (err?.message === "Network Error" ? "Network Error: Could not connect to backend server." : (err?.message || "Invalid credentials"));
      toast.error(msg);
      return false;
    }
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // ignore
    } finally {
      clearAuthTokens();
      setCurrentUser(null);
      sessionStorage.removeItem("solar_auth_uid");
    }
  };

  const verifySecurityCode = (code: string): boolean => code === SECURITY_CODE;

  const hasAccess = (allowedRoles: UserRole[]): boolean => {
    if (!currentUser) return false;
    const userRoles = (currentUser.roles?.length ? currentUser.roles : [currentUser.role])
      .map((r: any) => (typeof r === "string" ? r : r?.name || r?.role?.name))
      .filter(Boolean);
    if (userRoles.includes("admin")) return true;
    return userRoles.some((role: any) => allowedRoles.includes(role));
  };

  const addUser = async (user: AppUser) => {
    try {
      await createUserRequest(user);
      const fresh = await usersRequest();
      setUsers(fresh.map(normalizeApiUser));
      toast.success("User added successfully");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to add user");
    }
  };

  const updateUser = async (user: AppUser) => {
    try {
      await updateUserRequest(user.id, user);
      const fresh = await usersRequest();
      const normalized = fresh.map(normalizeApiUser);
      setUsers(normalized);
      if (currentUser?.id === user.id) {
        const me = normalized.find((u) => u.id === user.id);
        if (me) setCurrentUser(me);
      }
      toast.success("User updated successfully");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update user");
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await deleteUserRequest(id);
      const fresh = await usersRequest();
      setUsers(fresh.map(normalizeApiUser));
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
  admin: "System Administrator",
  manager: "General Manager (GM)",
  fieldwork: "Technical Manager (TM)",
  ttl: "Technical Team Leader (TTL)",
  finance: "Finance Admin / Accountant",
  storekeeper: "Store Keeper / Inventory Manager",
  sales: "Sales Manager / Sales Engineer",
  technician: "Field Technician / Installer",
  attendance: "Attendance Officer",
  hr: "HR Manager / HR Officer",
};

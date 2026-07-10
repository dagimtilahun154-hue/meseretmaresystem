export interface AuthCompany {
  id: string;
  code: "MM" | "FZ" | string;
  name: string;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  organizationId: string;
  roles: string[];
  companies: AuthCompany[];
}

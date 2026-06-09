import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isSuperAdmin: boolean;
  twoFactorEnabled: boolean;
}

interface Org {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  plan: string;
}

interface AuthState {
  user: User | null;
  org: Org | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;

  setAuth: (data: { user: User; org?: Org; token: string; refreshToken: string }) => void;
  setOrg: (org: Org) => void;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      org: null,
      token: null,
      refreshToken: null,
      isLoading: false,

      setAuth: ({ user, org, token, refreshToken }) => {
        localStorage.setItem('winkx_token', token);
        localStorage.setItem('winkx_refresh_token', refreshToken);
        if (org) localStorage.setItem('winkx_org_id', org.id);
        set({ user, org: org || null, token, refreshToken });
      },

      setOrg: (org) => {
        localStorage.setItem('winkx_org_id', org.id);
        set({ org });
      },

      logout: () => {
        authApi.logout().catch(() => {});
        localStorage.removeItem('winkx_token');
        localStorage.removeItem('winkx_refresh_token');
        localStorage.removeItem('winkx_org_id');
        set({ user: null, org: null, token: null, refreshToken: null });
      },

      loadUser: async () => {
        const token = localStorage.getItem('winkx_token');
        if (!token) return;

        set({ isLoading: true });
        try {
          const { user } = await authApi.me() as any;
          const orgId = localStorage.getItem('winkx_org_id');
          const defaultOrg = user.orgMemberships?.find((m: any) => m.orgId === orgId)?.org
            || user.orgMemberships?.[0]?.org;

          set({ user, org: defaultOrg || null });
        } catch {
          localStorage.removeItem('winkx_token');
          set({ user: null, org: null, token: null });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'winkx-auth',
      partialize: (state) => ({
        user: state.user,
        org: state.org,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

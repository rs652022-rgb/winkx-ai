const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('winkx_token');
  }

  private getOrgId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('winkx_org_id');
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const orgId = this.getOrgId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (orgId) headers['X-Org-Id'] = orgId;

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Try refresh
      const refreshToken = localStorage.getItem('winkx_refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${this.baseUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const { token: newToken } = await refreshRes.json();
            localStorage.setItem('winkx_token', newToken);
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryRes = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
            if (!retryRes.ok) throw new Error(await retryRes.text());
            return retryRes.json();
          }
        } catch {}
      }
      localStorage.removeItem('winkx_token');
      localStorage.removeItem('winkx_refresh_token');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async upload(path: string, file: File): Promise<any> {
    const token = this.getToken();
    const orgId = this.getOrgId();
    const form = new FormData();
    form.append('file', file);

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(orgId ? { 'X-Org-Id': orgId } : {}),
      },
      body: form,
    });

    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  }
}

export const api = new ApiClient(API_URL);

// Typed API methods
export const authApi = {
  login: (data: any) => api.post('/api/auth/login', data),
  signup: (data: any) => api.post('/api/auth/signup', data),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  google: (idToken: string) => api.post('/api/auth/google', { idToken }),
  forgotPassword: (email: string) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/api/auth/reset-password', { token, password }),
  setup2FA: () => api.post('/api/auth/2fa/setup'),
  verify2FA: (code: string) => api.post('/api/auth/2fa/verify', { code }),
  updateProfile: (data: any) => api.patch('/api/auth/profile', data),
};

export const orgsApi = {
  list: () => api.get('/api/orgs'),
  create: (data: any) => api.post('/api/orgs', data),
  get: (orgId: string) => api.get(`/api/orgs/${orgId}`),
  update: (orgId: string, data: any) => api.patch(`/api/orgs/${orgId}`, data),
  members: (orgId: string) => api.get(`/api/orgs/${orgId}/members`),
  invite: (orgId: string, data: any) => api.post(`/api/orgs/${orgId}/invites`, data),
  acceptInvite: (token: string) => api.post(`/api/orgs/invites/${token}/accept`),
};

export const channelsApi = {
  list: () => api.get('/api/channels'),
  connect: (data: any) => api.post('/api/channels/connect', data),
  connectWhatsApp: (data: any) => api.post('/api/channels/connect/whatsapp', data),
  connectInstagram: (data: any) => api.post('/api/channels/connect/instagram', data),
  connectFacebook: (data: any) => api.post('/api/channels/connect/facebook', data),
  disconnect: (channelId: string) => api.delete(`/api/channels/${channelId}`),
  sync: (channelId: string) => api.post(`/api/channels/${channelId}/sync`),
};

export const inboxApi = {
  conversations: (params?: any) => api.get(`/api/inbox/conversations?${new URLSearchParams(params).toString()}`),
  conversation: (id: string) => api.get(`/api/inbox/conversations/${id}`),
  sendMessage: (conversationId: string, data: any) => api.post(`/api/inbox/conversations/${conversationId}/messages`, data),
  assign: (conversationId: string, agentId: string | null) => api.post(`/api/inbox/conversations/${conversationId}/assign`, { agentId }),
  updateStatus: (conversationId: string, status: string) => api.patch(`/api/inbox/conversations/${conversationId}/status`, { status }),
  addNote: (conversationId: string, content: string) => api.post(`/api/inbox/conversations/${conversationId}/notes`, { content }),
  stats: () => api.get('/api/inbox/stats'),
};

export const flowsApi = {
  list: (params?: any) => api.get(`/api/flows?${new URLSearchParams(params || {}).toString()}`),
  create: (data: any) => api.post('/api/flows', data),
  get: (id: string) => api.get(`/api/flows/${id}`),
  update: (id: string, data: any) => api.put(`/api/flows/${id}`, data),
  delete: (id: string) => api.delete(`/api/flows/${id}`),
  duplicate: (id: string) => api.post(`/api/flows/${id}/duplicate`),
  toggle: (id: string) => api.post(`/api/flows/${id}/toggle`),
  versions: (id: string) => api.get(`/api/flows/${id}/versions`),
};

export const aiApi = {
  generateFlow: (data: any) => api.post('/api/ai/generate-flow', data),
  chat: (data: any) => api.post('/api/ai/chat', data),
  generateContent: (data: any) => api.post('/api/ai/generate-content', data),
  providers: () => api.get('/api/ai/providers'),
};

export const crmApi = {
  contacts: (params?: any) => api.get(`/api/crm/contacts?${new URLSearchParams(params || {}).toString()}`),
  contact: (id: string) => api.get(`/api/crm/contacts/${id}`),
  createContact: (data: any) => api.post('/api/crm/contacts', data),
  updateContact: (id: string, data: any) => api.patch(`/api/crm/contacts/${id}`, data),
  leads: (params?: any) => api.get(`/api/crm/leads?${new URLSearchParams(params || {}).toString()}`),
  createLead: (data: any) => api.post('/api/crm/leads', data),
  updateLead: (id: string, data: any) => api.patch(`/api/crm/leads/${id}`, data),
  pipelines: () => api.get('/api/crm/pipelines'),
  createPipeline: (name: string) => api.post('/api/crm/pipelines', { name }),
  deals: (params?: any) => api.get(`/api/crm/deals?${new URLSearchParams(params || {}).toString()}`),
  createDeal: (data: any) => api.post('/api/crm/deals', data),
  updateDeal: (id: string, data: any) => api.patch(`/api/crm/deals/${id}`, data),
};

export const campaignsApi = {
  list: (params?: any) => api.get(`/api/campaigns?${new URLSearchParams(params || {}).toString()}`),
  create: (data: any) => api.post('/api/campaigns', data),
  get: (id: string) => api.get(`/api/campaigns/${id}`),
  update: (id: string, data: any) => api.patch(`/api/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/api/campaigns/${id}`),
  launch: (id: string) => api.post(`/api/campaigns/${id}/launch`),
  analytics: (id: string) => api.get(`/api/campaigns/${id}/analytics`),
};

export const analyticsApi = {
  dashboard: (params?: any) => api.get(`/api/analytics/dashboard?${new URLSearchParams(params || {}).toString()}`),
  performance: (params?: any) => api.get(`/api/analytics/performance?${new URLSearchParams(params || {}).toString()}`),
};

export const agentsApi = {
  list: () => api.get('/api/agents'),
  create: (data: any) => api.post('/api/agents', data),
  get: (id: string) => api.get(`/api/agents/${id}`),
  update: (id: string, data: any) => api.patch(`/api/agents/${id}`, data),
  delete: (id: string) => api.delete(`/api/agents/${id}`),
  knowledgeBases: () => api.get('/api/agents/knowledge-bases'),
  createKB: (data: any) => api.post('/api/agents/knowledge-bases', data),
  kbDocuments: (kbId: string) => api.get(`/api/agents/knowledge-bases/${kbId}/documents`),
  addDocument: (kbId: string, data: any) => api.post(`/api/agents/knowledge-bases/${kbId}/documents`, data),
};

export const templatesApi = {
  list: (params?: any) => api.get(`/api/templates?${new URLSearchParams(params || {}).toString()}`),
  get: (id: string) => api.get(`/api/templates/${id}`),
  import: (id: string) => api.post(`/api/templates/${id}/import`),
  rate: (id: string, rating: number) => api.post(`/api/templates/${id}/rate`, { rating }),
};

export const billingApi = {
  plans: () => api.get('/api/billing/plans'),
  subscription: () => api.get('/api/billing/subscription'),
  checkout: (data: any) => api.post('/api/billing/checkout', data),
  portal: () => api.post('/api/billing/portal'),
  usage: () => api.get('/api/billing/usage'),
};

export const developerApi = {
  keys: () => api.get('/api/developer/keys'),
  listKeys: () => api.get('/api/developer/keys'),
  createKey: (data: any) => api.post('/api/developer/keys', data),
  revokeKey: (id: string) => api.delete(`/api/developer/keys/${id}`),
  webhooks: () => api.get('/api/developer/webhooks'),
  listWebhooks: () => api.get('/api/developer/webhooks'),
  createWebhook: (data: any) => api.post('/api/developer/webhooks', data),
  deleteWebhook: (id: string) => api.delete(`/api/developer/webhooks/${id}`),
  testWebhook: (id: string) => api.post(`/api/developer/webhooks/${id}/test`),
};

export const adminApi = {
  stats: () => api.get('/api/admin/stats'),
  users: (params?: any) => api.get(`/api/admin/users?${new URLSearchParams(params || {}).toString()}`),
  updateUser: (id: string, data: any) => api.patch(`/api/admin/users/${id}`, data),
  orgs: (params?: any) => api.get(`/api/admin/orgs?${new URLSearchParams(params || {}).toString()}`),
  auditLogs: (params?: any) => api.get(`/api/admin/audit-logs?${new URLSearchParams(params || {}).toString()}`),
};

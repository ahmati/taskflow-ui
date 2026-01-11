// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:32787/api';

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken() {
    return this.token || localStorage.getItem('authToken');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { params, ...fetchConfig } = config;
    const url = this.buildUrl(endpoint, params);

    // Build headers, but avoid sending Content-Type on GET/DELETE requests
    const combinedHeaders: HeadersInit = {
      ...this.getHeaders(),
      ...fetchConfig.headers,
    };

    const method = (fetchConfig.method || 'GET').toString().toUpperCase();
    if (method === 'GET' || method === 'DELETE') {
      // Content-Type is unnecessary for GET/DELETE and can trigger preflight when combined with other headers
      if ((combinedHeaders as Record<string, unknown>)['Content-Type']) {
        const { ['Content-Type']: _, ...rest } = combinedHeaders as Record<string, unknown>;
        // cast back to HeadersInit
        (fetchConfig as any).headers = rest as HeadersInit;
      }
    } else {
      (fetchConfig as any).headers = combinedHeaders;
    }

    const response = await fetch(url, {
      ...fetchConfig,
      headers: (fetchConfig as any).headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    // Handle No Content responses and non-JSON bodies gracefully
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const text = await response.text();
    if (!text) return undefined as unknown as T;

    try {
      return JSON.parse(text) as T;
    } catch {
      // If response is not JSON, return undefined to avoid throwing on parse errors
      return undefined as unknown as T;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: unknown, headers?: HeadersInit): Promise<T> {
    const body =
      data instanceof FormData || data instanceof URLSearchParams
        ? (data as BodyInit)
        : data
        ? JSON.stringify(data)
        : undefined;

    return this.request<T>(endpoint, {
      method: 'POST',
      body,
      headers,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Auth API endpoints
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ token: string; user: { id: string; email: string; name: string } }>('/auth/login', { email, password }),
  // Form-encoded login to avoid CORS preflight when server accepts urlencoded bodies
  loginForm: (email: string, password: string) => {
    const params = new URLSearchParams({ email, password });
    return apiClient.post<{ token: string; user: { id: string; email: string; name: string } }>('/auth/login', params, {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
  },
  
  register: (name: string, email: string, password: string) =>
    apiClient.post<{ token: string; user: { id: string; email: string; name: string } }>('/auth/register', { name, email, password }),
  // Form-encoded register to avoid CORS preflight when server accepts urlencoded bodies
  registerForm: (name: string, email: string, password: string) => {
    const params = new URLSearchParams({ name, email, password });
    return apiClient.post<{ token: string; user: { id: string; email: string; name: string } }>('/auth/register', params, {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
  },
  
  logout: () => apiClient.post('/auth/logout'),
  
  me: () => apiClient.get<{ id: string; email: string; name: string }>('/auth/me'),
};

// Tasks API endpoints
export const tasksApi = {
  // Map response properties by name and normalize string values to frontend enums
  getAll: async (filters?: { status?: string; type?: string; priority?: string }) => {
    const normalize = (v?: any) => {
      if (!v) return '';
      let s = String(v);
      s = s.replace(/([a-z0-9])([A-Z])/g, '$1-$2');
      s = s.replace(/[_\s]+/g, '-').toLowerCase();
      s = s.replace(/-+/g, '-');
      return s;
    };

    const mapType = (v?: any): Task['type'] => {
      const s = normalize(v);
      if (s.includes('bug')) return 'bug';
      if (s.includes('feature')) return 'feature';
      if (s.includes('improv')) return 'improvement';
      if (s.includes('doc')) return 'documentation';
      return 'feature';
    };

    const mapPriority = (v?: any): Task['priority'] => {
      const s = normalize(v);
      if (s.includes('low')) return 'low';
      if (s.includes('high')) return 'high';
      return 'medium';
    };

    const mapStatus = (v?: any): Task['status'] => {
      const s = normalize(v);
      if (s.includes('todo')) return 'todo';
      if (s.includes('in-progress') || (s.includes('in') && s.includes('progress')) || s.includes('inprogress')) return 'in-progress';
      if (s.includes('done')) return 'done';
      return 'todo';
    };

    const res = await apiClient.get<any[]>('/tasks', filters as Record<string, string> | undefined);
    return res.map((t) => ({
      id: String(t.id),
      title: t.title,
      description: t.description,
      type: mapType(t.type),
      status: mapStatus(t.status),
      priority: mapPriority(t.priority),
      order: typeof t.order === 'number' ? t.order : 0,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString(),
    } as Task));
  },

  getById: async (id: string) => {
    const t = await apiClient.get<any>(`/tasks/${id}`);
    const normalize = (v?: any) => {
      if (!v) return '';
      let s = String(v);
      s = s.replace(/([a-z0-9])([A-Z])/g, '$1-$2');
      s = s.replace(/[_\s]+/g, '-').toLowerCase();
      s = s.replace(/-+/g, '-');
      return s;
    };

    const mapType = (v?: any): Task['type'] => {
      const s = normalize(v);
      if (s.includes('bug')) return 'bug';
      if (s.includes('feature')) return 'feature';
      if (s.includes('improv')) return 'improvement';
      if (s.includes('doc')) return 'documentation';
      return 'feature';
    };

    const mapPriority = (v?: any): Task['priority'] => {
      const s = normalize(v);
      if (s.includes('low')) return 'low';
      if (s.includes('high')) return 'high';
      return 'medium';
    };

    const mapStatus = (v?: any): Task['status'] => {
      const s = normalize(v);
      if (s.includes('todo')) return 'todo';
      if (s.includes('in-progress') || (s.includes('in') && s.includes('progress')) || s.includes('inprogress')) return 'in-progress';
      if (s.includes('done')) return 'done';
      return 'todo';
    };

    return {
      id: String(t.id),
      title: t.title,
      description: t.description,
      type: mapType(t.type),
      status: mapStatus(t.status),
      priority: mapPriority(t.priority),
      order: typeof t.order === 'number' ? t.order : 0,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString(),
    } as Task;
  },

  // Update status via dedicated status endpoints: /tasks/{id}/todo | inprogress | done
  updateStatus: async (id: string, status: Task['status']) => {
    const endpointMap: Record<Task['status'], string> = {
      'todo': 'todo',
      'in-progress': 'inprogress',
      'done': 'done',
    };
    const endpoint = endpointMap[status] || 'todo';
    const t = await apiClient.patch<any>(`/tasks/${id}/${endpoint}`);
    return {
      id: String(t.id),
      title: t.title,
      description: t.description,
      type: typeof t.type === 'string' ? String(t.type).toLowerCase() as any : 'feature',
      status: typeof t.status === 'string' ? (String(t.status).toLowerCase().replace(/\s+/g, '-')) as any : 'todo',
      priority: typeof t.priority === 'string' ? String(t.priority).toLowerCase() as any : 'medium',
      order: typeof t.order === 'number' ? t.order : 0,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString(),
    } as Task;
  },
  
  create: (task: CreateTaskPayload) => apiClient.post<Task>('/tasks', task),
  
  update: (id: string, task: Partial<Task>) => apiClient.put<Task>(`/tasks/${id}`, task),
  
  delete: (id: string) => apiClient.delete(`/tasks/${id}`),
  
  reorder: (taskIds: string[]) => apiClient.post('/tasks/reorder', { taskIds }),
};

// Types
export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'feature' | 'improvement' | 'documentation';
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  type: Task['type'];
  priority: Task['priority'];
}

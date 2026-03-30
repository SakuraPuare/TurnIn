import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// 创建 axios 实例
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api', // 默认使用相对路径 /api
  timeout: 10000, // 请求超时时间
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 直接返回响应数据
    return response.data;
  },
  (error: AxiosError) => {
    if (error.response) {
      // 服务器返回了错误状态码
      const status = error.response.status;
      const data = error.response.data as { error?: string; message?: string } | undefined;
      const message = data?.error || data?.message || `请求失败 (${status})`;
      
      // 处理 401 未授权错误（token 过期或无效）
      if (status === 401) {
        // 使用 useAuthStore 的 logout 方法清除认证状态
        useAuthStore.getState().logout();
      }
      
      // 返回错误信息
      return Promise.reject(new ApiError(message, status, error.response.data));
    }
    
    // 请求被取消或网络错误
    return Promise.reject(new ApiError(error.message || "网络请求失败"));
  }
);

// 封装 GET 请求
export const get = <T = any>(url: string, params?: any, config?: AxiosRequestConfig) => {
  return api.get<T, T>(url, { ...config, params });
};

// 封装 POST 请求
export const post = <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  return api.post<T, T>(url, data, config);
};

export const postForm = <T = any>(url: string, data: FormData, config?: AxiosRequestConfig) => {
  const headers = { ...(config?.headers || {}) };
  delete (headers as Record<string, unknown>)["Content-Type"];

  return api.post<T, T>(url, data, {
    ...config,
    headers,
  });
};

// 封装 PUT 请求
export const put = <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  return api.put<T, T>(url, data, config);
};

export const patch = <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  return api.patch<T, T>(url, data, config);
};

// 封装 DELETE 请求
export const del = <T = any>(url: string, config?: AxiosRequestConfig) => {
  return api.delete<T, T>(url, config);
};

// 导出默认实例，以便可以直接使用或进一步配置
export default api;

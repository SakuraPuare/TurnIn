import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

// 创建 axios 实例
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api', // 默认使用相对路径 /api
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // 如果存在 token，则添加到请求头
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
      
      // 处理 401 未授权错误（token 过期或无效）
      if (status === 401) {
        // 清除本地存储的 token
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          // 可以选择重定向到登录页
          // window.location.href = '/login';
        }
      }
      
      // 返回错误信息
      return Promise.reject(error.response.data);
    }
    
    // 请求被取消或网络错误
    return Promise.reject(error.message);
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

// 封装 PUT 请求
export const put = <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  return api.put<T, T>(url, data, config);
};

// 封装 DELETE 请求
export const del = <T = any>(url: string, config?: AxiosRequestConfig) => {
  return api.delete<T, T>(url, config);
};

// 导出默认实例，以便可以直接使用或进一步配置
export default api;

// 基础 API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// 创建带有认证的请求头
export const createAuthHeaders = () => {
  const token = useAuthStore.getState().getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// 用于管理员 API 的请求函数
export const adminFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}/api/admin/${endpoint}`;
  const headers = {
    ...createAuthHeaders(),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  // 如果响应状态为 401，可能是 token 过期，可以在这里处理登出逻辑
  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('登录已过期，请重新登录');
  }

  // 解析响应
  const data = await response.json();
  
  // 如果响应不成功，抛出错误
  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }
  
  return data;
}; 
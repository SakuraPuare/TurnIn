import axios, { AxiosRequestConfig, AxiosError } from 'axios';
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
    // 从 useAuthStore 获取 token
    const token = useAuthStore.getState().token;
    
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
        // 使用 useAuthStore 的 logout 方法清除认证状态
        useAuthStore.getState().logout();
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
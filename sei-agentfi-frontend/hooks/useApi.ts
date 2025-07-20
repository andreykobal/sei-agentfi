import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { useCallback } from "react";

// Create axios instance with base configuration
const createApiInstance = () => {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor to add auth token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle auth errors
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid, clear storage
        localStorage.removeItem("authToken");
        localStorage.removeItem("userEmail");
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export const useApi = () => {
  const apiInstance = createApiInstance();

  const request = useCallback(
    async <T = any>(
      method: "GET" | "POST" | "PUT" | "DELETE",
      endpoint: string,
      data?: any,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> => {
      try {
        const response = await apiInstance.request<T>({
          method,
          url: endpoint,
          data,
          ...config,
        });
        return response;
      } catch (error) {
        throw error;
      }
    },
    []
  );

  // Convenience methods
  const get = useCallback(
    <T = any>(endpoint: string, config?: AxiosRequestConfig) =>
      request<T>("GET", endpoint, undefined, config),
    [request]
  );

  const post = useCallback(
    <T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig) =>
      request<T>("POST", endpoint, data, config),
    [request]
  );

  const put = useCallback(
    <T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig) =>
      request<T>("PUT", endpoint, data, config),
    [request]
  );

  const del = useCallback(
    <T = any>(endpoint: string, config?: AxiosRequestConfig) =>
      request<T>("DELETE", endpoint, undefined, config),
    [request]
  );

  return {
    request,
    get,
    post,
    put,
    delete: del,
  };
};

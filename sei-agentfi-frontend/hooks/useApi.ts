import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { useCallback } from "react";

// Create axios instance with base configuration
const createApiInstance = () => {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:42069",
    timeout: 60000, // Increased to 60 seconds for AI responses
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
        console.log(
          `[INTERCEPTOR] Added auth token to request: ${config.method?.toUpperCase()} ${
            config.url
          }`
        );
      } else {
        console.log(
          `[INTERCEPTOR] No auth token found for request: ${config.method?.toUpperCase()} ${
            config.url
          }`
        );
      }
      return config;
    },
    (error) => {
      console.error(`[INTERCEPTOR] Request error:`, error);
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle auth errors
  instance.interceptors.response.use(
    (response) => {
      console.log(
        `[INTERCEPTOR] Response intercepted: ${
          response.status
        } ${response.config.method?.toUpperCase()} ${response.config.url}`
      );
      return response;
    },
    (error) => {
      console.error(`[INTERCEPTOR] Response error:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
      });

      if (error.response?.status === 401) {
        // Token expired or invalid, clear storage
        console.log(`[INTERCEPTOR] 401 error, clearing auth storage`);
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
      const requestId = `api-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      console.log(`[${requestId}] API Request:`, {
        method,
        endpoint,
        dataSize: data ? JSON.stringify(data).length : 0,
        hasAuthToken: !!localStorage.getItem("authToken"),
        baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:42069",
      });

      try {
        const response = await apiInstance.request<T>({
          method,
          url: endpoint,
          data,
          ...config,
        });

        console.log(`[${requestId}] API Response:`, {
          status: response.status,
          statusText: response.statusText,
          dataSize: response.data ? JSON.stringify(response.data).length : 0,
          headers: response.headers,
        });

        return response;
      } catch (error: any) {
        console.error(`[${requestId}] API Error:`, {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data,
          requestData: data,
        });
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

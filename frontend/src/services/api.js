/**
 * api.js — Central Axios instance (see config/api.js for base URL)
 *
 * Features:
 *  - Injects Authorization header from in-memory / sessionStorage on every request
 *  - Auto-refreshes access token on 401 using Refresh Token Rotation (RTR)
 *  - Clears session and updates Zustand state on refresh failure (without hard page reload loops)
 */
import axios from 'axios';
import { getApiV1Url } from '../config/api';

const BASE_URL = getApiV1Url();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let inMemoryAccessToken = null;
let activeRequests = 0;
let authFailureHandler = null;

const getDeviceId = () => {
  const key = 'gkp_device_id';
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
};

const showLoader = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent("loader", { detail: true }));
  }
};

const hideLoader = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent("loader", { detail: false }));
  }
};

export function registerAuthFailureHandler(handler) {
  authFailureHandler = handler;
}

export function setAccessToken(token) {
  inMemoryAccessToken = token;
  if (token) {
    try { localStorage.setItem('token', token); } catch (e) {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:token_updated', { detail: { token } }));
    }
  } else {
    try { localStorage.removeItem('token'); } catch (e) {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:token_cleared'));
    }
  }
}

export async function refreshAccessToken() {
  const response = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
  if (response.data && response.data.success && response.data.token) {
    const newToken = response.data.token;
    setAccessToken(newToken);
    api.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
    return newToken;
  }
  throw new Error(response.data?.message || 'Refresh returned unsuccessful response');
}

export function getAccessToken() {
  if (!inMemoryAccessToken && typeof window !== 'undefined') {
    try { inMemoryAccessToken = localStorage.getItem('token'); } catch (e) {}
  }
  return inMemoryAccessToken;
}

export function clearAccessToken() {
  inMemoryAccessToken = null;
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem('token'); } catch (e) {}
  }
}

// ── Request: attach access token ──────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const isBackground = Boolean(
    config.skipLoader || 
    config.url?.includes('/notifications') || 
    config.url?.includes('/messenger/unread') || 
    config.url?.includes('/unread-count')
  );

  if (!isBackground) {
    activeRequests++;
    showLoader();
  }
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (err) => {
  const isBackground = Boolean(
    err.config?.skipLoader || 
    err.config?.url?.includes('/notifications') || 
    err.config?.url?.includes('/messenger/unread') || 
    err.config?.url?.includes('/unread-count')
  );

  if (!isBackground) {
    activeRequests--;
    if (activeRequests <= 0) {
      activeRequests = 0;
      hideLoader();
    }
  }
  return Promise.reject(err);
});

// ── Response: handle 401 → attempt token refresh ──────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => {
    const isBackground = Boolean(
      res.config?.skipLoader || 
      res.config?.url?.includes('/notifications') || 
      res.config?.url?.includes('/messenger/unread') || 
      res.config?.url?.includes('/unread-count')
    );

    if (!isBackground) {
      activeRequests--;
      if (activeRequests <= 0) {
        activeRequests = 0;
        hideLoader();
      }
    }
    return res;
  },
  async (err) => {
    const isBackground = Boolean(
      err.config?.skipLoader || 
      err.config?.url?.includes('/notifications') || 
      err.config?.url?.includes('/messenger/unread') || 
      err.config?.url?.includes('/unread-count')
    );

    if (!isBackground) {
      activeRequests--;
      if (activeRequests <= 0) {
        activeRequests = 0;
        hideLoader();
      }
    }
    const originalRequest = err.config;

    // Timeout error handling
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return Promise.reject({ 
        message: 'Request timed out. Check your connection.', 
        isTimeout: true 
      });
    }

    // Network offline detection
    if (!err.response) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return Promise.reject({ message: 'No internet connection', isOffline: true });
      }
      return Promise.reject({ message: 'Server unreachable', isNetworkError: true });
    }

    // Handle 429 Too Many Requests
    if (err.response.status === 429) {
      const retryAfter = err.response.headers?.['retry-after'] || err.response.headers?.['Retry-After'];
      console.warn(`[API] Rate limited (429) on ${originalRequest?.url}. Retry after: ${retryAfter || 'a moment'}`);
      return Promise.reject(err);
    }

    // Handle 401 Unauthorized and attempt token refresh
    if (err.response.status === 401 && !originalRequest._retry) {
      const requestUrl = originalRequest.url || '';
      // Don't try to refresh if the request is to login or refresh itself
      if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/refresh') || requestUrl.includes('auth/refresh')) {
        return Promise.reject(err);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
        processQueue(null, newToken);
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        // Only clear session when server explicitly returns 401 Unauthorized
        if (refreshError?.response?.status === 401) {
          clearSession();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(err);
  }
);

// ── Session helpers ────────────────────────────────────────────────────────────
export function clearSession() {
  clearAccessToken();
  if (authFailureHandler) {
    try {
      authFailureHandler();
    } catch (e) {
      console.warn("Auth failure handler failed:", e);
    }
  }
}

// ── In-Flight Request Deduplication & GET Response Caching ───────────
const inFlightRequests = new Map();
const getCache = new Map();
const DEFAULT_GET_CACHE_TTL = 15000; // 15 seconds
let apiCacheGeneration = 0;

export function clearApiCache() {
  apiCacheGeneration += 1;
  getCache.clear();
  inFlightRequests.clear();
}

if (typeof window !== 'undefined') {
  window.addEventListener('auth:token_updated', clearApiCache);
  window.addEventListener('auth:token_cleared', clearApiCache);
}

const originalRequest = api.request.bind(api);

api.request = function (configOrUrl, maybeConfig) {
  const config = typeof configOrUrl === 'string'
    ? { ...(maybeConfig || {}), url: configOrUrl }
    : { ...(configOrUrl || {}) };

  const method = (config.method || 'get').toLowerCase();

  // Invalidate read cache on state mutations
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    clearApiCache();
    return originalRequest(config);
  }

  // Requests with caller-owned abort signals must not share cancellation or results.
  if (method === 'get' && !config.skipCache && !config.signal && !config.headers?.['x-skip-cache']) {
    const tokenScope = config.headers?.Authorization || config.headers?.authorization || getAccessToken() || 'anonymous';
    const cacheKey = `${tokenScope}:${api.getUri(config)}`;
    const now = Date.now();
    const requestGeneration = apiCacheGeneration;

    // Check recent cached response
    const cached = getCache.get(cacheKey);
    if (cached && (now - cached.timestamp < (config.cacheTtl || DEFAULT_GET_CACHE_TTL))) {
      return Promise.resolve(cached.response);
    }

    // Check duplicate in-flight promise
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    const requestPromise = originalRequest(config)
      .then((response) => {
        if (requestGeneration === apiCacheGeneration && response && response.status >= 200 && response.status < 300) {
          getCache.set(cacheKey, { timestamp: Date.now(), response });
        }
        return response;
      })
      .finally(() => {
        if (requestGeneration === apiCacheGeneration) {
          inFlightRequests.delete(cacheKey);
        }
      });

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  return originalRequest(config);
};

// Axios binds its method aliases to the original request implementation, so route
// GET calls through the wrapped request method explicitly.
api.get = (url, config) => api.request({ ...(config || {}), url, method: 'get' });

['post', 'put', 'patch', 'delete'].forEach((method) => {
  const originalMethod = api[method].bind(api);
  api[method] = (...args) => {
    clearApiCache();
    return originalMethod(...args);
  };
});

export default api;


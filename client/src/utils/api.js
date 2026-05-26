export const api = {
  get: (url, options = {}) => request(url, { ...options, method: 'GET' }),
  post: (url, body, options = {}) => request(url, { ...options, method: 'POST', body }),
  put: (url, body, options = {}) => request(url, { ...options, method: 'PUT', body }),
  patch: (url, body, options = {}) => request(url, { ...options, method: 'PATCH', body }),
  delete: (url, options = {}) => request(url, { ...options, method: 'DELETE' }),
};

async function request(url, { method, body, headers = {}, ...customOptions } = {}) {
  const token = localStorage.getItem('token');
  const isFormData = body instanceof FormData;

  const config = {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...headers,
    },
    ...customOptions
  };

  if (body && !isFormData) {
    config.body = JSON.stringify(body);
  } else if (body && isFormData) {
    config.body = body;
  }

  // Handle absolute urls or relative urls
  // Since Vite proxy is active, relative URLs starting with /api or /uploads will go to the proxy
  // Các route xác thực (login, signup, ...) cần trả 401 về cho component xử lý,
  // không tự redirect, để hiển thị thông báo lỗi cho người dùng.
  const isAuthRoute = url.includes('/api/auth/');

  const res = await fetch(url, config);
  // BUG FIX: Chỉ redirect về login khi 401 từ API yêu cầu auth (không phải auth route)
  // và response có ý định báo "unauthorized" thực sự (không phải 401 general từ các public API)
  if (res.status === 401 && !isAuthRoute) {
    // Kiểm tra response body có thực sự là lỗi auth không
    const clonedRes = res.clone();
    try {
      const body = await clonedRes.json();
      if (body.error && (
        body.error.toLowerCase().includes('đăng nhập') ||
        body.error.toLowerCase().includes('token') ||
        body.error.toLowerCase().includes('unauthorized') ||
        body.error.toLowerCase().includes('xác thực')
      )) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      // Nếu không phải lỗi auth thực sự, trả về response gốc
      return res;
    } catch {
      // Nếu không parse được JSON, redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
  }
  return res;
}

export function authHeaders(includeJson = true) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export function getMediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // If the path doesn't start with http, and since Vite proxy is configured for /uploads,
  // we can just use the relative path (or prepend a slash if missing).
  return path.startsWith('/') ? path : `/${path}`;
}

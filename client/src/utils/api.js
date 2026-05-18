export function authHeaders(includeJson = true) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

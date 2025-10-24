// client/src/api.js
// Base URL phải giống server: ví dụ http://localhost:3000/api
export const API = import.meta.env.VITE_API_URL;
function getToken(){ try{ return localStorage.getItem('token') || ''; }catch{ return ''; } }

function ensureBaseUrl() {
  if (!API) {
    throw new Error(
      'Thiếu VITE_API_URL trong client/.env\n' +
      'Ví dụ: VITE_API_URL=http://localhost:3000/api'
    );
  }
  if (!API.startsWith('http')) {
    throw new Error(`VITE_API_URL không hợp lệ: "${API}" (thiếu http/https)`);
  }
}

// ===== common =====
async function j(method, path, body) {
  ensureBaseUrl();

  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // thành công
  if (res.ok) {
    // có thể là 204 (no content)
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : res.text();
  }

  // lỗi: cố parse JSON trước, fallback text
  let detail = '';
  try {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const errJson = await res.json();
      detail = errJson?.error || errJson?.message || JSON.stringify(errJson);
    } else {
      detail = await res.text();
    }
} catch {
  detail = `HTTP ${res.status}`;
}
  const msg =
    `API error ${res.status} ${res.statusText || ''} @ ${method} ${path}\n` +
    (detail ? String(detail) : '');
  throw new Error(msg.trim());
}

// ===== health (tiện debug) =====
export const ping = () => j('GET', '/health');

// ===== farms =====
export const getFarms   = () => j('GET',  '/farms');
export const createFarm = (payload) => j('POST','/farms', payload);

// ===== plots =====
export const listPlots  = (farm_id) => j('GET', `/plots?farm_id=${encodeURIComponent(farm_id)}`);
export const createPlot = (payload) => j('POST','/plots', payload);

// ===== rubber types =====
export const getRubberTypes = () => j('GET','/rubber-types');
// (nếu cần thêm mới loại mủ từ FE)
// export const createRubberType = (payload) => j('POST','/rubber-types', payload);

// ===== conversion =====
export const createConversion = (payload) => j('POST','/conversions', payload);

// ===== plans =====
export const listPlans = (params) => {
  const qs = new URLSearchParams(params || {}).toString();
  return j('GET', `/plans?${qs}`);
};
export const createPlan  = (payload) => j('POST','/plans', payload);
export const updatePlan  = (id, payload) => j('PUT', `/plans/${id}`, payload);
export const deletePlan  = (id) => j('DELETE', `/plans/${id}`);

// plan history & utilities
export const getPlanHistory = (params) => {
  const qs = new URLSearchParams(params || {}).toString();
  return j('GET', `/plans/history?${qs}`);
};
export const bumpPlanVersion = (payload) => j('POST', '/plans/bump-version', payload);
export const copyPlans = (payload) => j('POST', '/plans/bulk-copy', payload);

// ===== actuals =====
export const saveActual  = (payload) => j('POST','/actuals', payload);
export const listActuals = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return j('GET', `/actuals?${qs}`);
};
export const updateActual = (id, payload) => j('PUT', `/actuals/${id}`, payload);
export const deleteActual = (id) => j('DELETE', `/actuals/${id}`);

// ===== dashboard =====
export const getDashboard = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return j('GET', `/reports/dashboard?${qs}`);
};

// ===== auth =====
export const authRegister = (payload) => j('POST', '/auth/register', payload);
export const authLogin = async (payload) => {
  const res = await j('POST', '/auth/login', payload);
  if (res?.token) localStorage.setItem('token', res.token);
  return res;
};
export const authMe = () => j('GET', '/auth/me');
export const authLogout = () => { try{ localStorage.removeItem('token'); }catch{ /* ignore */ } return true; };

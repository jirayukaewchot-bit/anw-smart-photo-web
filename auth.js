(() => {
  'use strict';

  const CONFIG = {
    // ปิดเป็น false เมื่อมี Backend จริง
    demoMode: true,
    api: { login: '/api/auth/login', logout: '/api/auth/logout', me: '/api/auth/me' },
    loginPage: 'login.html',
    homePage: 'index.html',
  };
  const DEMO_KEY = 'anwDemoUser';

  let csrfToken = null;

  function request(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;
    return fetch(url, { credentials: 'same-origin', ...options, method, headers });
  }

  async function authFetch(url, options) {
    const res = await request(url, options);
    if (res.status === 401) { redirectToLogin(); throw new Error('UNAUTHENTICATED'); }
    return res;
  }

  function redirectToLogin() { location.replace(CONFIG.loginPage); }

  async function getSession() {
    if (CONFIG.demoMode) {
      // DEMO ONLY: ไม่มีความปลอดภัยจริง
      const name = sessionStorage.getItem(DEMO_KEY);
      return name ? { displayName: name } : null;
    }
    try {
      const res = await request(CONFIG.api.me);
      if (!res.ok) return null;
      const data = await res.json();
      csrfToken = data.csrfToken || null;
      return data;
    } catch {
      return null;
    }
  }

  async function login(username, password) {
    if (CONFIG.demoMode) {
      sessionStorage.setItem(DEMO_KEY, 'ผู้ใช้ทดลอง');
      return { ok: true };
    }
    try {
      const res = await request(CONFIG.api.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) return { ok: true };
      if (res.status === 401) return { ok: false, reason: 'invalid' };
      if (res.status === 429) return { ok: false, reason: 'locked' };
      return { ok: false, reason: 'server' };
    } catch {
      return { ok: false, reason: 'network' };
    }
  }

  async function logout() {
    try {
      if (CONFIG.demoMode) {
        sessionStorage.removeItem(DEMO_KEY);
      } else {
        await request(CONFIG.api.logout, { method: 'POST' });
      }
    } catch (err) {
      console.error('logout error:', err);
    }
    redirectToLogin();
  }

  window.ANWAuth = {
    CONFIG, request, authFetch, getSession, login, logout, redirectToLogin,
    async requireLogin() {
      const s = await getSession();
      if (!s) { redirectToLogin(); return null; }
      return s;
    },
  };
})();
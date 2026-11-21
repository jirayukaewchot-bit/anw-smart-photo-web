(() => {
  'use strict';
  const form = document.getElementById('loginForm');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  const toggle = document.getElementById('pwToggle');

  if (ANWAuth.CONFIG.demoMode) document.getElementById('demoNotice').hidden = false;

  // ถ้าล็อกอินอยู่แล้ว ไปหน้าแรกเลย
  ANWAuth.getSession().then((s) => { if (s) location.replace(ANWAuth.CONFIG.homePage); });

  toggle.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'ซ่อน' : 'แสดง';
    toggle.setAttribute('aria-pressed', String(show));
  });

  const MESSAGES = {
    empty: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน',
    invalid: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    locked: 'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่',
    network: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
    server: 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่ภายหลัง',
  };

  function showError(key) { errorEl.textContent = MESSAGES[key]; errorEl.hidden = false; }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const u = username.value.trim();
    const p = password.value;
    if (!u || !p) { showError('empty'); (u ? password : username).focus(); return; }

    btn.disabled = true;
    btn.textContent = 'กำลังเข้าสู่ระบบ…';
    const result = await ANWAuth.login(u, p);

    if (result.ok) {
      password.value = ''; // ล้างรหัสผ่านออกจากช่องทันที
      location.replace(ANWAuth.CONFIG.homePage);
      return;
    }
    password.value = '';
    showError(result.reason);
    password.focus();
    btn.disabled = false;
    btn.textContent = 'เข้าสู่ระบบ';
  });
})();

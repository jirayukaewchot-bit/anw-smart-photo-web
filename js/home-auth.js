(async () => {
  'use strict';
  try {
    const session = await ANWAuth.requireLogin();
    if (!session) return; // กำลังไปหน้า login

    document.getElementById('userName').textContent = session.displayName || 'ผู้ใช้งาน';
    document.getElementById('logoutBtn').addEventListener('click', () => ANWAuth.logout());
    document.body.classList.remove('is-auth-pending');
  } catch (err) {
    console.error('home-auth error:', err);
    location.replace('login.html');
  }
})();

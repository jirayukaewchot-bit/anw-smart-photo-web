(() => {
  'use strict';

  const CONFIG = {
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    facebookHosts: ['www.facebook.com', 'facebook.com', 'm.facebook.com'],
  };

  const $ = (id) => document.getElementById(id);
  const form = $('searchForm'), dropzone = $('dropzone');
  const input = $('photoInput'), cameraInput = $('cameraInput');
  const pickBtn = $('pickBtn'), cameraBtn = $('cameraBtn');
  const previewWrap = $('previewWrap'), preview = $('preview');
  const dzEmpty = $('dzEmpty'), fileName = $('fileName'), fileError = $('fileError');
  const consent = $('consent'), searchBtn = $('searchBtn'), searchHint = $('searchHint');
  const statusEl = $('status');
  const results = $('results'), resultsTitle = $('resultsTitle');
  const resultCount = $('resultCount'), resultGrid = $('resultGrid');
  const template = $('resultTemplate');

  // ---------- State ----------
  let selectedFile = null;
  let previewUrl = null;
  let isSearching = false;

  // ---------- Helpers ----------
  function formatSize(bytes) {
    return bytes >= 1048576
      ? (bytes / 1048576).toFixed(1) + ' MB'
      : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function validate(file) {
    if (!CONFIG.allowedTypes.includes(file.type)) {
      return 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP เท่านั้น';
    }
    if (file.size > CONFIG.maxFileSize) {
      return 'ไฟล์ใหญ่เกิน 10 MB กรุณาเลือกรูปที่เล็กกว่านี้';
    }
    return '';
  }

  function safeUrl(value, allowedHosts) {
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:') return null;
      if (allowedHosts && !allowedHosts.includes(u.hostname)) return null;
      return u.href;
    } catch {
      return null;
    }
  }

  function showError(msg) { fileError.textContent = msg; fileError.hidden = false; }
  function clearError() { fileError.textContent = ''; fileError.hidden = true; }

  function setStatus(type, message) {
    statusEl.className = 'status';
    statusEl.replaceChildren();
    if (!type) return;
    if (type === 'loading') {
      const sp = document.createElement('span');
      sp.className = 'spinner';
      sp.setAttribute('aria-hidden', 'true');
      statusEl.append(sp, message);
    } else {
      if (type === 'error') statusEl.classList.add('is-error');
      statusEl.textContent = message;
    }
  }

  function hideResults() {
    results.hidden = true;
    resultGrid.replaceChildren();
    resultCount.textContent = '';
  }

  function revokePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  // ---------- Render ----------
  function render() {
    const has = Boolean(selectedFile);

    if (has) preview.src = previewUrl; else preview.removeAttribute('src');
    previewWrap.hidden = !has;
    dzEmpty.hidden = has;
    fileName.hidden = !has;
    fileName.textContent = has ? `${selectedFile.name} (${formatSize(selectedFile.size)})` : '';
    dropzone.classList.toggle('has-file', has);
    pickBtn.textContent = has ? 'เปลี่ยนรูปภาพ' : 'เลือกรูปภาพ';
    pickBtn.disabled = cameraBtn.disabled = isSearching;

    const ready = has && consent.checked && !isSearching;
    searchBtn.disabled = !ready;
    searchBtn.textContent = isSearching ? 'กำลังค้นหา…' : 'ค้นหาภาพของฉัน';
    searchBtn.setAttribute('aria-busy', String(isSearching));

    if (isSearching) searchHint.textContent = '';
    else if (!has) searchHint.textContent = 'เลือกรูปภาพก่อนเริ่มค้นหา';
    else if (!consent.checked) searchHint.textContent = 'ติ๊กช่องยินยอมเพื่อเริ่มค้นหา';
    else searchHint.textContent = '';
  }

  // ---------- File handling ----------
  function setFile(file) {
    clearError();
    const err = validate(file);
    if (err) { showError(err); return; }
    revokePreview();
    selectedFile = file;
    previewUrl = URL.createObjectURL(file);
    hideResults();
    setStatus(null);
    render();
  }

  function handleInputChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file) setFile(file);
  }

  input.addEventListener('change', handleInputChange);
  cameraInput.addEventListener('change', handleInputChange);
  pickBtn.addEventListener('click', () => input.click());
  cameraBtn.addEventListener('click', () => cameraInput.click());
  consent.addEventListener('change', () => { clearError(); render(); });

  dropzone.addEventListener('click', (e) => {
    if (isSearching || e.target.closest('button')) return;
    input.click();
  });

  // ---------- Drag & Drop ----------
  ['dragenter', 'dragover'].forEach((t) =>
    dropzone.addEventListener(t, (e) => {
      e.preventDefault();
      if (!isSearching) dropzone.classList.add('is-dragover');
    }));
  ['dragleave', 'drop'].forEach((t) =>
    dropzone.addEventListener(t, () => dropzone.classList.remove('is-dragover')));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (isSearching) return;
    const file = e.dataTransfer && e.dataTransfer.files[0];
    if (file) setFile(file);
  });
  ['dragover', 'drop'].forEach((t) => window.addEventListener(t, (e) => e.preventDefault()));

  // ---------- Search ----------
  async function searchPhotos(file) {
    if (ANWAuth.CONFIG.demoMode) {
      await new Promise((r) => setTimeout(r, 1200));
      return [
        { title: 'กิจกรรมตัวอย่าง 01', date: '2025-01-15', imageUrl: null, facebookUrl: 'https://www.facebook.com/' },
        { title: 'กิจกรรมตัวอย่าง 02', date: '2025-02-20', imageUrl: null, facebookUrl: 'https://www.facebook.com/' },
        { title: 'กิจกรรมตัวอย่าง 03', date: '2025-03-08', imageUrl: null, facebookUrl: null },
      ];
    }
    const body = new FormData();
    body.append('photo', file);
    const res = await ANWAuth.authFetch('/api/search', { method: 'POST', body });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data.results;
  }

  function renderResults(photos) {
    resultGrid.replaceChildren();
    if (!Array.isArray(photos) || photos.length === 0) {
      results.hidden = true;
      setStatus('empty', 'ไม่พบภาพที่ตรงกัน ลองใช้ภาพใบหน้าตรง ชัดเจน และมีแสงเพียงพอ');
      return;
    }

    const frag = document.createDocumentFragment();
    photos.forEach((p) => {
      const card = template.content.firstElementChild.cloneNode(true);
      const img = card.querySelector('.result-img');
      const ph = card.querySelector('.placeholder-text');
      const link = card.querySelector('.result-link');
      const noLink = card.querySelector('.result-nolink');

      const title = String(p.title || 'ภาพกิจกรรม');
      card.querySelector('.result-title').textContent = title;

      const d = p.date ? new Date(p.date) : null;
      card.querySelector('.result-meta').textContent =
        d && !isNaN(d) ? d.toLocaleDateString('th-TH', { dateStyle: 'long' }) : '';

      const imgSrc = p.imageUrl ? safeUrl(p.imageUrl) : null;
      if (imgSrc) { img.src = imgSrc; img.alt = 'ภาพกิจกรรม: ' + title; }
      else { img.hidden = true; ph.hidden = false; }

      const fb = p.facebookUrl ? safeUrl(p.facebookUrl, CONFIG.facebookHosts) : null;
      if (fb) { link.href = fb; link.hidden = false; }
      else { noLink.hidden = false; }

      frag.appendChild(card);
    });

    resultGrid.appendChild(frag);
    resultCount.textContent = `พบ ${photos.length} ภาพ`;
    setStatus(null);
    results.hidden = false;
    results.scrollIntoView();
    resultsTitle.focus({ preventScroll: true });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSearching) return;
    if (!selectedFile) { showError('กรุณาเลือกรูปภาพก่อนค้นหา'); return; }
    if (!consent.checked) { showError('กรุณาติ๊กยินยอมก่อนค้นหา'); return; }

    clearError();
    hideResults();
    isSearching = true;
    setStatus('loading', 'กำลังค้นหา กรุณารอสักครู่…');
    render();

    try {
      renderResults(await searchPhotos(selectedFile));
    } catch (err) {
      if (err.message === 'UNAUTHENTICATED') return;
      console.error(err);
      setStatus('error', 'เกิดข้อผิดพลาดในการค้นหา กรุณาลองใหม่อีกครั้ง');
    } finally {
      isSearching = false;
      render();
    }
  });

  window.addEventListener('pagehide', revokePreview);
  render();
})();

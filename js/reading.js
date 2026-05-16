/* ===== Reading Flow ===== */
let product = null;
let selectedCards = [];
let needed = 1;

window.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('tarot_product');
  if (!raw) { window.location.href = '/'; return; }
  product = JSON.parse(raw);
  needed  = parseInt(product.cards);

  document.getElementById('productName').textContent = product.name;
  document.getElementById('productPrice').textContent =
    Number(product.price).toLocaleString('ko-KR') + '원';

  buildBirthSelects();
  buildDeck();
  updateCounter();
  applySavedProfile();    // 같은 폰에서 재방문 시 이름·생일·성별 자동 채움
});

/* ===== Saved Profile (이름·생일·성별 재방문 시 자동 채움) ===== */
const PROFILE_KEY = 'tarot_user_profile';

function loadSavedProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); }
  catch { return null; }
}

function saveProfile(p) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }
  catch (e) { /* quota 등 무시 */ }
}

function applySavedProfile() {
  const p = loadSavedProfile();
  if (!p || !p.userName || !p.userBirth) return;

  // 폼 자동 채움
  const nameEl = document.getElementById('userName');
  if (nameEl) nameEl.value = p.userName;

  const [y, m, d] = (p.userBirth || '').split('-');
  if (y && m && d) {
    const yEl = document.getElementById('userBirthYear');
    const mEl = document.getElementById('userBirthMonth');
    const dEl = document.getElementById('userBirthDay');
    if (yEl) yEl.value = y;
    if (mEl) { mEl.value = m; mEl.dispatchEvent(new Event('change')); }
    if (dEl) dEl.value = d;
  }
  const gEl = document.getElementById('userGender');
  if (gEl && p.userGender) gEl.value = p.userGender;

  // 안내 박스 표시
  const notice = document.getElementById('savedProfileNotice');
  const nameSpan = document.getElementById('savedProfileName');
  if (notice && nameSpan) {
    nameSpan.textContent = p.userName;
    notice.style.display = 'flex';
  }

  // 질문 입력 칸으로 부드럽게 안내
  setTimeout(() => {
    const q = document.getElementById('userQuestion');
    if (q) q.focus({ preventScroll: true });
  }, 100);
}

function clearSavedProfile() {
  try { localStorage.removeItem(PROFILE_KEY); } catch {}
  // 폼 초기화
  ['userName', 'userBirthYear', 'userBirthMonth', 'userBirthDay', 'userGender']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  // 안내 박스 숨기기
  const notice = document.getElementById('savedProfileNotice');
  if (notice) notice.style.display = 'none';
  // 이름 칸으로 포커스
  document.getElementById('userName')?.focus();
}

/* ===== Birth Date Selects (Year / Month / Day) ===== */
function buildBirthSelects() {
  const yearEl  = document.getElementById('userBirthYear');
  const monthEl = document.getElementById('userBirthMonth');
  const dayEl   = document.getElementById('userBirthDay');
  if (!yearEl || !monthEl || !dayEl) return;

  const now = new Date();
  const thisYear = now.getFullYear();
  // 년도: 100년 전 ~ 올해
  for (let y = thisYear; y >= thisYear - 100; y--) {
    const o = document.createElement('option');
    o.value = y; o.textContent = y + '년';
    yearEl.appendChild(o);
  }
  // 월: 1~12
  for (let m = 1; m <= 12; m++) {
    const o = document.createElement('option');
    o.value = String(m).padStart(2, '0');
    o.textContent = m + '월';
    monthEl.appendChild(o);
  }
  // 일: 처음엔 31일. 년/월 선택 시 실제 일수로 재생성
  fillDays(31);

  // 월 또는 년 선택 시 일수 재계산 (윤년/짧은달 처리)
  const updateDays = () => {
    const y = parseInt(yearEl.value);
    const m = parseInt(monthEl.value);
    const days = (y && m) ? new Date(y, m, 0).getDate() : 31;
    const prev = dayEl.value;
    fillDays(days);
    if (prev && parseInt(prev) <= days) dayEl.value = prev;
  };
  yearEl.addEventListener('change', updateDays);
  monthEl.addEventListener('change', updateDays);

  function fillDays(n) {
    dayEl.innerHTML = '<option value="">일</option>';
    for (let d = 1; d <= n; d++) {
      const o = document.createElement('option');
      o.value = String(d).padStart(2, '0');
      o.textContent = d + '일';
      dayEl.appendChild(o);
    }
  }
}

/* 년/월/일 → "YYYY-MM-DD" 조합 (없으면 빈 문자열) */
function getBirthValue() {
  const y = document.getElementById('userBirthYear')?.value;
  const m = document.getElementById('userBirthMonth')?.value;
  const d = document.getElementById('userBirthDay')?.value;
  return (y && m && d) ? `${y}-${m}-${d}` : '';
}

/* ===== Build Card Deck ===== */
function buildDeck() {
  const deck = document.getElementById('cardDeck');
  deck.innerHTML = '';
  // Shuffle
  const shuffled = [...TAROT_CARDS].sort(() => Math.random() - 0.5);
  shuffled.forEach(card => {
    const el = document.createElement('div');
    el.className = 'deck-card';
    el.dataset.id = card.id;
    el.title = card.name;
    el.addEventListener('click', () => toggleCard(el, card));
    deck.appendChild(el);
  });
}

function toggleCard(el, card) {
  const idx = selectedCards.findIndex(c => c.id === card.id);
  if (idx > -1) {
    selectedCards.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    if (selectedCards.length >= needed) {
      const first = selectedCards.shift();
      document.querySelector(`.deck-card[data-id="${first.id}"]`)?.classList.remove('selected');
    }
    selectedCards.push({ ...card, isReversed: Math.random() < 0.3 });
    el.classList.add('selected');
    // Sparkle effect
    sparkle(el);
  }
  updateCounter();
}

function sparkle(el) {
  const rect = el.getBoundingClientRect();
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div');
    s.style.cssText = `
      position:fixed;
      width:6px;height:6px;
      border-radius:50%;
      background:${Math.random()>0.5?'#f59e0b':'#a855f7'};
      pointer-events:none;
      z-index:9999;
      left:${rect.left + rect.width/2}px;
      top:${rect.top + rect.height/2}px;
      transition:all 0.6s ease;
      opacity:1;
    `;
    document.body.appendChild(s);
    requestAnimationFrame(() => {
      const angle  = (Math.PI * 2 / 6) * i;
      const dist   = 40 + Math.random() * 30;
      s.style.transform = `translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px)`;
      s.style.opacity   = '0';
    });
    setTimeout(() => s.remove(), 700);
  }
}

function updateCounter() {
  document.getElementById('selectedCount').textContent = selectedCards.length;
  document.getElementById('neededCount').textContent   = `/ ${needed}장 선택`;
  const btn = document.getElementById('step2Next');
  if (!btn) return;
  btn.disabled = selectedCards.length < needed;
  if (selectedCards.length >= needed) {
    btn.textContent = '결과 보기 →';
    btn.classList.add('ready');
  } else {
    btn.textContent = `${needed - selectedCards.length}장 더 선택하세요`;
  }
}

/* ===== Step Navigation ===== */
function setStep(n) {
  [1, 2, 3].forEach(i => {
    document.getElementById(`step${i}`)?.classList.toggle('active', i === n);
    const ps = document.getElementById(`ps${i}`);
    if (ps) {
      ps.classList.remove('active', 'done');
      if (i < n)  ps.classList.add('done');
      if (i === n) ps.classList.add('active');
    }
  });
  [1, 2].forEach(i =>
    document.getElementById(`pl${i}`)?.classList.toggle('done', i < n)
  );
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep1() { setStep(1); }

function goToStep2() {
  const name  = document.getElementById('userName')?.value.trim();
  const birth = getBirthValue();
  const q     = document.getElementById('userQuestion')?.value.trim();
  if (!name || !birth || !q) {
    showFieldError('모든 필수 항목(*)을 입력해주세요.'); return;
  }
  setStep(2);
}

function goToResult() {
  if (selectedCards.length < needed) return;

  const ctx = {
    product,
    selectedCards,
    userName:     document.getElementById('userName')?.value.trim(),
    userBirth:    getBirthValue(),
    userEmail:    document.getElementById('userEmail')?.value.trim(),
    userGender:   document.getElementById('userGender')?.value,
    userQuestion: document.getElementById('userQuestion')?.value.trim(),
  };
  sessionStorage.setItem('tarot_reading_ctx', JSON.stringify(ctx));

  // 같은 폰에서 재방문 시 자동 채움용 — 질문은 매번 다르니 저장 안 함
  saveProfile({
    userName:   ctx.userName,
    userBirth:  ctx.userBirth,
    userGender: ctx.userGender
  });

  window.location.href = 'result.html';
}

function fillQuestion(btn) {
  const ta = document.getElementById('userQuestion');
  if (!ta) return;
  ta.value = btn.textContent.trim();
  ta.focus();
}

function showFieldError(msg) {
  const el = document.getElementById('fieldError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

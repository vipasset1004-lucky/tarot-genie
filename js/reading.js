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

  buildDeck();
  updateCounter();
});

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
  const birth = document.getElementById('userBirth')?.value;
  const email = document.getElementById('userEmail')?.value.trim();
  const q     = document.getElementById('userQuestion')?.value.trim();
  if (!name || !birth || !email || !q) {
    showFieldError('모든 필수 항목(*)을 입력해주세요.'); return;
  }
  if (!email.includes('@')) { showFieldError('올바른 이메일을 입력해주세요.'); return; }
  setStep(2);
}

function goToResult() {
  if (selectedCards.length < needed) return;

  const ctx = {
    product,
    selectedCards,
    userName:     document.getElementById('userName')?.value.trim(),
    userBirth:    document.getElementById('userBirth')?.value,
    userEmail:    document.getElementById('userEmail')?.value.trim(),
    userGender:   document.getElementById('userGender')?.value,
    userQuestion: document.getElementById('userQuestion')?.value.trim(),
  };
  sessionStorage.setItem('tarot_reading_ctx', JSON.stringify(ctx));
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

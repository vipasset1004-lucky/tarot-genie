/* ===== Reading Flow ===== */
let product = null;
let selectedCards = [];
let needed = 1;

window.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('tarot_product');
  if (!raw) { window.location.href = '/'; return; }
  product = JSON.parse(raw);
  needed  = parseInt(product.cards);

  // Populate header
  document.getElementById('productName').textContent = product.name;
  document.getElementById('productPrice').textContent =
    Number(product.price).toLocaleString('ko-KR') + '원';

  // Step 3 order summary
  document.getElementById('orderProductName').textContent = product.name;
  document.getElementById('orderCardCount').textContent   = `${product.cards}장`;
  document.getElementById('orderPrice').textContent       =
    Number(product.price).toLocaleString('ko-KR') + '원';

  buildDeck();
  updateCounter();
});

/* ===== Deck ===== */
function buildDeck() {
  const deck = document.getElementById('cardDeck');
  deck.innerHTML = '';
  TAROT_CARDS.forEach(card => {
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
      // Deselect first selected
      const first = selectedCards.shift();
      document.querySelector(`.deck-card[data-id="${first.id}"]`)?.classList.remove('selected');
    }
    selectedCards.push({ ...card, reversed: Math.random() < 0.3 });
    el.classList.add('selected');
  }
  updateCounter();
}

function updateCounter() {
  document.getElementById('selectedCount').textContent = selectedCards.length;
  document.getElementById('neededCount').textContent   = `/ ${needed}장 선택`;
  const btn = document.getElementById('step2Next');
  if (btn) btn.disabled = selectedCards.length < needed;
}

/* ===== Step Navigation ===== */
function setStep(n) {
  [1, 2, 3].forEach(i => {
    document.getElementById(`step${i}`).classList.toggle('active', i === n);
    const ps = document.getElementById(`ps${i}`);
    if (ps) {
      ps.classList.remove('active', 'done');
      if (i < n)  ps.classList.add('done');
      if (i === n) ps.classList.add('active');
    }
  });
  [1, 2].forEach(i => {
    document.getElementById(`pl${i}`)?.classList.toggle('done', i < n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep1() { setStep(1); }

function goToStep2() {
  const name  = document.getElementById('userName')?.value.trim();
  const birth = document.getElementById('userBirth')?.value;
  const email = document.getElementById('userEmail')?.value.trim();
  const q     = document.getElementById('userQuestion')?.value.trim();
  if (!name || !birth || !email || !q) {
    alert('모든 필수 항목(*)을 입력해주세요.');
    return;
  }
  if (!email.includes('@')) { alert('올바른 이메일을 입력해주세요.'); return; }
  setStep(2);
}

function goToStep3() {
  if (selectedCards.length < needed) {
    alert(`카드를 ${needed}장 선택해주세요.`);
    return;
  }
  setStep(3);
}

/* ===== Toss Payment ===== */
async function requestPayment() {
  const btn = document.getElementById('payBtn');
  btn.disabled = true;
  btn.textContent = '결제 준비 중...';

  const orderId = 'TAROT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  const amount  = parseInt(product.price);

  // Save reading context for result page
  sessionStorage.setItem('tarot_reading_ctx', JSON.stringify({
    product,
    selectedCards,
    userName:     document.getElementById('userName')?.value.trim(),
    userBirth:    document.getElementById('userBirth')?.value,
    userEmail:    document.getElementById('userEmail')?.value.trim(),
    userGender:   document.getElementById('userGender')?.value,
    userQuestion: document.getElementById('userQuestion')?.value.trim(),
    orderId
  }));

  try {
    const clientKey = window.TOSS_CLIENT_KEY || 'test_ck_placeholder';
    const { loadTossPayments } = await import('https://js.tosspayments.com/v2/standard');
    const tossPayments = await loadTossPayments(clientKey);
    const payment = tossPayments.payment({ customerKey: 'guest-' + Date.now() });

    await payment.requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: amount },
      orderId,
      orderName: product.name,
      successUrl: window.location.origin + '/result.html',
      failUrl:    window.location.origin + '/reading.html'
    });
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.textContent = '💳 결제하기';
    if (err.code !== 'USER_CANCEL') alert('결제 중 오류가 발생했습니다. 다시 시도해주세요.');
  }
}

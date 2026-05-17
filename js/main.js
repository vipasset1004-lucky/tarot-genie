/* ===== Star Canvas ===== */
(function initStars() {
  const canvas = document.getElementById('starCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [], shootingStars = [], W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeStar() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.007 + 0.003
    };
  }

  function makeShooter() {
    return {
      x: Math.random() * W * 0.7,
      y: Math.random() * H * 0.4,
      len: Math.random() * 200 + 80,
      angle: Math.PI / 5 + (Math.random() - 0.5) * 0.4,
      speed: Math.random() * 14 + 10,
      alpha: 1,
      active: true
    };
  }

  resize();
  stars = Array.from({ length: 300 }, makeStar);
  window.addEventListener('resize', () => { resize(); stars = Array.from({ length: 300 }, makeStar); });

  let tick = 0;
  (function draw() {
    ctx.clearRect(0, 0, W, H);
    tick++;

    stars.forEach(s => {
      s.phase += s.speed;
      const a = (Math.sin(s.phase) + 1) / 2 * 0.75 + 0.15;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,200,255,${a})`;
      ctx.fill();
    });

    if (tick % 280 === 0) shootingStars.push(makeShooter());
    shootingStars = shootingStars.filter(s => s.active);
    shootingStars.forEach(s => {
      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;
      s.alpha -= 0.016;
      if (s.alpha <= 0) { s.active = false; return; }
      const g = ctx.createLinearGradient(
        s.x - Math.cos(s.angle) * s.len, s.y - Math.sin(s.angle) * s.len, s.x, s.y
      );
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, `rgba(200,180,255,${s.alpha})`);
      ctx.beginPath();
      ctx.moveTo(s.x - Math.cos(s.angle) * s.len, s.y - Math.sin(s.angle) * s.len);
      ctx.lineTo(s.x, s.y);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    });
    requestAnimationFrame(draw);
  })();
})();

/* ===== Cursor Glow ===== */
(function() {
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  document.body.appendChild(glow);
  let mx = 0, my = 0, cx = 0, cy = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function move() {
    cx += (mx - cx) * 0.1;
    cy += (my - cy) * 0.1;
    glow.style.left = cx + 'px';
    glow.style.top  = cy + 'px';
    requestAnimationFrame(move);
  })();
})();

/* ===== Nav Scroll ===== */
window.addEventListener('scroll', () => {
  document.getElementById('nav')?.classList.toggle('scrolled', window.scrollY > 40);
});

/* ===== Scroll Reveal ===== */
(function() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const delay = parseInt(e.target.dataset.delay || 0);
      setTimeout(() => e.target.classList.add('visible'), delay);
      obs.unobserve(e.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();

/* ===== Hero Stats Counter ===== */
(function() {
  function countUp(el, target, suffix) {
    suffix = suffix || el.dataset.suffix || '';
    const duration = 1800;
    const start = performance.now();
    (function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(ease * target);
      el.textContent = value.toLocaleString('ko-KR') + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString('ko-KR') + suffix;
    })(start);
  }

  // 정적 통계 — viewport 진입 시 카운트업
  const staticEls = document.querySelectorAll('[data-count]');
  if (staticEls.length) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        countUp(e.target, parseInt(e.target.dataset.count));
      });
    }, { threshold: 0.5 });
    staticEls.forEach(el => obs.observe(el));
  }

  // 누적 리딩 수 — Upstash Redis 카운터 + 베이스 100 (실 호출마다 +1)
  const readingEl = document.getElementById('readingCountNum');
  if (readingEl) {
    fetch('/api/reading-count')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && typeof data.count === 'number') {
          // 화면에 보이면 카운트업, 아직 안 보이면 바로 텍스트만 갱신
          const rect = readingEl.getBoundingClientRect();
          const visible = rect.top < window.innerHeight && rect.bottom > 0;
          if (visible) countUp(readingEl, data.count);
          else readingEl.textContent = data.count.toLocaleString('ko-KR');
        }
      })
      .catch(() => { /* baseline 100 그대로 유지 */ });
  }
})();

/* ===== 3D Card Tilt ===== */
(function() {
  document.querySelectorAll('.pcard').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `translateY(-6px) perspective(700px) rotateX(${-y * 9}deg) rotateY(${x * 9}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
})();

/* ===== Chatbot ===== */
function toggleChatbot() {
  const win = document.getElementById('chatbotWindow');
  win.classList.toggle('open');
  if (win.classList.contains('open')) document.getElementById('chatInput')?.focus();
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msgs  = document.getElementById('chatMessages');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';

  msgs.appendChild(makeBubble(text, 'user'));
  scrollChat(msgs);

  const typing = makeBubble('...', 'bot typing');
  msgs.appendChild(typing);
  scrollChat(msgs);

  try {
    const res  = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    typing.remove();
    msgs.appendChild(makeBubble(data.reply || '잠시 후 다시 시도해주세요.', 'bot'));
  } catch {
    typing.remove();
    msgs.appendChild(makeBubble('연결에 문제가 있어요. 잠시 후 다시 시도해주세요 🙏', 'bot'));
  }
  scrollChat(msgs);
}

function makeBubble(text, type) {
  const wrap   = document.createElement('div');
  const isUser = type.includes('user');
  wrap.className = `chatbot__msg chatbot__msg--${isUser ? 'user' : 'bot'}${type.includes('typing') ? ' chatbot__msg--typing' : ''}`;
  if (!isUser) {
    const av = document.createElement('span');
    av.className = 'chatbot__msg-avatar';
    av.textContent = '🔮';
    wrap.appendChild(av);
  }
  const bubble = document.createElement('div');
  bubble.className = 'chatbot__msg-text';
  bubble.innerHTML = text.replace(/\n/g, '<br>');
  wrap.appendChild(bubble);
  return wrap;
}

function scrollChat(el) { el.scrollTop = el.scrollHeight; }

/* ===== PLUS 상품 뱃지 (Clarifier 가능 = 1/3/5장) ===== */
(function() {
  const PLUS_PRODUCTS = ['daily', 'curious', 'three', 'yearly', 'comprehensive'];
  document.querySelectorAll('.pcard').forEach(card => {
    if (!PLUS_PRODUCTS.includes(card.dataset.product)) return;
    const plus = document.createElement('div');
    plus.className = 'pcard__plus';
    plus.innerHTML = '✨ <strong>PLUS</strong> 추가 질문 1회 <small>(베타 무료)</small>';
    const tag = card.querySelector('.pcard__tag');
    if (tag) tag.insertAdjacentElement('afterend', plus);
  });
})();

/* ===== Navigation ===== */
function goToReading(btn) {
  const card = btn.closest('[data-product]');
  sessionStorage.setItem('tarot_product', JSON.stringify({
    product: card.dataset.product,
    price:   card.dataset.price,
    cards:   card.dataset.cards,
    name:    card.dataset.name
  }));
  window.location.href = 'reading.html';
}

function scrollToProducts() {
  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
}

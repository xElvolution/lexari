(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stage = $('stage'), body = document.body, email = $('email'), form = $('form'), hint = $('hint'), go = $('go');
  const pupL = $('pupL'), pupR = $('pupR'), bot = $('bot'), eyesOpen = $('eyesOpen');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  const ref = new URLSearchParams(location.search).get('ref') || '';
  const PAL = [['#ff8a3d','#d65f16'],['#3b82f6','#1e4fd6'],['#34d399','#079669'],['#fcd34d','#d19b04'],['#f45b5b','#c42a2a'],['#2dd4bf','#0d8f84'],['#f9a8d4','#d9579e'],['#c9b8ff','#8f6bff'],['#7dd3fc','#0b84c4']];
  let mood = 'idle';
  const setMood = m => { mood = m; stage.dataset.mood = m; body.classList.toggle('valid', m === 'valid'); };

  /* ---- little coworker faces (same family as the landing roster) ---- */
  function face(seed, size) {
    const r = n => { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); };
    const [fill, shade] = PAL[r(PAL.length)];
    const shapes = [
      '<circle cx="50" cy="54" r="38"/>', '<rect x="12" y="18" width="76" height="70" rx="20"/>',
      '<path d="M50 16 C74 14 90 32 88 56 C86 80 70 92 48 90 C26 88 12 74 13 52 C14 30 28 17 50 16 Z"/>',
      '<path d="M50 14 L84 33 L84 73 L50 92 L16 73 L16 33 Z"/>', '<ellipse cx="50" cy="54" rx="34" ry="40"/>',
      '<rect x="8" y="28" width="84" height="60" rx="26"/>'];
    const eyes = [
      '<ellipse cx="38" cy="52" rx="6.5" ry="8.5"/><ellipse cx="62" cy="52" rx="6.5" ry="8.5"/>',
      '<circle cx="38" cy="52" r="4.5"/><circle cx="62" cy="52" r="4.5"/>',
      '<rect x="27" y="45" width="46" height="14" rx="7"/>',
      '<path d="M31 55 Q38 46 45 55" stroke="#0a0a0a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M55 55 Q62 46 69 55" stroke="#0a0a0a" stroke-width="4" fill="none" stroke-linecap="round"/>'];
    const mouths = ['<path d="M42 70 Q50 77 58 70" stroke="#0a0a0a" stroke-width="3.4" fill="none" stroke-linecap="round"/>',
      '<path d="M40 68 Q50 82 60 68 Z"/>', '<ellipse cx="50" cy="72" rx="4" ry="5"/>',
      '<path d="M41 70 Q45.5 76 50 70 Q54.5 76 59 70" stroke="#0a0a0a" stroke-width="3.2" fill="none" stroke-linecap="round"/>'];
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}"><g fill="${fill}" stroke="${shade}" stroke-width="3" stroke-linejoin="round">${shapes[r(shapes.length)]}</g><ellipse cx="36" cy="30" rx="10" ry="5" fill="#fff" opacity=".35" transform="rotate(-20 36 30)"/><g fill="#0a0a0a">${eyes[r(eyes.length)]}${mouths[r(mouths.length)]}</g></svg>`;
  }
  const crewSpots = [[-1,3,1.0],[87,9,.85],[3,25,.7],[90,28,.75],[4,93,.6],[88,95,.65]];
  const crew = $('crew');
  crewSpots.forEach(([x, y, k], i) => {
    const w = document.createElement('div');
    w.innerHTML = face(i * 17 + 3, 10);
    const s = w.firstChild;
    s.style.setProperty('--x', x + '%'); s.style.setProperty('--y', y + '%');
    s.style.setProperty('--s', `calc(${k} * clamp(40px, 11vw, 74px))`);
    s.style.setProperty('--d', (2.4 + i * .5) + 's');
    crew.appendChild(s);
  });

  /* ---- eyes follow the pointer, or the caret while typing ---- */
  let target = null, lastPointer = 0;
  const canvas = document.createElement('canvas').getContext('2d');
  function caretPoint() {
    const r = email.getBoundingClientRect(), cs = getComputedStyle(email);
    canvas.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const w = canvas.measureText(email.value.slice(0, email.selectionStart ?? email.value.length)).width;
    return { x: Math.min(r.left + parseFloat(cs.paddingLeft) + w - email.scrollLeft, r.right), y: r.top + r.height / 2 };
  }
  function look(p) {
    if (!p) { pupL.setAttribute('cx', 70); pupL.setAttribute('cy', 94); pupR.setAttribute('cx', 130); pupR.setAttribute('cy', 94); return; }
    const b = bot.getBoundingClientRect(), sc = b.width / 200;
    [[pupL, 70], [pupR, 130]].forEach(([el, ex]) => {
      const cx = b.left + ex * sc, cy = b.top + 92 * sc;
      const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1, m = Math.min(9, d / 18);
      el.setAttribute('cx', (ex + dx / d * m).toFixed(1)); el.setAttribute('cy', (92 + dy / d * m * 1.4).toFixed(1));
    });
  }
  addEventListener('pointermove', e => { lastPointer = performance.now(); if (document.activeElement !== email) { target = { x: e.clientX, y: e.clientY }; look(target); } }, { passive: true });
  document.addEventListener('selectionchange', () => { if (document.activeElement === email) look(caretPoint()); });
  email.addEventListener('focus', () => look(caretPoint()));
  email.addEventListener('blur', () => { look(target); if (mood === 'typing' || mood === 'unsure') setMood(email.value ? mood : 'idle'); });
  // idle glances when nothing is happening
  setInterval(() => {
    if (reduce || document.activeElement === email || performance.now() - lastPointer < 2500) return;
    const b = bot.getBoundingClientRect();
    look({ x: b.left + b.width / 2 + (Math.random() - .5) * 600, y: b.top + b.height / 2 + (Math.random() - .3) * 400 });
  }, 1800);
  // blink
  (function blink() {
    setTimeout(() => { if (!reduce) { eyesOpen.classList.add('blink'); setTimeout(() => eyesOpen.classList.remove('blink'), 130); } blink(); }, 2200 + Math.random() * 2600);
  })();

  /* ---- reactions to typing ---- */
  const RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;
  const valid = v => RE.test(v.trim()) && v.trim().length <= 254;
  let nod = 0;
  email.addEventListener('input', () => {
    const v = email.value;
    hint.classList.remove('err', 'ok');
    if (!v) { setMood('idle'); hint.textContent = 'One email. Your agent, your rules.'; }
    else if (valid(v)) { if (mood !== 'valid') burst(innerWidth / 2, bot.getBoundingClientRect().bottom - 30, 14, .6); setMood('valid'); hint.textContent = 'Looks great. Claim your agent.'; hint.classList.add('ok'); }
    else { setMood(v.includes('@') && v.length > 4 ? 'unsure' : 'typing'); hint.textContent = v.includes('@') ? 'Almost there...' : 'Keep going...'; }
    look(caretPoint());
    if (!reduce && mood !== 'valid') { const g = $('botBody'); g.style.transform = `translateY(${(nod ^= 1) ? 3 : -2}px) rotate(${nod ? -2 : 2}deg)`; clearTimeout(g._t); g._t = setTimeout(() => g.style.transform = '', 140); }
  });

  /* ---- count ---- */
  const countN = $('countN');
  function animateCount(to) {
    const from = +countN.textContent.replace(/\D/g, '') || 0, st = performance.now();
    const step = now => { const k = Math.min(1, (now - st) / 900); countN.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))).toLocaleString(); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  fetch('/api/stats').then(r => r.json()).then(d => animateCount(d.total)).catch(() => {});

  /* ---- confetti: brand colors plus tiny agent faces ---- */
  const fx = $('fx'), ctx = fx.getContext('2d'); let parts = [], raf = 0;
  const size = () => { const dpr = Math.min(2, devicePixelRatio || 1); fx.width = innerWidth * dpr; fx.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const COLS = ['#5b2bff', '#8f6bff', '#c9b8ff', '#ffffff', '#fcd34d', '#34d399', '#f9a8d4', '#3b82f6'];
  function burst(x, y, n, power = 1) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.3, s = (6 + Math.random() * 9) * power;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4, w: 6 + Math.random() * 7, h: 4 + Math.random() * 6, c: COLS[i % COLS.length], kind: Math.random() < .12 ? 'face' : Math.random() < .5 ? 'rect' : 'dot', life: 0 });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.y < innerHeight + 40 && p.life < 420);
    for (const p of parts) {
      p.life++; p.vy += .28; p.vx *= .985; p.vy *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      if (p.kind === 'rect') ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life / 6)));
      else if (p.kind === 'dot') { ctx.beginPath(); ctx.arc(0, 0, p.h / 1.6, 0, 7); ctx.fill(); }
      else { const s = 18; ctx.fillStyle = '#5b2bff'; ctx.beginPath(); ctx.roundRect(-s / 2, -s / 2, s, s, 5); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-3.5, -2, 2, 2.8, 0, 0, 7); ctx.ellipse(3.5, -2, 2, 2.8, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-4, 3); ctx.quadraticCurveTo(0, 6.5, 4, 3); ctx.stroke(); }
      ctx.restore();
    }
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  /* ---- submit: claim the agent, print the pass, celebrate ---- */
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  const mask = e => { const [u, d] = e.split('@'); return (u.length <= 2 ? u[0] + '*' : u.slice(0, 2) + '*'.repeat(Math.min(5, u.length - 2))) + '@' + d; };
  let busy = false;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    const v = email.value.trim();
    if (!valid(v)) {
      setMood('error'); $('field').classList.remove('shake'); void $('field').offsetWidth; $('field').classList.add('shake');
      hint.textContent = v ? 'That email does not look right.' : 'Type your email first.'; hint.className = 'hint label err';
      setTimeout(() => setMood(v ? 'unsure' : 'idle'), 600); email.focus(); return;
    }
    busy = true; go.disabled = true; go.querySelector('.t').textContent = 'Claiming';
    let data;
    try {
      const res = await fetch('/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v, company: $('company').value, ref, t: Math.round(performance.now() - t0) }) });
      data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Something broke. Try again.');
    } catch (err) {
      busy = false; go.disabled = false; go.querySelector('.t').textContent = 'Claim my agent';
      setMood('error'); hint.textContent = err.message || 'Network hiccup. Try again.'; hint.className = 'hint label err';
      setTimeout(() => setMood('unsure'), 600); return;
    }
    email.blur(); look(null);
    $('intro').classList.add('out');
    await wait(350);
    $('intro').hidden = true;
    stage.classList.add('joined');
    setMood('punch'); stage.classList.add('punching');
    await wait(500);
    // fill the badge
    const n = data.position;
    $('bNum').textContent = '#' + String(n).padStart(4, '0');
    $('bMail').textContent = mask(v);
    $('bDate').textContent = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    $('bFace').innerHTML = face([...data.ref].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 233280, 68);
    $('place').textContent = data.existing ? `Still #${n.toLocaleString()} in line.` : `You're #${n.toLocaleString()} in line.`;
    $('placeSub').textContent = data.existing ? 'You already claimed your agent. Share your link to move up.' : 'Share your link. Every friend who joins moves you up.';
    $('shareUrl').value = data.share;
    const text = `I claimed my Lexari agent pass. #${n} in line for my own personalized AI agent. Your own agent. Your rules. Onchain.`;
    $('openDash').href = '/dashboard?email=' + encodeURIComponent(v);
    $('shareX').href = 'https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(data.share);
    if (!navigator.share) $('shareNative').hidden = true;
    $('shareNative').onclick = () => navigator.share({ title: 'Lexari waitlist', text, url: data.share }).catch(() => {});
    $('done').hidden = false;
    void $('done').offsetWidth;
    $('badgeDrop').classList.add('printing');
    await wait(1650);
    setMood('joined'); stage.classList.remove('punching');
    const b = $('badge').getBoundingClientRect();
    burst(b.left + b.width * .2, b.top + 40, 70, 1.1); burst(b.right - b.width * .2, b.top + 40, 70, 1.1);
    setTimeout(() => burst(innerWidth / 2, innerHeight * .9, 90, 1.4), 250);
    $('after').classList.add('in');
    animateCount(Math.max(data.total, +countN.textContent.replace(/\D/g, '') || 0));
    if (!reduce && navigator.vibrate) navigator.vibrate([20, 40, 30]);
  });
  $('copy').addEventListener('click', async () => {
    const u = $('shareUrl'); try { await navigator.clipboard.writeText(u.value); } catch { u.select(); document.execCommand('copy'); }
    const c = $('copy'); c.textContent = 'Copied'; c.classList.add('ok'); burst(c.getBoundingClientRect().left + 30, c.getBoundingClientRect().top, 18, .5);
    setTimeout(() => { c.textContent = 'Copy'; c.classList.remove('ok'); }, 1600);
  });
  $('badge').addEventListener('click', () => { const b = $('badge').getBoundingClientRect(); burst(b.left + b.width / 2, b.top + 30, 30, .8); });
})();
/* held or hovered: happy face, back to normal on release or leave */
(() => {
  const w = document.getElementById('botWrap'), s = document.getElementById('stage');
  const on = () => s.classList.add('held'), off = () => s.classList.remove('held');
  w.addEventListener('pointerdown', e => { on(); try { w.setPointerCapture(e.pointerId); } catch {} });
  w.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') on(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => w.addEventListener(t, e => { if (e.pointerType !== 'mouse' || !w.matches(':hover')) off(); }));
  w.addEventListener('pointerleave', off);
  w.addEventListener('contextmenu', e => e.preventDefault());
  w.addEventListener('selectstart', e => e.preventDefault());
})();

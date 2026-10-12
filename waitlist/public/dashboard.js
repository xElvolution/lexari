(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const app = $('app'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qs = new URLSearchParams(location.search);
  const ref = qs.get('ref') || '';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n).toLocaleString('en-US');

  /* ---- agent faces, same family as the landing ---- */
  const PAL = [['#ff8a3d','#d65f16'],['#3b82f6','#1e4fd6'],['#34d399','#079669'],['#fcd34d','#d19b04'],['#f45b5b','#c42a2a'],['#2dd4bf','#0d8f84'],['#f9a8d4','#d9579e'],['#c9b8ff','#8f6bff'],['#7dd3fc','#0b84c4']];
  function face(seed, size) {
    const r = n => { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); };
    const [fill, shade] = PAL[r(PAL.length)];
    const shapes = ['<circle cx="50" cy="54" r="38"/>', '<rect x="12" y="18" width="76" height="70" rx="20"/>', '<path d="M50 16 C74 14 90 32 88 56 C86 80 70 92 48 90 C26 88 12 74 13 52 C14 30 28 17 50 16 Z"/>', '<path d="M50 14 L84 33 L84 73 L50 92 L16 73 L16 33 Z"/>', '<ellipse cx="50" cy="54" rx="34" ry="40"/>', '<rect x="8" y="28" width="84" height="60" rx="26"/>'];
    const eyes = ['<ellipse cx="38" cy="52" rx="6.5" ry="8.5"/><ellipse cx="62" cy="52" rx="6.5" ry="8.5"/>', '<circle cx="38" cy="52" r="4.5"/><circle cx="62" cy="52" r="4.5"/>', '<rect x="27" y="45" width="46" height="14" rx="7"/>', '<path d="M31 55 Q38 46 45 55" stroke="#0a0a0a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M55 55 Q62 46 69 55" stroke="#0a0a0a" stroke-width="4" fill="none" stroke-linecap="round"/>'];
    const mouths = ['<path d="M42 70 Q50 77 58 70" stroke="#0a0a0a" stroke-width="3.4" fill="none" stroke-linecap="round"/>', '<path d="M40 68 Q50 82 60 68 Z"/>', '<ellipse cx="50" cy="72" rx="4" ry="5"/>', '<path d="M41 70 Q45.5 76 50 70 Q54.5 76 59 70" stroke="#0a0a0a" stroke-width="3.2" fill="none" stroke-linecap="round"/>'];
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="f" aria-hidden="true"><g fill="${fill}" stroke="${shade}" stroke-width="3" stroke-linejoin="round">${shapes[r(shapes.length)]}</g><ellipse cx="36" cy="30" rx="10" ry="5" fill="#fff" opacity=".35" transform="rotate(-20 36 30)"/><g fill="#0a0a0a">${eyes[r(eyes.length)]}${mouths[r(mouths.length)]}</g></svg>`;
  }
  const seedOf = s => [...String(s)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 233280;
  [[-2,8,1],[90,14,.8],[2,46,.6],[93,52,.7],[6,88,.65],[86,90,.6]].forEach(([x, y, k], i) => {
    const w = document.createElement('div'); w.innerHTML = face(i * 17 + 3, 10); const s = w.firstChild;
    s.style.setProperty('--x', x + '%'); s.style.setProperty('--y', y + '%'); s.style.setProperty('--s', `calc(${k} * clamp(40px, 9vw, 70px))`); s.style.setProperty('--d', (2.4 + i * .5) + 's');
    $('crew').appendChild(s);
  });

  /* ---- confetti ---- */
  const fx = $('fx'), ctx = fx.getContext('2d'); let parts = [], raf = 0;
  const size = () => { const dpr = Math.min(2, devicePixelRatio || 1); fx.width = innerWidth * dpr; fx.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const COLS = ['#5b2bff', '#8f6bff', '#c9b8ff', '#ffffff', '#fcd34d', '#34d399', '#f9a8d4', '#3b82f6'];
  function burst(x, y, n, power = 1) {
    if (reduce) return;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.3, s = (6 + Math.random() * 9) * power; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4, w: 6 + Math.random() * 7, h: 4 + Math.random() * 6, c: COLS[i % COLS.length], dot: Math.random() < .5, life: 0 }); }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.y < innerHeight + 40 && p.life < 420);
    for (const p of parts) { p.life++; p.vy += .28; p.vx *= .985; p.vy *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; if (p.dot) { ctx.beginPath(); ctx.arc(0, 0, p.h / 1.6, 0, 7); ctx.fill(); } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life / 6))); ctx.restore(); }
    raf = parts.length ? requestAnimationFrame(tick) : 0;
  }
  const burstAt = (el, n = 30, pw = .7) => { const b = el.getBoundingClientRect(); burst(b.left + b.width / 2, b.top + b.height / 2, n, pw); };
  let toastT; function toast(msg) { let t = document.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }

  function countUp(el, to, prefix = '') {
    const from = +String(el.textContent).replace(/\D/g, '') || 0, st = performance.now();
    if (reduce || from === to) { el.textContent = prefix + fmt(to); return; }
    const step = now => { const k = Math.min(1, (now - st) / 1000); el.textContent = prefix + fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  fetch('/api/stats').then(r => r.json()).then(d => countUp($('countN'), d.total)).catch(() => {});

  const api = async (url, opts = {}) => {
    const res = await fetch(url, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw Object.assign(new Error(data.error || 'Something broke. Try again.'), { status: res.status });
    return data;
  };
  const show = v => { app.dataset.view = v; app.removeAttribute('aria-busy'); $('gate').hidden = v !== 'gate'; $('board').hidden = v !== 'board'; $('signout').hidden = v !== 'board'; };

  /* ================= sign-in gate (Privy email code) ================= */
  const gate = $('gate'), hint = $('hint'), email = $('email'), code = $('code');
  const setMood = m => { gate.dataset.mood = m; document.body.classList.toggle('valid', m === 'valid'); };
  const RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;
  const say = (t, cls = '') => { hint.textContent = t; hint.className = 'hint label' + (cls ? ' ' + cls : ''); };
  let cfg = null, privyReady = null, pendingEmail = '';
  function loadPrivy() {
    if (privyReady) return privyReady;
    privyReady = (async () => {
      cfg = cfg || await api('/api/config');
      if (!cfg.privyAppId) throw new Error('Email sign-in is not set up yet.');
      if (!window.LexariPrivy) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = '/privy.js'; s.onload = ok; s.onerror = () => no(new Error('Sign-in could not load. Check your connection.')); document.head.appendChild(s); });
      await window.LexariPrivy.init(cfg.privyAppId, cfg.privyClientId);
    })();
    privyReady.catch(() => { privyReady = null; });
    return privyReady;
  }
  // eyes follow the pointer, like the landing
  const pupL = $('pupL'), pupR = $('pupR'), bot = $('bot');
  addEventListener('pointermove', e => {
    if (gate.hidden || !bot) return;
    const b = bot.getBoundingClientRect(), sc = b.width / 200;
    [[pupL, 70], [pupR, 130]].forEach(([el, ex]) => { const cx = b.left + ex * sc, cy = b.top + 92 * sc, dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1, m = Math.min(9, d / 18); el.setAttribute('cx', (ex + dx / d * m).toFixed(1)); el.setAttribute('cy', (92 + dy / d * m * 1.4).toFixed(1)); });
  }, { passive: true });
  (function blink() { setTimeout(() => { const e = $('eyesOpen'); if (!reduce && e) { e.classList.add('blink'); setTimeout(() => e.classList.remove('blink'), 130); } blink(); }, 2400 + Math.random() * 2600); })();
  email.addEventListener('input', () => { const v = email.value.trim(); if (!v) { setMood('idle'); say('Secure sign-in by Privy. No password.'); } else if (RE.test(v)) { setMood('valid'); say('Looks great. We will email you a code.', 'ok'); } else setMood(v.includes('@') ? 'unsure' : 'typing'); });
  code.addEventListener('input', () => { code.value = code.value.replace(/\D/g, '').slice(0, 6); setMood(code.value.length === 6 ? 'valid' : 'typing'); if (code.value.length === 6) $('codeForm').requestSubmit(); });
  const busy = (btn, on, label) => { btn.disabled = on; btn.querySelector('.t').textContent = label; };
  const fail = (field, msg) => { setMood('error'); field.classList.remove('shake'); void field.offsetWidth; field.classList.add('shake'); say(msg, 'err'); setTimeout(() => setMood('unsure'), 600); };

  $('emailForm').addEventListener('submit', async e => {
    e.preventDefault();
    const v = email.value.trim().toLowerCase();
    if (!RE.test(v)) return fail($('field'), v ? 'That email does not look right.' : 'Type your email first.');
    busy($('go'), true, 'Sending');
    try {
      await loadPrivy();
      await window.LexariPrivy.sendCode(v);
      pendingEmail = v;
      $('emailForm').hidden = true; $('codeForm').hidden = false; $('codeForm').classList.add('in');
      $('gateTitle').innerHTML = 'Check your<br>inbox.'; $('gateSub').textContent = `We sent a 6 digit code to ${v}. It expires in a few minutes.`;
      say('Type the code to open your dashboard.', 'ok'); setMood('joined'); code.focus();
    } catch (err) { fail($('field'), niceErr(err)); }
    busy($('go'), false, 'Send code');
  });
  $('codeForm').addEventListener('submit', async e => {
    e.preventDefault();
    if ($('verify').disabled) return;
    if (code.value.length !== 6) return fail($('codeField'), 'The code has 6 digits.');
    busy($('verify'), true, 'Checking');
    try {
      const tokens = await window.LexariPrivy.login(pendingEmail, code.value);
      await api('/api/auth/privy', { method: 'POST', body: JSON.stringify({ ...tokens, ref }) });
      setMood('joined'); burstAt($('bot'), 80, 1.1);
      await load(true);
    } catch (err) { code.value = ''; fail($('codeField'), niceErr(err)); }
    busy($('verify'), false, 'Open dashboard');
  });
  $('changeEmail').addEventListener('click', () => { $('codeForm').hidden = true; $('emailForm').hidden = false; $('emailForm').classList.add('in'); $('gateTitle').innerHTML = 'Open your<br>agent dashboard.'; $('gateSub').textContent = 'Sign in with a one-time code sent to your email. Track your spot, points and referrals.'; setMood('idle'); email.focus(); });
  function niceErr(err) {
    const m = String(err && (err.message || err.error) || '');
    if (/invalid.*code|incorrect|expired/i.test(m)) return 'That code did not work. Check it and try again.';
    if (/origin/i.test(m)) return 'Sign-in is not enabled for this site yet.';
    if (/rate|too many/i.test(m)) return 'Too many tries. Wait a minute and try again.';
    return m && m.length < 120 ? m : 'Something broke. Try again.';
  }
  $('signout').addEventListener('click', async () => { try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } catch {} try { await loadPrivy(); await window.LexariPrivy.logout(); } catch {} location.href = '/dashboard'; });

  /* ================= dashboard ================= */
  const ICONS = {
    x: '<svg viewBox="0 0 24 24"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.9 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.2L4.4 7H19.6L12 12.2zM4 9.1V17h16V9.1l-8 5.4-8-5.4z"/></svg>',
    friends: '<svg viewBox="0 0 24 24"><path d="M9 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm8 1a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM1 20c0-3.9 3.6-6.5 8-6.5s8 2.6 8 6.5H1zm17.4 0c0-2.2-.8-4.1-2.2-5.4 3.7-.5 6.8 1.5 6.8 5.4h-4.6z"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L21 7.5l-1.4-1.4z"/></svg>',
  };
  const icFor = k => k === 'verify_email' ? ICONS.mail : k === 'referral' ? ICONS.friends : /_x$/.test(k) ? ICONS.x : ICONS.chat;
  let D = null, first = true;
  const shareText = d => `I claimed my Lexari agent pass. #${d.position} in line for my own personalized AI agent. Your own agent. Your rules. Onchain.`;
  const xIntent = d => 'https://x.com/intent/post?text=' + encodeURIComponent(shareText(d)) + '&url=' + encodeURIComponent(d.share);

  function heroBot() {
    const src = $('bot'); const c = src.cloneNode(true);
    c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    c.querySelector('g').setAttribute('class', 'body');
    c.querySelector('.eyes-happy').querySelectorAll('path').forEach(p => p.style.opacity = 1);
    c.querySelectorAll('.sclera,.pupil').forEach(n => n.style.opacity = 0);
    c.querySelector('.mouth').style.opacity = 0; const mb = c.querySelector('.mouth-big'); mb.style.opacity = 1; mb.style.transform = 'scaleY(1)';
    c.querySelectorAll('.blush ellipse').forEach(n => n.style.opacity = .85);
    c.querySelectorAll('.sparks path').forEach((n, i) => { n.style.animation = 'spark 1.1s ease-in-out infinite'; n.style.animationDelay = i * .45 + 's'; });
    $('heroBot').replaceChildren(c);
    $('heroBot').onclick = () => burstAt($('heroBot'), 40, .9);
  }

  function render(d, celebrate) {
    const prev = D; D = d;
    $('hello').textContent = `Agent pass / ${d.me.masked}`;
    $('spotTitle').textContent = `You're #${fmt(d.position)} in line.`;
    $('spotSub').textContent = d.top100.inTop ? 'You are inside the top 100 by points. Keep climbing to hold your spot.' : 'Earn points to climb toward the top 100 rewards.';
    countUp($('sSpot'), d.position, '#'); $('sTotal').textContent = `of ${fmt(d.total)}`;
    countUp($('sRank'), d.rank, '#'); countUp($('sPts'), d.points); $('sPtsSub').textContent = 'waitlist points';
    if (prev && prev.points !== d.points) { const s = $('sPts').closest('.stat'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); }
    countUp($('countN'), d.total);
    // progress toward top 100
    const pct = Math.round(d.top100.progress * 100);
    requestAnimationFrame(() => { $('pFill').style.width = pct + '%'; $('pBot').style.left = `clamp(15px, ${pct}%, calc(100% - 15px))`; });
    $('pBar').setAttribute('aria-valuenow', pct);
    $('pState').textContent = d.top100.inTop ? 'In the top 100' : `${pct}%`; $('pState').classList.toggle('ok', d.top100.inTop);
    $('pNote').textContent = d.top100.inTop ? `You rank #${fmt(d.rank)} by points. The top 100 at launch get rewards.` : `${fmt(d.top100.need)} more points puts you in the top 100. One friend joining adds 50.`;
    // share
    $('shareUrl').value = d.share; $('shareX').href = xIntent(d);
    $('banner').src = d.banner; $('bannerLink').href = d.banner; $('bannerDl').href = d.banner; $('bannerDl').setAttribute('download', `lexari-agent-pass-${d.position}.png`);
    if (!navigator.share) $('shareNative').hidden = true;
    // tasks
    const doneN = d.tasks.filter(t => t.done).length, oneOff = d.tasks.filter(t => t.kind !== 'repeat').length;
    $('tDone').textContent = `${doneN} of ${oneOff} done`;
    $('tasks').innerHTML = d.tasks.map(t => {
      let act;
      if (t.kind === 'repeat') act = `<button class="t-btn alt" data-copy type="button">Copy link</button>`;
      else if (t.done) act = `<span class="t-tag">Earned</span>`;
      else if (t.kind === 'auto') act = `<span class="t-tag">Auto</span>`;
      else if (t.key === 'share_x') act = `<a class="t-btn" data-task="${t.key}" href="${esc(xIntent(d))}" target="_blank" rel="noopener">Post</a>`;
      else act = `<a class="t-btn" data-task="${t.key}" href="${esc(t.url)}" target="_blank" rel="noopener">Open</a>`;
      const sub = t.kind === 'repeat' ? `${esc(t.body)} ${t.count ? `${t.count} joined so far.` : ''}` : t.kind === 'self' && !t.done ? `${esc(t.body)} Counted once, on your word.` : esc(t.body);
      return `<li class="task${t.done ? ' is-done' : ''}" data-key="${t.key}"><span class="t-ic">${t.done ? ICONS.check : icFor(t.key)}</span><span class="t-txt"><b>${esc(t.title)}</b><span>${sub}</span></span><span class="t-act"><span class="t-pts">+${t.pts}${t.kind === 'repeat' ? ' each' : ''}</span>${act}</span></li>`;
    }).join('');
    // leaderboard
    $('lb').innerHTML = d.leaderboard.map(r => `<li class="${r.me ? 'me' : ''}"><span class="n">${r.rank}</span>${face(seedOf(r.seed), 30)}<span class="w">${esc(r.who)}</span><span class="p">${fmt(r.pts)}</span></li>`).join('')
      + (d.leaderboard.some(r => r.me) ? '' : `<li class="me"><span class="n">${fmt(d.rank)}</span>${face(seedOf(d.me.code), 30)}<span class="w">You</span><span class="p">${fmt(d.points)}</span></li>`);
    // referrals
    $('rCount').textContent = d.referrals.length;
    $('refs').innerHTML = d.referrals.length ? d.referrals.map(r => `<li>${face(seedOf(r.who), 28)}<span class="w">${esc(r.who)}</span><span class="d">${new Date(r.joined).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span><span class="p">+${r.pts}</span></li>`).join('')
      : `<li class="empty">${face(seedOf(d.me.code) + 11, 54)}<span>No referrals yet. Share your link and every friend who joins adds 50 points.</span></li>`;
    if (first) { heroBot(); first = false; }
    if (celebrate) setTimeout(() => { burstAt($('heroBot'), 70, 1.1); burst(innerWidth / 2, innerHeight * .9, 80, 1.3); }, 350);
  }

  async function load(celebrate) {
    try { render(await api('/api/me'), celebrate); show('board'); if (qs.has('email')) history.replaceState(null, '', '/dashboard'); }
    catch (err) {
      if (err.status !== 401) { show('gate'); say(err.message, 'err'); return; }
      show('gate');
      const pre = (qs.get('email') || '').trim();
      if (pre) { email.value = pre; email.dispatchEvent(new Event('input')); }
      loadPrivy().catch(e => say(niceErr(e), 'err'));
    }
  }

  async function copyLink(btn) {
    const u = $('shareUrl'); try { await navigator.clipboard.writeText(u.value); } catch { u.select(); document.execCommand('copy'); }
    const old = btn.textContent; btn.textContent = 'Copied'; btn.classList.add('ok'); burstAt(btn, 18, .5); setTimeout(() => { btn.textContent = old; btn.classList.remove('ok'); }, 1600);
  }
  $('copy').addEventListener('click', e => copyLink(e.currentTarget));
  $('shareNative').addEventListener('click', () => D && navigator.share({ title: 'Lexari waitlist', text: shareText(D), url: D.share }).catch(() => {}));
  const claim = async key => {
    try { const d = await api('/api/tasks/' + key, { method: 'POST', body: '{}' }); render(d); if (d.awarded) { const li = document.querySelector(`[data-key="${key}"]`); li && burstAt(li, 40, .8); toast(`+${d.tasks.find(t => t.key === key).pts} points`); } }
    catch (err) { toast(err.message); if (err.status === 401) location.reload(); }
  };
  $('shareX').addEventListener('click', () => { if (D && D.tasks.some(t => t.key === 'share_x' && !t.done)) setTimeout(() => claim('share_x'), 1200); });
  $('tasks').addEventListener('click', e => {
    const c = e.target.closest('[data-copy]'); if (c) return copyLink(c);
    const a = e.target.closest('[data-task]'); if (!a) return;
    a.textContent = 'Opening'; a.setAttribute('aria-disabled', 'true');
    // opened in a new tab; count it once the person is back
    setTimeout(() => claim(a.dataset.task), 1200);
  });
  load(false);
})();

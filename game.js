(() => {
  const cv = document.getElementById('game'), ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const $ = id => document.getElementById(id);
  let best = 0;
  try { best = +localStorage.getItem('fireflyBest') || 0; } catch (e) {}
  $('best').textContent = best;

  let state = 'menu', score, lives, flies, bats, p, t, spawnBat, hurt;
  const keys = {};
  const rand = (a, b) => a + Math.random() * (b - a);

  function reset() {
    score = 0; lives = 3; t = 0; spawnBat = 90; hurt = 0;
    p = { x: W / 2, y: H / 2, r: 18, tx: null, ty: null };
    flies = []; bats = [];
    for (let i = 0; i < 6; i++) addFly();
    sync();
  }
  function addFly() {
    flies.push({ x: rand(30, W - 30), y: rand(40, H - 60), a: rand(0, 6.28), ph: rand(0, 6.28) });
  }
  function addBat() {
    const s = 2 + Math.min(score / 12, 3);
    bats.push({ x: W + 30, y: rand(30, H - 60), vx: -rand(s, s + 1.5), ph: rand(0, 6.28) });
  }
  function sync() { $('score').textContent = score; $('lives').textContent = lives; }

  function start() { reset(); state = 'play'; }
  function end() {
    state = 'over';
    if (score > best) { best = score; try { localStorage.setItem('fireflyBest', best); } catch (e) {} $('best').textContent = best; }
  }

  addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') { e.preventDefault(); if (state !== 'play') start(); }
    if (e.key.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

  function pointer(e) {
    const r = cv.getBoundingClientRect();
    p.tx = (e.clientX - r.left) * W / r.width;
    p.ty = (e.clientY - r.top) * H / r.height;
  }
  cv.addEventListener('pointerdown', e => { if (state !== 'play') start(); pointer(e); });
  cv.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') pointer(e); });
  cv.addEventListener('pointerup', () => { p.tx = p.ty = null; });

  function update() {
    t++;
    const sp = 4.2;
    let dx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
    let dy = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
    if (dx || dy) { const m = Math.hypot(dx, dy); p.x += dx / m * sp; p.y += dy / m * sp; p.tx = p.ty = null; }
    else if (p.tx != null) { p.x += (p.tx - p.x) * 0.18; p.y += (p.ty - p.y) * 0.18; }
    p.x = Math.max(p.r, Math.min(W - p.r, p.x));
    p.y = Math.max(p.r, Math.min(H - p.r, p.y));

    flies.forEach(f => {
      f.a += rand(-0.15, 0.15);
      f.x += Math.cos(f.a) * 0.8; f.y += Math.sin(f.a) * 0.8;
      if (f.x < 10 || f.x > W - 10) f.a = Math.PI - f.a;
      if (f.y < 10 || f.y > H - 10) f.a = -f.a;
    });
    flies = flies.filter(f => {
      if (Math.hypot(f.x - p.x, f.y - p.y) < p.r + 8) { score++; sync(); return false; }
      return true;
    });
    while (flies.length < 6) addFly();

    if (--spawnBat <= 0) { addBat(); spawnBat = Math.max(35, 100 - score * 2); }
    bats.forEach(b => { b.x += b.vx; b.y += Math.sin((t + b.ph * 10) / 12) * 1.5; });
    bats = bats.filter(b => {
      if (b.x < -40) return false;
      if (!hurt && Math.hypot(b.x - p.x, b.y - p.y) < p.r + 14) {
        lives--; hurt = 60; sync();
        if (lives <= 0) end();
        return false;
      }
      return true;
    });
    if (hurt) hurt--;
  }

  function glow(x, y, r, c) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(255,212,92,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill();
  }
  function text(s, y, size, color) {
    ctx.fillStyle = color || '#d9efe6'; ctx.textAlign = 'center';
    ctx.font = `800 ${size}px "Bricolage Grotesque", system-ui, sans-serif`;
    ctx.fillText(s, W / 2, y);
  }

  function draw() {
    ctx.fillStyle = '#0b2227'; ctx.fillRect(0, 0, W, H);
    // reeds
    ctx.strokeStyle = '#2f5d50'; ctx.lineWidth = 3;
    for (let x = 10; x < W; x += 26) {
      const h = 30 + (x * 7 % 40), sway = Math.sin(t / 40 + x) * 4;
      ctx.beginPath(); ctx.moveTo(x, H); ctx.quadraticCurveTo(x + sway, H - h / 2, x + sway * 1.5, H - h); ctx.stroke();
    }
    flies.forEach(f => {
      const pulse = 0.6 + 0.4 * Math.sin(t / 10 + f.ph);
      glow(f.x, f.y, 22 * pulse + 6, 'rgba(255,212,92,.9)');
      ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, 6.28); ctx.fill();
    });
    bats.forEach(b => {
      const flap = Math.sin(t / 3 + b.ph) * 10;
      ctx.fillStyle = '#05100f';
      ctx.beginPath(); ctx.moveTo(b.x, b.y);
      ctx.quadraticCurveTo(b.x + 10, b.y - 14 + flap, b.x + 26, b.y - 4);
      ctx.quadraticCurveTo(b.x + 12, b.y + 2, b.x, b.y + 8);
      ctx.quadraticCurveTo(b.x - 12, b.y + 2, b.x - 26, b.y - 4);
      ctx.quadraticCurveTo(b.x - 10, b.y - 14 + flap, b.x, b.y); ctx.fill();
      ctx.fillStyle = '#ff6b5e';
      ctx.fillRect(b.x - 5, b.y, 3, 3); ctx.fillRect(b.x + 2, b.y, 3, 3);
    });
    // jar
    if (!hurt || t % 8 < 4) {
      glow(p.x, p.y, 44, 'rgba(255,212,92,.35)');
      ctx.fillStyle = 'rgba(217,239,230,.22)'; ctx.strokeStyle = '#d9efe6'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(p.x - 14, p.y - 15, 28, 32, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a8c686'; ctx.fillRect(p.x - 11, p.y - 21, 22, 6);
    }
    if (state === 'menu') { text('Firefly Jar', H / 2 - 10, 44, '#ffd45c'); text('Press Space or tap to start', H / 2 + 30, 20); }
    if (state === 'over') { text('Lights out', H / 2 - 10, 44, '#ffd45c'); text(`You caught ${score}. Space or tap to retry`, H / 2 + 30, 20); }
  }

  reset();
  (function loop() { if (state === 'play') update(); else t++; draw(); requestAnimationFrame(loop); })();
})();

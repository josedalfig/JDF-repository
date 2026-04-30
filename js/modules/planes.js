/**
 * modules/planes.js — Subtle animated planes in background
 * Pure canvas, no DOM elements, zero performance impact.
 * Uses canvas paths (not emoji) so orientation is consistent on all platforms.
 */

(function(){
  const canvas = document.getElementById('planesCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, planes = [], animId;

  // ── Config ───────────────────────────────────────────────────────
  const CFG = {
    count:    window.innerWidth < 600 ? 4 : 6, // fewer planes on mobile
    minSpeed: 0.25,
    maxSpeed: 0.55,
    minSize:  8,
    maxSize:  16,
    opacity:  0.11,
  };

  // ── Helpers ──────────────────────────────────────────────────────
  function rand(min, max){ return min + Math.random() * (max - min); }

  // ── Draw plane shape pointing RIGHT (0°) ─────────────────────────
  // Canvas rotation then handles direction of travel.
  function _drawPlane(ctx, s) {
    // Fuselage — nose points right (+x)
    ctx.beginPath();
    ctx.moveTo( s,       0        );  // nose
    ctx.lineTo(-s * .5, -s * .22  );  // upper-rear fuselage
    ctx.lineTo(-s * .7,  0        );  // tail
    ctx.lineTo(-s * .5,  s * .22  );  // lower-rear fuselage
    ctx.closePath();
    ctx.fill();

    // Upper wing
    ctx.beginPath();
    ctx.moveTo( s * .2,  -s * .12 );  // wing root (forward)
    ctx.lineTo(-s * .22, -s * .12 );  // wing root (rear)
    ctx.lineTo(-s * .42, -s * .82 );  // wing tip (rear)
    ctx.lineTo(-s * .08, -s * .82 );  // wing tip (forward)
    ctx.closePath();
    ctx.fill();

    // Lower wing (mirror)
    ctx.beginPath();
    ctx.moveTo( s * .2,   s * .12 );
    ctx.lineTo(-s * .08,  s * .82 );
    ctx.lineTo(-s * .42,  s * .82 );
    ctx.lineTo(-s * .22,  s * .12 );
    ctx.closePath();
    ctx.fill();

    // Tail fin
    ctx.beginPath();
    ctx.moveTo(-s * .48, -s * .1  );
    ctx.lineTo(-s * .68, -s * .1  );
    ctx.lineTo(-s * .84, -s * .46 );
    ctx.lineTo(-s * .58, -s * .46 );
    ctx.closePath();
    ctx.fill();
  }

  // ── Spawn ────────────────────────────────────────────────────────
  function spawnPlane(){
    const edge = Math.floor(Math.random() * 4);
    let x, y, angle;

    switch(edge){
      case 0: x = rand(0,W); y = -30;    angle = rand(20,  160); break; // top
      case 1: x = W + 30;   y = rand(0,H); angle = rand(110,250); break; // right
      case 2: x = rand(0,W); y = H + 30; angle = rand(200,340); break; // bottom
      default:x = -30;      y = rand(0,H); angle = rand(-70, 70); break; // left
    }

    const size  = rand(CFG.minSize, CFG.maxSize);
    const speed = rand(CFG.minSpeed, CFG.maxSpeed);
    const rad   = angle * Math.PI / 180;

    return {
      x, y,
      vx: Math.cos(rad) * speed,
      vy: Math.sin(rad) * speed,
      angle,
      size,
      alpha: CFG.opacity * rand(0.6, 1.4),
    };
  }

  function isOffScreen(p){
    const m = 60;
    return p.x < -m || p.x > W + m || p.y < -m || p.y > H + m;
  }

  // ── Resize ───────────────────────────────────────────────────────
  function resize(){
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    // setTransform resets before scaling — prevents accumulation on repeated resizes
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── Draw ─────────────────────────────────────────────────────────
  function draw(){
    ctx.clearRect(0, 0, W, H);

    planes.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle * Math.PI / 180);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = '#f5efe6';
      _drawPlane(ctx, p.size);
      ctx.restore();
    });
  }

  // ── Tick ─────────────────────────────────────────────────────────
  function tick(){
    planes.forEach(p => { p.x += p.vx; p.y += p.vy; });
    planes = planes.map(p => isOffScreen(p) ? spawnPlane() : p);
    draw();
    animId = requestAnimationFrame(tick);
  }

  // ── Init ─────────────────────────────────────────────────────────
  function init(){
    resize();

    planes = Array.from({ length: CFG.count }, () => {
      const p = spawnPlane();
      // Scatter planes across the screen at startup
      const t = rand(0.1, 0.9);
      p.x += p.vx * W * t / Math.abs(p.vx || 1);
      p.y += p.vy * H * t / Math.abs(p.vy || 1);
      return p;
    });

    tick();
  }

  // ── Pause when tab hidden ────────────────────────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else tick();
  });

  window.addEventListener('resize', () => {
    cancelAnimationFrame(animId);
    resize();
    tick();
  });

  window.addEventListener('load', init);
})();

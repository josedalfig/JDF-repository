/**
 * modules/planes.js — Subtle animated planes in background
 * Pure canvas paths — consistent orientation on all platforms/browsers.
 */

(function(){
  const canvas = document.getElementById('planesCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, planes = [], animId;

  const CFG = {
    count:    window.innerWidth < 600 ? 4 : 6,
    minSpeed: 0.25,
    maxSpeed: 0.55,
    minSize:  10,   // half-length of fuselage
    maxSize:  18,
    opacity:  0.13,
  };

  function rand(min, max){ return min + Math.random() * (max - min); }

  // ── Plane silhouette pointing RIGHT ──────────────────────────────
  // s = half-fuselage-length. All dimensions relative to s.
  // Fuselage dominates; wings are ~50 % of fuselage span so it reads
  // clearly as a plane and not a bird/cross.
  function _drawPlane(ctx, s) {

    // ① Fuselage — rounded nose, commercial airliner body
    ctx.beginPath();
    ctx.moveTo( s * 0.82,  0        );  // nose (rounded, not pointy)
    ctx.lineTo( s * 0.50, -s * .10  );  // upper-front
    ctx.lineTo(-s * 0.80, -s * .10  );  // upper-rear
    ctx.lineTo(-s * 0.92,  0        );  // tail end
    ctx.lineTo(-s * 0.80,  s * .10  );  // lower-rear
    ctx.lineTo( s * 0.50,  s * .10  );  // lower-front
    ctx.closePath();
    ctx.fill();

    // ② Main wings — slightly swept, positioned mid-body
    ctx.beginPath();
    ctx.moveTo( s * 0.22, -s * .09 );  // root forward
    ctx.lineTo(-s * 0.06, -s * .09 );  // root rearward
    ctx.lineTo(-s * 0.24, -s * .52 );  // tip rearward
    ctx.lineTo(-s * 0.02, -s * .52 );  // tip forward
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo( s * 0.22,  s * .09 );
    ctx.lineTo(-s * 0.02,  s * .52 );
    ctx.lineTo(-s * 0.24,  s * .52 );
    ctx.lineTo(-s * 0.06,  s * .09 );
    ctx.closePath();
    ctx.fill();

    // ③ Tail fins — much smaller (passenger jet, not fighter)
    ctx.beginPath();
    ctx.moveTo(-s * 0.62, -s * .09 );
    ctx.lineTo(-s * 0.74, -s * .09 );
    ctx.lineTo(-s * 0.84, -s * .20 );  // ← smaller (was .30)
    ctx.lineTo(-s * 0.65, -s * .20 );
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-s * 0.62,  s * .09 );
    ctx.lineTo(-s * 0.65,  s * .20 );
    ctx.lineTo(-s * 0.84,  s * .20 );
    ctx.lineTo(-s * 0.74,  s * .09 );
    ctx.closePath();
    ctx.fill();
  }

  // ── Spawn ────────────────────────────────────────────────────────
  function spawnPlane(){
    const edge = Math.floor(Math.random() * 4);
    let x, y, angle;

    switch(edge){
      case 0: x = rand(0,W); y = -40;    angle = rand( 20, 160); break; // top
      case 1: x = W + 40;   y = rand(0,H); angle = rand(110, 250); break; // right
      case 2: x = rand(0,W); y = H + 40; angle = rand(200, 340); break; // bottom
      default:x = -40;      y = rand(0,H); angle = rand(-70,  70); break; // left
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

  // ── Resize — setTransform resets before scaling ──────────────────
  function resize(){
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
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
      const t = rand(0.1, 0.9);
      p.x += p.vx * W * t / Math.abs(p.vx || 1);
      p.y += p.vy * H * t / Math.abs(p.vy || 1);
      return p;
    });
    tick();
  }

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

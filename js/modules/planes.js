/**
 * modules/planes.js — Subtle animated planes in background
 * Pure canvas, no DOM elements, zero performance impact.
 * Planes are very faint, random routes, never distracting.
 */

(function(){
  const canvas = document.getElementById('planesCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, planes = [], animId;

  // ── Config ───────────────────────────────────────────────────────
  const CFG = {
    count:     6,          // number of simultaneous planes
    minSpeed:  0.25,       // px/frame
    maxSpeed:  0.55,
    minScale:  1.2,
    maxScale:  2.2,
    opacity:   0.11,
    spawnEdge: true,       // planes come from edges
  };

  // Plane emoji rendered to canvas
  const GLYPH = '✈';

  // ── Helpers ──────────────────────────────────────────────────────
  function rand(min, max){ return min + Math.random() * (max - min); }

  function spawnPlane(){
    // Pick a random edge to start from
    const edge = Math.floor(Math.random() * 4); // 0=top,1=right,2=bottom,3=left
    let x, y, angle;

    switch(edge){
      case 0: x = rand(0, W); y = -30;     angle = rand(20, 160);   break; // top
      case 1: x = W + 30;    y = rand(0,H); angle = rand(110, 250); break; // right
      case 2: x = rand(0, W); y = H + 30;  angle = rand(200, 340);  break; // bottom
      default:x = -30;       y = rand(0,H); angle = rand(-70, 70);  break; // left
    }

    const scale = rand(CFG.minScale, CFG.maxScale);
    const speed = rand(CFG.minSpeed, CFG.maxSpeed);
    const rad   = (angle * Math.PI) / 180;

    return {
      x, y,
      vx: Math.cos(rad) * speed,
      vy: Math.sin(rad) * speed,
      angle,
      scale,
      // Slightly vary opacity per plane
      alpha: CFG.opacity * rand(0.6, 1.4),
      // Font size proportional to scale
      fontSize: Math.round(14 * scale),
    };
  }

  function isOffScreen(p){
    const margin = 60;
    return p.x < -margin || p.x > W + margin || p.y < -margin || p.y > H + margin;
  }

  // ── Resize ───────────────────────────────────────────────────────
  function resize(){
    // Use devicePixelRatio for crisp rendering on retina
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
  }

  // ── Draw ─────────────────────────────────────────────────────────
  function draw(){
    ctx.clearRect(0, 0, W, H);

    planes.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      // Rotate so plane faces direction of travel (✈ faces right = 0°)
      ctx.rotate(p.angle * Math.PI / 180);
      ctx.globalAlpha = p.alpha;
      ctx.font = p.fontSize + 'px sans-serif';
      ctx.fillStyle = '#f5efe6';  // sand color — visible on dark bg
      ctx.fillText(GLYPH, 0, 0);
      ctx.restore();
    });
  }

  // ── Tick ─────────────────────────────────────────────────────────
  function tick(){
    // Move planes
    planes.forEach(p => { p.x += p.vx; p.y += p.vy; });

    // Replace planes that left the screen
    planes = planes.map(p => isOffScreen(p) ? spawnPlane() : p);

    draw();
    animId = requestAnimationFrame(tick);
  }

  // ── Init ─────────────────────────────────────────────────────────
  function init(){
    resize();

    // Spawn initial planes at random positions (not just edges)
    planes = Array.from({ length: CFG.count }, () => {
      const p = spawnPlane();
      // Start at random progress along their route
      const t = rand(0.1, 0.9);
      p.x += p.vx * W * t / Math.abs(p.vx || 1);
      p.y += p.vy * H * t / Math.abs(p.vy || 1);
      return p;
    });

    tick();
  }

  // ── Pause when tab is hidden (performance) ───────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      tick();
    }
  });

  window.addEventListener('resize', () => {
    cancelAnimationFrame(animId);
    resize();
    tick();
  });

  // Start after fonts/layout settle
  window.addEventListener('load', init);
})();

/* Bay Bedroom — isometric concept model. Units: centimetres.
   World frame: x runs along the wardrobe wall (A) from the AC-window wall (B, x=0)
   to the balcony-window wall (D, x=W). z runs from wall A (z=0) to the bed wall (C, z=D). */
(function () {
  const W = 347, H = 300, T = 16;
  const FAC = W / (1 + Math.SQRT2), FD = FAC / Math.SQRT2;  // the bed bay is a regular half-octagon: three 143.7 cm walls, 101.6 cm deep
  const D = (128 * 929.0304 + FD * FD) / W, DS = D - FD;   // 372.5 cm wardrobe wall to window wall (128 sq ft); 270.9 cm straight side walls
  const CW = W - 2 * FD;                                    // 143.7 cm window wall
  const E45 = T * Math.tan(Math.PI / 8), E90 = T;       // outer-face mitre at 135 and 90 degree corners
  const stage = document.getElementById('stage');
  if (!window.THREE || !stage) return;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const room = new THREE.Group();
  room.position.set(-W / 2, 0, -D / 2);
  scene.add(room);

  /* ---------- procedural textures ---------- */
  function canvasTex(w, h, draw, rx, ry) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
    return t;
  }
  function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function grain(ctx, w, h, base, line, n, seed) {
    const r = rnd(seed);
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const x = r() * w, amp = 2 + r() * 6, f = 0.004 + r() * 0.01;
      ctx.strokeStyle = line; ctx.globalAlpha = 0.05 + r() * 0.12; ctx.lineWidth = 0.6 + r() * 1.6;
      ctx.beginPath();
      for (let y = 0; y <= h; y += 8) ctx.lineTo(x + Math.sin(y * f + i) * amp, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const oakTex = canvasTex(256, 512, (c, w, h) => grain(c, w, h, '#cfae84', '#8a6440', 70, 7));
  const walnutTex = canvasTex(256, 512, (c, w, h) => grain(c, w, h, '#5b3d29', '#241509', 60, 11));
  const floorTex = canvasTex(1024, 1024, (c, w, h) => {
    const r = rnd(3), pw = 128;
    for (let col = 0; col < w / pw; col++) {
      let y = -r() * 300;
      while (y < h) {
        const len = 260 + r() * 300, tone = 188 + Math.floor(r() * 22);
        c.fillStyle = `rgb(${tone + 22},${tone},${tone - 30})`;
        c.fillRect(col * pw, y, pw, len);
        for (let k = 0; k < 7; k++) {
          c.strokeStyle = 'rgba(120,90,55,0.10)'; c.lineWidth = 1;
          const gx = col * pw + 8 + r() * (pw - 16);
          c.beginPath(); c.moveTo(gx, y); c.bezierCurveTo(gx + 6, y + len / 3, gx - 6, y + len * 0.66, gx + 2, y + len); c.stroke();
        }
        c.fillStyle = 'rgba(80,60,40,0.35)'; c.fillRect(col * pw, y, pw, 2);
        y += len;
      }
      c.fillStyle = 'rgba(80,60,40,0.3)'; c.fillRect(col * pw, 0, 2, h);
    }
  }, 2.2, 2.2);
  const rugTex = canvasTex(512, 512, (c, w, h) => {
    const r = rnd(5);
    c.fillStyle = '#d3cec6'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(90,80,70,0.10)'; c.fillRect(r() * w, r() * h, 2, 2); }
    c.strokeStyle = 'rgba(110,98,86,0.45)'; c.lineWidth = 10; c.strokeRect(22, 22, w - 44, h - 44);
  });
  const skyTex = canvasTex(64, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f6f8f2'); g.addColorStop(0.55, '#dfeadb'); g.addColorStop(1, '#a9c29c');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });

  /* ---------- materials ---------- */
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.8, metalness: 0 }, o));
  const M = {
    wall: std({ color: 0xe6e1d9, roughness: 0.95 }),
    cap: std({ color: 0xf7f5f1, roughness: 1 }),
    oak: std({ map: walnutTex, roughness: 0.55 }),      // v3: every wood surface is walnut
    lacquer: std({ color: 0xcdc3b7, roughness: 0.5 }),   // warm taupe matt lacquer (reference)
    panel: std({ color: 0xbfb4a7, roughness: 0.7 }),
    walnut: std({ map: walnutTex, roughness: 0.55 }),
    flute: std({ color: 0x4e3322, roughness: 0.5 }),
    black: std({ color: 0x1d1d1c, roughness: 0.4, metalness: 0.5 }),
    greenFrame: std({ color: 0x23372f, roughness: 0.55 }),
    bars: std({ color: 0x1f2a25, roughness: 0.5, metalness: 0.3 }),
    sky: new THREE.MeshBasicMaterial({ map: skyTex }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x6d5a45, transparent: true, opacity: 0.38, roughness: 0.08, metalness: 0.1 }),
    floor: std({ map: floorTex, roughness: 0.7 }),
    slab: std({ color: 0xd9d3ca, roughness: 1 }),
    rug: std({ map: rugTex, roughness: 1 }),
    white: std({ color: 0xf3f1ec, roughness: 0.9 }),
    duvet: std({ color: 0xebe7e0, roughness: 0.95 }),
    throwGrey: std({ color: 0x6f6b66, roughness: 1 }),
    pillowGrey: std({ color: 0x8f8a83, roughness: 1 }),
    taupe: std({ color: 0x8a7f72, roughness: 0.95 }),
    leather: std({ color: 0xa4643a, roughness: 0.6 }),
    sheer: new THREE.MeshStandardMaterial({ color: 0xf1ebe0, transparent: true, opacity: 0.78, roughness: 1, side: THREE.DoubleSide }),
    led: new THREE.MeshBasicMaterial({ color: 0xffd7a0 }),
    mirror: std({ color: 0xdbe3e5, roughness: 0.12, metalness: 0.25 }),
    ac: std({ color: 0xf4f4f2, roughness: 0.5 }),
    leaf: std({ color: 0x4f7a4a, roughness: 0.8 }),
    pot: std({ color: 0xc9c2b6, roughness: 0.9 }),
    cloth: [0x3c4a5a, 0xb9a58a, 0xe9e4da, 0x6b4a3a, 0x8c9a8c, 0x2b2b2b].map((c) => std({ color: c, roughness: 1 }))
  };

  /* box by min-corner */
  function box(p, w, h, d, mat, x, y, z, noShadow) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x + w / 2, y + h / 2, z + d / 2);
    m.castShadow = !noShadow; m.receiveShadow = true;
    p.add(m); return m;
  }
  function cyl(p, r, h, mat, x, y, z, seg) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 24), mat);
    m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; p.add(m); return m;
  }

  /* ---------- walls: each wall is a group in local coords (x along wall, +z into room) ---------- */
  const sets = {};
  function setFor(key, normal) {
    if (!sets[key]) { const set = new THREE.Group(); room.add(set); sets[key] = { set, normal: new THREE.Vector3(normal[0], 0, normal[1]) }; }
    return sets[key].set;
  }
  // wall segment in local coords: inner face at z=0, outer at z=-T; oa/ob mitre the outer face
  function prismGeo(a, b, oa, ob, y0, y1) {
    const v = [[a, y0, 0], [b, y0, 0], [ob, y0, -T], [oa, y0, -T], [a, y1, 0], [b, y1, 0], [ob, y1, -T], [oa, y1, -T]];
    const pos = [];
    [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
      .forEach(([p, q, r, s]) => [p, q, r, p, r, s].forEach((i) => pos.push(...v[i])));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    return geo;
  }
  // straight wall from p0 to p1 ([x, z]) with the room on its inner side; local x measured from `origin`
  function makeWall(key, normal, p0, p1, openings, e0, e1, origin) {
    let ux = p1[0] - p0[0], uz = p1[1] - p0[1]; const len = Math.hypot(ux, uz); ux /= len; uz /= len;
    const o = origin || p0;
    const g = new THREE.Group(); g.rotation.y = Math.atan2(-uz, ux); g.position.set(o[0], 0, o[1]);
    setFor(key, normal).add(g);
    const s0 = (p0[0] - o[0]) * ux + (p0[1] - o[1]) * uz, s1 = s0 + len;
    const cuts = [s0, s1]; openings.forEach((q) => cuts.push(q.x0, q.x1)); cuts.sort((a, b) => a - b);
    const seg = (a, b, y0, y1, mat, shadow) => {
      const m = new THREE.Mesh(prismGeo(a, b, a <= s0 + 1e-6 ? a - e0 : a, b >= s1 - 1e-6 ? b + e1 : b, y0, y1), mat);
      m.castShadow = shadow; m.receiveShadow = true; g.add(m);
    };
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], b = cuts[i + 1]; if (b - a < 0.01) continue;
      const q = openings.find((w) => w.x0 <= a && w.x1 >= b);
      if (!q) seg(a, b, 0, H, M.wall, true);
      else { if (q.y0 > 0) seg(a, b, 0, q.y0, M.wall, true); seg(a, b, q.y1, H, M.wall, true); }
    }
    seg(s0, s1, H, H + 0.6, M.cap, false);
    return g;
  }
  // rectangle on the wardrobe side, three-faceted bay (the octagonal tower) on the bed side
  const A = makeWall('A', [0, 1], [0, 0], [W, 0], [{ x0: 240, x1: 330, y0: 0, y1: 210 }], E90, E90);
  const Dw = makeWall('D', [-1, 0], [W, 0], [W, DS], [{ x0: 105, x1: 252.5, y0: 75, y1: 210 }], E90, E45);
  const FR = makeWall('C', [0, -1], [W, DS], [W - FD, D], [], E45, E45);
  const C = makeWall('C', [0, -1], [W - FD, D], [FD, D], [{ x0: W / 2 - 50, x1: W / 2 + 50, y0: 95, y1: 210 }], E45, E45, [W, D]);
  const FL = makeWall('C', [0, -1], [FD, D], [0, DS], [], E45, E45);
  const B = makeWall('B', [1, 0], [0, DS], [0, 0], [{ x0: 163, x1: 263, y0: 90, y1: 210 }], E45, E90, [0, 343]);

  function windowUnit(g, x0, x1, y0, y1, panes) {
    const w = x1 - x0, h = y1 - y0, f = 6;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.sky);
    glass.position.set(x0 + w / 2, y0 + h / 2, -T + 3); g.add(glass);
    box(g, w, f, 9, M.greenFrame, x0, y1 - f, -8); box(g, w, f, 9, M.greenFrame, x0, y0, -8);
    box(g, f, h, 9, M.greenFrame, x0, y0, -8); box(g, f, h, 9, M.greenFrame, x1 - f, y0, -8);
    for (let i = 1; i < panes; i++) box(g, 4.5, h, 8, M.greenFrame, x0 + (w * i) / panes - 2.25, y0, -8);
    for (let x = x0 + 12; x < x1 - 8; x += 11) box(g, 1.1, h - 2 * f, 1.1, M.bars, x, y0 + f, -11, true);
    for (let y = y0 + 14; y < y1 - 8; y += 13) box(g, w - 2 * f, 1.1, 1.1, M.bars, x0 + f, y, -11, true);
    box(g, w + 8, 2.5, 5, M.white, x0 - 4, y0 - 2.5, 0);
  }
  function sheer(g, x0, x1, y0, y1) {
    const w = x1 - x0, seg = Math.max(8, Math.round(w / 2));
    const geo = new THREE.PlaneGeometry(w, y1 - y0, seg, 1);
    const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 0.9) * 2.2);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, M.sheer); m.position.set(x0 + w / 2, (y0 + y1) / 2, 9); m.castShadow = true; g.add(m);
  }
  function flutes(g, x0, x1, y0, y1) {
    box(g, x1 - x0, y1 - y0, 1.2, M.flute, x0, y0, 0);
    const geo = new THREE.CylinderGeometry(1.7, 1.7, y1 - y0, 10, 1, false, 0, Math.PI);
    for (let x = x0 + 2; x <= x1 - 2; x += 4) {
      const m = new THREE.Mesh(geo, M.walnut); m.rotation.y = -Math.PI / 2;
      m.position.set(x, (y0 + y1) / 2, 1.2); m.castShadow = true; m.receiveShadow = true; g.add(m);
    }
  }
  const warmLights = [];
  function warm(p, x, y, z, i, dist) { const l = new THREE.PointLight(0xffb676, i, dist, 2); l.position.set(x, y, z); p.add(l); warmLights.push(l); return l; }

  /* ---------- WALL A: the storage wall ---------- */
  // door (existing opening 90 cm, re-laminated leaf), casing in walnut
  box(A, 7, 217, T + 3, M.walnut, 233, 0, -T); box(A, 7, 217, T + 3, M.walnut, 330, 0, -T); box(A, 104, 5, T + 3, M.walnut, 233, 210, -T);
  box(A, 90, 208, 4, M.walnut, 240, 0, -T / 2 - 2);
  [258, 285, 312].forEach((x) => box(A, 0.8, 190, 0.6, M.black, x, 9, -T / 2 + 2, true));
  box(A, 2, 24, 3, M.black, 318, 95, -T / 2 + 2);
  // wardrobe carcass 195 w x 213 h x 60 d: walnut surround, four hinged taupe shutters (reference photo)
  box(A, 195, 8, 57, M.walnut, 0, 0, 0);
  box(A, 2, 213, 62, M.walnut, 0, 0, 0); box(A, 2, 213, 62, M.walnut, 193, 0, 0); box(A, 195, 2, 62, M.walnut, 0, 211, 0);
  box(A, 191, 203, 1, M.white, 2, 8, 0.5);
  const DW = (191 - 3 * 0.3) / 4;
  for (let i = 0; i < 4; i++) box(A, DW, 202, 2, M.lacquer, 2 + i * (DW + 0.3), 8.5, 58);
  // fluted walnut band across the four shutters, 100-124 cm
  box(A, 191, 24, 0.6, M.walnut, 2, 100, 60);
  const fluteGeo = new THREE.CylinderGeometry(0.55, 0.55, 24, 6);
  for (let x = 2.8; x < 192.6; x += 1.6) { const m = new THREE.Mesh(fluteGeo, M.walnut); m.position.set(x, 112, 60.6); A.add(m); }
  // long black bar handles on shutters 1 and 3, at the meeting edge
  [1, 3].forEach((k) => box(A, 1.2, 110, 3.5, M.black, 2 + k * (DW + 0.3) - 4.5, 55, 60));
  // rounded open end shelves 33 x 60
  const sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.lineTo(33, 0); sh.lineTo(33, 27); sh.absarc(0, 27, 33, 0, Math.PI / 2, false); sh.lineTo(0, 0);
  const shelfGeo = new THREE.ExtrudeGeometry(sh, { depth: 2, bevelEnabled: false, curveSegments: 20 });
  [8, 52, 96, 140, 184].forEach((y) => {
    const m = new THREE.Mesh(shelfGeo, M.oak); m.rotation.x = Math.PI / 2; m.position.set(195, y + 2, 0);
    m.castShadow = true; m.receiveShadow = true; A.add(m);
  });
  box(A, 33, 205, 1, M.walnut, 195, 8, 0);
  cyl(A, 5, 20, M.pot, 208, 186, 30); cyl(A, 1.2, 14, M.leaf, 208, 206, 30, 6);
  box(A, 4, 22, 16, M.cloth[1], 200, 142, 14); box(A, 4, 20, 16, M.cloth[3], 204.5, 142, 14); box(A, 4, 24, 16, M.cloth[4], 209, 142, 14);
  cyl(A, 7, 14, M.cloth[2], 212, 98, 26); box(A, 18, 10, 18, M.leather, 202, 54, 14);
  // loft cabinets: full 347 cm, 213–290 cm, cladding the existing concrete loft
  box(A, W, 77, 56, M.oak, 0, 213, 0);
  const loftN = 6, lw = W / loftN;
  for (let i = 0; i < loftN; i++) {
    box(A, lw - 0.8, 74, 2, M.lacquer, i * lw + 0.4, 215, 56);
    box(A, lw - 0.8, 1.4, 0.6, M.black, i * lw + 0.4, 215, 58, true);
  }
  box(A, W, 0.8, 1.6, M.led, 0, 212.2, 54, true);
  box(A, W, 10, 56, M.walnut, 0, 290, 0);   // filler up to the false ceiling
  warm(A, 110, 200, 80, 0.3, 190); warm(A, 280, 200, 80, 0.3, 190);

  /* ---------- WALL B (AC window wall): local x = D - worldZ ---------- */
  windowUnit(B, 163, 263, 90, 210, 2);
  sheer(B, 141, 171, 4, 228); sheer(B, 255, 280, 4, 228);
  box(B, 143, 1.5, 3, M.black, 139, 229, 2);
  box(B, 80, 29, 22, M.ac, 173, 236, 0); box(B, 72, 1.2, 1, M.black, 177, 240, 22, true);
  // free-standing full-length mirror on castors (room coordinates; drops away with wall B)
  const mg = new THREE.Group(); mg.position.set(30, 0, 236); mg.rotation.y = -0.52; setFor('B', [1, 0]).add(mg);
  box(mg, 3, 174, 56, M.walnut, -1.5, 12, -28); box(mg, 0.4, 169, 51, M.mirror, 1.5, 14.5, -25.5, true);
  [-25, 25].forEach((z) => { box(mg, 40, 4, 4, M.walnut, -20, 5, z - 2); box(mg, 2, 31, 3, M.walnut, -2, 9, z - 1.5);
    [-17, 17].forEach((x) => { const c = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 8), M.black); c.position.set(x, 2.5, z); mg.add(c); }); });

  /* ---------- WALL C (bed bay): centre face local x = W - worldX; facets measured from their outer end ---------- */
  windowUnit(C, W / 2 - 50, W / 2 + 50, 95, 210, 2);
  sheer(C, W / 2 - 64, W / 2 - 38, 0, 228); sheer(C, W / 2 + 38, W / 2 + 64, 0, 228);
  // plain taupe panels with shadow gaps (the balcony-side wall is partly covered by the build-out)
  const panels = (g, a, b, n) => { const w = (b - a - (n - 1) * 0.5) / n; for (let i = 0; i < n; i++) box(g, w, 228, 1.8, M.panel, a + i * (w + 0.5), 0, 0); };
  panels(FL, 0, FAC, 3); panels(FR, 32.9 * Math.SQRT2, FAC, 2);
  // the existing 285 cm concrete slab spans the bay: a trapezoid ledge, 143.7 at the back, 285 at the front, 70.6 deep
  const LD = (285 - CW) / 2;
  const ls = new THREE.Shape([new THREE.Vector2(FD - LD, LD), new THREE.Vector2(FD, 0), new THREE.Vector2(W - FD, 0), new THREE.Vector2(W - FD + LD, LD)]);
  // loft cabinets on the shelf, 228 cm up to the false ceiling, six lift-up shutters on the 285 cm front
  const bl = new THREE.Mesh(new THREE.ExtrudeGeometry(ls, { depth: 72, bevelEnabled: false }), M.walnut);
  bl.rotation.x = Math.PI / 2; bl.position.y = 300; bl.castShadow = true; bl.receiveShadow = true; C.add(bl);
  const bw = (285 - 5 * 0.8) / 6;
  for (let i = 0; i < 6; i++) box(C, bw, 68, 2, M.lacquer, FD - LD + i * (bw + 0.8), 230, LD);
  box(C, 285, 1.4, 0.6, M.black, FD - LD, 231, LD + 2, true);
  box(C, 283, 0.8, 1.5, M.led, FD - LD + 1, 227.3, LD - 2, true);
  warm(C, W / 2, 222, 16, 0.25, 220);
  // one floating nightstand, on the AC-side facet
  [[FL, 62, 102]].forEach(([fg, a, b]) => {
    box(fg, b - a, 16, 28, M.lacquer, a, 38, 3.5); box(fg, b - a, 2, 28, M.walnut, a, 54, 3.5);
    const cx = (a + b) / 2;
    cyl(fg, 5.5, 3, M.black, cx, 56, 17.5); cyl(fg, 1, 18, M.black, cx, 59, 17.5);
    const shade = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.led);
    shade.position.set(cx, 77, 17.5); fg.add(shade);
    warm(fg, cx, 72, 21, 0.55, 150);
  });

  /* ---------- WALL D (balcony window wall): local x = worldZ ---------- */
  windowUnit(Dw, 105, 252.5, 75, 210, 3);
  // the wall is built out 32.9 cm from the bay to 68.6 cm short of the wardrobe wall, with a rounded end;
  // under the window the build-out becomes a window seat (45 cm high, window from 75 cm)
  const TK = 32.9, RE = 13.2, ZE = 68.6;
  [[ZE + RE, 105, 0, H], [105, 252.5, 0, 42], [105, 252.5, 210, H], [252.5, DS, 0, H]]
    .forEach(([a, b, y0, y1]) => box(Dw, b - a, y1 - y0, TK, M.wall, a, y0, 0));
  box(Dw, RE, H, TK - RE, M.wall, ZE, 0, 0);
  const rc = new THREE.Mesh(new THREE.CylinderGeometry(RE, RE, H, 16, 1, false, 1.5 * Math.PI, 0.5 * Math.PI), M.wall);
  rc.position.set(ZE + RE, H / 2, TK - RE); rc.castShadow = rc.receiveShadow = true; Dw.add(rc);
  const tri = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(DS, 0), new THREE.Vector2(DS, TK), new THREE.Vector2(DS + TK, TK)]), { depth: H, bevelEnabled: false }), M.wall);
  tri.rotation.x = Math.PI / 2; tri.position.y = H; tri.receiveShadow = true; Dw.add(tri);
  box(Dw, 147.5, 3, TK + 5, M.oak, 105, 42, 0);
  box(Dw, 145, 8, TK + 2, M.taupe, 106.2, 45, 1);
  [[135, 22, 21], [176.8, 21, 15], [222.6, 22, 21]].forEach(([zc, rw, rh]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), M.pillowGrey);
    m.scale.set(rw, rh, 6.5); m.position.set(zc, 53 + rh - 2, 8); m.rotation.x = -0.28; m.castShadow = true; Dw.add(m);
  });
  box(Dw, DS - ZE, 0.6, TK, M.cap, ZE, H, 0, true);
  const Dz = new THREE.Group(); Dz.position.z = TK; Dw.add(Dz);
  sheer(Dz, 84, 112, 2, 232); sheer(Dz, 246, 269, 2, 232);
  box(Dz, 190, 1.5, 3, M.black, 80, 233, 2);
  box(Dz, 70, 3.5, 7, M.black, 144, 248, 0); box(Dz, 66, 0.6, 5, M.led, 146, 247.6, 1, true);
  // wire-mesh laundry basket in the recess by the wardrobe
  cyl(Dw, 12, 26, M.white, 54.5, 0, 14, 20);

  /* ---------- free furniture ---------- */
  const POLY = [[0, 0], [W, 0], [W, DS], [W - FD, D], [FD, D], [0, DS]];
  const OUTER = [[-T, -T], [W + T, -T], [W + T, DS + E45], [W - FD + E45, D + T], [FD - E45, D + T], [-T, DS + E45]];
  const shapeOf = (pts, flip) => new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, flip ? -z : z)));
  const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(shapeOf(OUTER), { depth: 14, bevelEnabled: false }), M.slab);
  slab.rotation.x = Math.PI / 2; slab.position.y = -0.4; slab.receiveShadow = true; room.add(slab);
  floorTex.repeat.set(2.2 / W, 2.2 / W);
  const fl = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(POLY, true)), M.floor);
  fl.rotation.x = -Math.PI / 2; fl.position.y = 0.05; fl.receiveShadow = true; room.add(fl);
  // bed centred on the window wall; the headboard stands off it just enough to clear the angled walls
  const BCX = W / 2, HB_W = 166, bz1 = D - ((HB_W - CW) / 2 + 1.5) - 9;
  const bx0 = BCX - 80, bx1 = BCX + 80, bz0 = bz1 - 198;
  const rug = box(room, 240, 1, 200, M.rug, BCX - 120, 0, bz0 - 45); rug.castShadow = false;
  box(room, bx1 - bx0 - 12, 10, bz1 - bz0 - 12, M.black, bx0 + 6, 0, bz0 + 6);
  box(room, bx1 - bx0, 22, bz1 - bz0, M.walnut, bx0, 10, bz0);
  box(room, 156, 20, 192, M.white, bx0 + 5, 32, bz0 + 4);
  box(room, 162, 10, 138, M.duvet, bx0 + 2, 46, bz0 + 52);
  box(room, 170, 22, 34, M.throwGrey, bx0 - 2, 36, bz0 + 16);
  box(room, HB_W, 118, 9, M.taupe, BCX - HB_W / 2, 0, bz1);
  for (let x = BCX - HB_W / 2 + 7; x < BCX + HB_W / 2 - 3; x += 15.1) box(room, 1, 104, 0.8, M.pillowGrey, x, 12, bz1 - 0.6, true);
  function pillow(x, y, z, sx, sy, sz, mat, tilt) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat);
    m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.x = tilt || 0; m.castShadow = true; room.add(m);
  }
  pillow(bx0 + 42, 62, bz1 - 16, 34, 9, 14, M.white, -0.5); pillow(bx1 - 42, 62, bz1 - 16, 34, 9, 14, M.white, -0.5);
  pillow(bx0 + 50, 60, bz1 - 34, 22, 8, 10, M.pillowGrey, -0.4); pillow(bx1 - 50, 60, bz1 - 34, 22, 8, 10, M.pillowGrey, -0.4);
  cyl(room, 19, 42, M.leather, 58, 0, 236, 36);

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0xfffaf2, 0xb8a58d, 0.62));
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  const sun = new THREE.DirectionalLight(0xfff0dc, 0.95);
  sun.position.set(260, 520, 380); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -360, right: 360, top: 360, bottom: -360, near: 50, far: 1400 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6; sun.shadow.radius = 4;
  scene.add(sun);

  /* ---------- camera + controls ---------- */
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  const target = new THREE.Vector3(0, 105, 0);
  const controls = new THREE.OrbitControls(cam, renderer.domElement);
  Object.assign(controls, { enablePan: false, enableDamping: true, dampingFactor: 0.08, minZoom: 0.75, maxZoom: 2.6, minPolarAngle: 0.25, maxPolarAngle: 1.36 });
  controls.target.copy(target);
  const VIEWS = { wardrobe: { az: 0.72, pol: 1.0 }, bed: { az: 2.55, pol: 1.0 } };
  const R = 1400;
  function place(az, pol) {
    cam.position.set(target.x + R * Math.sin(pol) * Math.sin(az), target.y + R * Math.cos(pol), target.z + R * Math.sin(pol) * Math.cos(az));
    cam.lookAt(target);
  }
  place(VIEWS.wardrobe.az, VIEWS.wardrobe.pol);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tween = null;
  function setView(name) {
    const v = VIEWS[name]; if (!v) return;
    const off = cam.position.clone().sub(target);
    const s = new THREE.Spherical().setFromVector3(off);
    let az0 = s.theta, az1 = v.az;
    while (az1 - az0 > Math.PI) az1 -= 2 * Math.PI; while (az0 - az1 > Math.PI) az1 += 2 * Math.PI;
    if (reduce) { place(v.az, v.pol); cam.zoom = 1; cam.updateProjectionMatrix(); return; }
    tween = { t0: performance.now(), az0, az1, p0: s.phi, p1: v.pol, z0: cam.zoom };
  }
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    setView(b.dataset.view);
  }));

  /* ---------- callouts ---------- */
  const tag = document.getElementById('tags');
  const CALLS = [
    ['4-door wardrobe &middot; 195 &times; 213 cm', 'A', [30, 170, 60], 'l'],
    ['Fluted walnut band', 'A', [97, 112, 61], 'd'],
    ['Loft cabinets &middot; full 347 cm', 'A', [300, 262, 58], ''],
    ['Rounded open shelves', 'A', [222, 120, 40], ''],
    ['Standing mirror on castors', 'B', [30, 120, 236], 'l'],
    ['Half-octagon bay &middot; 3 &times; 144 cm', 'C', [52, 170, 323], ''],
    ['Loft cabinets over the bay', 'C', [W / 2, 265, 302], ''],
    ['Upholstered bed &middot; 5 &times; 6&frac12; ft', null, [173, 60, 255], ''],
    ['Sheer curtains on ceiling track', 'D', [W - 9 - 32.9, 180, 98], ''],
    ['Window seat &middot; 147.5 cm', 'D', [W - 26, 55, 178], ''],
    ['Light oak-look flooring', null, [300, 0, 150], 'd']
  ].map(([t, wall, p, side]) => {
    const el = document.createElement('div');
    el.className = 'tag' + (side ? ' t' + side : '');
    el.innerHTML = '<i></i><span>' + t + '</span>'; tag.appendChild(el);
    return { el, wall, p: new THREE.Vector3(p[0], p[1], p[2]) };
  });
  const v3 = new THREE.Vector3(), off = new THREE.Vector3();

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight, a = w / h, fs = a < 1 ? 700 / a : 700;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    const vh = a < 1 ? fs * 0.72 : 540;
    cam.left = (-vh * a) / 2; cam.right = (vh * a) / 2; cam.top = vh / 2; cam.bottom = -vh / 2; cam.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();

  function frame(now) {
    if (tween) {
      const k = Math.min(1, (now - tween.t0) / 900), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      place(tween.az0 + (tween.az1 - tween.az0) * e, tween.p0 + (tween.p1 - tween.p0) * e);
      cam.zoom = tween.z0 + (1 - tween.z0) * e; cam.updateProjectionMatrix();
      if (k >= 1) tween = null;
    } else controls.update();
    off.copy(cam.position).sub(target).setY(0).normalize();
    Object.values(sets).forEach((s) => { s.set.visible = s.normal.dot(off) > -0.08; });
    const w = stage.clientWidth, h = stage.clientHeight;
    CALLS.forEach((c) => {
      const vis = !c.wall || sets[c.wall].set.visible;
      c.el.hidden = !vis; if (!vis) return;
      v3.copy(c.p); room.localToWorld(v3); v3.project(cam);
      c.el.style.transform = `translate(${((v3.x + 1) / 2) * w}px, ${((1 - v3.y) / 2) * h}px)`;
    });
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  stage.classList.add('ready');
})();

/* Sportive Hub · exercise animations
   Every demo is a keyframed pose on a small 2D rig, drawn as tapered capsules in brand colours.
   Near-side limbs are olive, far-side limbs sand. Mount with SHAnim.mountAll(root). */
(function (global) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var C = { olive: '#595641', sand: '#BAA48D', milk: '#F0ECE3', pastel: '#C9D6B8', charcoal: '#282828' };
  var L = { TOR: 52, NECK: 9, HR: 11, UA: 30, FA: 26, HAND: 10, TH: 43, SH: 42, FT: 14 };
  var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- maths ---------------- */
  function rad(a) { return a * Math.PI / 180; }
  function dir(a) { var r = rad(a); return [Math.cos(r), Math.sin(r)]; }
  function add(p, a, len) { var d = dir(a); return [p[0] + d[0] * len, p[1] + d[1] * len]; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpP(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }
  function ang(a, b) { return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; }
  function angLerp(a, b, t) { var d = ((b - a) % 360 + 540) % 360 - 180; return a + d * t; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function ik(h, f, l1, l2, up) {
    var dx = f[0] - h[0], dy = f[1] - h[1], d = Math.max(0.001, Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01));
    var a = Math.atan2(dy, dx), c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), off = Math.acos(Math.max(-1, Math.min(1, c)));
    var g = up === false ? a + off : a - off;
    return [h[0] + Math.cos(g) * l1, h[1] + Math.sin(g) * l1];
  }
  var ANG = { t: 1, n: 1, face: 1, s: 1, e: 1, w: 1, h: 1, k: 1, a: 1, tilt: 1, p1: 1, p2: 1, p3: 1, th: 1, rot: 1 };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function lerpObj(A, B, t, key) {
    if (Array.isArray(A)) return A.map(function (v, i) { return lerp(v, B[i], t); });
    if (typeof A === 'number') { if (typeof B !== 'number') return A; return ANG[key] ? angLerp(A, B, t) : lerp(A, B, t); }
    if (A && typeof A === 'object') { var o = {}; for (var k in A) o[k] = (B && k in B) ? lerpObj(A[k], B[k], t, k) : A[k]; return o; }
    return t < .5 ? A : B;
  }

  /* ---------------- svg ---------------- */
  function el(parent, tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }
  function part(parent, color) { var g = el(parent, 'g', { fill: color }); return { g: g, q: el(g, 'path', {}), a: el(g, 'circle', {}), b: el(g, 'circle', {}) }; }
  function f2(v) { return v.toFixed(2); }
  function cap(pt, a, b, ra, rb) {
    var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 0.001, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
    var s = Math.max(-1, Math.min(1, (ra - rb) / d)), c = Math.sqrt(1 - s * s);
    var px = nx * c + ux * s, py = ny * c + uy * s, qx = -nx * c + ux * s, qy = -ny * c + uy * s;
    pt.q.setAttribute('d', 'M' + f2(a[0] + px * ra) + ' ' + f2(a[1] + py * ra) + 'L' + f2(b[0] + px * rb) + ' ' + f2(b[1] + py * rb) + 'L' + f2(b[0] + qx * rb) + ' ' + f2(b[1] + qy * rb) + 'L' + f2(a[0] + qx * ra) + ' ' + f2(a[1] + qy * ra) + 'Z');
    pt.a.setAttribute('cx', f2(a[0])); pt.a.setAttribute('cy', f2(a[1])); pt.a.setAttribute('r', f2(ra));
    pt.b.setAttribute('cx', f2(b[0])); pt.b.setAttribute('cy', f2(b[1])); pt.b.setAttribute('r', f2(rb));
  }
  function hide(pt, on) { pt.g.style.display = on ? 'none' : ''; }

  /* ---------------- props ---------------- */
  var PROPS = {
    mat: function (g) { el(g, 'ellipse', { cx: 200, cy: 201, rx: 168, ry: 5, fill: 'rgba(40,40,40,.06)' }); el(g, 'rect', { x: 34, y: 194, width: 332, height: 7, rx: 3.5, fill: C.pastel }); },
    floor: function (g) { el(g, 'line', { x1: 20, y1: 196, x2: 380, y2: 196, stroke: 'rgba(40,40,40,.22)', 'stroke-width': 1.2 }); },
    matTop: function (g) { el(g, 'rect', { x: 60, y: 62, width: 280, height: 118, rx: 10, fill: C.pastel, opacity: .7 }); },
    chair: function (g, o) { var x = o.x || 160; el(g, 'rect', { x: x, y: 158, width: 58, height: 7, rx: 3, fill: C.sand }); el(g, 'rect', { x: x + 2, y: 165, width: 4, height: 31, fill: C.sand }); el(g, 'rect', { x: x + 52, y: 165, width: 4, height: 31, fill: C.sand }); if (o.back !== false) el(g, 'rect', { x: x - 2, y: o.backTop || 98, width: 6, height: 158 - (o.backTop || 98), rx: 3, fill: C.sand }); },
    wall: function (g, o) { el(g, 'rect', { x: o.x, y: 10, width: 12, height: 186, fill: C.sand, opacity: .55 }); },
    door: function (g, o) { el(g, 'rect', { x: o.x, y: 14, width: 9, height: 182, rx: 2, fill: C.sand, opacity: .8 }); el(g, 'rect', { x: o.x - 30, y: 14, width: 60, height: 6, rx: 2, fill: C.sand, opacity: .8 }); },
    table: function (g, o) { var x = o.x || 250, y = o.y || 112, w = o.w || 110; el(g, 'rect', { x: x, y: y, width: w, height: 7, rx: 3, fill: C.sand }); el(g, 'rect', { x: x + w - 10, y: y + 7, width: 5, height: 196 - y - 7, fill: C.sand }); if (o.leg2 !== false) el(g, 'rect', { x: x + 6, y: y + 7, width: 5, height: 196 - y - 7, fill: C.sand }); },
    step: function (g, o) { el(g, 'rect', { x: o.x || 180, y: 178, width: o.w || 120, height: 18, rx: 2, fill: C.sand, opacity: .75 }); },
    counter: function (g, o) { var x = o.x || 268; el(g, 'rect', { x: x, y: 98, width: 100, height: 8, rx: 3, fill: C.sand }); el(g, 'rect', { x: x + 6, y: 106, width: 88, height: 90, fill: C.sand, opacity: .35 }); },
    deskTop: function (g) { el(g, 'rect', { x: 20, y: 139, width: 360, height: 9, rx: 3, fill: C.sand }); el(g, 'rect', { x: 20, y: 148, width: 360, height: 80, fill: C.sand, opacity: .22 }); },
    floorLow: function (g) { el(g, 'rect', { x: 20, y: 182, width: 360, height: 6, rx: 3, fill: C.pastel }); }
  };

  /* ---------------- side rig (most exercises) ---------------- */
  function sideRig(svg) {
    var R = {};
    R.fleg = { th: part(svg, C.sand), sh: part(svg, C.sand), ft: part(svg, C.sand) };
    R.farm = { ua: part(svg, C.sand), fa: part(svg, C.sand), hd: part(svg, C.sand) };
    R.torso = [part(svg, C.olive), part(svg, C.olive), part(svg, C.olive)];
    R.pelvis = el(svg, 'circle', { r: 12, fill: C.olive });
    R.neck = part(svg, C.olive);
    R.tail = el(svg, 'ellipse', { rx: 6.5, ry: 4, fill: C.olive });
    R.head = el(svg, 'circle', { r: L.HR, fill: C.olive });
    R.glow = el(svg, 'circle', { r: 0, fill: C.sand, opacity: 0 });
    R.leg = { th: part(svg, C.olive), sh: part(svg, C.olive), ft: part(svg, C.olive) };
    R.arm = { ua: part(svg, C.olive), fa: part(svg, C.olive), hd: part(svg, C.olive) };
    return R;
  }
  function fkSide(p) {
    var H = p.hip, t = p.t, b = p.bend || 0;
    var S = add(H, t, L.TOR), mid = lerpP(H, S, .5), nm = dir(t - 90), Cp = [mid[0] + nm[0] * b, mid[1] + nm[1] * b];
    function bez(u) { return [(1 - u) * (1 - u) * H[0] + 2 * (1 - u) * u * Cp[0] + u * u * S[0], (1 - u) * (1 - u) * H[1] + 2 * (1 - u) * u * Cp[1] + u * u * S[1]]; }
    var Sj = bez(.9);
    var n = p.n == null ? t : p.n, N = add(S, n, L.NECK), Hc = add(N, n, L.HR * .95);
    function arm(a, off) {
      if (!a) return null;
      var base = [Sj[0] + off[0], Sj[1] + off[1]], k = a.len || 1, E, W;
      if (a.hand) { W = [a.hand[0] + off[0], a.hand[1] + off[1]]; E = ik(base, W, L.UA * k, L.FA * k, a.up); }
      else { E = add(base, a.s, L.UA * k); W = add(E, a.e, L.FA * k); }
      var wa = a.w == null ? ang(E, W) : a.w;
      return { B: base, E: E, W: W, X: add(W, wa, L.HAND * k) };
    }
    function leg(l, off) {
      if (!l) return null;
      var B = [H[0] + off[0], H[1] + off[1]], K, A;
      if (l.K) { K = [l.K[0] + off[0], l.K[1] + off[1]]; A = [l.A[0] + off[0], l.A[1] + off[1]]; }
      else if (l.foot) { A = [l.foot[0] + off[0], l.foot[1] + off[1]]; K = ik(B, A, L.TH, L.SH, l.up); }
      else { K = add(B, l.h, L.TH); A = add(K, l.k, L.SH); }
      return { B: B, K: K, A: A, T: add(A, l.a == null ? 0 : l.a, L.FT) };
    }
    var fo = [-1.5, -1.5];
    return { H: H, S: S, Sj: Sj, bez: bez, N: N, Hc: Hc, n: n, face: p.face == null ? n + 90 : p.face,
      arm: arm(p.arm, [0, 0]), farm: arm(p.farm || p.arm, fo), leg: leg(p.leg, [0, 0]), fleg: leg(p.fleg || p.leg, fo) };
  }
  function drawLeg(r, j) { if (!j) { hide(r.th, 1); hide(r.sh, 1); hide(r.ft, 1); return; } hide(r.th, 0); hide(r.sh, 0); hide(r.ft, 0); cap(r.th, j.B, j.K, 10.5, 6.5); cap(r.sh, j.K, j.A, 6.4, 4.4); cap(r.ft, j.A, j.T, 4.4, 3.1); }
  function drawArm(r, j) { if (!j) { hide(r.ua, 1); hide(r.fa, 1); hide(r.hd, 1); return; } hide(r.ua, 0); hide(r.fa, 0); hide(r.hd, 0); cap(r.ua, j.B, j.E, 6, 4.8); cap(r.fa, j.E, j.W, 4.8, 3.6); cap(r.hd, j.W, j.X, 3.7, 3); }
  function glowAt(name, J) {
    var fd = dir(J.face);
    switch (name) {
      case 'belly': var b = J.bez(.45); return [b[0] + fd[0] * 9, b[1] + fd[1] * 9];
      case 'pelvis': return [J.H[0] + fd[0] * 4, J.H[1] + fd[1] * 4];
      case 'lowback': var lb = J.bez(.25); return [lb[0] - fd[0] * 9, lb[1] - fd[1] * 9];
      case 'thigh': return lerpP(J.leg.B, J.leg.K, .5);
      case 'knee': return J.leg.K;
      case 'shoulder': return J.Sj;
      case 'glute': return [J.H[0] - fd[0] * 7, J.H[1] - fd[1] * 7];
      case 'calf': return lerpP(J.leg.K, J.leg.A, .4);
      case 'chest': var c = J.bez(.8); return [c[0] + fd[0] * 9, c[1] + fd[1] * 9];
      case 'hip': return J.H;
      default: return J.H;
    }
  }
  function drawSide(R, p, J) {
    drawLeg(R.fleg, J.fleg); drawArm(R.farm, p.hideFarArm ? null : J.farm);
    var pts = [0, .34, .67, 1].map(J.bez), rr = [11.5, 10.5, 11.8, 13];
    for (var i = 0; i < 3; i++) cap(R.torso[i], pts[i], pts[i + 1], rr[i], rr[i + 1]);
    R.pelvis.setAttribute('cx', f2(J.H[0])); R.pelvis.setAttribute('cy', f2(J.H[1]));
    cap(R.neck, J.S, J.N, 4.8, 4.4);
    R.head.setAttribute('cx', f2(J.Hc[0])); R.head.setAttribute('cy', f2(J.Hc[1]));
    var tl = add(J.Hc, J.face + 180, L.HR + 2.5);
    R.tail.setAttribute('cx', f2(tl[0])); R.tail.setAttribute('cy', f2(tl[1])); R.tail.setAttribute('transform', 'rotate(' + f2(J.face + 180) + ' ' + f2(tl[0]) + ' ' + f2(tl[1]) + ')');
    var gv = p.glow ? p.glow.v : 0;
    if (gv > 0.01) { var gp = glowAt(p.glow.at, J); R.glow.setAttribute('cx', f2(gp[0])); R.glow.setAttribute('cy', f2(gp[1])); R.glow.setAttribute('r', f2(9 + 9 * gv)); R.glow.setAttribute('opacity', f2(.6 * gv)); } else R.glow.setAttribute('opacity', 0);
    drawLeg(R.leg, J.leg); drawArm(R.arm, p.hideArm ? null : J.arm);
  }

  /* ---------------- front rig ---------------- */
  function frontRig(svg) {
    var R = {};
    R.rLeg = { th: part(svg, C.olive), sh: part(svg, C.olive), ft: part(svg, C.olive) };
    R.lLeg = { th: part(svg, C.olive), sh: part(svg, C.olive), ft: part(svg, C.olive) };
    R.torso = part(svg, C.olive); R.hips = part(svg, C.olive); R.sh = part(svg, C.olive);
    R.neck = part(svg, C.olive); R.head = el(svg, 'circle', { r: 12, fill: C.olive });
    R.face = el(svg, 'ellipse', { rx: 6, ry: 8, fill: C.milk, opacity: .22 });
    R.glow = el(svg, 'circle', { r: 0, fill: C.sand, opacity: 0 });
    R.rArm = { ua: part(svg, C.olive), fa: part(svg, C.olive), hd: part(svg, C.olive) };
    R.lArm = { ua: part(svg, C.olive), fa: part(svg, C.olive), hd: part(svg, C.olive) };
    return R;
  }
  function drawFront(R, p, hl) {
    var H = p.hip, S = add(H, -90, L.TOR), SR = [S[0] - 16, S[1] + 4], SL = [S[0] + 16, S[1] + 4], HR = [H[0] - 8, H[1]], HL = [H[0] + 8, H[1]];
    cap(R.torso, [H[0], H[1] - 6], [S[0], S[1] + 6], 13, 15); cap(R.hips, HR, HL, 10, 10); cap(R.sh, SR, SL, 7, 7);
    var n = -90 + (p.tilt || 0), N = add(S, n, L.NECK + 1), Hc = add(N, n, 12);
    cap(R.neck, S, N, 4.8, 4.5);
    R.head.setAttribute('cx', f2(Hc[0])); R.head.setAttribute('cy', f2(Hc[1]));
    var tw = (p.turn || 0);
    R.face.setAttribute('cx', f2(Hc[0] + tw * 6)); R.face.setAttribute('cy', f2(Hc[1] + 1)); R.face.setAttribute('rx', f2(6 - Math.abs(tw) * 2.5)); R.face.setAttribute('transform', 'rotate(' + f2(p.tilt || 0) + ' ' + f2(Hc[0]) + ' ' + f2(Hc[1]) + ')');
    function arm(r, a, base, color) {
      var E, W; if (a.hand) { W = a.hand; E = ik(base, W, L.UA, L.FA, a.up); } else { E = add(base, a.s, L.UA); W = add(E, a.e, L.FA); }
      var X = add(W, a.w == null ? ang(E, W) : a.w, L.HAND);
      [r.ua, r.fa, r.hd].forEach(function (q) { q.g.setAttribute('fill', color); });
      cap(r.ua, base, E, 6, 4.8); cap(r.fa, E, W, 4.8, 3.6); cap(r.hd, W, X, 3.8, 3.2);
      return { E: E, W: W, X: X };
    }
    function leg(r, l, base) { var K = l.K || add(base, l.h, L.TH), A = l.A || add(K, l.k, L.SH), T = add(A, l.a == null ? 90 : l.a, 9); cap(r.th, base, K, 10, 6.5); cap(r.sh, K, A, 6.3, 4.4); cap(r.ft, A, T, 4.6, 3.6); }
    leg(R.rLeg, p.rLeg, HR); leg(R.lLeg, p.lLeg, HL);
    var J = { S: S, SR: SR, SL: SL, H: H, Hc: Hc };
    J.r = arm(R.rArm, p.rArm, SR, hl === 'r' ? C.sand : C.olive);
    J.l = arm(R.lArm, p.lArm, SL, hl === 'l' ? C.sand : C.olive);
    var gv = p.glow ? p.glow.v : 0;
    if (gv > 0.01) { var gp = p.glow.at === 'rShoulder' ? SR : p.glow.at === 'chest' ? [S[0], S[1] + 14] : SL; R.glow.setAttribute('cx', f2(gp[0])); R.glow.setAttribute('cy', f2(gp[1])); R.glow.setAttribute('r', f2(8 + 8 * gv)); R.glow.setAttribute('opacity', f2(.6 * gv)); } else R.glow.setAttribute('opacity', 0);
    return J;
  }

  /* ---------------- hand rig (close-up, side view) ---------------- */
  function handRig(svg) {
    var R = {};
    R.ff = [part(svg, C.sand), part(svg, C.sand), part(svg, C.sand)];
    R.fore = part(svg, C.olive); R.palm = part(svg, C.olive);
    R.fn = [part(svg, C.olive), part(svg, C.olive), part(svg, C.olive)];
    R.thumb = [part(svg, C.olive), part(svg, C.olive)];
    return R;
  }
  function drawHand(R, p) {
    var W = p.wrist || [180, 118], F0 = [W[0] - 150, W[1] + 2];
    cap(R.fore, F0, W, 21, 16);
    var P = add(W, p.w, 54); cap(R.palm, W, P, 18, 16);
    function finger(parts, base, off) {
      var a1 = p.w + p.p1, a2 = a1 + p.p2, a3 = a2 + p.p3;
      var b = [base[0] + off[0], base[1] + off[1]], j1 = add(b, a1, 34), j2 = add(j1, a2, 23), j3 = add(j2, a3, 17);
      cap(parts[0], b, j1, 9.5, 8.6); cap(parts[1], j1, j2, 8.6, 7.8); cap(parts[2], j2, j3, 7.8, 7);
      return j3;
    }
    var tip = finger(R.fn, P, [0, 0]); finger(R.ff, P, [-4, -6]);
    var tb = add(add(W, p.w, 10), p.w + (p.side || -1) * 90, 12), ta = p.w + (p.th == null ? -30 : p.th), t1 = add(tb, ta, 27), t2 = add(t1, ta + 15, 19);
    cap(R.thumb[0], tb, t1, 9.5, 8.4); cap(R.thumb[1], t1, t2, 8.4, 7.4);
    return { W: W, P: P, tip: tip };
  }

  /* ---------------- head / upper-body close-ups ---------------- */
  function headSideRig(svg) {
    return { shoulders: el(svg, 'path', { fill: C.olive }), neck: part(svg, C.olive), tail: el(svg, 'ellipse', { rx: 18, ry: 11, fill: C.olive }), head: el(svg, 'circle', { r: 34, fill: C.olive }), nose: el(svg, 'path', { fill: C.olive }) };
  }
  function drawHeadSide(R, p) {
    R.shoulders.setAttribute('d', 'M120 225 C120 196 150 178 200 178 C250 178 280 196 280 225 Z');
    var base = [200 + p.dx * .3, 182], top = [205 + p.dx, 140];
    cap(R.neck, base, top, 15, 14);
    var Hc = [208 + p.dx, 104 + (p.dy || 0)];
    R.head.setAttribute('cx', f2(Hc[0])); R.head.setAttribute('cy', f2(Hc[1]));
    R.tail.setAttribute('cx', f2(Hc[0] - 40)); R.tail.setAttribute('cy', f2(Hc[1] + 2)); R.tail.setAttribute('transform', 'rotate(-12 ' + f2(Hc[0] - 40) + ' ' + f2(Hc[1] + 2) + ')');
    R.nose.setAttribute('d', 'M' + f2(Hc[0] + 31) + ' ' + f2(Hc[1] - 6) + ' L' + f2(Hc[0] + 40) + ' ' + f2(Hc[1] + 6) + ' L' + f2(Hc[0] + 31) + ' ' + f2(Hc[1] + 9) + ' Z');
  }
  function headFrontRig(svg) {
    return { shoulders: el(svg, 'path', { fill: C.olive }), neck: part(svg, C.olive), head: el(svg, 'circle', { r: 34, fill: C.olive }), face: el(svg, 'ellipse', { rx: 18, ry: 24, fill: C.milk, opacity: .2 }), arc: el(svg, 'path', { fill: 'none', stroke: C.sand, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0 }) };
  }
  function drawHeadFront(R, p) {
    R.shoulders.setAttribute('d', 'M80 225 C84 190 130 176 200 176 C270 176 316 190 320 225 Z');
    var base = [200, 180], n = -90 + (p.tilt || 0), top = add(base, n, 36), Hc = add(top, n, 30);
    cap(R.neck, base, top, 16, 15);
    R.head.setAttribute('cx', f2(Hc[0])); R.head.setAttribute('cy', f2(Hc[1]));
    var tw = p.turn || 0;
    R.face.setAttribute('cx', f2(Hc[0] + tw * 16)); R.face.setAttribute('cy', f2(Hc[1] + 3)); R.face.setAttribute('rx', f2(18 - Math.abs(tw) * 8));
    R.face.setAttribute('transform', 'rotate(' + f2(p.tilt || 0) + ' ' + f2(Hc[0]) + ' ' + f2(Hc[1]) + ')');
    if (p.stretch) { var s0 = add(base, -90, 4); R.arc.setAttribute('d', 'M' + f2(base[0] + (p.tilt > 0 ? -30 : 30)) + ' 176 Q ' + f2(base[0] + (p.tilt > 0 ? -22 : 22)) + ' 150 ' + f2(s0[0] + (p.tilt > 0 ? -10 : 10)) + ' 128'); R.arc.setAttribute('opacity', f2(Math.min(1, Math.abs(p.tilt) / 25) * .9)); } else R.arc.setAttribute('opacity', 0);
  }
  function backRig(svg) {
    return { body: el(svg, 'path', { fill: C.olive }), neck: part(svg, C.olive), head: el(svg, 'circle', { r: 30, fill: C.olive }), tail: el(svg, 'ellipse', { rx: 9, ry: 15, fill: C.olive }), spine: el(svg, 'line', { stroke: C.milk, 'stroke-width': 2, opacity: .35 }), sl: el(svg, 'path', { fill: C.sand }), sr: el(svg, 'path', { fill: C.sand }), arrows: el(svg, 'path', { fill: 'none', stroke: C.pastel, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 }) };
  }
  function drawBack(R, p) {
    R.body.setAttribute('d', 'M92 225 C96 168 120 134 200 132 C280 134 304 168 308 225 Z');
    cap(R.neck, [200, 136], [200, 98], 15, 14);
    R.head.setAttribute('cx', 200); R.head.setAttribute('cy', 70); R.tail.setAttribute('cx', 200); R.tail.setAttribute('cy', 104);
    R.spine.setAttribute('x1', 200); R.spine.setAttribute('y1', 140); R.spine.setAttribute('x2', 200); R.spine.setAttribute('y2', 222);
    var sq = p.sq || 0, dx = 16 * sq, dy = 5 * sq;
    function blade(x, flip) { return 'M' + f2(x) + ' ' + f2(150 + dy) + ' L' + f2(x + flip * 34) + ' ' + f2(150 + dy) + ' L' + f2(x + flip * 6) + ' ' + f2(205 + dy) + ' Z'; }
    R.sl.setAttribute('d', blade(170 + dx, -1)); R.sr.setAttribute('d', blade(230 - dx, 1));
    R.sl.setAttribute('stroke', C.sand); R.sl.setAttribute('stroke-width', 8); R.sl.setAttribute('stroke-linejoin', 'round');
    R.sr.setAttribute('stroke', C.sand); R.sr.setAttribute('stroke-width', 8); R.sr.setAttribute('stroke-linejoin', 'round');
    R.arrows.setAttribute('d', 'M118 176 L144 176 M138 170 L145 176 L138 182 M282 176 L256 176 M262 170 L255 176 L262 182');
    R.arrows.setAttribute('opacity', f2(sq * .95));
  }

  /* ---------------- foot close-up ---------------- */
  function footRig(svg) { return { trail: el(svg, 'path', { fill: 'none', stroke: C.sand, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .8 }), shin: part(svg, C.olive), heel: el(svg, 'circle', { r: 14, fill: C.olive }), foot: part(svg, C.olive), toes: part(svg, C.olive), towel: el(svg, 'path', { fill: C.sand }) }; }
  function drawFoot(R, p, inst) {
    var A = p.ankle, K = [A[0] - 10, 0];
    cap(R.shin, K, A, 20, 14);
    R.heel.setAttribute('cx', f2(A[0] - 4)); R.heel.setAttribute('cy', f2(A[1] + 4));
    var len = 58 * (p.fl == null ? 1 : p.fl), M = add(A, p.a, len), T = add(M, p.a + (p.toe || 0), 18);
    cap(R.foot, A, M, 13, 9.5); cap(R.toes, M, T, 9.5, 7.5);
    if (p.trail) {
      inst.trail = inst.trail || []; inst.trail.push([T[0], T[1]]); if (inst.trail.length > 70) inst.trail.shift();
      R.trail.setAttribute('d', 'M' + inst.trail.map(function (q) { return f2(q[0]) + ' ' + f2(q[1]); }).join(' L'));
    } else R.trail.setAttribute('d', '');
    if (p.towel != null) { var w = p.towel; R.towel.setAttribute('d', 'M' + f2(170 - w * 30) + ' 190 Q ' + f2(230) + ' ' + f2(190 - w * 14) + ' 340 190 L 340 198 L ' + f2(170 - w * 30) + ' 198 Z'); } else R.towel.setAttribute('d', '');
  }

  /* ---------------- towel twist close-up ---------------- */
  function towelRig(svg) { return { towel: el(svg, 'rect', { x: 70, y: 100, width: 260, height: 30, rx: 15, fill: C.sand }), stripes: el(svg, 'g', { stroke: C.milk, 'stroke-width': 2.5, opacity: .55 }), lf: part(svg, C.olive), rf: part(svg, C.olive), lfist: el(svg, 'ellipse', { rx: 24, ry: 20, fill: C.olive }), rfist: el(svg, 'ellipse', { rx: 24, ry: 20, fill: C.olive }), lk: el(svg, 'line', { stroke: C.milk, 'stroke-width': 2.5, opacity: .5, 'stroke-linecap': 'round' }), rk: el(svg, 'line', { stroke: C.milk, 'stroke-width': 2.5, opacity: .5, 'stroke-linecap': 'round' }) }; }
  function drawTowel(R, p) {
    var rot = p.rot || 0;
    while (R.stripes.firstChild) R.stripes.removeChild(R.stripes.firstChild);
    for (var x = 165; x <= 235; x += 14) el(R.stripes, 'line', { x1: x - rot * .25, y1: 102, x2: x + rot * .25, y2: 128 });
    cap(R.lf, [120, 225], [130, 128], 18, 16); cap(R.rf, [280, 225], [270, 128], 18, 16);
    [[R.lfist, R.lk, 130, rot], [R.rfist, R.rk, 270, -rot]].forEach(function (f) {
      f[0].setAttribute('cx', f[2]); f[0].setAttribute('cy', 115); f[0].setAttribute('transform', 'rotate(' + f2(f[3]) + ' ' + f[2] + ' 115)');
      var a = dir(f[3] - 90); f[1].setAttribute('x1', f2(f[2] - a[0] * 14)); f[1].setAttribute('y1', f2(115 - a[1] * 14)); f[1].setAttribute('x2', f2(f[2] + a[0] * 14)); f[1].setAttribute('y2', f2(115 + a[1] * 14));
    });
  }

  /* ---------------- pose helpers ---------------- */
  var SUP = { hip: [213, 183], t: 180, n: 180, face: 270, arm: { s: 4, e: 2, w: 0 }, leg: { foot: [262, 188], a: 0 }, fleg: { foot: [258, 188], a: 0 } };
  function sup(over) { var p = clone(SUP); for (var k in over) p[k] = over[k]; return p; }
  var STAND = { hip: [196, 106], t: -90, n: -90, face: 0, arm: { s: 93, e: 92, w: 92 }, leg: { foot: [198, 190], a: 0 }, fleg: { foot: [194, 190], a: 0 } };
  function stand(over) { var p = clone(STAND); for (var k in over) p[k] = over[k]; return p; }
  var QUAD = { hip: [150, 142], t: -8, n: 20, face: 100, arm: { hand: [206, 191] }, farm: { hand: [202, 191] }, leg: { K: [150, 188], A: [104, 190], a: 180 }, fleg: { K: [148, 188], A: [102, 190], a: 180 } };
  function quad(over) { var p = clone(QUAD); for (var k in over) p[k] = over[k]; return p; }
  var SEAT = { hip: [190, 148], t: -90, n: -90, face: 0, arm: { s: 80, e: 20, w: 20 }, leg: { foot: [234, 190], a: 0 }, fleg: { foot: [230, 190], a: 0 } };
  function seat(over) { var p = clone(SEAT); for (var k in over) p[k] = over[k]; return p; }
  function G(at, v) { return { at: at, v: v }; }

  /* ---------------- the 42 exercises ---------------- */
  var A = {};
  /* neck */
  A['Chin tucks'] = { rig: 'headSide', keys: [{ p: { dx: 8 }, d: 1, h: .6, cue: 'Sit tall' }, { p: { dx: -10 }, d: 1, h: 2.2, cue: 'Tuck, hold 3 s' }] };
  A['Side neck stretch'] = { rig: 'headFront', keys: [{ p: { tilt: 0, stretch: 1 }, d: 1.2, h: .6, cue: 'Sit tall' }, { p: { tilt: 26, stretch: 1 }, d: 1.6, h: 2.4, cue: 'Ear to shoulder, hold' }, { p: { tilt: 0, stretch: 1 }, d: 1.4, h: .6, cue: 'Back to centre' }, { p: { tilt: -26, stretch: 1 }, d: 1.6, h: 2.4, cue: 'Other side, hold' }] };
  A['Shoulder blade squeezes'] = { rig: 'back', keys: [{ p: { sq: 0 }, d: .9, h: .6, cue: 'Relax' }, { p: { sq: 1 }, d: .9, h: 2, cue: 'Squeeze back and down, 3 s' }] };
  A['Slow neck turns'] = { rig: 'headFront', keys: [{ p: { turn: 0 }, d: 1.4, h: .4, cue: 'Centre' }, { p: { turn: 1 }, d: 1.6, h: .8, cue: 'Turn slowly' }, { p: { turn: 0 }, d: 1.4, h: .4, cue: 'Centre' }, { p: { turn: -1 }, d: 1.6, h: .8, cue: 'Other side' }] };
  /* shoulder */
  A['Pendulum swings'] = { rig: 'side', props: [['floor'], ['table', { x: 250, y: 118, w: 110 }]], fn: function (t) {
    var ph = t * 2 * Math.PI / 2.4;
    return { cue: 'Small circles, arm loose', p: stand({ hip: [180, 108], t: -22, n: -10, face: 70, leg: { foot: [196, 190], a: 0 }, fleg: { foot: [168, 190], a: 0 }, farm: { hand: [262, 118], up: false }, arm: { s: 90 + 9 * Math.sin(ph), e: 90 + 10 * Math.sin(ph + .5), w: 90 + 10 * Math.sin(ph + .6), len: 1 } }) };
  } };
  A['Wall finger walk'] = { rig: 'side', props: [['floor'], ['wall', { x: 262 }]], keys: [
    { p: stand({ hip: [204, 106], arm: { s: 30, e: 12, w: -30 } }), d: 1.4, h: .4, cue: 'Fingers on the wall' },
    { p: stand({ hip: [214, 106], t: -86, arm: { s: -62, e: -66, w: -70 } }), d: 3, h: 1.6, cue: 'Walk up, hold 5 s' }] };
  A['Doorway outward press'] = { rig: 'front', hl: 'r', props: [['floor'], ['door', { x: 108 }]], keys: [
    { p: { hip: [200, 106], rArm: { s: 92, e: 180, w: 180 }, lArm: { s: 92, e: 90, w: 90 }, rLeg: { h: 95, k: 92 }, lLeg: { h: 85, k: 88 }, glow: G('rShoulder', 0) }, d: .8, h: .8, cue: 'Elbow at your side' },
    { p: { hip: [200, 106], rArm: { s: 92, e: 180, w: 180 }, lArm: { s: 92, e: 90, w: 90 }, rLeg: { h: 95, k: 92 }, lLeg: { h: 85, k: 88 }, glow: G('rShoulder', 1) }, d: .6, h: 3, cue: 'Press out, hold 10 s' }] };
  A['Cross-body stretch'] = { rig: 'front', hl: 'r', props: [['floor']], keys: [
    { p: { hip: [200, 106], rArm: { s: 95, e: 92, w: 92 }, lArm: { hand: [219, 114], up: false }, rLeg: { h: 95, k: 92 }, lLeg: { h: 85, k: 88 } }, d: 1.2, h: .6, cue: 'Stand tall' },
    { p: { hip: [200, 106], rArm: { s: 2, e: 4, w: 4 }, lArm: { hand: [212, 66], up: false }, rLeg: { h: 95, k: 92 }, lLeg: { h: 85, k: 88 } }, d: 1.6, h: 2.6, cue: 'Hug across, hold' }] };
  /* upper back */
  A['Chair back extension'] = { rig: 'side', props: [['floor'], ['chair', { x: 160, backTop: 112 }]], keys: [
    { p: seat({ arm: { s: -120, e: 40, w: 60 } }), d: 1.2, h: .5, cue: 'Hands behind head' },
    { p: seat({ t: -116, bend: -4, n: -130, face: -40, arm: { s: -150, e: 10, w: 40 } }), d: 1.8, h: 1.2, cue: 'Lean back over the chair' }] };
  A['Open books'] = { rig: 'side', props: [['matTop']], fn: function (t) {
    var cyc = 7, u = (t % cyc) / cyc, ph, cue;
    if (u < .1) { ph = 0; cue = 'Arms together'; } else if (u < .45) { ph = ease((u - .1) / .35); cue = 'Open the top arm'; } else if (u < .62) { ph = 1; cue = 'Follow it with your eyes'; } else if (u < .95) { ph = 1 - ease((u - .62) / .33); cue = 'Close slowly'; } else { ph = 0; cue = 'Arms together'; }
    var a = ph * 180, sc = Math.abs(Math.cos(rad(a))), up = a > 90;
    return { cue: cue, p: { hip: [222, 122], t: 180, n: 180, face: 90 - ph * 180, leg: { h: 90, k: 0, a: 0 }, fleg: { h: 88, k: 2, a: 0 }, farm: { s: 90, e: 90, w: 90 }, arm: { s: up ? -90 : 90, e: up ? -90 : 90, w: up ? -90 : 90, len: Math.max(.08, sc) } } };
  } };
  A['Cat–cow'] = { rig: 'side', props: [['mat']], keys: [
    { p: quad({ bend: 0 }), d: 1, h: .3, cue: 'Flat back' },
    { p: quad({ bend: 11, n: 100, face: 170 }), d: 1.8, h: .8, cue: 'Round up, chin to chest' },
    { p: quad({ bend: 0 }), d: 1.2, h: .2, cue: 'Through flat' },
    { p: quad({ bend: -9, n: -30, face: 50 }), d: 1.8, h: .8, cue: 'Sink, lift your chest' }] };
  A['Doorway chest stretch'] = { rig: 'side', props: [['floor'], ['door', { x: 150 }]], keys: [
    { p: stand({ hip: [176, 106], arm: { s: 180, e: -90, w: -90 } }), d: 1.2, h: .5, cue: 'Forearms on the frame' },
    { p: stand({ hip: [190, 106], t: -80, n: -82, face: 8, leg: { foot: [214, 190], a: 0 }, fleg: { foot: [176, 190], a: 0 }, arm: { s: 186, e: -90, w: -90 } }), d: 1.8, h: 2.2, cue: 'Step through, hold' }] };
  /* lower back */
  A['Knee to chest'] = { rig: 'side', props: [['mat']], keys: [
    { p: sup({ arm: { hand: [224, 187] }, leg: { K: [242, 151], A: [262, 188], a: 0 } }), d: 1.2, h: .5, cue: 'Knees bent' },
    { p: sup({ arm: { hand: [194, 142], up: false }, leg: { K: [190, 148], A: [224, 134], a: -60 } }), d: 1.8, h: 2.4, cue: 'Hug the knee, hold 20 s' }] };
  A['Pelvic tilts'] = { rig: 'side', props: [['mat']], keys: [
    { p: sup({ bend: -3, glow: G('lowback', 0) }), d: 1, h: .5, cue: 'Relax' },
    { p: sup({ bend: 3, hip: [213, 184], glow: G('lowback', 1) }), d: 1.2, h: 1.4, cue: 'Flatten your low back' }] };
  A['Glute bridge'] = { rig: 'side', props: [['mat']], keys: [
    { p: sup({}), d: 1.2, h: .6, cue: 'Rest' },
    { p: sup({ hip: [205, 166], t: 158 }), d: 1.4, h: 1.6, cue: 'Squeeze and lift, hold 2 s' }] };
  A['Bird dog'] = { rig: 'side', props: [['mat']], keys: [
    { p: quad({}), d: 1.3, h: .6, cue: 'Hands and knees' },
    { p: quad({ farm: { hand: [262, 131] }, leg: { K: [107, 142], A: [65, 143], a: 182 } }), d: 1.5, h: 1.8, cue: 'Reach, hips level, hold' }] };
  A["Child's pose"] = { rig: 'side', props: [['mat']], keys: [
    { p: quad({ leg: { K: [214, 188], A: [168, 191], a: 180 }, fleg: { K: [212, 188], A: [166, 191], a: 180 }, hip: [170, 142], t: -2, arm: { hand: [226, 191] }, farm: { hand: [222, 191] } }), d: 1.5, h: .5, cue: 'Hands and knees' },
    { p: quad({ leg: { K: [214, 188], A: [168, 191], a: 180 }, fleg: { K: [212, 188], A: [166, 191], a: 180 }, hip: [176, 172], t: 16, n: 30, face: 120, arm: { hand: [300, 190] }, farm: { hand: [296, 190] } }), d: 2, h: 2.4, cue: 'Sit back, breathe, hold 30 s' }] };
  /* core */
  A['Belly breathing'] = { rig: 'side', props: [['mat']], keys: [
    { p: sup({ bend: 0, glow: G('belly', .15), arm: { hand: [194, 167], up: false } }), d: 4, h: .3, cue: 'Breathe out, 6 s' },
    { p: sup({ bend: 5, glow: G('belly', 1), arm: { hand: [194, 162], up: false } }), d: 3, h: .5, cue: 'Breathe in, belly rises' }] };
  A['Pelvic floor squeezes'] = { rig: 'side', props: [['mat']], keys: [
    { p: sup({ glow: G('pelvis', 0) }), d: 1, h: 1, cue: 'Fully relax' },
    { p: sup({ glow: G('pelvis', 1) }), d: .8, h: 2.6, cue: 'Squeeze and lift, 5 s' }] };
  A['Heel slides'] = { rig: 'side', props: [['mat']], keys: [
    { p: sup({}), d: 1.6, h: .4, cue: 'Draw belly in' },
    { p: sup({ leg: { foot: [298, 188], a: -40 } }), d: 1.8, h: .5, cue: 'Slide the heel away' }] };
  A['Dead bug, feet down'] = { rig: 'side', props: [['mat']], keys: [
    { p: sup({ arm: { s: -86, e: -88, w: -88 }, leg: { K: [214, 140], A: [256, 140], a: -60 }, fleg: { K: [212, 140], A: [254, 140], a: -60 } }), d: 1.4, h: .6, cue: 'Knees over hips' },
    { p: sup({ arm: { s: -86, e: -88, w: -88 }, leg: { K: [236, 148], A: [266, 186], a: 0 }, fleg: { K: [212, 140], A: [254, 140], a: -60 } }), d: 1.6, h: .8, cue: 'Tap the floor, back still' }] };
  /* elbow */
  A['Forearm top stretch'] = { rig: 'hand', keys: [
    { p: { w: 0, p1: 0, p2: 0, p3: 0, th: -30 }, d: 1.2, h: .5, cue: 'Arm straight, palm down' },
    { p: { w: 62, p1: 10, p2: 10, p3: 5, th: -20, help: 1 }, d: 1.6, h: 2.4, cue: 'Bend the wrist down, hold' }] };
  A['Forearm underside stretch'] = { rig: 'hand', keys: [
    { p: { w: 0, p1: 0, p2: 0, p3: 0, th: 30, side: 1 }, d: 1.2, h: .5, cue: 'Arm straight, palm up' },
    { p: { w: -55, p1: -12, p2: -6, p3: 0, th: 25, side: 1, help: 1 }, d: 1.6, h: 2.4, cue: 'Pull the fingers back, hold' }] };
  A['Slow wrist lowers'] = { rig: 'hand', props: [['deskTop']], keys: [
    { p: { w: 45, p1: 60, p2: 70, p3: 40, th: 40, bottle: 1, wrist: [180, 120] }, d: 3, h: .3, cue: 'Lower slowly, 3 s' },
    { p: { w: -40, p1: 60, p2: 70, p3: 40, th: 40, bottle: 1, wrist: [180, 120], help: 1 }, d: 1.2, h: .4, cue: 'Other hand lifts it' }] };
  A['Towel twist'] = { rig: 'towel', keys: [{ p: { rot: -28 }, d: 1.2, h: .5, cue: 'Wring one way' }, { p: { rot: 28 }, d: 1.2, h: .5, cue: 'Then the other' }] };
  /* wrist */
  A['Wrist circles'] = { rig: 'hand', props: [['deskTop']], fn: function (t) { var ph = t * 2 * Math.PI / 2.6; return { cue: 'Slow circles', p: { w: 32 * Math.sin(ph), p1: 6, p2: 6, p3: 3, th: -26, wrist: [180, 120] } }; } };
  A['Tendon glides'] = { rig: 'hand', keys: [
    { p: { w: 0, p1: 0, p2: 0, p3: 0, th: -40 }, d: 1, h: .7, cue: 'Fingers straight' },
    { p: { w: 0, p1: 0, p2: 95, p3: 80, th: -40 }, d: 1, h: .7, cue: 'Hook fist' },
    { p: { w: 0, p1: 85, p2: 95, p3: 70, th: 10 }, d: 1, h: .7, cue: 'Full fist' },
    { p: { w: 0, p1: 85, p2: 0, p3: 0, th: -20 }, d: 1, h: .7, cue: 'Tabletop' },
    { p: { w: 0, p1: 85, p2: 95, p3: 0, th: -10 }, d: 1, h: .7, cue: 'Straight fist' }] };
  A['Prayer stretch'] = { rig: 'front', props: [['floor']], keys: [
    { p: { hip: [200, 106], rArm: { hand: [198, 74], up: true, w: -90 }, lArm: { hand: [202, 74], up: false, w: -90 }, rLeg: { h: 95, k: 92 }, lLeg: { h: 85, k: 88 } }, d: 1.4, h: .5, cue: 'Palms together' },
    { p: { hip: [200, 106], rArm: { hand: [198, 100], up: true, w: -90 }, lArm: { hand: [202, 100], up: false, w: -90 }, rLeg: { h: 95, k: 92 }, lLeg: { h: 85, k: 88 } }, d: 1.8, h: 2.2, cue: 'Lower your hands, hold' }] };
  A['Towel squeeze'] = { rig: 'hand', keys: [
    { p: { w: 0, p1: 30, p2: 35, p3: 20, th: 0, roll: 1 }, d: .8, h: .8, cue: 'Let go fully' },
    { p: { w: 0, p1: 75, p2: 85, p3: 60, th: 35, roll: 1, sq: 1 }, d: .6, h: 2.4, cue: 'Squeeze, hold 5 s' }] };
  /* hip */
  A['Clamshells'] = { rig: 'side', props: [['mat']], keys: [
    { p: { hip: [210, 182], t: 180, n: 180, face: 270, arm: { s: 0, e: 0, w: 0 }, leg: { K: [244, 186], A: [268, 186], a: 10 }, fleg: { K: [244, 190], A: [268, 190], a: 10 } }, d: 1.2, h: .5, cue: 'Knees together' },
    { p: { hip: [210, 182], t: 180, n: 180, face: 270, arm: { s: 0, e: 0, w: 0 }, leg: { K: [238, 150], A: [268, 186], a: 10 }, fleg: { K: [244, 190], A: [268, 190], a: 10 }, glow: G('glute', .8) }, d: 1.2, h: 1, cue: 'Lift the top knee, hips still' }] };
  A['Kneeling hip flexor stretch'] = { rig: 'side', props: [['mat']], keys: [
    { p: { hip: [182, 140], t: -90, n: -90, face: 0, arm: { hand: [234, 140], up: false }, farm: { hand: [232, 142], up: false }, leg: { K: [232, 146], A: [236, 189], a: 0 }, fleg: { K: [160, 188], A: [118, 191], a: 180 }, glow: G('hip', 0) }, d: 1.6, h: .5, cue: 'Tall, back knee down' },
    { p: { hip: [196, 142], t: -92, n: -95, face: -5, arm: { hand: [194, 30], up: false }, farm: { hand: [190, 32], up: false }, leg: { K: [236, 150], A: [236, 189], a: 0 }, fleg: { K: [160, 188], A: [118, 191], a: 180 }, glow: G('hip', .9) }, d: 2, h: 2.4, cue: 'Tuck, shift forward, reach' }] };
  A['Figure-four stretch'] = { rig: 'side', props: [['mat']], keys: [
    { p: sup({ arm: { hand: [224, 187] }, fleg: { foot: [258, 188], a: 0 }, leg: { K: [232, 168], A: [244, 152], a: -60 }, glow: G('glute', 0) }), d: 1.4, h: .5, cue: 'Ankle over knee' },
    { p: sup({ fleg: { foot: [214, 126], a: -70 }, leg: { K: [226, 148], A: [221, 130], a: -80 }, arm: { hand: [218, 132], up: false }, glow: G('glute', .8) }), d: 1.8, h: 2.4, cue: 'Pull the thigh in, hold' }] };
  /* knee */
  A['Thigh squeezes'] = { rig: 'side', props: [['mat']], keys: [
    { p: { hip: [150, 182], t: -80, n: -80, face: 10, farm: { hand: [118, 191] }, arm: { hand: [122, 191] }, leg: { foot: [236, 186], a: -70 }, fleg: { foot: [232, 186], a: -70 }, glow: G('thigh', 0) }, d: .8, h: .8, cue: 'Relax' },
    { p: { hip: [150, 182], t: -80, n: -80, face: 10, farm: { hand: [118, 191] }, arm: { hand: [122, 191] }, leg: { foot: [237, 188], a: -76 }, fleg: { foot: [232, 186], a: -70 }, glow: G('thigh', 1) }, d: .5, h: 2.6, cue: 'Tighten, press the knee down' }] };
  A['Straight leg raise'] = { rig: 'side', props: [['mat']], keys: [
    { p: sup({ leg: { foot: [298, 187], a: -70 }, glow: G('thigh', .2) }), d: 1.6, h: .5, cue: 'Tighten the thigh' },
    { p: sup({ leg: { foot: [284, 138], a: -122 }, glow: G('thigh', .7) }), d: 1.4, h: .6, cue: 'Lift to knee height' }] };
  A['Sit to stand'] = { rig: 'side', props: [['floor'], ['chair', { x: 160, back: false }]], keys: [
    { p: seat({ leg: { foot: [228, 190], a: 0 }, fleg: { foot: [224, 190], a: 0 }, arm: { s: 120, e: 60, w: 40 } }), d: 1.6, h: .5, cue: 'Feet back, sit tall' },
    { p: seat({ hip: [200, 144], t: -45, n: -40, face: 50, leg: { foot: [228, 190], a: 0 }, fleg: { foot: [224, 190], a: 0 }, arm: { s: 60, e: 20, w: 10 } }), d: 1, h: .1, cue: 'Lean forward' },
    { p: stand({ hip: [218, 106], leg: { foot: [228, 190], a: 0 }, fleg: { foot: [224, 190], a: 0 } }), d: 1.2, h: .6, cue: 'Stand, no hands' }] };
  /* ankle */
  A['Ankle alphabet'] = { rig: 'foot', fn: function (t) { var ph = t * 2 * Math.PI / 3.2; return { cue: 'Trace A, B, C…', p: { ankle: [190, 120], a: 20 + 22 * Math.sin(ph), fl: 1 - .22 * (1 + Math.cos(ph * 2)) / 2, toe: 10, trail: 1 } }; } };
  A['Calf raises'] = { rig: 'side', props: [['floor'], ['counter', { x: 262 }]], keys: [
    { p: stand({ hip: [196, 106], farm: { hand: [264, 98], up: false }, leg: { foot: [198, 190], a: 0 }, fleg: { foot: [194, 190], a: 0 } }), d: 3, h: .3, cue: 'Lower over 3 s' },
    { p: stand({ hip: [199, 96], farm: { hand: [264, 98], up: false }, leg: { foot: [201, 179], a: 38 }, fleg: { foot: [197, 179], a: 38 }, glow: G('calf', .7) }), d: 1, h: .8, cue: 'Rise onto your toes' }] };
  A['Wall calf stretch'] = { rig: 'side', props: [['floor'], ['wall', { x: 286 }]], keys: [
    { p: stand({ hip: [214, 106], t: -76, n: -78, face: 12, arm: { hand: [286, 78] }, farm: { hand: [286, 80] }, leg: { foot: [240, 190], a: 0 }, fleg: { foot: [170, 190], a: 0 } }), d: 1.4, h: .5, cue: 'Hands on wall, heel down' },
    { p: stand({ hip: [228, 108], t: -72, n: -74, face: 16, arm: { hand: [286, 80] }, farm: { hand: [286, 82] }, leg: { foot: [240, 190], a: 0 }, fleg: { foot: [170, 190], a: 0 }, glow: G('calf', 0) }), d: 1.8, h: 2.4, cue: 'Lean in, hold 30 s' }] };
  A['One-leg balance'] = { rig: 'side', props: [['floor'], ['counter', { x: 270 }]], fn: function (t) { var sw = Math.sin(t * 1.7) * 1.4; return { cue: 'Balance, 30 s', p: stand({ hip: [198 + sw, 106], t: -90 + sw * .6, n: -90, arm: { s: 60, e: 40, w: 30 }, farm: { s: 120, e: 100, w: 90 }, leg: { foot: [198, 190], a: 0 }, fleg: { h: 60, k: 110, a: 20 } }) }; } };
  A['Towel scrunches'] = { rig: 'foot', keys: [
    { p: { ankle: [168, 152], a: 12, fl: 1, toe: 0, towel: 0 }, d: .8, h: .4, cue: 'Toes spread' },
    { p: { ankle: [168, 152], a: 12, fl: .96, toe: 45, towel: 1 }, d: .9, h: .5, cue: 'Scrunch the towel in' }] };

  /* ---------------- instance ---------------- */
  function cueText(anim, t) {
    if (anim.fn) return anim.fn(t);
    var keys = anim.keys, segs = [], total = 0, i;
    for (i = 0; i < keys.length; i++) { var k = keys[i], next = keys[(i + 1) % keys.length]; segs.push({ from: k, to: next, d: next.d, h: next.h || 0 }); total += next.d + (next.h || 0); }
    var x = t % total;
    for (i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (x < s.d) return { p: lerpObj(s.from.p, s.to.p, ease(x / s.d)), cue: s.to.cue };
      x -= s.d;
      if (x < s.h) return { p: s.to.p, cue: s.to.cue };
      x -= s.h;
    }
    return { p: keys[0].p, cue: keys[0].cue };
  }
  function Inst(box, name) {
    var anim = A[name]; if (!anim) return null;
    var svg = el(box, 'svg', { viewBox: '0 0 400 225', role: 'img', 'aria-label': name + ', animated demonstration' });
    var props = el(svg, 'g', {}); (anim.props || (anim.rig === 'side' ? [['mat']] : [])).forEach(function (pr) { PROPS[pr[0]](props, pr[1] || {}); });
    if (anim.rig === 'hand' && !anim.props) {}
    var extra = el(svg, 'g', {});
    var rig = anim.rig, R;
    if (rig === 'side') R = sideRig(svg); else if (rig === 'front') R = frontRig(svg); else if (rig === 'hand') R = handRig(svg); else if (rig === 'headSide') R = headSideRig(svg); else if (rig === 'headFront') R = headFrontRig(svg); else if (rig === 'back') R = backRig(svg); else if (rig === 'foot') R = footRig(svg); else if (rig === 'towel') R = towelRig(svg);
    var over = el(svg, 'g', {});
    var cue = document.createElement('span'); cue.className = 'ex-cue'; box.appendChild(cue);
    var self = { box: box, visible: false, t0: 0, name: name };
    var helper = rig === 'hand' ? { hand: part(over, C.sand), bottle: el(extra, 'rect', { width: 22, height: 54, rx: 7, fill: C.pastel, stroke: C.sand, 'stroke-width': 2 }), roll: el(extra, 'ellipse', { rx: 16, ry: 22, fill: C.sand }) } : null;
    self.render = function (t) {
      var st = cueText(anim, t), p = st.p;
      if (cue.textContent !== st.cue) cue.textContent = st.cue;
      if (rig === 'side') drawSide(R, p, fkSide(p));
      else if (rig === 'front') drawFront(R, p, anim.hl);
      else if (rig === 'hand') {
        var J = drawHand(R, p);
        if (p.help) { var hp = p.w > 0 ? add(J.tip, p.w - 90, 2) : add(J.tip, p.w + 90, 2); cap(helper.hand, add(hp, p.w > 0 ? -60 : 60, 56), hp, 15, 11); helper.hand.g.style.display = ''; } else helper.hand.g.style.display = 'none';
        if (p.bottle) { var bp = add(J.P, p.w + 90, 20); helper.bottle.setAttribute('x', f2(bp[0] - 11)); helper.bottle.setAttribute('y', f2(bp[1] - 27)); helper.bottle.setAttribute('transform', 'rotate(' + f2(p.w) + ' ' + f2(bp[0]) + ' ' + f2(bp[1]) + ')'); helper.bottle.style.display = ''; } else helper.bottle.style.display = 'none';
        if (p.roll) { var rp = add(J.P, p.w + 90, 16); helper.roll.setAttribute('cx', f2(rp[0] + 10)); helper.roll.setAttribute('cy', f2(rp[1])); helper.roll.setAttribute('rx', f2(20 - (p.sq || 0) * 4)); helper.roll.setAttribute('ry', 26); helper.roll.style.display = ''; } else helper.roll.style.display = 'none';
      }
      else if (rig === 'headSide') drawHeadSide(R, p);
      else if (rig === 'headFront') drawHeadFront(R, p);
      else if (rig === 'back') drawBack(R, p);
      else if (rig === 'foot') drawFoot(R, p, self);
      else if (rig === 'towel') drawTowel(R, p);
    };
    self.still = function () {
      if (anim.fn) { self.render(1.2); return; }
      var k = anim.keys[anim.keys.length > 1 ? 1 : 0]; self.render(0); cue.textContent = k.cue;
      if (rig === 'side') drawSide(R, k.p, fkSide(k.p)); else if (rig === 'front') drawFront(R, k.p, anim.hl); else if (rig === 'hand') drawHand(R, k.p); else if (rig === 'headSide') drawHeadSide(R, k.p); else if (rig === 'headFront') drawHeadFront(R, k.p); else if (rig === 'back') drawBack(R, k.p); else if (rig === 'foot') drawFoot(R, k.p, self); else if (rig === 'towel') drawTowel(R, k.p);
    };
    return self;
  }

  /* one shared clock; only on-screen demos animate */
  var live = [], running = false, io = null;
  function tick(now) {
    var any = false;
    for (var i = 0; i < live.length; i++) { var it = live[i]; if (!it.visible || !it.box.isConnected) continue; any = true; it.render((now - it.t0) / 1000); }
    live = live.filter(function (it) { return it.box.isConnected; });
    if (live.length) requestAnimationFrame(tick); else running = false;
  }
  function start() { if (!running && !reduce) { running = true; requestAnimationFrame(tick); } }
  if ('IntersectionObserver' in global) io = new IntersectionObserver(function (es) { es.forEach(function (e) { var it = e.target.__shanim; if (it) it.visible = e.isIntersecting; }); }, { rootMargin: '80px' });

  global.SHAnim = {
    names: Object.keys(A),
    has: function (n) { return !!A[n]; },
    mount: function (box, name) {
      var it = Inst(box, name); if (!it) return null;
      box.__shanim = it; it.t0 = performance.now() - Math.random() * 600;
      if (reduce) { it.still(); return it; }
      it.render(0); it.visible = !io; if (io) io.observe(box);
      live.push(it); start(); return it;
    },
    mountAll: function (root) { (root || document).querySelectorAll('[data-anim]').forEach(function (b) { if (!b.__shanim) global.SHAnim.mount(b, b.getAttribute('data-anim')); }); }
  };
})(window);

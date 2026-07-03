// SVG図の生成（断面図・全体図・くさび説明図・ケース土圧図・ω-Paグラフ・揚圧力図・水圧図・地盤反力図）
import { fmt3 } from './blocks.js';

function svg(w, h, inner, cls = '') {
  return `<svg class="rpt-fig ${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}
const L = (x1, y1, x2, y2, cls = 'ln') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
const T = (x, y, text, cls = 'tx', anchor = 'middle') =>
  `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${text}</text>`;
const P = (pts, cls = 'poly') => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" class="${cls}"/>`;
const PL = (pts, cls = 'pline') => `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" class="${cls}"/>`;

// 寸法線（両端ティック付き）
function dim(x1, y1, x2, y2, label, offTx = -3) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  return (
    L(x1, y1, x2, y2, 'dim') +
    L(x1 - nx * 3, y1 - ny * 3, x1 + nx * 3, y1 + ny * 3, 'dim') +
    L(x2 - nx * 3, y2 - ny * 3, x2 + nx * 3, y2 + ny * 3, 'dim') +
    T(mx + nx * offTx, my + ny * offTx - 2, label, 'dtx')
  );
}

const mmv = (v) => String(Math.round(v * 1000));

// 1.1.1 断面形状図
export function sectionFig(geom) {
  const W = 250, H = 215;
  const s = 150 / geom.height;
  const ox = 60, oy = 185;
  const X = (x) => ox + x * s, Y = (y) => oy - y * s;
  const pts = [[0, 0], [0, geom.height], [geom.topWidth, geom.height], [geom.baseWidth, 0]];
  let g = P(pts.map(([x, y]) => [X(x), Y(y)]), 'wall');
  // 寸法: 天端幅 / 背面上部の残り幅 / 底版幅
  g += dim(X(0), Y(geom.height) - 14, X(geom.topWidth), Y(geom.height) - 14, mmv(geom.topWidth));
  g += dim(X(geom.topWidth), Y(geom.height) - 14, X(geom.baseWidth), Y(geom.height) - 14, mmv(geom.baseWidth - geom.topWidth));
  g += dim(X(0), oy + 16, X(geom.baseWidth), oy + 16, mmv(geom.baseWidth), 5);
  g += dim(X(0) - 16, Y(0), X(0) - 16, Y(geom.height), mmv(geom.height));
  g += L(X(geom.baseWidth), Y(0), X(geom.baseWidth), Y(geom.height) - 10, 'ext');
  return svg(W, H, g);
}

// 1.1.2 全体形状図（土砂天端・水位・嵩上げ盛土）
export function overallFig(geom, { soilTop, wFront = 0, wBack = 0, raise = 0, slopeN = 0 }) {
  const W = 330, H = 205;
  const topY = Math.max(geom.height, soilTop + raise);
  const s = 140 / topY;
  const ox = 95, oy = 175;
  const X = (x) => ox + x * s, Y = (y) => oy - y * s;
  const pts = [[0, 0], [0, geom.height], [geom.topWidth, geom.height], [geom.baseWidth, 0]];
  let g = P(pts.map(([x, y]) => [X(x), Y(y)]), 'wall');
  // 前面地盤線・背面土砂面（嵩上げ時は勾配→レベルの折れ線）
  g += L(X(0) - 75, Y(0), X(0), Y(0), 'ground');
  const bx = geom.baseWidth - soilTop * (geom.baseWidth - geom.topWidth) / geom.height;
  const surf = [[X(bx), Y(soilTop)]];
  if (raise > 0 && slopeN > 0) {
    surf.push([X(bx + slopeN * raise), Y(soilTop + raise)]);
    surf.push([X(bx) + 165, Y(soilTop + raise)]);
  } else {
    surf.push([X(bx) + 150, Y(soilTop)]);
  }
  g += PL(surf, 'ground');
  const hy = surf[surf.length - 1][1];
  for (let i = 0; i < 6; i++) {
    const hx = surf[surf.length - 1][0] - 14 - i * 15;
    if (hx > surf[surf.length - 2][0]) g += L(hx + 6, hy, hx, hy + 6, 'hatch');
  }
  if (raise > 0 && slopeN > 0) {
    g += T((surf[0][0] + surf[1][0]) / 2 - 8, (surf[0][1] + surf[1][1]) / 2 - 6, `1:${slopeN}`, 'dtx', 'end');
    g += dim(surf[1][0] + 14, Y(soilTop), surf[1][0] + 14, Y(soilTop + raise), mmv(raise));
  }
  // 水位（▽記号付き破線）
  const wl = (h, x1, x2, lx) => {
    if (h <= 0) return '';
    let o = L(x1, Y(h), x2, Y(h), 'water');
    o += PL([[lx - 5, Y(h) - 6], [lx + 5, Y(h) - 6], [lx, Y(h)]], 'wmark');
    o += T(lx, Y(h) - 10, mmv(h), 'dtx');
    return o;
  };
  g += wl(wFront, X(0) - 70, X(0), X(0) - 40);
  g += wl(wBack, X(geom.baseWidth), X(geom.baseWidth) + 120, X(geom.baseWidth) + 85);
  g += dim(X(0), oy + 16, X(geom.baseWidth), oy + 16, mmv(geom.baseWidth), 5);
  return svg(W, H, g);
}

// 3.x 試行くさび法の説明図（常時/地震時）
export function wedgeMethodFig(seismic) {
  const W = 340, H = 230;
  // 模式図: 壁(台形) + 地表面 + すべり面
  const heel = [200, 200], top = [160, 60], frontTop = [90, 60], frontBottom = [90, 200];
  const surfY = 60;
  const slipEnd = [305, surfY];
  let g = P([frontBottom, frontTop, top, heel], 'wall');
  g += L(top[0], surfY, 330, surfY, 'ground');
  g += L(heel[0], heel[1], slipEnd[0], slipEnd[1], 'slip');
  // 上載荷重 q
  for (let x = 215; x <= 290; x += 15) g += L(x, surfY - 18, x, surfY - 4, 'arrow');
  g += L(210, surfY - 18, 295, surfY - 18, 'ln');
  g += T(252, surfY - 24, seismic ? 'qE' : 'q', 'sym');
  g += dim(215, surfY - 34, 295, surfY - 34, seismic ? 'BE' : 'B');
  // W（くさび重心の下向き矢印）
  const cx = 235, cy = 115;
  g += L(cx, cy, cx, cy + 30, 'arrow') + T(cx + 9, cy + 18, seismic ? 'WE' : 'W', 'sym');
  if (seismic) {
    g += L(cx, cy, cx - 28, cy, 'arrow') + T(cx - 30, cy - 5, 'kh・WE', 'sym', 'end');
  }
  // R（すべり面反力）・PA（壁面反力）・c・l
  g += L(262, 152, 244, 128, 'arrow') + T(268, 150, 'R', 'sym', 'start');
  g += T(272, 118, seismic ? 'cE・lE' : 'c・l', 'sym');
  g += L(172, 128, 194, 140, 'arrow') + T(166, 126, seismic ? 'PEA' : 'PA', 'sym', 'end');
  // 角度ラベル
  g += T(214, 192, 'ω' + (seismic ? 'E' : ''), 'sym');
  g += T(258, 178, 'φ', 'sym');
  g += T(184, 100, 'α', 'sym');
  g += T(318, 52, 'β', 'sym');
  g += T(186, 152, 'δ' + (seismic ? 'E' : ''), 'sym');
  g += T(110, 52, seismic ? 'ZE' : 'Z', 'sym');
  return svg(W, H, g);
}

// ケース毎の土圧計算図（すべり角・水位・活荷重・嵩上げ盛土）
export function caseEpFig(geom, epH, ep, { waterBack = 0, wFront = 0, surcharge = false, raise = 0, slopeN = 0 }) {
  const W = 320, H = 200;
  const omega = ep.omega;
  const topY = Math.max(geom.height, epH + raise, ep.end ? ep.end[1] : 0);
  const s = 130 / topY;
  const ox = 70, oy = 172;
  const X = (x) => ox + x * s, Y = (y) => oy - y * s;
  const pts = [[0, 0], [0, geom.height], [geom.topWidth, geom.height], [geom.baseWidth, 0]];
  let g = P(pts.map(([x, y]) => [X(x), Y(y)]), 'wall');
  const bx = geom.baseWidth - epH * (geom.baseWidth - geom.topWidth) / geom.height;
  // 地表面（嵩上げ時は勾配→レベル）
  let surfEndX = 315, surfEndY = Y(epH);
  if (raise > 0 && slopeN > 0) {
    g += PL([[X(bx), Y(epH)], [X(bx + slopeN * raise), Y(epH + raise)], [315, Y(epH + raise)]], 'ground');
    surfEndY = Y(epH + raise);
  } else {
    g += L(X(bx), Y(epH), 315, Y(epH), 'ground');
  }
  // すべり線（くさび先端まで）
  const end = ep.end || [geom.baseWidth + epH / Math.tan(omega * Math.PI / 180), epH];
  g += L(X(geom.baseWidth), Y(0), X(end[0]), Y(end[1]), 'slip');
  g += T(Math.min(X(end[0]) + 6, 285), Y(end[1]) + 16, `${omega.toFixed(1)}°`, 'dtx', 'start');
  // 活荷重
  if (surcharge) {
    const lx0 = raise > 0 && slopeN > 0 ? Math.min(X(bx + slopeN * raise) + 8, 280) : X(bx) + 18;
    for (let x = lx0 + 4; x <= 300; x += 16) g += L(x, surfEndY - 14, x, surfEndY - 3, 'arrow');
    g += L(lx0, surfEndY - 14, 304, surfEndY - 14, 'ln');
    g += T(Math.max(255, lx0 + 20), surfEndY - 19, '活荷重', 'sym');
  }
  // 水位
  if (waterBack > 0) {
    g += L(X(geom.baseWidth) + 4, Y(waterBack), 315, Y(waterBack), 'water');
    g += PL([[295 - 5, Y(waterBack) - 6], [295 + 5, Y(waterBack) - 6], [295, Y(waterBack)]], 'wmark');
    g += T(295, Y(waterBack) - 10, mmv(waterBack), 'dtx');
  }
  if (wFront > 0) {
    g += L(15, Y(wFront), X(0) - 4, Y(wFront), 'water');
    g += PL([[30 - 5, Y(wFront) - 6], [30 + 5, Y(wFront) - 6], [30, Y(wFront)]], 'wmark');
  }
  g += dim(X(0) - 18, Y(0), X(0) - 18, Y(geom.height), mmv(geom.height));
  return svg(W, H, g);
}

// ω-Pa 曲線グラフ
export function omegaPaGraph(curve, xmin) {
  const W = 430, H = 190;
  const x0 = 70, x1 = 405, y0 = 150, y1 = 25;
  const maxPa = Math.max(...curve.map((p) => p[1]), 0.1);
  const steps = [0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0];
  const step = steps.find((s) => maxPa / s <= 8) || 20;
  const ymax = Math.ceil(maxPa / step) * step;
  const SX = (w) => x0 + (w - xmin) / (90 - xmin) * (x1 - x0);
  const SY = (v) => y0 - v / ymax * (y0 - y1);
  let g = L(x0, y0, x1, y0, 'axis') + L(x0, y0, x0, y1, 'axis');
  for (let w = xmin; w <= 90; w += 10) {
    g += L(SX(w), y0, SX(w), y0 + 4, 'axis') + T(SX(w), y0 + 15, w.toFixed(2), 'gtx');
  }
  for (let v = 0; v <= ymax + 1e-9; v += step) {
    g += L(x0 - 4, SY(v), x0, SY(v), 'axis') + T(x0 - 8, SY(v) + 3, v.toFixed(1), 'gtx', 'end');
    if (v > 0) g += L(x0, SY(v), x1, SY(v), 'grid');
  }
  g += PL(curve.filter((p) => p[0] >= xmin).map(([w, v]) => [SX(w), SY(Math.min(v, ymax))]), 'curve');
  g += T((x0 + x1) / 2, H - 4, 'すべり角 ω (度)', 'gcap');
  g += T(x0, 14, '主働土圧 Pa (kN)', 'gcap', 'start');
  return svg(W, H, g);
}

// 揚圧力図（台形分布）
export function upliftFig(up) {
  const W = 320, H = 150;
  const x0 = 80, x1 = 250, yb = 55;
  const maxU = Math.max(Math.abs(up.uP1), Math.abs(up.uP2), 1e-6);
  const d1 = 60 * Math.abs(up.uP1) / maxU, d2 = 60 * Math.abs(up.uP2) / maxU;
  let g = L(x0 - 20, yb, x1 + 20, yb, 'ln');
  g += P([[x0, yb], [x1, yb], [x1, yb + d2], [x0, yb + d1]], 'press');
  for (let i = 0; i <= 4; i++) {
    const x = x0 + (x1 - x0) * i / 4;
    const d = d1 + (d2 - d1) * i / 4;
    g += L(x, yb + d, x, yb + 3, 'arrow');
  }
  g += T(x0 - 5, yb + d1 + 14, `up1 = ${fmt3(up.uP1)}(kN/m2)`, 'dtx', 'start');
  g += T(x1 + 5, yb + d2 + 14, `up2 = ${fmt3(up.uP2)}(kN/m2)`, 'dtx', 'end');
  g += dim(x0, yb - 12, x1, yb - 12, fmt3(up.B));
  return svg(W, H, g);
}

// 静水圧図（三角形分布） side: 'back'(前方へ押す) / 'front'(抵抗)
export function waterFig(wp, side) {
  const W = 260, H = 170;
  const yb = 140, yt = yb - 100 * Math.min(wp.H / 1.0, 1) - 10;
  const xw = side === 'back' ? 90 : 170;
  const dir = side === 'back' ? -1 : 1;
  const d = 70;
  let g = L(xw, yt - 15, xw, yb, 'wall2');
  const ys = yt + 10;
  g += P([[xw, ys], [xw + dir * d, yb], [xw, yb]], 'press');
  g += L(xw + dir * (d + 14), ys, xw + dir * (d + 14), yb, 'ext');
  g += T(xw + dir * 40, ys - 6, '0.000', 'dtx');
  g += T(xw + dir * 40, yb + 14, fmt3(Math.abs(wp.pw)), 'dtx');
  g += dim(xw - dir * 16, ys, xw - dir * 16, yb, mmv(wp.H));
  for (let i = 1; i <= 3; i++) {
    const y = ys + (yb - ys) * i / 4;
    const dd = d * i / 4;
    g += L(xw + dir * dd, y, xw + dir * 3, y, 'arrow');
  }
  return svg(W, H, g);
}

// 地盤反力度図
export function reactionFig(rc, sum) {
  const W = 340, H = 190;
  const x0 = 80, x1 = 260, yb = 70;
  const qm = Math.max(rc.q1, rc.q2, 1e-6);
  const d1 = 55 * rc.q1 / qm, d2 = 55 * rc.q2 / qm;
  let g = L(x0 - 15, yb, x1 + 15, yb, 'ln');
  if (rc.type === '台形') {
    g += P([[x0, yb], [x1, yb], [x1, yb + d2], [x0, yb + d1]], 'press');
  } else if (rc.q2 === 0) {
    const xe = x0 + (x1 - x0) * (rc.Bp / rc.B);
    g += P([[x0, yb], [xe, yb], [x0, yb + d1]], 'press');
  } else {
    const xs = x1 - (x1 - x0) * (rc.Bp / rc.B);
    g += P([[xs, yb], [x1, yb], [x1, yb + d2]], 'press');
  }
  g += T(x0 - 5, yb + Math.max(d1, 12) + 14, `q1 = ${fmt3(rc.q1)}(kN/m2)`, 'dtx', 'start');
  g += T(x1 + 5, yb + Math.max(d2, 12) + 14, `q2 = ${fmt3(rc.q2)}(kN/m2)`, 'dtx', 'end');
  // V と偏心量 e
  const xc = (x0 + x1) / 2;
  const xe = xc + (x1 - x0) * (sum.e / rc.B);
  g += L(xe, yb - 38, xe, yb - 4, 'arrowV');
  g += T(xe + 5, yb - 42, `V = ${fmt3(sum.V)}(kN)`, 'dtx', 'start');
  g += L(xc, yb - 26, xc, yb + 2, 'ext');
  g += T((xc + xe) / 2, yb - 28, fmt3(sum.e), 'dtx');
  g += dim(x0, yb - 14, xc, yb - 14, fmt3(rc.B / 2));
  g += dim(xc, yb - 14, x1, yb - 14, fmt3(rc.B / 2));
  g += dim(x0, yb + 72, x1, yb + 72, fmt3(rc.B), 5);
  return svg(W, H, g);
}

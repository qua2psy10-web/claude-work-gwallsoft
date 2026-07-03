// 試行くさび法による主働土圧（盛土部擁壁）
// 常時   : PA  = {W・sin(ω-φ) - c・l・cosφ}・L / cos(ω-φ-α-δ)
// 地震時 : PEA = {W・sin(ω-φ+θ)/cosθ - c・l・cosφ}・L / cos(ω-φ-α-δ)   θ=tan⁻¹(kh)
// すべり面は壁踵(底版背面端)を通る平面。
// 背面土砂形状: レベル、または壁背面位置から勾配1:nで嵩上げ高さhまで立ち上がりその先レベル(盛土)。

const RAD = Math.PI / 180;

function shoelace(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

// 多角形の y ≦ yc の部分を切り出す（Sutherland-Hodgman）
function clipBelow(poly, yc) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ain = a[1] <= yc + 1e-12;
    const bin = b[1] <= yc + 1e-12;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (yc - a[1]) / (b[1] - a[1]);
      out.push([a[0] + t * (b[0] - a[0]), yc]);
    }
  }
  return out;
}

// 1つのすべり角ωに対する土圧合力
function wedgeAt(omegaDeg, p) {
  const om = omegaDeg * RAD;
  const phi = p.phi * RAD;
  const alpha = p.alpha * RAD;
  const delta = p.delta * RAD;
  const theta = Math.atan(p.kh || 0);
  const tanW = Math.tan(om);
  const raise = p.raise || 0;
  const n = p.slopeN || 0;

  // 壁背面と土砂天端の交点
  const xb = p.heelX - p.H * Math.tan(alpha);

  // くさび多角形（踵 → 壁背面天端 → 地表面 → すべり線先端）
  let poly, end;
  if (raise > 0 && n > 0) {
    // すべり線 y=(x-heelX)tanω と法面 y=H+(x-xb)/n の交点
    const denom = tanW - 1 / n;
    if (denom <= 1e-12) return null; // すべり線が法面より緩い → くさび不成立
    const xi = (p.H - xb / n + p.heelX * tanW) / denom;
    const yi = (xi - p.heelX) * tanW;
    if (xi <= xb + 1e-12) return null;
    if (yi <= p.H + raise + 1e-12) {
      end = [xi, yi];
      poly = [[p.heelX, 0], [xb, p.H], end];
    } else {
      const xi2 = p.heelX + (p.H + raise) / tanW;
      end = [xi2, p.H + raise];
      poly = [[p.heelX, 0], [xb, p.H], [xb + n * raise, p.H + raise], end];
    }
  } else {
    const xi = p.heelX + p.H / tanW;
    if (xi <= xb + 1e-12) return null;
    end = [xi, p.H];
    poly = [[p.heelX, 0], [xb, p.H], end];
  }

  const A = shoelace(poly);
  if (!(A > 0)) return null;

  // 背面水位以下は水中単位体積重量
  const hw = Math.min(Math.max(p.waterLevel || 0, 0), p.H);
  const Abelow = hw > 0 ? shoelace(clipBelow(poly, hw)) : 0;
  const sgA = p.gammaWet * (A - Abelow) + (p.gammaSub || 0) * Abelow;

  // 上載荷重（壁背面天端位置からX1〜X2、くさび上の地表面の水平投影幅との重なり）
  const T = end[0] - xb;
  let Bq = 0;
  if (p.q > 0) {
    Bq = Math.max(0, Math.min(p.x2, T) - Math.max(p.x1, 0));
  }
  const sqB = (p.q || 0) * Bq;

  const W = sgA + sqB;
  const l = Math.hypot(end[0] - p.heelX, end[1]);
  const cl = (p.c || 0) * l;

  const dcos = Math.cos(om - phi - alpha - delta);
  if (dcos <= 1e-9) return null;
  const num = W * Math.sin(om - phi + theta) / Math.cos(theta) - cl * Math.cos(phi);
  const PA = num * p.L / dcos;
  return { omega: omegaDeg, T, A, sgA, sqB, W, l, cl, PA, end, poly };
}

// パラメータ p:
//  H:土圧作用高(m) alpha:壁背面と鉛直面のなす角(度) L:土圧作用幅(m) heelX:踵のx座標(=底版幅)
//  gammaWet, gammaSub, waterLevel(底版底からの背面水位), phi, c, delta, kh,
//  q, x1, x2(壁背面天端位置基準), precision(度),
//  raise:嵩上げ高さ(m), slopeN:法面勾配1:nのn
export function trialWedge(p) {
  const precision = p.precision || 0.001;
  const theta = Math.atan(p.kh || 0) / RAD;
  const beta = (p.raise || 0) > 0 && (p.slopeN || 0) > 0 ? Math.atan(1 / p.slopeN) / RAD : 0;
  // 掃引範囲: 分子が正となる ω > φ-θ、かつ法面勾配より急な範囲
  let lo = Math.max(p.phi - theta + 0.05, beta + 0.05, 1);
  let hi = 89.95;

  // グラフ用の粗い掃引 + 最大値の初期位置
  const curve = [];
  let best = null;
  const step = 0.05;
  for (let w = lo; w <= hi + 1e-9; w += step) {
    const r = wedgeAt(w, p);
    if (!r) continue;
    curve.push([w, Math.max(r.PA, 0)]);
    if (!best || r.PA > best.PA) best = r;
  }
  if (!best) return null;

  // 黄金分割法で precision まで詳細化
  let a = Math.max(lo, best.omega - step);
  let b = Math.min(hi, best.omega + step);
  const gr = (Math.sqrt(5) - 1) / 2;
  let c1 = b - gr * (b - a);
  let c2 = a + gr * (b - a);
  let f1 = wedgeAt(c1, p)?.PA ?? -Infinity;
  let f2 = wedgeAt(c2, p)?.PA ?? -Infinity;
  while (b - a > precision / 2) {
    if (f1 < f2) {
      a = c1; c1 = c2; f1 = f2;
      c2 = a + gr * (b - a);
      f2 = wedgeAt(c2, p)?.PA ?? -Infinity;
    } else {
      b = c2; c2 = c1; f2 = f1;
      c1 = b - gr * (b - a);
      f1 = wedgeAt(c1, p)?.PA ?? -Infinity;
    }
  }
  const omega = (a + b) / 2;
  const r = wedgeAt(omega, p);

  // 土圧合力が負となる場合は土圧なし
  const PA = Math.max(r.PA, 0);
  const da = (p.delta + p.alpha) * RAD;
  const PAV = PA * Math.sin(da);
  const PAH = PA * Math.cos(da);
  // 作用位置: 水平成分は H/3、鉛直成分は壁背面上の同じ高さの位置
  const Y = p.H / 3;
  const X = p.heelX - Y * Math.tan(p.alpha * RAD);
  // 粘着高 z = 2c/γ・tan(45°+φ/2)
  const z = (p.c || 0) > 0 ? 2 * p.c / p.gammaWet * Math.tan((45 + p.phi / 2) * RAD) : 0;

  return {
    omega, curve, beta,
    end: r.end, poly: r.poly,
    sgA: r.sgA, sqB: r.sqB, W: r.W, cl: r.cl, z,
    L: p.L, PA, PAV, PAH, X, Y,
    MV: PAV * X, MH: PAH * Y,
  };
}

// 試行くさび法による主働土圧（盛土部擁壁・背面土砂レベル）
// 常時   : PA  = {W・sin(ω-φ) - c・l・cosφ}・L / cos(ω-φ-α-δ)
// 地震時 : PEA = {W・sin(ω-φ+θ)/cosθ - c・l・cosφ}・L / cos(ω-φ-α-δ)   θ=tan⁻¹(kh)
// すべり面は壁踵(底版背面端)を通り、くさびは壁背面・地表面(レベル)・すべり面で囲まれる三角形。

const RAD = Math.PI / 180;

// 1つのすべり角ωに対する土圧合力
function wedgeAt(omegaDeg, p) {
  const om = omegaDeg * RAD;
  const phi = p.phi * RAD;
  const alpha = p.alpha * RAD;
  const delta = p.delta * RAD;
  const theta = Math.atan(p.kh || 0);

  // くさび上面幅 T = H・(cotω + tanα)
  const T = p.H * (1 / Math.tan(om) + Math.tan(alpha));
  if (!(T > 0)) return null;
  const A = 0.5 * T * p.H;

  // 背面水位以下は水中単位体積重量（幅は高さに比例するため面積比 = (hw/H)^2）
  const hw = Math.min(Math.max(p.waterLevel || 0, 0), p.H);
  const Abelow = 0.5 * hw * hw * (T / p.H);
  const sgA = p.gammaWet * (A - Abelow) + (p.gammaSub || 0) * Abelow;

  // 上載荷重（壁背面天端位置からX1〜X2の範囲、くさび上面との重なり幅）
  let Bq = 0;
  if (p.q > 0) {
    Bq = Math.max(0, Math.min(p.x2, T) - Math.max(p.x1, 0));
  }
  const sqB = (p.q || 0) * Bq;

  const W = sgA + sqB;
  const l = p.H / Math.sin(om);
  const cl = (p.c || 0) * l;

  const denom = Math.cos(om - phi - alpha - delta);
  if (denom <= 1e-9) return null;
  const num = W * Math.sin(om - phi + theta) / Math.cos(theta) - cl * Math.cos(phi);
  const PA = num * p.L / denom;
  return { omega: omegaDeg, T, A, sgA, sqB, W, l, cl, PA };
}

// パラメータ p:
//  H:土圧作用高(m) alpha:壁背面と鉛直面のなす角(度) L:土圧作用幅(m)
//  gammaWet, gammaSub, waterLevel(底版底からの背面水位), phi, c, delta, kh,
//  q, x1, x2(壁背面天端位置基準), precision(度), heelX(踵のx座標=底版幅)
export function trialWedge(p) {
  const precision = p.precision || 0.001;
  const theta = Math.atan(p.kh || 0) / RAD;
  // 掃引範囲: 分子が正となる ω > φ-θ から 90°手前まで
  let lo = Math.max(p.phi - theta + 0.05, 1);
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
    omega, curve,
    sgA: r.sgA, sqB: r.sqB, W: r.W, cl: r.cl, z,
    L: p.L, PA, PAV, PAH, X, Y,
    MV: PAV * X, MH: PAH * Y,
  };
}

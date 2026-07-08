// サンプルPDF（4冊）の計算書数値との照合テスト
//   node tests/verify.mjs
import { compute } from '../js/calc/engine.js';
import { presets } from '../js/model.js';
import { trialWedge } from '../js/calc/earthPressure.js';

let pass = 0, fail = 0;
function eq(label, actual, expected, tol = 0.0015) {
  const ok = Math.abs(actual - expected) <= tol;
  if (ok) { pass++; }
  else {
    fail++;
    console.error(`  NG ${label}: actual=${actual.toFixed(4)} expected=${expected}`);
  }
}
function eqStr(label, actual, expected) {
  if (actual === expected) { pass++; }
  else { fail++; console.error(`  NG ${label}: actual=${actual} expected=${expected}`); }
}

// ---------------------------------------------------------------
console.log('◆ 共通: 躯体自重（座標法）');
{
  const r = compute(presets.noWaterDrop());
  eq('断面積A', r.self.A, 0.448, 0.0006);
  eq('XG', r.self.XG, 0.269, 0.0006);
  eq('YG', r.self.YG, 0.391, 0.0006);
  eq('躯体自重V', r.self.V, 10.313, 0.001);
  eq('V・XG', r.self.VXG, 2.773, 0.001);
  eq('壁背面角α', r.alpha, 16.699, 0.001);
}

// ---------------------------------------------------------------
console.log('◆ サンプル1: 水位無・落差0.27 (9134390e)');
{
  // チェックなし側の変種は生成されないため、活荷重の有無それぞれで計算して照合する
  const inpN = presets.noWaterDrop();
  inpN.surcharge.enabled = false;
  const rN = compute(inpN);
  const r = compute(presets.noWaterDrop());
  eqStr('ケース数(活荷重なし)', String(rN.cases.length), '1');
  eqStr('ケース数(活荷重あり)', String(r.cases.length), '1');
  const c1 = rN.cases[0];
  const c2 = r.cases[0];

  eq('土圧作用高', r.epHeight, 0.580, 1e-9);
  // ケース1 常時
  eq('c1 ω', c1.ep.omega, 61.594, 0.02);
  eq('c1 ΣγA', c1.ep.sgA, 2.687, 0.003);
  eq('c1 PA', c1.ep.PA, 1.413, 0.002);
  eq('c1 PAV', c1.ep.PAV, 0.845, 0.002);
  eq('c1 PAH', c1.ep.PAH, 1.133, 0.002);
  eq('c1 X', c1.ep.X, 0.597, 0.001);
  eq('c1 Y', c1.ep.Y, 0.193, 0.001);
  eq('c1 V', c1.sum.V, 11.157, 0.002);
  eq('c1 H', c1.sum.H, 1.133, 0.002);
  eq('c1 M', c1.sum.M, 0.596, 0.002);
  eq('c1 e', c1.sum.e, 0.053, 0.001);
  eq('c1 3(B/2-|e|)', c1.reaction.width3, 0.822, 0.001);
  eqStr('c1 分布形', c1.reaction.type, '台形');
  eq('c1 q1', c1.reaction.q1, 25.368, 0.03);
  eq('c1 q2', c1.reaction.q2, 8.700, 0.03);
  eq('c1 B/n', c1.overturn.allow, 0.109, 0.001);
  eqStr('c1 転倒', String(c1.overturn.ok), 'true');
  eq('c1 Hu', c1.sliding.Hu, 6.694, 0.002);
  eq('c1 Hu/H', c1.sliding.ratio, 5.907, 0.01);
  eq('c1 Be', c1.sliding.Be, 0.548, 0.001);
  eqStr('c1 滑動', String(c1.sliding.ok), 'true');
  eq('c1 qmax', c1.bearing.qmax, 25.368, 0.03);
  eqStr('c1 支持', String(c1.bearing.ok), 'true');

  // ケース2 常時＋活荷重(全面載荷)
  eq('c2 ω', c2.ep.omega, 58.875, 0.02);
  eq('c2 ΣγA', c2.ep.sgA, 2.888, 0.003);
  eq('c2 ΣqB', c2.ep.sqB, 4.432, 0.005);
  eq('c2 PA', c2.ep.PA, 3.568, 0.002);
  eq('c2 PAV', c2.ep.PAV, 2.133, 0.002);
  eq('c2 PAH', c2.ep.PAH, 2.861, 0.002);
  eq('c2 V', c2.sum.V, 12.445, 0.002);
  eq('c2 H', c2.sum.H, 2.861, 0.002);
  eq('c2 M', c2.sum.M, 0.583, 0.002);
  eq('c2 e', c2.sum.e, 0.047, 0.001);
  eq('c2 q1', c2.reaction.q1, 27.152, 0.03);
  eq('c2 q2', c2.reaction.q2, 10.848, 0.03);
  eq('c2 Hu/H', c2.sliding.ratio, 2.610, 0.01);
}

// ---------------------------------------------------------------
console.log('◆ サンプル2: 水位無・落差0 (cd7bad4d)');
{
  const inpN = presets.noWaterFlush();
  inpN.surcharge.enabled = false;
  const c1 = compute(inpN).cases[0];
  const r = compute(presets.noWaterFlush());
  const c2 = r.cases[0];
  eq('土圧作用高', r.epHeight, 0.850, 1e-9);
  eq('c1 V', c1.sum.V, 12.127, 0.002);
  eq('c1 H', c1.sum.H, 2.434, 0.002);
  eq('c1 M', c1.sum.M, 0.854, 0.002);
  eq('c1 e', Math.abs(c1.sum.e), 0.070, 0.001);
  eq('c1 Hu/H', c1.sliding.ratio, 2.989, 0.01);
  eq('c1 qmax', c1.bearing.qmax, 30.459, 0.03);
  eq('c2 V', c2.sum.V, 14.373, 0.002);
  eq('c2 H', c2.sum.H, 5.448, 0.002);
  eq('c2 M', c2.sum.M, 1.163, 0.002);
  eq('c2 e', Math.abs(c2.sum.e), 0.081, 0.001);
  eq('c2 Hu/H', c2.sliding.ratio, 1.583, 0.01);
  eq('c2 qmax', c2.bearing.qmax, 38.214, 0.03);
}

// ---------------------------------------------------------------
console.log('◆ サンプル3: 水位有・落差0.27 (5f9fc85f)');
{
  // 活荷重あり: 浮力考慮1/2/3 + 地震時2ケース。活荷重なしの数値はチェックを外して照合する。
  // （旧「浮力無視」ケースは水位無しの計算と同一のためサンプル1で照合済み）
  const r = compute(presets.waterDrop());
  eqStr('ケース数', String(r.cases.length), '5');
  const inpN = presets.waterDrop();
  inpN.surcharge.enabled = false;
  const rN = compute(inpN);
  eqStr('ケース数(活荷重なし)', String(rN.cases.length), '5');
  const cS = r.cases;   // [考慮1, 考慮2, 考慮3, 地震(常時土圧), 地震(地震時土圧)] 活荷重あり
  const cN = rN.cases;  // 同上 活荷重なし

  // 揚圧力・水圧
  eq('uP1', r.uplift.uP1, -8.330, 0.001);
  eq('uP2', r.uplift.uP2, -3.724, 0.001);
  eq('UP', r.uplift.UP, -3.948, 0.002);
  eq('UP XG', r.uplift.XG, 0.286, 0.001);
  eq('背面水圧PW', r.wpBack.PW, 0.708, 0.002);
  eq('背面水圧YG', r.wpBack.YG, 0.127, 0.001);
  eq('前面水圧PW', r.wpFront.PW, -3.540, 0.002);
  eq('前面水圧YG', r.wpFront.YG, 0.283, 0.001);
  // 躯体慣性力
  eq('慣性力H', r.inertia.H, 1.650, 0.002);
  eq('慣性力H・YG', r.inertia.HYG, 0.645, 0.002);

  // 土圧: 浮力考慮ケース(水中単重)
  eq('c2 ΣγA', cN[0].ep.sgA, 2.092, 0.003);
  eq('c2 PA', cN[0].ep.PA, 1.100, 0.002);
  // 地震時土圧
  eq('c10 ωE', cS[4].ep.omega, 51.969, 0.05);
  eq('c10 ΣγAE', cS[4].ep.sgA, 3.458, 0.005);
  eq('c10 PEA', cS[4].ep.PA, 1.833, 0.003);
  eq('c10 PEAV', cS[4].ep.PAV, 0.963, 0.002);
  eq('c10 PEAH', cS[4].ep.PAH, 1.560, 0.002);

  // 作用力計算結果 (V, H, M)（サンプルの浮力考慮1/2/3・地震時の値）
  const VHM = [
    [cN[0], 7.023, -2.658, -0.570], [cN[1], 7.023, 1.590, 0.523], [cN[2], 7.023, -1.950, -0.480],
    [cS[0], 8.311, -0.929, -0.583], [cS[1], 8.311, 3.319, 0.510], [cS[2], 8.311, -0.221, -0.493],
    [cS[3], 11.157, 2.783, 1.241], [cS[4], 11.276, 3.210, 1.291],
  ];
  VHM.forEach(([c, V, H, M], i) => {
    eq(`case${i + 1} V`, c.sum.V, V, 0.003);
    eq(`case${i + 1} H`, c.sum.H, H, 0.003);
    eq(`case${i + 1} M`, c.sum.M, M, 0.003);
  });
  // 転倒 |e|
  const es = [[cN[0], 0.081], [cN[1], 0.074], [cN[2], 0.068], [cS[0], 0.070], [cS[1], 0.061], [cS[2], 0.059], [cS[3], 0.111], [cS[4], 0.115]];
  es.forEach(([c, e], i) => eq(`case${i + 1} |e|`, Math.abs(c.sum.e), e, 0.001));
  // 滑動
  const slide = [[cN[0], null], [cN[1], 2.650], [cN[2], null], [cS[0], null], [cS[1], 1.503], [cS[2], null], [cS[3], 2.405], [cS[4], 2.108]];
  slide.forEach(([c, s], i) => {
    if (s === null) eqStr(`case${i + 1} 滑動算定不能`, String(c.sliding.indeterminate), 'true');
    else eq(`case${i + 1} Hu/H`, c.sliding.ratio, s, 0.012);
  });
  // 支持 qmax
  const qmax = [[cN[0], 18.692], [cN[1], 18.032], [cN[2], 17.439], [cS[0], 20.842], [cS[1], 19.817], [cS[2], 19.588], [cS[3], 34.388], [cS[4], 35.294]];
  qmax.forEach(([c, q], i) => eq(`case${i + 1} qmax`, c.bearing.qmax, q, 0.05));
  // 地震時条件
  eq('case9 B/n', cS[3].overturn.allow, 0.218, 0.001);
  eqStr('case9 Fs', String(cS[3].sliding.Fs), '1.2');
}

// ---------------------------------------------------------------
console.log('◆ サンプル4: 水位有・落差0 (6366e656)');
{
  const r = compute(presets.waterFlush());
  const inpN = presets.waterFlush();
  inpN.surcharge.enabled = false;
  const rN = compute(inpN);
  const cS = r.cases;   // [考慮1, 考慮2, 考慮3, 地震(常時土圧), 地震(地震時土圧)] 活荷重あり
  const cN = rN.cases;  // 同上 活荷重なし
  // 土圧（背面水位0 → 浮力考慮でも土圧は同じ）
  eq('c1 ω', cN[0].ep.omega, 61.594, 0.02);
  eq('c1 ΣγA', cN[0].ep.sgA, 5.771, 0.005);
  eq('c1 PA', cN[0].ep.PA, 3.036, 0.003);
  eq('c5 ΣqB', cS[0].ep.sqB, 7.147, 0.01);
  eq('c5 PA', cS[0].ep.PA, 6.795, 0.005);
  eq('c10 ωE', cS[4].ep.omega, 51.938, 0.05);
  eq('c10 ΣγAE', cS[4].ep.sgA, 7.434, 0.01);
  eq('c10 PEA', cS[4].ep.PA, 3.937, 0.005);

  const VHM = [
    [cN[0], 9.399, -1.106, -0.447], [cN[1], 9.399, 2.434, 0.556], [cN[2], 9.399, -1.106, -0.447],
    [cS[0], 11.645, 1.908, -0.138], [cS[1], 11.645, 5.448, 0.866], [cS[2], 11.645, 1.908, -0.138],
    [cS[3], 12.127, 4.084, 1.499], [cS[4], 12.382, 5.000, 1.697],
  ];
  VHM.forEach(([c, V, H, M], i) => {
    eq(`case${i + 1} V`, c.sum.V, V, 0.004);
    eq(`case${i + 1} H`, c.sum.H, H, 0.004);
    eq(`case${i + 1} M`, c.sum.M, M, 0.004);
  });
  const es = [[cN[0], 0.048], [cN[1], 0.059], [cN[2], 0.048], [cS[0], 0.012], [cS[1], 0.074], [cS[2], 0.012], [cS[3], 0.124], [cS[4], 0.137]];
  es.forEach(([c, e], i) => eq(`case${i + 1} |e|`, Math.abs(c.sum.e), e, 0.001));
  const slide = [[cN[0], null], [cN[1], 2.317], [cN[2], null], [cS[0], 3.663], [cS[1], 1.283], [cS[2], 3.663], [cS[3], 1.782], [cS[4], 1.486]];
  slide.forEach(([c, s], i) => {
    if (s === null) eqStr(`case${i + 1} 滑動算定不能`, String(c.sliding.indeterminate), 'true');
    else eq(`case${i + 1} Hu/H`, c.sliding.ratio, s, 0.012);
  });
  eqStr('case7 滑動NG', String(cS[1].sliding.ok), 'false');
  const qmax = [[cN[0], 20.597], [cN[1], 22.129], [cN[2], 20.597], [cS[0], 19.703], [cS[1], 29.884], [cS[2], 19.703], [cS[3], 39.650], [cS[4], 43.338]];
  qmax.forEach(([c, q], i) => eq(`case${i + 1} qmax`, c.bearing.qmax, q, 0.05));
}

// ---------------------------------------------------------------
console.log('◆ 部材計算（自己整合チェック）');
{
  // サンプル入力では竪壁計算用 δm = 2/3×30 = 20度 = 安定計算用δ と一致するため、
  // 部材計算の N・M は安定計算の V・M と一致し、縁応力度は地盤反力度 q1,q2 と一致する。
  const inp = presets.noWaterDrop();
  inp.member.calc = true;
  const r = compute(inp);
  const [c1] = r.cases;
  const m = c1.member;
  eq('m N = V', m.N, c1.sum.V, 0.0005);
  eq('m M = M', m.M, c1.sum.M, 0.0005);
  eq('m S = H', m.S, c1.sum.H, 0.0005);
  eq('m σ1 = q1', m.s1, c1.reaction.q1, 0.001);
  eq('m σ2 = q2', m.s2, c1.reaction.q2, 0.001);
  eq('m A', m.A, 0.655, 1e-9);
  eq('m Z', m.Z, 0.655 * 0.655 / 6, 1e-9);
  eq('m τ', m.tau, c1.sum.H / 0.655 / 1000, 1e-6);
  eq('m k', m.k, 1.0, 1e-9);
  eqStr('m 判定', String(m.ok), 'true');

  // 地震時ケースは割増係数 k=1.5
  const inp2 = presets.waterDrop();
  inp2.member.calc = true;
  const r2 = compute(inp2);
  const m10 = r2.cases[4].member;
  eq('m10 k', m10.k, 1.5, 1e-9);
  eq('m10 σca·k', m10.sigmaCa, 5.25 * 1.5, 1e-9);
  // 揚圧力は部材計算に含まれない（浮力考慮ケースでも N は自重+土圧のみ）
  const m2 = r2.cases[1].member;
  eqStr('m2 揚圧力行なし', String(m2.rows.some((row) => row.name === '揚圧力')), 'false');
  eqStr('m2 水圧行あり', String(m2.rows.some((row) => row.name === '水圧')), 'true');
}

// ---------------------------------------------------------------
console.log('◆ 背面土の嵩上げ・勾配（理論解との照合）');
{
  // (1) 無限長斜面(嵩上げ大)・鉛直壁(α=0)・δ=β は Rankine の理論解と一致する
  //     Ka = cosβ・(cosβ−√(cos²β−cos²φ))/(cosβ+√(cos²β−cos²φ)),  PA = 1/2・γ・H²・Ka
  const phi = 30, beta = 10, gamma = 19, H = 1.0;
  const cb = Math.cos(beta * Math.PI / 180);
  const rt = Math.sqrt(cb * cb - Math.cos(phi * Math.PI / 180) ** 2);
  const Ka = cb * (cb - rt) / (cb + rt);
  const PAexp = 0.5 * gamma * H * H * Ka;
  const r = trialWedge({
    H, alpha: 0, L: 1, heelX: 0.5,
    gammaWet: gamma, gammaSub: 0, waterLevel: 0,
    phi, c: 0, delta: beta, kh: 0,
    q: 0, x1: 0, x2: 0, precision: 0.001,
    raise: 100, slopeN: 1 / Math.tan(beta * Math.PI / 180),
  });
  eq('無限斜面 PA = Rankine', r.PA, PAexp, PAexp * 0.005);

  // (2) 嵩上げ高さに対する単調性: レベル < 嵩上げ0.3m < 無限斜面
  const base = {
    H: 0.58, alpha: 16.699, L: 1, heelX: 0.655,
    gammaWet: 19, gammaSub: 0, waterLevel: 0,
    phi: 30, c: 0, delta: 20, kh: 0,
    q: 0, x1: 0, x2: 0, precision: 0.001, slopeN: 1.5,
  };
  const pa0 = trialWedge({ ...base, raise: 0 }).PA;
  const pa03 = trialWedge({ ...base, raise: 0.3 }).PA;
  const paInf = trialWedge({ ...base, raise: 50 }).PA;
  eq('レベル時PA(既存一致)', pa0, 1.413, 0.002);
  eqStr('嵩上げでPA増加', String(pa03 > pa0 && paInf > pa03), 'true');

  // (3) raise=0 は従来のレベル計算と完全一致（engine経由・活荷重なしケースで照合）
  const inp = presets.noWaterDrop();
  inp.surcharge.enabled = false;
  inp.backfill.raise = 0.3;
  inp.backfill.slopeN = 1.5;
  const re = compute(inp);
  eq('engine 嵩上げPA', re.cases[0].ep.PA, pa03, 0.001);
  eq('β算出', re.backfill.beta, Math.atan(1 / 1.5) * 180 / Math.PI, 1e-9);
}

// ---------------------------------------------------------------
console.log('◆ 追加: 計算条件の組み合わせ（揚圧力・受動土圧・衝突荷重）');
{
  // (1) 受動土圧: φ=30 → Kp = tan²(60°) = 3, PP = 1/2・19・0.5²・3 = 7.125
  const inp = presets.noWaterDrop();
  inp.passive.enabled = true;
  inp.frontSoil.normal = 0.5;
  const r = compute(inp);
  const base = compute(presets.noWaterDrop());
  eq('受動土圧 Kp', r.passiveN.Kp, 3.0, 0.001);
  eq('受動土圧 PP', r.passiveN.PP, 7.125, 0.001);
  eq('滑動 Hu増分 = PP', r.cases[0].sliding.Hu - base.cases[0].sliding.Hu, 7.125, 0.001);
  eq('転倒 e 不変', r.cases[0].sum.e, base.cases[0].sum.e, 1e-9);
  eq('支持 q1 不変', r.cases[0].reaction.q1, base.cases[0].reaction.q1, 1e-9);
}
{
  // (2) 衝突荷重: 「衝突時」ケースが追加され H・H·y に反映される
  const inp = presets.noWaterDrop();
  inp.collision.enabled = true;
  inp.collision.P = 10;
  inp.collision.h = 0.85;
  const r = compute(inp);
  const base = compute(presets.noWaterDrop());
  eqStr('ケース数+1', String(r.cases.length), String(base.cases.length + 1));
  const cc = r.cases[r.cases.length - 1];
  eqStr('衝突ケース名', cc.name, '衝突時');
  // 衝突時ケースは活荷重なしのため、活荷重なしの常時計算と比較する
  const inpN = presets.noWaterDrop();
  inpN.surcharge.enabled = false;
  const baseN = compute(inpN);
  eq('衝突時 H = 常時H + P・L', cc.sum.H, baseN.cases[0].sum.H + 10 * 1.0, 0.001);
  eq('衝突時 H・y増分 = P・L・h', cc.sum.Hy - baseN.cases[0].sum.Hy, 8.5, 0.001);
  eq('衝突時 Fs', cc.cond.Fs, 1.2, 1e-9);
  eq('既存ケース V 不変', r.cases[0].sum.V, base.cases[0].sum.V, 1e-9);
  eq('既存ケース H 不変', r.cases[0].sum.H, base.cases[0].sum.H, 1e-9);
}
{
  // (3) 揚圧力オフ: 浮力考慮ケースから揚圧力行が外れる（水圧・土圧低減は維持）
  const inp = presets.waterDrop();
  inp.water.considerUplift = false;
  const r = compute(inp);
  const base = compute(presets.waterDrop());
  eqStr('揚圧力行なし', String(r.cases.some((c) => c.rows.some((row) => row.name === '揚圧力'))), 'false');
  eqStr('比較元は揚圧力行あり', String(base.cases.some((c) => c.rows.some((row) => row.name === '揚圧力'))), 'true');
  const idx = base.cases.findIndex((c) => c.buoyancy === 2 && !c.inertia);
  eq('V差 = −UP', r.cases[idx].sum.V - base.cases[idx].sum.V, -base.uplift.UP, 0.001);
  eq('H 不変', r.cases[idx].sum.H, base.cases[idx].sum.H, 1e-9);
}
{
  // (4) 部材計算: 衝突時は割増係数1.5・衝突荷重行を含む
  const inp = presets.noWaterDrop();
  inp.member.calc = true;
  inp.collision.enabled = true;
  const r = compute(inp);
  const cc = r.cases[r.cases.length - 1];
  eq('衝突時 割増係数k', cc.member.k, 1.5, 1e-9);
  eqStr('部材作用力に衝突荷重行', String(cc.member.rows.some((row) => row.name === '衝突荷重')), 'true');
}

// ---------------------------------------------------------------
console.log('◆ 追加: チェックなし側の変種ケースは生成しない');
{
  const r1 = compute(presets.noWaterDrop());   // 活荷重考慮・水位無
  eqStr('水位無・活荷重考慮 → 1ケース', String(r1.cases.length), '1');
  eqStr('全ケースが活荷重あり', String(r1.cases.every((c) => c.surcharge)), 'true');
  const r2 = compute(presets.waterDrop());     // 活荷重・水位・地震を考慮
  eqStr('水位有 → 浮力考慮3+地震2の5ケース', String(r2.cases.length), '5');
  eqStr('浮力無視の常時ケースなし', String(r2.cases.some((c) => !c.inertia && c.buoyancy === 0)), 'false');
  const inp3 = presets.noWaterDrop();
  inp3.surcharge.enabled = false;              // 全条件チェックなし
  const r3 = compute(inp3);
  eqStr('全条件なし → 常時1ケース', String(r3.cases.length === 1 && r3.cases[0].name === '常時'), 'true');
}

// ---------------------------------------------------------------
console.log(`\n結果: ${pass} 件一致 / ${fail} 件不一致`);
process.exit(fail === 0 ? 0 : 1);

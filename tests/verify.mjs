// サンプルPDF（4冊）の計算書数値との照合テスト
//   node tests/verify.mjs
import { compute } from '../js/calc/engine.js';
import { presets } from '../js/model.js';

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
  const r = compute(presets.noWaterDrop());
  eqStr('ケース数', String(r.cases.length), '2');
  const [c1, c2] = r.cases;

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
  const r = compute(presets.noWaterFlush());
  const [c1, c2] = r.cases;
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
  const r = compute(presets.waterDrop());
  eqStr('ケース数', String(r.cases.length), '10');
  const c = r.cases;

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
  eq('c2 ΣγA', c[1].ep.sgA, 2.092, 0.003);
  eq('c2 PA', c[1].ep.PA, 1.100, 0.002);
  // 地震時土圧
  eq('c10 ωE', c[9].ep.omega, 51.969, 0.05);
  eq('c10 ΣγAE', c[9].ep.sgA, 3.458, 0.005);
  eq('c10 PEA', c[9].ep.PA, 1.833, 0.003);
  eq('c10 PEAV', c[9].ep.PAV, 0.963, 0.002);
  eq('c10 PEAH', c[9].ep.PAH, 1.560, 0.002);

  // 作用力計算結果 (V, H, M)
  const VHM = [
    [11.157, 1.133, 0.596], [7.023, -2.658, -0.570], [7.023, 1.590, 0.523], [7.023, -1.950, -0.480],
    [12.445, 2.861, 0.583], [8.311, -0.929, -0.583], [8.311, 3.319, 0.510], [8.311, -0.221, -0.493],
    [11.157, 2.783, 1.241], [11.276, 3.210, 1.291],
  ];
  VHM.forEach(([V, H, M], i) => {
    eq(`case${i + 1} V`, c[i].sum.V, V, 0.003);
    eq(`case${i + 1} H`, c[i].sum.H, H, 0.003);
    eq(`case${i + 1} M`, c[i].sum.M, M, 0.003);
  });
  // 転倒 |e|
  const es = [0.053, 0.081, 0.074, 0.068, 0.047, 0.070, 0.061, 0.059, 0.111, 0.115];
  es.forEach((e, i) => eq(`case${i + 1} |e|`, Math.abs(c[i].sum.e), e, 0.001));
  // 滑動
  const slide = [5.907, null, 2.650, null, 2.610, null, 1.503, null, 2.405, 2.108];
  slide.forEach((s, i) => {
    if (s === null) eqStr(`case${i + 1} 滑動算定不能`, String(c[i].sliding.indeterminate), 'true');
    else eq(`case${i + 1} Hu/H`, c[i].sliding.ratio, s, 0.012);
  });
  // 支持 qmax
  const qmax = [25.368, 18.692, 18.032, 17.439, 27.152, 20.842, 19.817, 19.588, 34.388, 35.294];
  qmax.forEach((q, i) => eq(`case${i + 1} qmax`, c[i].bearing.qmax, q, 0.05));
  // 地震時条件
  eq('case9 B/n', c[8].overturn.allow, 0.218, 0.001);
  eqStr('case9 Fs', String(c[8].sliding.Fs), '1.2');
}

// ---------------------------------------------------------------
console.log('◆ サンプル4: 水位有・落差0 (6366e656)');
{
  const r = compute(presets.waterFlush());
  const c = r.cases;
  // 土圧（背面水位0 → 浮力考慮でも土圧は同じ）
  eq('c1 ω', c[0].ep.omega, 61.594, 0.02);
  eq('c1 ΣγA', c[0].ep.sgA, 5.771, 0.005);
  eq('c1 PA', c[0].ep.PA, 3.036, 0.003);
  eq('c5 ΣqB', c[4].ep.sqB, 7.147, 0.01);
  eq('c5 PA', c[4].ep.PA, 6.795, 0.005);
  eq('c10 ωE', c[9].ep.omega, 51.938, 0.05);
  eq('c10 ΣγAE', c[9].ep.sgA, 7.434, 0.01);
  eq('c10 PEA', c[9].ep.PA, 3.937, 0.005);

  const VHM = [
    [12.127, 2.434, 0.854], [9.399, -1.106, -0.447], [9.399, 2.434, 0.556], [9.399, -1.106, -0.447],
    [14.373, 5.448, 1.163], [11.645, 1.908, -0.138], [11.645, 5.448, 0.866], [11.645, 1.908, -0.138],
    [12.127, 4.084, 1.499], [12.382, 5.000, 1.697],
  ];
  VHM.forEach(([V, H, M], i) => {
    eq(`case${i + 1} V`, c[i].sum.V, V, 0.004);
    eq(`case${i + 1} H`, c[i].sum.H, H, 0.004);
    eq(`case${i + 1} M`, c[i].sum.M, M, 0.004);
  });
  const es = [0.070, 0.048, 0.059, 0.048, 0.081, 0.012, 0.074, 0.012, 0.124, 0.137];
  es.forEach((e, i) => eq(`case${i + 1} |e|`, Math.abs(c[i].sum.e), e, 0.001));
  const slide = [2.989, null, 2.317, null, 1.583, 3.663, 1.283, 3.663, 1.782, 1.486];
  slide.forEach((s, i) => {
    if (s === null) eqStr(`case${i + 1} 滑動算定不能`, String(c[i].sliding.indeterminate), 'true');
    else eq(`case${i + 1} Hu/H`, c[i].sliding.ratio, s, 0.012);
  });
  eqStr('case7 滑動NG', String(c[6].sliding.ok), 'false');
  const qmax = [30.459, 20.597, 22.129, 20.597, 38.214, 19.703, 29.884, 19.703, 39.650, 43.338];
  qmax.forEach((q, i) => eq(`case${i + 1} qmax`, c[i].bearing.qmax, q, 0.05));
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
  const m10 = r2.cases[9].member;
  eq('m10 k', m10.k, 1.5, 1e-9);
  eq('m10 σca·k', m10.sigmaCa, 5.25 * 1.5, 1e-9);
  // 揚圧力は部材計算に含まれない（浮力考慮ケースでも N は自重+土圧のみ）
  const m2 = r2.cases[1].member;
  eqStr('m2 揚圧力行なし', String(m2.rows.some((row) => row.name === '揚圧力')), 'false');
  eqStr('m2 水圧行あり', String(m2.rows.some((row) => row.name === '水圧')), 'true');
}

// ---------------------------------------------------------------
console.log(`\n結果: ${pass} 件一致 / ${fail} 件不一致`);
process.exit(fail === 0 ? 0 : 1);

// 部材計算: 無筋コンクリート竪壁の応力度照査（許容応力度法）
// 照査断面は竪壁付け根（底版上面）。断面より上の作用力から
// 軸力N・せん断力S・図心回りモーメントMを求め、縁応力度・せん断応力度を照査する。
//   A = b・L,  Z = L・b²/6
//   e = b/2 − (ΣV・x − ΣH・y)/N,  M = N・e
//   σ1,σ2 = N/A ± M/Z （前面側/背面側の縁応力度）
//   τ = S/A
// 許容値は基準値×割増係数k（常時1.00/地震時1.50）

const KN_M2_TO_N_MM2 = 1 / 1000; // kN/m2 → N/mm2

export function memberCheck({ rows, b, L, member, k }) {
  const N = rows.reduce((s, r) => s + r.V, 0);
  const Vx = rows.reduce((s, r) => s + r.Vx, 0);
  const S = rows.reduce((s, r) => s + r.H, 0);
  const Hy = rows.reduce((s, r) => s + r.Hy, 0);
  const e = b / 2 - (Vx - Hy) / N;
  const M = N * e;

  const A = b * L;
  const Z = L * b * b / 6;
  const s1 = N / A + M / Z; // 前面側縁応力度 (kN/m2)
  const s2 = N / A - M / Z; // 背面側縁応力度 (kN/m2)
  const tau = Math.abs(S) / A;

  // N/mm2 換算
  const sigma1 = s1 * KN_M2_TO_N_MM2;
  const sigma2 = s2 * KN_M2_TO_N_MM2;
  const sigmaC = Math.max(sigma1, sigma2);              // 曲げ圧縮（正）
  const sigmaT = Math.max(-Math.min(sigma1, sigma2), 0); // 曲げ引張（負側の絶対値）
  const tauD = tau * KN_M2_TO_N_MM2;

  const sigmaCa = member.sigmaCa * k;
  const sigmaCta = member.sigmaCta * k;
  const tauA = member.tauA * k;

  return {
    rows, b, L, A, Z, k,
    N, Vx, S, Hy, e, M,
    s1, s2,
    sigma1, sigma2, sigmaC, sigmaT, tau: tauD,
    sigmaCa, sigmaCta, tauA,
    okC: sigmaC <= sigmaCa + 1e-9,
    okT: sigmaT <= sigmaCta + 1e-9,
    okTau: tauD <= tauA + 1e-9,
    get ok() { return this.okC && this.okT && this.okTau; },
  };
}

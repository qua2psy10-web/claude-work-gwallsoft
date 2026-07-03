// 作用力の算定: 躯体自重・慣性力・揚圧力・水圧・作用力集計・地盤反力度
import { sectionProperties, wallVertices } from './geometry.js';

// 躯体自重（座標法）
export function selfWeight(geom, gammaConcrete, bodyLength) {
  const sec = sectionProperties(wallVertices(geom));
  const V = sec.A * gammaConcrete * bodyLength;
  return {
    sec,
    A: sec.A, gamma: gammaConcrete, L: bodyLength,
    V, XG: sec.XG, YG: sec.YG,
    VXG: V * sec.XG,
  };
}

// 躯体慣性力 H = V・kh（着力点は重心高YG）
export function bodyInertia(self, kh) {
  const H = self.V * kh;
  return { A: self.A, gamma: self.gamma, L: self.L, V: self.V, kh, H, YG: self.YG, HYG: H * self.YG };
}

// 揚圧力（台形分布）
//  uP1 = -γw・HW1(前面側), uP2 = -γw・HW2(背面側)
//  UP  = (uP1+uP2)/2・B・L,  XG = B(uP1+2uP2)/{3(uP1+uP2)}
export function uplift(gammaW, HW1, HW2, B, L) {
  const uP1 = -gammaW * HW1;
  const uP2 = -gammaW * HW2;
  const UP = (uP1 + uP2) / 2 * B * L;
  const XG = (uP1 + uP2) === 0 ? B / 2 : B * (uP1 + 2 * uP2) / (3 * (uP1 + uP2));
  return { gammaW, HW1, HW2, B, L, uP1, uP2, UP, XG, UPXG: UP * XG };
}

// 静水圧 PW = 1/2・γw・H^2・L（dir: +1=背面(前方へ押す), -1=前面(抵抗)）
export function waterPressure(gammaW, H, L, dir) {
  const pw = dir * gammaW * H;
  const PW = 0.5 * pw * H * L;
  const YG = H / 3;
  return { gammaW, H, L, pw, PW, YG, PWYG: PW * YG };
}

// 作用力の集計と偏心量・モーメント
//  e = B/2 - (ΣV・x - ΣH・y)/ΣV,  M = V・e
export function aggregate(rows, B) {
  const V = rows.reduce((s, r) => s + r.V, 0);
  const Vx = rows.reduce((s, r) => s + r.Vx, 0);
  const H = rows.reduce((s, r) => s + r.H, 0);
  const Hy = rows.reduce((s, r) => s + r.Hy, 0);
  const e = B / 2 - (Vx - Hy) / V;
  const M = V * e;
  return { rows, B, V, Vx, H, Hy, e, M };
}

// 地盤反力度（台形分布 / 三角形分布）
export function groundReaction(B, L, e, V, M) {
  const width3 = 3 * (B / 2 - Math.abs(e));
  if (width3 > B) {
    // 台形分布: q1,q2 = V/(B・L) ± 6M/(B^2・L)
    const q1 = V / (B * L) + 6 * M / (B * B * L);
    const q2 = V / (B * L) - 6 * M / (B * B * L);
    return { type: '台形', width3, B, Bp: B, q1, q2 };
  }
  // 三角形分布: B'=3(B/2-|e|)、後方偏心(e<0)のときは B'=B
  const Bp = e < 0 ? B : width3;
  const q1 = 2 * V / (Bp * L);
  if (e < 0) return { type: '三角形', width3, B, Bp, q1: 0, q2: q1 };
  return { type: '三角形', width3, B, Bp, q1, q2: 0 };
}

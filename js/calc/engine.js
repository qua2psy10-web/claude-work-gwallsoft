// 全荷重ケースの一括計算
import { backFaceAngle } from './geometry.js';
import { trialWedge } from './earthPressure.js';
import { selfWeight, bodyInertia, uplift, waterPressure, aggregate, groundReaction } from './forces.js';
import { checkOverturn, checkSliding, checkBearing } from './stability.js';
import { generateCases } from '../model.js';

export function compute(input) {
  const geom = input.geometry;
  const gammaConcrete = input.concrete.type === 'rc' ? input.concrete.gammaRC : input.concrete.gammaPlain;
  const alpha = backFaceAngle(geom);
  const epHeight = geom.height - input.drop; // 土圧の作用高
  const B = geom.baseWidth;
  const Lbase = input.lengths.base;

  const self = selfWeight(geom, gammaConcrete, input.lengths.body);
  const inertia = input.seismic.enabled ? bodyInertia(self, input.seismic.khBody) : null;

  const up = input.water.enabled
    ? uplift(input.soil.gammaW, input.water.normal.front, input.water.normal.back, B, Lbase)
    : null;

  const wpBack = input.water.enabled && input.water.normal.back > 0
    ? waterPressure(input.soil.gammaW, input.water.normal.back, Lbase, +1)
    : null;
  const wpFront = input.water.enabled && input.water.normal.front > 0
    ? waterPressure(input.soil.gammaW, input.water.normal.front, Lbase, -1)
    : null;

  const caseDefs = generateCases(input);
  const cases = caseDefs.map((cd) => {
    const seismicEp = cd.epKind === 'seismic';
    const useWater = cd.buoyancy > 0; // 浮力考慮ケースのみ背面水位で土圧を低減
    const ep = trialWedge({
      H: epHeight,
      alpha,
      L: input.lengths.ep,
      heelX: B,
      gammaWet: input.soil.gammaWet,
      gammaSub: input.soil.gammaSub,
      waterLevel: useWater ? input.water.normal.back : 0,
      phi: input.soil.phi,
      c: seismicEp ? input.soil.cE : input.soil.c,
      delta: seismicEp ? input.soil.deltaE : input.soil.delta,
      kh: seismicEp ? input.seismic.khSoil : 0,
      q: cd.surcharge ? input.surcharge.q : 0,
      x1: input.surcharge.x1,
      x2: input.surcharge.x2,
      precision: input.epCondition.precision,
    });

    // 作用力の集計行
    const rows = [{ name: '躯体自重', V: self.V, Vx: self.VXG, H: 0, Hy: 0 }];
    if (cd.inertia && inertia) {
      rows.push({ name: '躯体慣性力', V: 0, Vx: 0, H: inertia.H, Hy: inertia.HYG });
    }
    if (cd.buoyancy > 0 && up) {
      rows.push({ name: '揚圧力', V: up.UP, Vx: up.UPXG, H: 0, Hy: 0 });
    }
    rows.push({
      name: '土圧',
      V: input.epCondition.considerPv ? ep.PAV : 0,
      Vx: input.epCondition.considerPv ? ep.MV : 0,
      H: ep.PAH, Hy: ep.MH,
    });
    // 水圧: 浮力考慮1=前面のみ, 2=背面のみ, 3=前背面
    if (cd.buoyancy > 0) {
      let PW = 0, PWY = 0;
      if ((cd.buoyancy === 2 || cd.buoyancy === 3) && wpBack) { PW += wpBack.PW; PWY += wpBack.PWYG; }
      if ((cd.buoyancy === 1 || cd.buoyancy === 3) && wpFront) { PW += wpFront.PW; PWY += wpFront.PWYG; }
      rows.push({ name: '水圧', V: 0, Vx: 0, H: PW, Hy: PWY });
    }

    const sum = aggregate(rows, B);
    const reaction = groundReaction(B, Lbase, sum.e, sum.V, sum.M);
    const overturn = checkOverturn(sum.e, B, cd.cond.n);
    const sliding = checkSliding(sum.V, sum.H, sum.e, B, Lbase, input.stability.mu, input.stability.cB, cd.cond.Fs);
    const bearing = checkBearing(reaction.q1, reaction.q2, cd.cond.qa);

    return { ...cd, ep, rows, sum, reaction, overturn, sliding, bearing };
  });

  return {
    input, alpha, epHeight, gammaConcrete,
    self, inertia, uplift: up, wpBack, wpFront,
    cases,
  };
}

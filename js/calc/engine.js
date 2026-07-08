// 全荷重ケースの一括計算
import { backFaceAngle } from './geometry.js';
import { trialWedge } from './earthPressure.js';
import { selfWeight, bodyInertia, uplift, passivePressure, waterPressure, aggregate, groundReaction } from './forces.js';
import { checkOverturn, checkSliding, checkBearing } from './stability.js';
import { memberCheck } from './member.js';
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

  const up = input.water.enabled && input.water.considerUplift !== false
    ? uplift(input.soil.gammaW, input.water.normal.front, input.water.normal.back, B, Lbase)
    : null;

  // 受動土圧（前載土砂・ランキン受働土圧）: 滑動抵抗力に加算する
  const passiveOn = !!input.passive?.enabled;
  const ppN = passiveOn
    ? passivePressure(input.soil.gammaWet, input.soil.phi, input.soil.c, input.frontSoil.normal, input.lengths.ep)
    : null;
  const ppE = passiveOn
    ? passivePressure(input.soil.gammaWet, input.soil.phi, input.soil.cE, input.frontSoil.seismic, input.lengths.ep)
    : null;

  // 衝突荷重（水平力・土圧と同方向）
  const col = input.collision?.enabled
    ? {
        name: input.collision.name || '衝突荷重',
        P: input.collision.P, h: input.collision.h, L: input.lengths.body,
        H: input.collision.P * input.lengths.body,
        HYG: input.collision.P * input.lengths.body * input.collision.h,
      }
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
      raise: input.backfill?.raise || 0,
      slopeN: input.backfill?.slopeN || 0,
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
    if (cd.collision && col) {
      rows.push({ name: col.name, V: 0, Vx: 0, H: col.H, Hy: col.HYG });
    }
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
    const passive = cd.inertia ? ppE : ppN; // 地震時は地震時の前載土砂高・粘着力で算定
    const sliding = checkSliding(
      sum.V, sum.H, sum.e, B, Lbase, input.stability.mu, input.stability.cB, cd.cond.Fs,
      passive ? passive.PP : 0,
    );
    const bearing = checkBearing(reaction.q1, reaction.q2, cd.cond.qa);

    // 部材計算（竪壁付け根の応力度照査）
    // 竪壁計算用の壁面摩擦角は計算値 δm = 2/3・φ として土圧を別途算定する。
    // 揚圧力は照査断面（底版上面）より下に作用するため含めない。
    let member = null;
    let epm = null;
    if (input.member.calc) {
      const deltaM = (2 / 3) * input.soil.phi;
      epm = trialWedge({
        H: epHeight,
        alpha,
        L: input.lengths.ep,
        heelX: B,
        gammaWet: input.soil.gammaWet,
        gammaSub: input.soil.gammaSub,
        waterLevel: useWater ? input.water.normal.back : 0,
        phi: input.soil.phi,
        c: seismicEp ? input.soil.cE : input.soil.c,
        delta: deltaM,
        kh: seismicEp ? input.seismic.khSoil : 0,
        q: cd.surcharge ? input.surcharge.q : 0,
        x1: input.surcharge.x1,
        x2: input.surcharge.x2,
        precision: input.epCondition.precision,
        raise: input.backfill?.raise || 0,
        slopeN: input.backfill?.slopeN || 0,
      });
      const mRows = [{ name: '躯体自重', V: self.V, Vx: self.VXG, H: 0, Hy: 0 }];
      if (cd.inertia && inertia) {
        mRows.push({ name: '躯体慣性力', V: 0, Vx: 0, H: inertia.H, Hy: inertia.HYG });
      }
      mRows.push({ name: '土圧', V: epm.PAV, Vx: epm.MV, H: epm.PAH, Hy: epm.MH });
      if (cd.collision && col) {
        mRows.push({ name: col.name, V: 0, Vx: 0, H: col.H, Hy: col.HYG });
      }
      if (cd.buoyancy > 0) {
        let PW = 0, PWY = 0;
        if ((cd.buoyancy === 2 || cd.buoyancy === 3) && wpBack) { PW += wpBack.PW; PWY += wpBack.PWYG; }
        if ((cd.buoyancy === 1 || cd.buoyancy === 3) && wpFront) { PW += wpFront.PW; PWY += wpFront.PWYG; }
        mRows.push({ name: '水圧', V: 0, Vx: 0, H: PW, Hy: PWY });
      }
      member = memberCheck({
        rows: mRows,
        b: B,
        L: input.lengths.body,
        member: input.member,
        // 衝突時は地震時と同じ割増係数を用いる
        k: cd.inertia || cd.collision ? input.member.kSeismic : input.member.kNormal,
      });
    }

    return { ...cd, ep, epm, rows, sum, reaction, overturn, sliding, bearing, member, passive };
  });

  const raise = input.backfill?.raise || 0;
  const slopeN = input.backfill?.slopeN || 0;
  const beta = raise > 0 && slopeN > 0 ? Math.atan(1 / slopeN) * 180 / Math.PI : 0;

  return {
    input, alpha, epHeight, gammaConcrete,
    backfill: { raise, slopeN, beta },
    self, inertia, uplift: up, wpBack, wpFront,
    passiveN: ppN, passiveE: ppE, collision: col,
    cases,
  };
}

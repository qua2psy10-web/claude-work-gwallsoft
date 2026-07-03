// 入力データモデル・デフォルト値・荷重ケース自動生成

export function defaultInput() {
  return {
    title: '向堀川パラペット重力式擁壁H=0.85m背面土天端-0.27m',
    geometry: {
      topWidth: 0.400,   // 天端幅 (m)
      height: 0.850,     // 壁高 (m)
      baseWidth: 0.655,  // 底版幅 (m)
    },
    concrete: {
      gammaRC: 24.5,     // 鉄筋コンクリート単位体積重量 (kN/m3)
      gammaPlain: 23.0,  // 無筋コンクリート単位体積重量 (kN/m3)
      type: 'plain',     // 躯体材質: 'plain'=無筋 / 'rc'=鉄筋
    },
    lengths: { body: 1.0, base: 1.0, ep: 1.0 }, // 躯体延長・底版延長・土圧作用延長 (m)
    wallKind: '盛土部擁壁',
    foundation: '直接基礎',
    structure: '重力式定型擁壁',
    backfillShape: 'レベル',
    drop: 0.270,          // 擁壁天端からの落差高さ (m) → 土圧作用高 = 壁高 - 落差
    frontSoil: { normal: 0.0, seismic: 0.0 }, // 前載土砂高 (m)
    water: {
      enabled: false,
      handling: '揚圧力',
      upliftPosition: '高い位置',
      normal: { front: 0.850, back: 0.380 },  // 常時 前面/背面水位 (m)
      seismic: { front: 0.0, back: 0.0 },     // 地震時 前面/背面水位 (m)
    },
    soil: {
      gammaWet: 19.0,   // 湿潤単位体積重量 (kN/m3)
      gammaSub: 9.2,    // 水中単位体積重量 (kN/m3)
      gammaW: 9.8,      // 水の単位体積重量 (kN/m3)
      phi: 30.0,        // せん断抵抗角 (度)
      c: 0.0,           // 粘着力 常時 (kN/m2)
      cE: 0.0,          // 粘着力 地震時 (kN/m2)
      delta: 20.0,      // 壁面摩擦角 常時 (度)
      deltaE: 15.0,     // 壁面摩擦角 地震時 (度)
    },
    seismic: {
      enabled: false,
      khBody: 0.16,     // 設計水平震度(躯体)
      khSoil: 0.16,     // 設計水平震度(裏込土)
      levelName: 'レベル2地震時',
    },
    epCondition: {
      method: '試行くさび法',
      precision: 0.001,     // 収束精度 (度)
      considerPv: true,     // 安定モーメントの土圧鉛直成分(Pv)を考慮
    },
    surcharge: {
      enabled: true,
      name: '活荷重',
      q: 10.0,          // 荷重強度 (kN/m2)
      x1: 0.081,        // 載荷開始位置 (m) 壁背面天端位置から
      x2: 3.081,        // 載荷終了位置 (m)
    },
    stability: {
      overturnMethod: '偏心距離で照査',
      allowEccMethod: 'B/n',
      effectiveArea: '有効断面積',
      cB: 0.0,          // 底面と地盤の付着力 (kN/m2)
      mu: 0.6,          // 底面と地盤の摩擦係数
      bearingMethod: '入力値を用いる',
      normal: { n: 6.0, Fs: 1.5, qa: 100.0 },
      seismic: { n: 3.0, Fs: 1.2, qa: 150.0 },
    },
    member: {
      show: true,                 // 部材計算条件を帳票に出力
      calc: false,                // 応力度照査を行う（第5章 部材計算を出力）
      kNormal: 1.00,              // 許容応力度の割増係数（常時）
      kSeismic: 1.50,             // 許容応力度の割増係数（地震時）
      calcRebar: '算出しない',
      shearIncrease: '考慮しない',
      sigmaCk: 21, sigmaCa: 5.250, sigmaCta: 0.263, tauA: 0.360,
    },
    guideline: '道路土工擁壁工指針  平成24年 7月  社団法人  日本道路協会',
  };
}

// サンプル再現用プリセット
export const presets = {
  noWaterDrop: () => defaultInput(),
  noWaterFlush: () => {
    const d = defaultInput();
    d.title = '向堀川パラペット重力式擁壁H=0.85m背面土天端';
    d.drop = 0.0;
    d.surcharge.x1 = 0.0;
    d.surcharge.x2 = 3.0;
    return d;
  },
  waterDrop: () => {
    const d = defaultInput();
    d.title = '向堀川パラペット(重力式擁壁)H=0.85m(標準設計)前面水位天端考慮・背面土天端-0.27m、水位-0.47';
    d.water.enabled = true;
    d.seismic.enabled = true;
    d.member.show = false;
    return d;
  },
  waterFlush: () => {
    const d = defaultInput();
    d.title = '向堀川パラペット(重力式擁壁)H=0.85m(標準設計)前面水位天端考慮・背面土天端、水位-0.85';
    d.drop = 0.0;
    d.surcharge.x1 = 0.0;
    d.surcharge.x2 = 3.0;
    d.water.enabled = true;
    d.water.normal.back = 0.0;
    d.seismic.enabled = true;
    d.member.show = false;
    return d;
  },
};

// 荷重ケースの自動生成
// ケース定義: { no, name, ep:'normal'|'seismic', surcharge, buoyancy:0|1|2|3, inertia, cond }
//   buoyancy: 0=浮力無視, 1=前面水圧のみ, 2=背面水圧のみ, 3=前背面水圧
export function generateCases(input) {
  const cases = [];
  const sN = input.stability.normal;
  const sE = input.stability.seismic;
  let no = 1;

  const surchargeOpts = input.surcharge.enabled ? [false, true] : [false];

  if (!input.water.enabled) {
    for (const lc of surchargeOpts) {
      cases.push({
        no: no++,
        name: lc ? '常時＋活荷重(全面載荷) 水位無' : '常時',
        epKind: 'normal', surcharge: lc, buoyancy: -1, inertia: false, cond: sN,
      });
    }
  } else {
    for (const lc of surchargeOpts) {
      for (const b of [0, 1, 2, 3]) {
        const bName = b === 0 ? '浮力無視' : `浮力考慮${b}`;
        cases.push({
          no: no++,
          name: lc ? `常時 活荷重全面載荷 ${bName}` : `常時 ${bName}`,
          epKind: 'normal', surcharge: lc, buoyancy: b, inertia: false, cond: sN,
        });
      }
    }
  }

  if (input.seismic.enabled) {
    // 地震時: 常時土圧+慣性力 / 地震時土圧+慣性力（浮力無視）
    cases.push({
      no: no++, name: '地震時 浮力無視',
      epKind: 'normal', surcharge: false, buoyancy: input.water.enabled ? 0 : -1,
      inertia: true, cond: sE,
    });
    cases.push({
      no: no++, name: '地震時 浮力無視',
      epKind: 'seismic', surcharge: false, buoyancy: input.water.enabled ? 0 : -1,
      inertia: true, cond: sE,
    });
  }
  return cases;
}

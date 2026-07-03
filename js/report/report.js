// 計算結果 → A4帳票（サンプル計算書と同じ章構成）
import { fmt3, fmt2, table, kvTable, bullets, formula, legend, frac, judge, para, subTitle, esc } from './blocks.js';
import {
  sectionFig, overallFig, wedgeMethodFig, caseEpFig, omegaPaGraph,
  upliftFig, waterFig, reactionFig,
} from './figures.js';

// ---- セクション番号・ブロック収集 ----
class Builder {
  constructor() {
    this.blocks = [];
    this.c = [0, 0, 0, 0];
  }
  add(html, opts = {}) {
    this.blocks.push({ html, ...opts });
  }
  chapter(title) {
    this.c[0]++; this.c[1] = this.c[2] = this.c[3] = 0;
    const label = `第${this.c[0]}章 ${title}`;
    this.add(`<h1 class="rpt-h1">${label}</h1>`, { breakBefore: true, keepNext: true, toc: { level: 0, label } });
    return this.c[0];
  }
  sec(title, extra = {}) {
    this.c[1]++; this.c[2] = this.c[3] = 0;
    const label = `${this.c[0]}.${this.c[1]} ${title}`;
    this.add(`<h2 class="rpt-h2">${label}</h2>`, { keepNext: true, toc: { level: 1, label }, ...extra });
    return `${this.c[0]}.${this.c[1]}`;
  }
  sub(title, extra = {}) {
    this.c[2]++; this.c[3] = 0;
    const label = `${this.c[0]}.${this.c[1]}.${this.c[2]} ${title}`;
    this.add(`<h3 class="rpt-h3">${label}</h3>`, { keepNext: true, toc: { level: 2, label }, ...extra });
    return label;
  }
  sub2(title, extra = {}) {
    this.c[3]++;
    const label = `${this.c[0]}.${this.c[1]}.${this.c[2]}.${this.c[3]} ${title}`;
    this.add(`<h4 class="rpt-h4">${label}</h4>`, { keepNext: true, toc: { level: 3, label }, ...extra });
    return label;
  }
}

const UNIT = {
  kN: '(kN)', kNm: '(kN・m)', m: '(m)', kNm2: '(kN/m2)', kNm3: '(kN/m3)', deg: '(度)', m2: '(m2)', m3: '(m3)',
};

// ============================================================
export function buildBlocks(r) {
  const b = new Builder();
  const inp = r.input;
  const geom = inp.geometry;
  const water = inp.water.enabled;
  const seismic = inp.seismic.enabled;
  const B = geom.baseWidth;

  // ---------------- 第1章 設計条件 ----------------
  b.chapter('設計条件');
  b.add(para(`　標題　　 : ${esc(inp.title)}`));

  b.sec('形状寸法');
  b.sub('断面形状');
  b.add(bullets([['構造形式', inp.structure], ['基礎形式', inp.foundation]]));
  b.add(`<div class="rpt-figwrap">${sectionFig(geom)}</div>`);
  b.add(bullets([
    ['鉄筋コンクリートの単位体積重量', `${fmt3(inp.concrete.gammaRC)} ${UNIT.kNm3}`],
    ['無筋コンクリートの単位体積重量', `${fmt3(inp.concrete.gammaPlain)} ${UNIT.kNm3}`],
    ['躯体延長', `${fmt3(inp.lengths.body)} ${UNIT.m}`],
    ['底版延長', `${fmt3(inp.lengths.base)} ${UNIT.m}`],
    ['土圧作用延長', `${fmt3(inp.lengths.ep)} ${UNIT.m}`],
  ]));

  b.sub('全体形状');
  {
    const items = [['擁壁の種類', inp.wallKind]];
    items.push(['水位の有無', water ? '有り' : '無し']);
    if (water) {
      items.push(['水位の扱い', inp.water.handling]);
      items.push(['浮力の算定位置', inp.water.upliftPosition]);
    }
    const raised = r.backfill.raise > 0;
    items.push(['背面土砂形状', raised ? '盛土（嵩上げ）' : 'レベル']);
    if (raised) {
      items.push(['嵩上げ高さ', `${fmt3(r.backfill.raise)} ${UNIT.m}`]);
      items.push(['法面勾配', `1:${fmt2(r.backfill.slopeN)}　（法面傾斜角 β = ${fmt3(r.backfill.beta)} 度）`]);
    }
    items.push(['擁壁天端からの落差高さ', `${fmt3(inp.drop)} ${UNIT.m}`]);
    b.add(bullets(items));
  }
  b.sub2('常時');
  {
    const items = [['前載土砂高', `${fmt3(inp.frontSoil.normal)} ${UNIT.m}`]];
    if (water) {
      items.push(['背面水位', `${fmt3(inp.water.normal.back)} ${UNIT.m}`]);
      items.push(['前面水位', `${fmt3(inp.water.normal.front)} ${UNIT.m}`]);
    }
    b.add(bullets(items));
    b.add(`<div class="rpt-figwrap">${overallFig(geom, {
      soilTop: r.epHeight, wFront: water ? inp.water.normal.front : 0, wBack: water ? inp.water.normal.back : 0,
      raise: r.backfill.raise, slopeN: r.backfill.slopeN,
    })}</div>`);
  }
  if (seismic) {
    b.sub2('地震時');
    const items = [['前載土砂高', `${fmt3(inp.frontSoil.seismic)} ${UNIT.m}`]];
    if (water) {
      items.push(['背面水位', `${fmt3(inp.water.seismic.back)} ${UNIT.m}`]);
      items.push(['前面水位', `${fmt3(inp.water.seismic.front)} ${UNIT.m}`]);
    }
    b.add(bullets(items));
    b.add(`<div class="rpt-figwrap">${overallFig(geom, {
      soilTop: r.epHeight, wFront: water ? inp.water.seismic.front : 0, wBack: water ? inp.water.seismic.back : 0,
      raise: r.backfill.raise, slopeN: r.backfill.slopeN,
    })}</div>`);
  }

  b.sec('準拠指針');
  b.add(para(`　　${esc(inp.guideline)}`));

  b.sec('土砂条件');
  b.sub('単位体積重量');
  {
    const rows = [];
    if (water) rows.push(['水', `${fmt3(inp.soil.gammaW)}`, 'kN/m3']);
    if (water) {
      rows.push(['背面土砂　湿潤重量', `${fmt3(inp.soil.gammaWet)}`, 'kN/m3']);
      rows.push(['　　　　　水中重量', `${fmt3(inp.soil.gammaSub)}`, 'kN/m3']);
    } else {
      rows.push(['背面土砂', `${fmt3(inp.soil.gammaWet)}`, 'kN/m3']);
    }
    b.add(table([['項目名', '設定値', '単位']], rows));
  }
  b.sub('背面土砂');
  {
    const items = [];
    if (inp.member.show || inp.member.calc) items.push(['壁面摩擦角：竪壁計算用', '計算値']);
    items.push(['壁背面と鉛直面のなす角 α', '計算値']);
    b.add(bullets(items));
    const rows = [
      ['せん断抵抗角', 'φ', fmt3(inp.soil.phi), '度'],
      ['粘着力 (常　時)', 'c', fmt3(inp.soil.c), 'kN/m2'],
    ];
    if (seismic) rows.push(['　　　 (地震時)', 'cE', fmt3(inp.soil.cE), 'kN/m2']);
    rows.push(['壁面摩擦角：安定計算用　(常　時)', 'δ', fmt3(inp.soil.delta), '度']);
    if (seismic) rows.push(['　　　　　　　　　　　　(地震時)', 'δE', fmt3(inp.soil.deltaE), '度']);
    b.add(table([['項目名', '記号', '設定値', '単位']], rows));
  }

  b.sec('計算条件');
  if (seismic) {
    b.sub('設計水平震度');
    b.add(table([['', '躯体', '裏込土']], [
      ['レベル2地震時', fmt2(inp.seismic.khBody), fmt2(inp.seismic.khSoil)],
    ]));
  }
  b.sub('主働土圧条件');
  b.add(bullets([
    ['主働土圧計算方法', inp.epCondition.method],
    ['試行くさびの収束精度', `${inp.epCondition.precision}度`],
    ['安定モーメントの土圧鉛直成分(Pv)', inp.epCondition.considerPv ? '考慮する' : '考慮しない'],
  ]));

  if (inp.surcharge.enabled) {
    b.sec('荷重条件');
    b.sub('上載荷重');
    b.add(para('　(1)活荷重'));
    b.add(table(
      [['荷重名称', '荷重強度<br>(kN/m2)', 'X1<br>(m)', 'X2<br>(m)']],
      [[esc(inp.surcharge.name), fmt3(inp.surcharge.q), fmt3(inp.surcharge.x1), fmt3(inp.surcharge.x2)]],
    ));
  }

  b.sec('安定計算条件');
  b.sub('転倒照査の諸条件');
  b.add(bullets([
    ['転倒の照査方法', inp.stability.overturnMethod],
    ['許容偏心量の設定方法', `${inp.stability.allowEccMethod}<br><span class="note">(B：底版幅、n：許容偏心量を示す分母値)</span>`],
  ]));
  b.sub('滑動照査の諸条件');
  b.add(bullets([['有効断面積の取扱い', inp.stability.effectiveArea]]));
  b.add(table([['項目名', '記号', '値', '単位']], [
    ['付着力', 'cB', fmt3(inp.stability.cB), 'kN/m2'],
    ['摩擦係数', 'μ', fmt3(inp.stability.mu), '-'],
  ]));
  b.sub('支持力照査の諸条件');
  b.add(bullets([['許容支持力度', inp.stability.bearingMethod]]));

  if (inp.member.show || inp.member.calc) {
    b.sec('部材計算条件');
    b.sub('部材共通条件');
    b.add(bullets([
      ['必要鉄筋量の算出', inp.member.calcRebar],
      ['無筋コンクリートの許容せん断応力度の割り増し', inp.member.shearIncrease],
    ]));
    b.sub('材料特性値');
    b.add(para('　(1)無筋コンクリート'));
    b.add(table([[{ t: '項目', cs: 2 }, '基準値(N/mm2)<br>竪壁']], [
      [{ t: '設計基準強度', cs: 1 }, 'σck', String(inp.member.sigmaCk)],
      [{ t: '許容曲げ圧縮応力度', cs: 1 }, 'σca', fmt3(inp.member.sigmaCa)],
      [{ t: '許容曲げ引張応力度', cs: 1 }, 'σcta', fmt3(inp.member.sigmaCta)],
      [{ t: '許容せん断応力度', cs: 1 }, 'τa', fmt3(inp.member.tauA)],
    ].map((row) => [row[0].t, row[1] + '　' + row[2]])));
    b.sub('竪壁');
    b.add(para('　竪壁の部材計算位置(付け根からの距離)と照査対象'));
    b.add(table([['項目名', '計算位置(m)', '曲げ', 'せん断']], [['付け根位置', fmt3(0), '〇', '〇']]));
  }

  // 荷重の組み合わせ
  b.sec('荷重の組み合わせ');
  for (let i = 0; i < r.cases.length; i += 4) {
    const cs = r.cases.slice(i, i + 4);
    const header = [['No', ...cs.map((c) => String(c.no))]];
    const rows = [];
    rows.push(['ケース名', ...cs.map((c) => esc(c.name))]);
    rows.push(['安定計算', ...cs.map(() => '○')]);
    rows.push(['部材計算', ...cs.map(() => (inp.member.calc ? '○' : '-'))]);
    rows.push(['作用条件　地震時設定', ...cs.map((c) => (c.inertia ? 'LV2地震' : '無し'))]);
    if (water) {
      rows.push(['　　　　　揚圧力', ...cs.map((c) => (c.buoyancy > 0 ? '考慮' : '無視'))]);
      rows.push(['水位の扱い　前面水圧', ...cs.map((c) => (c.buoyancy === 1 || c.buoyancy === 3 ? '○' : '-'))]);
      rows.push(['　　　　　　背面水圧', ...cs.map((c) => (c.buoyancy === 2 || c.buoyancy === 3 ? '○' : '-'))]);
    }
    rows.push(['土圧・慣性力　作用土圧', ...cs.map((c) => (c.ep === 'seismic' ? '地震時土圧' : '常時土圧'))]);
    if (seismic) rows.push(['　　　　　　　地震時慣性力', ...cs.map((c) => (c.inertia ? '○' : '-'))]);
    rows.push(['上載荷重　活荷重', ...cs.map((c) => (c.surcharge ? '○' : '-'))]);
    rows.push(['　　　　　活荷重の取扱い', ...cs.map((c) => (c.surcharge ? '全面載荷' : '-'))]);
    rows.push(['許容偏心量 B/n の n', ...cs.map((c) => fmt2(c.cond.n))]);
    rows.push(['安定照査条件　滑動安全率', ...cs.map((c) => fmt2(c.cond.Fs))]);
    rows.push(['　　　　　　　許容支持力度', ...cs.map((c) => fmt2(c.cond.qa))]);
    if (inp.member.show || inp.member.calc) {
      rows.push(['部材照査条件　許容応力度', ...cs.map(() => (inp.member.calc ? '基準値' : '-'))]);
      rows.push(['許容応力度の割増係数', ...cs.map((c) => (inp.member.calc ? fmt2(c.inertia ? inp.member.kSeismic : inp.member.kNormal) : '-'))]);
    }
    b.add(table(header, rows, 'combo'));
  }

  // ---------------- 第2章 計算結果一覧 ----------------
  b.chapter('計算結果一覧');
  b.sec('作用力計算結果');
  b.add(table(
    [['No', '荷重ケース名', '鉛直力 V<br>(kN)', '水平力 H<br>(kN)', 'モーメント M<br>(kN・m)']],
    r.cases.map((c) => [String(c.no), { t: esc(c.name), cls: 'lt' }, fmt3(c.sum.V), fmt3(c.sum.H), fmt3(c.sum.M)]),
    'result',
  ));
  b.sec('安定計算結果');
  b.sub('転倒照査');
  b.add(table(
    [['No', '荷重ケース名', '偏心距離<br>(m)']],
    r.cases.map((c) => [String(c.no), { t: esc(c.name), cls: 'lt' },
      `|e|=${fmt3(c.overturn.absE)} ${c.overturn.ok ? '≦' : '＞'} B/n=${fmt3(c.overturn.allow)}<br><span class="${c.overturn.ok ? 'ok' : 'ng'}">${c.overturn.ok ? 'OK' : 'NG'}</span>`]),
    'result',
  ));
  b.sub('滑動照査');
  b.add(table(
    [['No', '荷重ケース名', '安全率']],
    r.cases.map((c) => {
      const s = c.sliding;
      const t = s.indeterminate
        ? '算定不能<br>(水平力が0以下)'
        : `Hu/H=${fmt3(s.ratio)} ${s.ok ? '≧' : '＜'} Fs=${fmt3(s.Fs)}<br><span class="${s.ok ? 'ok' : 'ng'}">${s.ok ? 'OK' : 'NG'}</span>`;
      return [String(c.no), { t: esc(c.name), cls: 'lt' }, t];
    }),
    'result',
  ));
  b.sub('支持照査');
  b.add(table(
    [['No', '荷重ケース名', '地盤反力度<br>(kN/m2)']],
    r.cases.map((c) => [String(c.no), { t: esc(c.name), cls: 'lt' },
      `qmax=${fmt3(c.bearing.qmax)} ${c.bearing.ok ? '≦' : '＞'}qa=${fmt3(c.bearing.qa)}<br><span class="${c.bearing.ok ? 'ok' : 'ng'}">${c.bearing.ok ? 'OK' : 'NG'}</span>`]),
    'result',
  ));
  if (inp.member.calc) {
    b.sec('部材計算結果');
    b.sub('竪壁付け根の応力度照査');
    b.add(table(
      [['No', '荷重ケース名', '曲げ圧縮<br>σc (N/mm2)', '曲げ引張<br>σt (N/mm2)', 'せん断<br>τ (N/mm2)', '判定']],
      r.cases.map((c) => {
        const m = c.member;
        return [String(c.no), { t: esc(c.name), cls: 'lt' },
          `${m.sigmaC.toFixed(4)} ≦ ${fmt3(m.sigmaCa)}`,
          `${m.sigmaT.toFixed(4)} ≦ ${fmt3(m.sigmaCta)}`,
          `${m.tau.toFixed(4)} ≦ ${fmt3(m.tauA)}`,
          `<span class="${m.ok ? 'ok' : 'ng'}">${m.ok ? 'OK' : 'NG'}</span>`];
      }),
      'result',
    ));
  }

  // ---------------- 第3章 作用力の算定 ----------------
  b.chapter('作用力の算定');
  b.sec('自重及び慣性力');
  b.add(para('　　算出範囲の断面積及び重心位置の計算は、次の座標法の計算式を用います。'));
  b.add(formula(
    `<div>A　= ${frac('1', '2')}Σ(x<sub>i+1</sub>・y<sub>i</sub>−x<sub>i</sub>・y<sub>i+1</sub>)</div>` +
    `<div>Gy = −${frac('1', '2')}Σ(y<sub>i+1</sub>−y<sub>i</sub>)・{x<sub>i</sub><sup>2</sup>+${frac('1', '3')}(x<sub>i+1</sub>−x<sub>i</sub>)(x<sub>i+1</sub>+2x<sub>i</sub>)}</div>` +
    `<div>Gx = ${frac('1', '2')}Σ(x<sub>i+1</sub>−x<sub>i</sub>)・{y<sub>i</sub><sup>2</sup>+${frac('1', '3')}(y<sub>i+1</sub>−y<sub>i</sub>)(y<sub>i+1</sub>+2y<sub>i</sub>)}</div>` +
    `<div>XG = ${frac('Gy', 'A')} − X<sub>0</sub>　　　YG = ${frac('Gx', 'A')} − Y<sub>0</sub></div>`,
  ));
  b.add(legend([
    ['A', '断面積 (m2)'], ['Gy', 'y軸に対する断面一次モーメント (m3)'], ['Gx', 'x軸に対する断面一次モーメント (m3)'],
    ['XG', 'x軸に対する重心距離 (m)'], ['YG', 'y軸に対する重心距離 (m)'],
    ['x<sub>i</sub>, y<sub>i</sub>', 'i点の座標値 (m)'],
    ['X<sub>0</sub>', `基準点のx座標値 = ${fmt3(0)} (m)`], ['Y<sub>0</sub>', `基準点のy座標値 = ${fmt3(0)} (m)`],
  ]));

  b.sub('躯体自重');
  {
    const sec = r.self.sec;
    const n = sec.rows.length;
    const rows = sec.rows.map((row, i) => [String(i), fmt3(row.x), fmt3(row.y), fmt3(row.dA), fmt3(row.dGy), fmt3(row.dGx)]);
    rows.push(['0', fmt3(sec.rows[0].x), fmt3(sec.rows[0].y), '-', '-', '-']);
    rows.push(['合計', '-', '-', fmt3(sec.A), fmt3(sec.Gy), fmt3(sec.Gx)]);
    b.add(table(
      [['No', 'x<br>(m)', 'y<br>(m)', 'A<br>(m2)', 'Gy<br>(m3)', 'Gx<br>(m3)']],
      rows,
    ));
    b.add(para(`　　　重心位置　　　　　　　　　　　　　　XG= Gy/A − X0 =　　${fmt3(sec.XG)}(m)`));
    b.add(para(`　　　重心位置　　　　　　　　　　　　　　YG= Gx/A − Y0 =　　${fmt3(sec.YG)}(m)`));
    b.add(table(
      [['種　類', 'A<br>(m2)', 'γ<br>(kN/m3)', 'L<br>(m)', 'V<br>(kN)', 'XG<br>(m)', 'V･XG<br>(kN・m)']],
      [['躯体', fmt3(r.self.A), fmt3(r.self.gamma), fmt3(r.self.L), fmt3(r.self.V), fmt3(r.self.XG), fmt3(r.self.VXG)]],
    ));
  }

  if (seismic && r.inertia) {
    b.sub('躯体慣性力');
    b.add(para('　　躯体慣性力は、次の計算式より算出します。'));
    b.add(formula('<div>H ＝ V・kh</div>'));
    b.add(legend([['H', '躯体慣性力 (kN)'], ['V', '躯体自重 (kN)'], ['kh', '設計水平震度']]));
    b.add(para('　(1)レベル2地震動慣性力'));
    b.add(para(`　　　${inp.seismic.levelName}の設計水平震度 = ${fmt2(inp.seismic.khBody)}`));
    b.add(table(
      [['種類', 'A<br>(m2)', 'γ<br>(kN/m3)', 'L<br>(m)', 'V<br>(kN)', '慣性力H<br>(kN)', 'YG<br>(m)', 'H･YG<br>(kN・m)']],
      [['躯体慣性力', fmt3(r.inertia.A), fmt3(r.inertia.gamma), fmt3(r.inertia.L), fmt3(r.inertia.V), fmt3(r.inertia.H), fmt3(r.inertia.YG), fmt3(r.inertia.HYG)]],
    ));
  }

  if (water && r.uplift) {
    b.sec('揚圧力');
    b.add(para('　揚圧力は次の計算式を用います。'));
    b.add(formula(
      '<div>uP1＝ − γW・HW1　　　　uP2＝ − γW・HW2</div>' +
      `<div>UP ＝ ${frac('uP1 + uP2', '2')}・B・L</div>` +
      `<div>XG ＝ ${frac('B(uP1 + 2uP2)', '3(uP1 + uP2)')}</div>`,
    ));
    b.add(legend([
      ['UP', '揚圧力 (kN)'], ['XG', '揚圧力の重心位置 (m)'],
      ['uP1', '底版前面端の揚圧力強度 (kN/m2)'], ['uP2', '底版背面端の揚圧力強度 (kN/m2)'],
      ['HW1', '底版底から前面水位までの高さ (m)'], ['HW2', '底版底から背面水位までの高さ (m)'],
      ['B', '揚圧力の作用幅 (m)'], ['L', '揚圧力の作用延長 (m)'], ['γW', '水の単位体積重量 (kN/m3)'],
    ]));
    b.add(para('　(1)常時'));
    b.add(`<div class="rpt-figwrap">${upliftFig(r.uplift)}</div>`);
    b.add(subTitle('設定値'));
    b.add(kvTable([
      ['水の単位体積重量', 'γW', 'kN/m3', fmt3(r.uplift.gammaW), ''],
      ['底版底から前面水位までの高さ', 'HW1', 'm', fmt3(r.uplift.HW1), ''],
      ['底版底から背面水位までの高さ', 'HW2', 'm', fmt3(r.uplift.HW2), ''],
      ['揚圧力の作用幅', 'B', 'm', fmt3(r.uplift.B), ''],
      ['揚圧力の作用延長', 'L', 'm', fmt3(r.uplift.L), ''],
    ]));
    b.add(subTitle('底版両端における揚圧力強度'));
    b.add(table(
      [['種類', 'γW<br>(kN/m3)', 'HW1<br>(m)', 'HW2<br>(m)', 'uP1<br>(kN/m2)', 'uP2<br>(kN/m2)']],
      [
        ['底版前面端', fmt3(r.uplift.gammaW), fmt3(r.uplift.HW1), '-', fmt3(r.uplift.uP1), '-'],
        ['底版背面端', fmt3(r.uplift.gammaW), '-', fmt3(r.uplift.HW2), '-', fmt3(r.uplift.uP2)],
      ],
    ));
    b.add(subTitle('揚圧力'));
    b.add(table(
      [['項目', 'uP1<br>(kN/m2)', 'uP2<br>(kN/m2)', 'B<br>(m)', 'L<br>(m)', 'UP<br>(kN)', 'XG<br>(m)', 'UP･XG<br>(kN・m)']],
      [['揚圧力', fmt3(r.uplift.uP1), fmt3(r.uplift.uP2), fmt3(r.uplift.B), fmt3(r.uplift.L), fmt3(r.uplift.UP), fmt3(r.uplift.XG), fmt3(r.uplift.UPXG)]],
    ));
  }

  // ---- 土圧 ----
  b.sec('土圧');
  b.sub('土圧の計算方法');
  b.add(para('　　試行くさび法(盛土部擁壁)による主働土圧は、以下の式より求めます。'));
  b.add(para('　　注）すべり面での粘着力による抵抗力が大きいために土圧合力が負の値となる場合、<br>　　　　土圧合力は生じないものとします。', 'note'));
  b.add(para('　　・常時'));
  b.add(`<div class="rpt-figwrap">${wedgeMethodFig(false)}</div>`);
  b.add(formula(
    '<div>W　＝ Σγ・A + Σq・B</div>' +
    `<div>PA　＝ ${frac('W・sin(ω−φ)−c・l・cosφ', 'cos(ω−φ−α−δ)')}・L</div>` +
    `<div>z　＝ ${frac('2・c', 'γ')}・tan(45°+ ${frac('φ', '2')})</div>` +
    '<div class="fnote">土圧の鉛直成分・水平成分</div>' +
    '<div>　　PAV ＝ PA・sin(δ+α)　　　PAH ＝ PA・cos(δ+α)</div>',
  ));
  b.add(legend([
    ['PA', '常時の主働土圧合力 (kN)'], ['PAV', '常時の主働土圧の鉛直成分 (kN)'], ['PAH', '常時の主働土圧の水平成分 (kN)'],
    ['ω', '常時のすべり面と水平面がなす角 (度)'], ['W', '常時のすべり面より上の土砂重量及び上載荷重 (kN/m)'],
    ['A', '常時のすべり面より上の土砂面積 (m2)'], ['q', '上載荷重 (kN/m2)'],
    ['B', '常時のすべり面より上の上載荷重載荷幅 (m)'], ['L', '土圧の作用幅 (m)'],
    ['γ', '背面土砂の(湿潤・水中)単位体積重量 (kN/m3)'], ['φ', '背面土砂のせん断抵抗角 (度)'],
    ['α', '壁背面と鉛直面のなす角 (度)'], ['β', '地表面の法面傾斜角 (度)'], ['δ', '常時の壁面摩擦角 (度)'],
    ['c', '背面土砂の粘着力(常時) (kN/m2)'], ['l', '常時のすべり面の長さ (m)'], ['z', '常時の粘着高 (m)'],
  ]));
  if (r.cases.some((c) => c.epKind === 'seismic')) {
    b.add(para('　　・地震時'));
    b.add(`<div class="rpt-figwrap">${wedgeMethodFig(true)}</div>`);
    b.add(formula(
      '<div>WE　 ＝ Σγ・AE + ΣqE・BE</div>' +
      `<div>PEA　＝ ${frac('WE・sin(ωE−φ+θ)/cosθ−cE・lE・cosφ', 'cos(ωE−φ−α−δE)')}・L</div>` +
      `<div>zE　 ＝ ${frac('2・cE', 'γ')}・tan(45°+ ${frac('φ', '2')})</div>` +
      '<div class="fnote">土圧の鉛直成分・水平成分</div>' +
      '<div>　　PEAV ＝ PEA・sin(δE+α)　　　PEAH ＝ PEA・cos(δE+α)</div>',
    ));
    b.add(legend([
      ['PEA', '地震時の主働土圧合力 (kN)'], ['ωE', '地震時のすべり面と水平面がなす角 (度)'],
      ['WE', '地震時のすべり面より上の土砂重量及び上載荷重 (kN/m)'], ['δE', '地震時の壁面摩擦角 (度)'],
      ['cE', '背面土砂の粘着力(地震時) (kN/m2)'], ['lE', '地震時のすべり面の長さ (m)'],
      ['θ', '地震時合成角 (度) θ=tan<sup>-1</sup>(kh)'], ['kh', '設計水平震度'], ['zE', '地震時の粘着高 (m)'],
    ]));
  }

  b.sub('土圧の計算');
  r.cases.forEach((c, i) => {
    b.add(para(`(${i + 1})${esc(c.name)}`, 'case-head'), { keepNext: true });
    const cd = r.cases[i];
    const useWater = cd.buoyancy > 0 && inp.water.normal.back > 0;
    b.add(`<div class="rpt-figwrap">${caseEpFig(geom, r.epHeight, cd.ep, {
      waterBack: useWater ? inp.water.normal.back : 0,
      wFront: cd.buoyancy > 0 ? inp.water.normal.front : 0,
      surcharge: cd.surcharge,
      raise: r.backfill.raise, slopeN: r.backfill.slopeN,
    })}</div>`);
    b.add(subTitle('土圧に関する設定値'));
    {
      const rows = [['土の湿潤単位体積重量', 'γ', 'kN/m3', fmt3(inp.soil.gammaWet), '']];
      if (cd.buoyancy > 0) {
        rows.push(['土の水中単位体積重量', "γ'", 'kN/m3', fmt3(inp.soil.gammaSub), '']);
        rows.push(['水の単位体積重量', 'γW', 'kN/m3', fmt3(inp.soil.gammaW), '']);
      }
      rows.push(['土圧の作用幅', 'L', 'm', fmt3(inp.lengths.ep), '']);
      rows.push(['土圧の作用高', 'H', 'm', fmt3(r.epHeight), '']);
      rows.push(['せん断抵抗角', 'φ', '度', fmt3(inp.soil.phi), '']);
      if (cd.epKind === 'seismic') {
        rows.push(['地震時の粘着力', 'cE', 'kN/m2', fmt3(inp.soil.cE), '']);
        rows.push(['地震時の壁面摩擦角', 'δE', '度', fmt3(inp.soil.deltaE), '']);
      } else if (cd.inertia) {
        rows.push(['地震時の粘着力', 'cE', 'kN/m2', fmt3(inp.soil.c), '']);
        rows.push(['地震時の壁面摩擦角', 'δE', '度', fmt3(inp.soil.delta), '']);
      } else {
        rows.push(['常時の粘着力', 'c', 'kN/m2', fmt3(inp.soil.c), '']);
        rows.push(['常時の壁面摩擦角', 'δ', '度', fmt3(inp.soil.delta), '']);
      }
      rows.push(['壁背面と鉛直面のなす角', 'α', '度', fmt3(r.alpha), '']);
      if (r.backfill.raise > 0) {
        rows.push(['法面傾斜角', 'β', '度', fmt3(r.backfill.beta), `嵩上げ${fmt3(r.backfill.raise)}m 勾配1:${fmt2(r.backfill.slopeN)}`]);
      }
      if (cd.surcharge) rows.push(['上載荷重', 'q', 'kN/m2', fmt3(inp.surcharge.q), '']);
      if (cd.inertia) rows.push(['設計水平震度', 'kh', '', fmt3(cd.epKind === 'seismic' ? inp.seismic.khSoil : 0), '']);
      b.add(kvTable(rows));
    }
    // ω-Pa グラフ
    const thetaDeg = cd.epKind === 'seismic' ? Math.atan(inp.seismic.khSoil) * 180 / Math.PI : 0;
    const xmin = Math.floor((inp.soil.phi - thetaDeg) / 10) * 10;
    b.add(`<div class="rpt-figwrap">${omegaPaGraph(cd.ep.curve, Math.max(xmin, 0))}</div>`);
    b.add(subTitle('土圧合力　　注)'));
    const E = cd.epKind === 'seismic' ? 'E' : '';
    b.add(table(
      [[`ω${E}<br>(度)`, `Σγ・A${E}<br>(kN/m)`, `Σq・B${E}<br>(kN/m)`, `W${E}<br>(kN/m)`, `c${E}・l${E}<br>(kN/m)`, `Z${E}<br>(m)`, 'L<br>(m)', `P${E ? 'E' : ''}A<br>(kN)`]],
      [[fmt3(cd.ep.omega), fmt3(cd.ep.sgA), fmt3(cd.ep.sqB), fmt3(cd.ep.W), fmt3(cd.ep.cl), fmt3(cd.ep.z), fmt3(cd.ep.L), fmt3(cd.ep.PA)]],
    ));
    b.add(subTitle('土圧の鉛直成分・水平成分'));
    const pe = E ? 'PEA' : 'PA';
    b.add(table(
      [[`${pe}<br>(kN)`, `${pe}V<br>(kN)`, 'X<br>(m)', `${pe}V・X<br>(kN・m)`, `${pe}H<br>(kN)`, 'Y<br>(m)', `${pe}H・Y<br>(kN・m)`]],
      [[fmt3(cd.ep.PA), fmt3(cd.ep.PAV), fmt3(cd.ep.X), fmt3(cd.ep.MV), fmt3(cd.ep.PAH), fmt3(cd.ep.Y), fmt3(cd.ep.MH)]],
    ));
  });

  // ---- 水圧 ----
  if (water && (r.wpBack || r.wpFront)) {
    b.sec('水圧');
    b.sub('水圧の計算方法');
    b.add(para('　　水圧(静水圧)は以下の式より求めます。'));
    b.add(formula(
      '<div>pw＝ γw・H</div>' +
      `<div>PW＝ ${frac('1', '2')}γw・H<sup>2</sup>・L ＝ ${frac('1', '2')}pw・H・L</div>`,
    ));
    b.add(legend([
      ['pw', '水圧強度 (kN/m2)'], ['PW', '水圧 (kN)'], ['γw', '水の単位体積重量 (kN/m3)'],
      ['H', '水圧の作用高 (m)'], ['L', '水圧の作用幅 (m)'],
    ]));
    b.sub('水圧の計算');
    const wpBlock = (wp, name, side) => {
      b.add(para(`　(${side === 'back' ? 1 : 2})${name}`), { keepNext: true });
      b.add(`<div class="rpt-figwrap">${waterFig(wp, side)}</div>`);
      b.add(subTitle('設定値'));
      b.add(kvTable([
        ['水の単位体積重量', 'γw', 'kN/m3', fmt3(wp.gammaW), ''],
        ['水圧の作用高', 'H', 'm', fmt3(wp.H), name.replace('水圧', '水位')],
        ['水圧の作用幅', 'L', 'm', fmt3(wp.L), ''],
      ]));
      b.add(subTitle('水圧強度'));
      b.add(table(
        [['種類', 'γw<br>(kN/m3)', 'H<br>(m)', 'pw<br>(kN/m2)']],
        [[name.replace('水圧', '水位'), fmt3(wp.gammaW), fmt3(wp.H), fmt3(wp.pw)]],
      ));
      b.add(subTitle('水圧合力'));
      b.add(table(
        [['種類', 'H<br>(m)', 'pw<br>(kN/m2)', 'L<br>(m)', 'PW<br>(kN)', 'YG<br>(m)', 'PW･YG<br>(kN・m)']],
        [[name.replace('水圧', '水位'), fmt3(wp.H), fmt3(wp.pw), fmt3(wp.L), fmt3(wp.PW), fmt3(wp.YG), fmt3(wp.PWYG)]],
      ));
    };
    if (r.wpBack) wpBlock(r.wpBack, '常時　背面水圧', 'back');
    if (r.wpFront) wpBlock(r.wpFront, '常時　前面水圧', 'front');
  }

  // ---- 作用力の集計 ----
  b.sec('作用力の集計');
  b.add(para('　　(1)合力の偏心量とモーメントの計算式'));
  b.add(para('　　　　作用力の鉛直力(V)及び水平力(H)の集計を行い、それらの各合力を算出します。<br>　　　　さらに、次式より合力作用位置の偏心量と底版中心での鉛直合力のモーメントを算出します。'));
  b.add(formula(
    `<div>e ＝ ${frac('B', '2')} − ${frac('V・x − H・y', 'V')}</div>` +
    '<div>M ＝ V・e</div>',
  ));
  b.add(legend([
    ['e', '合力作用位置の偏心量(底版中心(B/2)からの距離) (m)'], ['M', '底版中心での鉛直力によるモーメント (kN・m)'],
    ['B', '底版幅 (m)'], ['V・x', '0点における鉛直力によるモーメント (kN・m)'],
    ['H・y', '0点における水平力によるモーメント (kN・m)'], ['V', '鉛直力 (kN)'],
  ]));
  b.add(para('　　(2)荷重の組合せ'));
  for (let i = 0; i < r.cases.length; i += 6) {
    const cs = r.cases.slice(i, i + 6);
    const rows = [];
    rows.push(['地震時設定', ...cs.map((c) => (c.inertia ? 'LV2地震' : '無し'))]);
    rows.push(['作用土圧', ...cs.map((c) => (c.epKind === 'seismic' ? '地震時土圧' : '常時土圧'))]);
    if (water) rows.push(['水位', ...cs.map((c) => (c.buoyancy > 0 ? '考慮' : '無視'))]);
    rows.push(['躯体自重', ...cs.map(() => '○')]);
    if (seismic) rows.push(['躯体慣性力', ...cs.map((c) => (c.inertia ? '○' : '-'))]);
    if (water) {
      rows.push(['背面水重量', ...cs.map((c) => (c.buoyancy > 0 ? '○' : '-'))]);
      rows.push(['揚圧力', ...cs.map((c) => (c.buoyancy > 0 ? '○' : '-'))]);
    }
    rows.push(['土圧', ...cs.map(() => '○')]);
    if (water) rows.push(['水圧', ...cs.map((c) => (c.buoyancy > 0 ? '○' : '-'))]);
    b.add(table([[{ t: '種類', rs: 1 }, { t: 'ケースNo', cs: cs.length }], ['', ...cs.map((c) => String(c.no))]], rows, 'combo'));
  }
  r.cases.forEach((c) => {
    b.sub(`ケースNo.${c.no} ${esc(c.name)}`);
    b.add(subTitle('作用力の集計'));
    const rows = c.rows.map((row) => [row.name, fmt3(row.V), fmt3(row.Vx), fmt3(row.H), fmt3(row.Hy)]);
    rows.push(['合計', fmt3(c.sum.V), fmt3(c.sum.Vx), fmt3(c.sum.H), fmt3(c.sum.Hy)]);
    b.add(table([['種類', 'V<br>(kN)', 'V･x<br>(kN・m)', 'H<br>(kN)', 'H･y<br>(kN・m)']], rows));
    b.add(subTitle('作用力合力の偏心量及び底版中心での鉛直力合力のモーメント'));
    b.add(table(
      [['底版幅B<br>(m)', '偏心量e<br>(m)', 'モーメントM<br>(kN・m)']],
      [[fmt3(c.sum.B), fmt3(c.sum.e), fmt3(c.sum.M)]],
    ));
  });

  // ---- 地盤反力度 ----
  b.sec('地盤反力度');
  b.sub('地盤反力度の計算方法');
  b.add(para('　　・台形分布'));
  b.add(para(`　　　　3・( ${frac('B', '2')} − |e| ) > B　となる場合、地盤反力は台形分布となり、地盤反力度は以下の式より求めます。`));
  b.add(formula(`<div>q1,q2= ${frac('V', 'B・L')} ± ${frac('6・M', 'B<sup>2</sup>・L')}</div>`));
  b.add(para(`　　・三角形分布`));
  b.add(para(`　　　　3・( ${frac('B', '2')} − |e| ) ≦ B　となる場合、地盤反力は三角形分布となり、地盤反力度は以下の式より求めます。`));
  b.add(formula(
    `<div>q1= ${frac('2・V', "B'・L")}</div>` +
    `<div>B' = 3・( ${frac('B', '2')} − |e| )</div>`,
  ));
  b.add(para("　　　　ただし、合力の作用位置が底版中心より後方にある場合(e<0)は、<br>　　　　地盤反力の作用幅は底版全幅(B)とします。　B' = B"));
  b.add(legend([
    ['q1', '擁壁底面の前面側の地盤反力度 (kN/m2)'], ['q2', '擁壁底面の背面側の地盤反力度 (kN/m2)'],
    ['V', '鉛直力 (kN)'], ['M', '底版中心での鉛直力によるモーメント (kN・m)'],
    ['B', '擁壁の底版幅 (m)'], ["B'", '地盤反力が三角形分布となるときの作用幅 (m)'],
    ['L', '擁壁(底版)の延長 (m)'], ['e', '合力作用位置の偏心量(底版中心(B/2)からの距離) (m)'],
  ]));
  r.cases.forEach((c) => {
    b.sub(`ケースNo.${c.no} ${esc(c.name)}`);
    b.add(para('　　(設定値)'), { keepNext: true });
    b.add(kvTable([
      ['底版幅', 'B', 'm', fmt3(c.reaction.B), ''],
      ['擁壁(底版)の延長', 'L', 'm', fmt3(inp.lengths.base), ''],
      ['偏心量', 'e', 'm', fmt3(c.sum.e), ''],
      ['鉛直力', 'V', 'kN', fmt3(c.sum.V), ''],
      ['モーメント', 'M', 'kN・m', fmt3(c.sum.M), ''],
    ]));
    b.add(para('　　(分布形)'), { keepNext: true });
    const cmp = c.reaction.type === '台形' ? '＞' : '≦';
    b.add(para(`　　　　3・( B/2 − |e| ) =　${fmt3(c.reaction.width3)} (m) ${cmp} B =　${fmt3(c.reaction.B)} (m)<br>　　　　これより、地盤反力の分布は　${c.reaction.type}分布 となります。`));
    b.add(para('　　(地盤反力度)'), { keepNext: true });
    b.add(table(
      [['作用幅B<br>(m)', 'q1<br>(kN/m2)', 'q2<br>(kN/m2)']],
      [[fmt3(c.reaction.Bp), fmt3(c.reaction.q1), fmt3(c.reaction.q2)]],
    ));
    b.add(`<div class="rpt-figwrap">${reactionFig(c.reaction, c.sum)}</div>`);
  });

  // ---------------- 第4章 安定計算 ----------------
  b.chapter('安定計算');
  b.sec('安定計算の照査方法');
  b.add(para('(1)転倒に対する照査方法'));
  b.add(para('　　作用力の位置を示す偏心量(e)が底版中心から許容範囲内(B/n)にあるかの照査を行います。'));
  b.add(formula(`<div>|e| = ${frac('|M|', 'V')} ≦ ${frac('B', 'n')}</div>`));
  b.add(legend([
    ['e', '合力作用位置の偏心量(底版中心(B/2)からの距離) (m)'], ['M', '底版中心での鉛直力によるモーメント (kN・m)'],
    ['V', '鉛直力 (kN)'], ['B', '底版幅 (m)'], ['n', '底版幅の許容範囲を示すB/nの分母の値'],
  ]));
  b.add(para('(2)滑動に対する照査方法'));
  b.add(para('　　水平力(H)に対する滑動抵抗力(Hu)が安全率(Fs)を考慮した値を満足しているかの照査を行います。<br>　　なお、底版幅は有効載荷幅(Be)とします。'));
  b.add(formula(`<div>HU = V・μ + cB・Be・L</div><div>${frac('HU', 'H')} ≧ FS</div>`));
  b.add(legend([
    ['H', '水平力 (kN)'], ['HU', '滑動抵抗力 (kN)'], ['V', '鉛直力 (kN)'],
    ['μ', '擁壁底面と基礎地盤の摩擦係数'], ['cB', '擁壁底面と基礎地盤の付着力 (kN/m2)'],
    ['Be', '有効載荷幅 (m)　Be = B − 2・|e|'], ['B', '擁壁底版幅 (m)'],
    ['e', '合力作用位置の偏心量(底版中心(B/2)からの距離) (m)'], ['L', '擁壁(底版)の延長 (m)'], ['FS', '安全率'],
  ]));
  b.add(para('(3)支持に対する照査方法'));
  b.add(para('　　「地盤反力度の計算」で算出した地盤反力度の最大値(qmax)が、<br>　　許容支持力度(qa)以下となっているかの照査を行います。'));
  b.add(formula('<div>qmax ≦ qa</div>'));
  b.add(legend([
    ['qmax', '地盤反力度q1,q2のいずれか大きい値 (kN/m2)'], ['qa', '地盤の許容支持力度 (kN/m2)'],
  ]));

  r.cases.forEach((c) => {
    b.sec(`ケースNo.${c.no} ${esc(c.name)}`, { breakBefore: true });
    b.add(para('(1)作用力'));
    b.add(para('　　擁壁底版中心位置における作用力(鉛直力V・水平力H・モーメントM)は、次の通りです。'));
    b.add(formula(
      `<div>V =　${fmt3(c.sum.V).padStart(8)} (kN)</div>` +
      `<div>H =　${fmt3(c.sum.H).padStart(8)} (kN)</div>` +
      `<div>M =　${fmt3(c.sum.M).padStart(8)} (kN・m)</div>`,
    ));
    // 転倒
    b.add(para('(2)転倒に対する照査'), { keepNext: true });
    b.add(para('　　作用力の位置を示す偏心量(e)が底版中心からの許容範囲内(B/n)にあるかの照査を行います。'));
    b.add(para('　　(設定値)'), { keepNext: true });
    b.add(kvTable([
      ['底版幅', 'B', 'm', fmt3(c.reaction.B), ''],
      ['B/nのn', 'n', '-', fmt3(c.cond.n), ''],
    ]));
    b.add(para('　　(転倒照査)'), { keepNext: true });
    b.add(table(
      [['V<br>(kN)', 'M<br>(kN・m)', '|e|<br>(m)', 'B/n<br>(m)']],
      [[fmt3(c.sum.V), fmt3(c.sum.M), fmt3(c.overturn.absE), fmt3(c.overturn.allow)]],
    ));
    b.add(judge(`　　 |e| ＝ ${fmt3(c.overturn.absE)} (m) ${c.overturn.ok ? '≦' : '＞'} B/n = ${fmt3(c.overturn.allow)} (m)`, c.overturn.ok));
    // 滑動
    b.add(para('(3)滑動に対する照査'), { keepNext: true });
    b.add(para('　　水平力(H)に対する滑動抵抗力(Hu)が安全率(Fs)を考慮した値を満足しているかの照査を行います。<br>　　なお、底版幅は有効載荷幅(Be)とします。'));
    b.add(para('　　(設定値)'), { keepNext: true });
    b.add(kvTable([
      ['底版幅', 'B', 'm', fmt3(c.sliding.B), ''],
      ['偏心量', 'e', 'm', fmt3(c.sum.e), ''],
      ['有効載荷幅', 'Be', 'm', fmt3(c.sliding.Be), ''],
      ['擁壁(底版)の延長', 'L', 'm', fmt3(c.sliding.L), ''],
      ['底面と地盤の摩擦係数', 'μ', '-', fmt3(c.sliding.mu), ''],
      ['底面と地盤の粘着力', 'cB', 'kN/m2', fmt3(c.sliding.cB), ''],
      ['安全率', 'Fs', '-', fmt3(c.sliding.Fs), ''],
    ]));
    b.add(para('　　(滑動照査)'), { keepNext: true });
    if (c.sliding.indeterminate) {
      b.add(table(
        [['V<br>(kN)', 'H<br>(kN)', 'Hu<br>(kN)', 'Hu/H']],
        [[fmt3(c.sum.V), fmt3(c.sum.H), fmt3(c.sliding.Hu), '-']],
      ));
      b.add(para('　　 算定不能(水平力が0以下)のため、滑動照査は省略します。'));
    } else {
      b.add(table(
        [['V<br>(kN)', 'H<br>(kN)', 'Hu<br>(kN)', 'Hu/H']],
        [[fmt3(c.sum.V), fmt3(c.sum.H), fmt3(c.sliding.Hu), fmt3(c.sliding.ratio)]],
      ));
      b.add(judge(`　　 Hu/H =　${fmt3(c.sliding.ratio)}　${c.sliding.ok ? '≧' : '＜'}　Fs =　${fmt3(c.sliding.Fs)}`, c.sliding.ok));
    }
    // 支持
    b.add(para('(4)支持に対する照査'), { keepNext: true });
    b.add(para('　　「地盤反力度の計算」で算出した地盤反力度(q1,q2)のうちの最大値(qmax)が、<br>　　許容支持力度(qa)以下となっているかの照査を行います。'));
    b.add(para('　　(許容支持力度)'), { keepNext: true });
    b.add(kvTable([['許容支持力度', 'qa', 'kN/m2', fmt3(c.bearing.qa), '']]));
    b.add(para('　　(地盤反力度)'), { keepNext: true });
    b.add(table(
      [['q1<br>(kN/m2)', 'q2<br>(kN/m2)', 'qmax<br>(kN/m2)']],
      [[fmt3(c.bearing.q1), fmt3(c.bearing.q2), fmt3(c.bearing.qmax)]],
    ));
    b.add(judge(`　　 qmax ＝ ${fmt3(c.bearing.qmax)} (kN/m2)　${c.bearing.ok ? '≦' : '＞'}　qa = ${fmt3(c.bearing.qa)} (kN/m2)`, c.bearing.ok));
  });

  // ---------------- 第5章 部材計算 ----------------
  if (inp.member.calc) {
    b.chapter('部材計算');
    b.sec('部材計算の照査方法');
    b.add(para('　　竪壁付け根（底版上面）の断面について、断面より上の作用力から軸力(N)・せん断力(S)・<br>　　断面図心回りのモーメント(M)を求め、無筋コンクリートの縁応力度・せん断応力度を照査します。<br>　　竪壁計算用の壁面摩擦角は計算値（δm = 2/3・φ）を用いた土圧により算定します。<br>　　揚圧力は照査断面より下に作用するため考慮しません。'));
    b.add(formula(
      '<div>A ＝ b・L　　　　Z ＝ L・b<sup>2</sup>/6</div>' +
      `<div>e ＝ ${frac('b', '2')} − ${frac('ΣV・x − ΣH・y', 'N')}　　　　M ＝ N・e</div>` +
      `<div>σ1,σ2 ＝ ${frac('N', 'A')} ± ${frac('M', 'Z')}</div>` +
      `<div>τ ＝ ${frac('S', 'A')}</div>`,
    ));
    b.add(legend([
      ['b', '照査断面の幅 (m)'], ['L', '躯体延長 (m)'],
      ['A', '断面積 (m2)'], ['Z', '断面係数 (m3)'],
      ['N', '軸力（断面より上の鉛直力合計） (kN)'], ['S', 'せん断力（断面より上の水平力合計） (kN)'],
      ['e', '軸力の偏心量（断面図心からの距離） (m)'], ['M', '断面図心回りのモーメント (kN・m)'],
      ['σ1,σ2', '前面側・背面側の縁応力度 (kN/m2)'], ['τ', 'せん断応力度 (kN/m2)'],
      ['k', '許容応力度の割増係数（常時1.00／地震時1.50）'],
    ]));
    b.add(para('　　照査: σc ≦ σca・k、σt ≦ σcta・k、τ ≦ τa・k　（σc:曲げ圧縮、σt:曲げ引張、応力度はN/mm2換算）'));

    r.cases.forEach((c) => {
      const m = c.member;
      b.sec(`ケースNo.${c.no} ${esc(c.name)}`, { breakBefore: true });
      b.add(para('(1)断面諸元'), { keepNext: true });
      b.add(kvTable([
        ['照査断面の幅', 'b', 'm', fmt3(m.b), '竪壁付け根'],
        ['躯体延長', 'L', 'm', fmt3(m.L), ''],
        ['断面積', 'A', 'm2', fmt3(m.A), ''],
        ['断面係数', 'Z', 'm3', fmt3(m.Z), ''],
        ['割増係数', 'k', '-', fmt2(m.k), ''],
      ]));
      b.add(para('(2)作用力（竪壁計算用土圧 δm = 2/3・φ）'), { keepNext: true });
      {
        const rows = m.rows.map((row) => [row.name, fmt3(row.V), fmt3(row.Vx), fmt3(row.H), fmt3(row.Hy)]);
        rows.push(['合計', fmt3(m.N), fmt3(m.Vx), fmt3(m.S), fmt3(m.Hy)]);
        b.add(table([['種類', 'V<br>(kN)', 'V･x<br>(kN・m)', 'H<br>(kN)', 'H･y<br>(kN・m)']], rows));
      }
      b.add(table(
        [['N<br>(kN)', 'S<br>(kN)', 'e<br>(m)', 'M<br>(kN・m)']],
        [[fmt3(m.N), fmt3(m.S), fmt3(m.e), fmt3(m.M)]],
      ));
      b.add(para('(3)応力度照査'), { keepNext: true });
      b.add(table(
        [['σ1<br>(kN/m2)', 'σ2<br>(kN/m2)', 'σc<br>(N/mm2)', 'σt<br>(N/mm2)', 'τ<br>(N/mm2)']],
        [[fmt3(m.s1), fmt3(m.s2), m.sigmaC.toFixed(4), m.sigmaT.toFixed(4), m.tau.toFixed(4)]],
      ));
      b.add(judge(`　　 σc ＝ ${m.sigmaC.toFixed(4)} (N/mm2)　${m.okC ? '≦' : '＞'}　σca・k = ${fmt3(m.sigmaCa)} (N/mm2)`, m.okC));
      b.add(judge(`　　 σt ＝ ${m.sigmaT.toFixed(4)} (N/mm2)　${m.okT ? '≦' : '＞'}　σcta・k = ${fmt3(m.sigmaCta)} (N/mm2)`, m.okT));
      b.add(judge(`　　 τ　＝ ${m.tau.toFixed(4)} (N/mm2)　${m.okTau ? '≦' : '＞'}　τa・k = ${fmt3(m.tauA)} (N/mm2)`, m.okTau));
    });
  }

  return b.blocks;
}

// ============================================================
// ページ組み: ブロックを A4 ページへ流し込み → 目次生成
const PAGE_W_MM = 210, PAGE_H_MM = 297;
const MARGIN_X_MM = 17, MARGIN_TOP_MM = 14, MARGIN_BOTTOM_MM = 16, HEADER_MM = 8;
const CONTENT_W_MM = PAGE_W_MM - 2 * MARGIN_X_MM;
const CONTENT_H_MM = PAGE_H_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM - HEADER_MM;

export function renderReport(result, mount) {
  const blocks = buildBlocks(result);

  // 計測用コンテナ
  const meas = document.createElement('div');
  meas.className = 'rpt-measure';
  meas.style.cssText = `position:absolute;visibility:hidden;left:-9999px;top:0;width:${CONTENT_W_MM}mm;`;
  document.body.appendChild(meas);
  const els = blocks.map((blk) => {
    const el = document.createElement('div');
    el.className = 'rpt-block';
    el.innerHTML = blk.html;
    meas.appendChild(el);
    return el;
  });
  const pxPerMm = meas.getBoundingClientRect().width / CONTENT_W_MM;
  const maxH = CONTENT_H_MM * pxPerMm;
  const heights = els.map((el) => el.getBoundingClientRect().height);
  document.body.removeChild(meas);

  // keepNext 連鎖でグループ化
  const groups = [];
  for (let i = 0; i < blocks.length;) {
    const g = { idx: [i], breakBefore: !!blocks[i].breakBefore };
    while (blocks[g.idx[g.idx.length - 1]].keepNext && g.idx[g.idx.length - 1] + 1 < blocks.length) {
      g.idx.push(g.idx[g.idx.length - 1] + 1);
    }
    i = g.idx[g.idx.length - 1] + 1;
    groups.push(g);
  }

  // ページ詰め
  const pages = [];
  let cur = null, curH = 0;
  const newPage = () => { cur = { items: [] }; curH = 0; pages.push(cur); };
  newPage();
  for (const g of groups) {
    const gH = g.idx.reduce((s, i2) => s + heights[i2], 0);
    if ((g.breakBefore && cur.items.length > 0) || (curH + gH > maxH && cur.items.length > 0)) newPage();
    // グループがページ高を超える場合は分割して流し込む
    for (const i2 of g.idx) {
      if (curH + heights[i2] > maxH && cur.items.length > 0) newPage();
      cur.items.push(i2);
      curH += heights[i2];
    }
  }

  // 見出し → ページ番号
  const tocEntries = [];
  pages.forEach((pg, p) => {
    for (const i2 of pg.items) {
      if (blocks[i2].toc) tocEntries.push({ ...blocks[i2].toc, page: p + 1 });
    }
  });

  // 目次ページ
  const tocLines = tocEntries.map((t) =>
    `<div class="toc-line lv${t.level}"><span class="toc-t">${t.label}</span><span class="toc-dots">${'・'.repeat(80)}</span><span class="toc-p">${t.page}</span></div>`);
  const TOC_PER_PAGE = 44;
  const tocPages = [];
  for (let i = 0; i < tocLines.length; i += TOC_PER_PAGE) {
    tocPages.push(
      (i === 0 ? '<div class="toc-title">目　次</div>' : '') + tocLines.slice(i, i + TOC_PER_PAGE).join(''),
    );
  }

  // DOM 出力
  mount.innerHTML = '';
  const mkPage = (bodyHtml, pageNo) => {
    const pg = document.createElement('div');
    pg.className = 'rpt-page';
    pg.innerHTML = `<div class="rpt-pghead">${pageNo == null ? '' : pageNo}</div><div class="rpt-pgbody">${bodyHtml}</div>`;
    return pg;
  };
  tocPages.forEach((html) => mount.appendChild(mkPage(html, null)));
  pages.forEach((pg, p) => {
    const html = pg.items.map((i2) => `<div class="rpt-block">${blocks[i2].html}</div>`).join('');
    mount.appendChild(mkPage(html, p + 1));
  });
  return { pageCount: pages.length + tocPages.length };
}

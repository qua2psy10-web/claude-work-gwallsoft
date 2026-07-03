// UI制御: 入力⇔モデルのバインド・計算・帳票描画・JSON保存/読込
import { defaultInput, presets } from './model.js';
import { compute } from './calc/engine.js';
import { renderReport } from './report/report.js';

let model = defaultInput();

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, v) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  target[last] = v;
}

// モデル → フォーム
function syncForm() {
  for (const el of $$('[data-path]')) {
    const v = getPath(model, el.dataset.path);
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v ?? '';
  }
  $('#grp-water').classList.toggle('disabled', !model.water.enabled);
  $('#grp-surcharge').classList.toggle('disabled', !model.surcharge.enabled);
  $('#grp-seismic').classList.toggle('disabled', !model.seismic.enabled);
  $('#grp-member').classList.toggle('disabled', !model.member.show && !model.member.calc);
}

// フォーム → モデル
function readForm(el) {
  const path = el.dataset.path;
  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.type === 'number') {
    v = parseFloat(el.value);
    if (!isFinite(v)) return;
  } else v = el.value;
  setPath(model, path, v);
}

let timer = null;
function scheduleUpdate() {
  clearTimeout(timer);
  timer = setTimeout(update, 250);
}

function validate(m) {
  const errs = [];
  const g = m.geometry;
  if (!(g.height > 0)) errs.push('壁高は正の値としてください。');
  if (!(g.baseWidth > 0)) errs.push('底版幅は正の値としてください。');
  if (g.topWidth < 0 || g.topWidth > g.baseWidth) errs.push('天端幅は 0〜底版幅 の範囲としてください。');
  if (m.drop < 0 || m.drop >= g.height) errs.push('落差高さは 0〜壁高未満 としてください。');
  if (!(m.soil.phi > 0 && m.soil.phi < 60)) errs.push('せん断抵抗角φは 0〜60度 の範囲としてください。');
  if (m.backfill.raise < 0) errs.push('嵩上げ高さは 0 以上としてください。');
  if (m.backfill.raise > 0 && !(m.backfill.slopeN > 0)) errs.push('嵩上げ時は法面勾配 1:n の n を正の値としてください。');
  return errs;
}

function update() {
  const errs = validate(model);
  const status = $('#status');
  if (errs.length) {
    status.innerHTML = `<span class="ngmark">入力エラー: ${errs.join(' ')}</span>`;
    return;
  }
  try {
    const result = compute(model);
    const { pageCount } = renderReport(result, $('#report-area'));
    const ngCases = result.cases.filter((c) => !c.overturn.ok || !c.sliding.ok || !c.bearing.ok || (c.member && !c.member.ok));
    const ngText = ngCases.length
      ? `　<span class="ngmark">判定NG: ケース ${ngCases.map((c) => c.no).join(', ')}</span>`
      : '　全ケース判定OK';
    status.innerHTML = `全 ${pageCount} ページ／荷重ケース ${result.cases.length} ケース${ngText}`;
    fitPreview();
  } catch (err) {
    status.innerHTML = `<span class="ngmark">計算エラー: ${err.message}</span>`;
    console.error(err);
  }
}

// プレビューを画面幅に合わせて縮小表示
function fitPreview() {
  const area = $('#report-area');
  const avail = $('#preview').clientWidth - 40;
  const pageW = area.querySelector('.rpt-page')?.getBoundingClientRect().width || 0;
  const natural = pageW || 794;
  const scale = Math.min(1, avail / natural);
  area.style.transform = `scale(${scale})`;
  area.style.width = `${100 / scale}%`;
}

// ---- イベント ----
document.addEventListener('input', (e) => {
  if (!e.target.dataset?.path) return;
  readForm(e.target);
  if (e.target.type === 'checkbox') syncForm();
  scheduleUpdate();
});

$('#preset').addEventListener('change', (e) => {
  const key = e.target.value;
  if (!key || !presets[key]) return;
  model = presets[key]();
  syncForm();
  update();
});

$('#btn-print').addEventListener('click', () => window.print());

$('#btn-save').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'youheki-input.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#btn-load').addEventListener('click', () => $('#file-load').click());
$('#file-load').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const loaded = JSON.parse(await file.text());
    // 既定値にマージ（欠損キーを補完）
    model = deepMerge(defaultInput(), loaded);
    syncForm();
    update();
  } catch {
    alert('JSONの読込に失敗しました。');
  }
  e.target.value = '';
});

function deepMerge(base, over) {
  if (over === null || typeof over !== 'object' || Array.isArray(over)) return over ?? base;
  const out = { ...base };
  for (const k of Object.keys(over)) {
    out[k] = k in base ? deepMerge(base[k], over[k]) : over[k];
  }
  return out;
}

window.addEventListener('resize', fitPreview);

// 初期表示
syncForm();
update();

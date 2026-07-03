// 座標法による断面計算（道路土工擁壁工指針の計算式）
//   A  = 1/2 Σ(x[i+1]・y[i] - x[i]・y[i+1])
//   Gy = -1/2 Σ(y[i+1]-y[i])・{x[i]^2 + 1/3(x[i+1]-x[i])(x[i+1]+2x[i])}
//   Gx =  1/2 Σ(x[i+1]-x[i])・{y[i]^2 + 1/3(y[i+1]-y[i])(y[i+1]+2y[i])}
// 頂点は前面下端を原点に (x: 背面方向, y: 上方向)、サンプル帳票と同じ並び順で与える。

export function sectionProperties(vertices, x0 = 0, y0 = 0) {
  const n = vertices.length;
  const rows = [];
  let A = 0, Gy = 0, Gx = 0;
  for (let i = 0; i < n; i++) {
    const [xi, yi] = vertices[i];
    const [xj, yj] = vertices[(i + 1) % n];
    const dA = 0.5 * (xj * yi - xi * yj);
    const dGy = -0.5 * (yj - yi) * (xi * xi + (1 / 3) * (xj - xi) * (xj + 2 * xi));
    const dGx = 0.5 * (xj - xi) * (yi * yi + (1 / 3) * (yj - yi) * (yj + 2 * yi));
    A += dA; Gy += dGy; Gx += dGx;
    rows.push({ x: xi, y: yi, dA, dGy, dGx });
  }
  const XG = Gy / A - x0;
  const YG = Gx / A - y0;
  return { vertices, rows, A, Gy, Gx, XG, YG };
}

// 重力式定型擁壁の断面頂点（前面鉛直・背面直線勾配）
//   topWidth: 天端幅 (m), height: 壁高 (m), baseWidth: 底版幅 (m)
export function wallVertices({ topWidth, height, baseWidth }) {
  return [
    [0, 0],
    [0, height],
    [topWidth, height],
    [baseWidth, 0],
  ];
}

// 壁背面と鉛直面のなす角 α (度)
export function backFaceAngle({ topWidth, height, baseWidth }) {
  return Math.atan((baseWidth - topWidth) / height) * 180 / Math.PI;
}

// 背面勾配 tanα
export function backFaceTan({ topWidth, height, baseWidth }) {
  return (baseWidth - topWidth) / height;
}

// 背面のx座標（高さyにおける壁背面位置）
export function backFaceX(geom, y) {
  return geom.baseWidth - y * backFaceTan(geom);
}

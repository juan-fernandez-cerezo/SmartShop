import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import './RouteView.css';
import type { ViewState } from '../App';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Zone {
  id: string; name: string; type: string;
  x: number; y: number; width: number; height: number;
}
interface Stop { zone: Zone; products: any[]; order: number; }
interface Props { setView: (v: ViewState) => void; market: any; cart: any[]; }

// ─── Grid constants ───────────────────────────────────────────────────────────

const GW = 100, GH = 100;
type GP = { x: number; y: number };
const gIdx = (x: number, y: number) => y * GW + x;

// ─── Grid build ───────────────────────────────────────────────────────────────

/** All cells walkable by default; obstacle types become barriers. */
const buildGrid = (zones: Zone[]): Uint8Array => {
  const g = new Uint8Array(GW * GH).fill(1);
  const OBS = new Set(['Estantería', 'No transitable', 'Sección', 'Almacén']);
  for (const z of zones) {
    if (!OBS.has(z.type)) continue;
    const x0 = Math.max(0, Math.floor(z.x * GW));
    const y0 = Math.max(0, Math.floor(z.y * GH));
    const x1 = Math.min(GW, Math.ceil((z.x + z.width) * GW));
    const y1 = Math.min(GH, Math.ceil((z.y + z.height) * GH));
    for (let gy = y0; gy < y1; gy++)
      for (let gx = x0; gx < x1; gx++)
        g[gIdx(gx, gy)] = 0;
  }
  return g;
};

// ─── BFS nearest walkable ─────────────────────────────────────────────────────

const nearestWalkable = (pt: GP, g: Uint8Array): GP | null => {
  if (g[gIdx(pt.x, pt.y)]) return pt;
  const queue: GP[] = [pt];
  const seen = new Set([gIdx(pt.x, pt.y)]);
  const DIRS = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  while (queue.length) {
    const c = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const nx = c.x + dx, ny = c.y + dy;
      if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue;
      const k = gIdx(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      if (g[k]) return { x: nx, y: ny };
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
};

// ─── A* pathfinding ───────────────────────────────────────────────────────────

const astar = (g: Uint8Array, rawStart: GP, rawEnd: GP): GP[] => {
  const start = nearestWalkable(rawStart, g);
  const end   = nearestWalkable(rawEnd,   g);
  if (!start || !end) return [rawStart, rawEnd];
  if (start.x === end.x && start.y === end.y) return [start];

  const h = (a: GP, b: GP) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const INF = 1e9;
  const gs  = new Float32Array(GW * GH).fill(INF);
  const par = new Int32Array(GW * GH).fill(-1);
  const cl  = new Uint8Array(GW * GH);
  const sk  = gIdx(start.x, start.y);
  const ek  = gIdx(end.x,   end.y);
  gs[sk] = 0;

  type N = { x: number; y: number; f: number };
  const open: N[] = [{ x: start.x, y: start.y, f: h(start, end) }];
  const DIRS = [[0,1],[1,0],[0,-1],[-1,0]];
  const MAX = GW * GH * 2;
  let iter = 0;

  while (open.length && iter++ < MAX) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    const ck  = gIdx(cur.x, cur.y);
    if (cl[ck]) continue;
    cl[ck] = 1;
    if (ck === ek) break;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue;
      const nk = gIdx(nx, ny);
      if (cl[nk] || !g[nk]) continue;
      const ng = gs[ck] + 1;
      if (ng < gs[nk]) {
        gs[nk] = ng; par[nk] = ck;
        open.push({ x: nx, y: ny, f: ng + h({ x: nx, y: ny }, end) });
      }
    }
  }

  if (par[ek] === -1 && ek !== sk) return [rawStart, rawEnd];
  const path: GP[] = [];
  let c = ek;
  while (c !== -1) { path.unshift({ x: c % GW, y: Math.floor(c / GW) }); c = par[c]; }
  return path;
};

// ─── RDP path simplification ─────────────────────────────────────────────────

const rdp = (pts: GP[], eps: number): GP[] => {
  if (pts.length <= 2) return pts;
  let maxD = 0, mi = 0;
  const [s, e] = [pts[0], pts[pts.length - 1]];
  const dx = e.x - s.x, dy = e.y - s.y, len = Math.hypot(dx, dy);
  for (let i = 1; i < pts.length - 1; i++) {
    const d = len === 0 ? Math.hypot(pts[i].x - s.x, pts[i].y - s.y)
      : Math.abs(dy * pts[i].x - dx * pts[i].y + e.x * s.y - e.y * s.x) / len;
    if (d > maxD) { maxD = d; mi = i; }
  }
  if (maxD > eps) return [...rdp(pts.slice(0, mi + 1), eps).slice(0, -1), ...rdp(pts.slice(mi), eps)];
  return [s, e];
};

// ─── Coordinate helpers ───────────────────────────────────────────────────────

const zoneGP = (z: Zone): GP => ({ x: Math.round((z.x + z.width / 2) * GW), y: Math.round((z.y + z.height / 2) * GH) });
const toSVG  = (p: GP) => ({ x: (p.x / GW) * 100, y: (p.y / GH) * 100 });

// ─── TSP helpers ──────────────────────────────────────────────────────────────

/** A* path length between two zones (corridor distance for TSP matrix) */
const astarLen = (g: Uint8Array, a: Zone, b: Zone): number => astar(g, zoneGP(a), zoneGP(b)).length;

const tourCost = (order: number[], D: number[][]): number => {
  let c = 0;
  for (let i = 0; i < order.length - 1; i++) c += D[order[i]][order[i + 1]];
  return c;
};

/** All permutations of arr */
const genPerms = (arr: number[]): number[][] => {
  if (arr.length === 0) return [[]];
  const out: number[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.filter((_, k) => k !== i);
    for (const p of genPerms(rest)) out.push([arr[i], ...p]);
  }
  return out;
};

/** OR-opt (node relocation): try inserting each node at every other position */
const orOpt = (order: number[], D: number[][]): number[] => {
  let best = [...order];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length; i++) {
      const node    = best[i];
      const removed = best.filter((_, k) => k !== i);
      const base    = tourCost(best, D);
      for (let j = 1; j <= removed.length; j++) {
        const trial = [...removed.slice(0, j), node, ...removed.slice(j)];
        if (tourCost(trial, D) < base - 1) { best = trial; improved = true; break; }
      }
      if (improved) break;
    }
  }
  return best;
};

// ─── Sidebar zone colors ──────────────────────────────────────────────────────

const ZONE_COLORS: Record<string, { bg: string; border: string }> = {
  Entrada:          { bg: 'rgba(34,197,94,0.28)',   border: '#16a34a' },
  Salida:           { bg: 'rgba(16,185,129,0.28)',  border: '#059669' },
  Estantería:       { bg: 'rgba(59,130,246,0.22)',  border: '#2563eb' },
  Sección:          { bg: 'rgba(59,130,246,0.22)',  border: '#2563eb' },
  Pasillo:          { bg: 'rgba(249,115,22,0.22)',  border: '#ea580c' },
  Caja:             { bg: 'rgba(168,85,247,0.22)',  border: '#9333ea' },
  Almacén:          { bg: 'rgba(239,68,68,0.22)',   border: '#dc2626' },
  'No transitable': { bg: 'rgba(100,116,139,0.22)', border: '#475569' },
  Otro:             { bg: 'rgba(107,114,128,0.22)', border: '#6b7280' },
};
const zoneColor = (t: string) => ZONE_COLORS[t] ?? ZONE_COLORS['Otro'];

// ─── Match cart item to zone ──────────────────────────────────────────────────

const matchZone = (item: any, zones: Zone[]): Zone | null => {
  const cat = (item.category || '').toLowerCase();
  if (!cat) return null;
  return zones.find(z => { const zn = z.name.toLowerCase(); return zn.includes(cat) || cat.includes(zn); }) ?? null;
};

// ─── Build ordered stops ──────────────────────────────────────────────────────
// Uses A* pairwise distance matrix.
// ≤ 8 product stops → brute-force optimal permutation.
// > 8 product stops → greedy nearest-neighbor + 2-opt + OR-opt.
// Nearest Caja/Salida selected by real A* distance from last product stop.

const buildRoute = (zones: Zone[], cart: any[], grid: Uint8Array): Stop[] => {
  if (zones.length === 0) return [];

  const zoneProducts: Record<string, any[]> = {};
  const unmatched: any[] = [];
  for (const item of cart) {
    const z = matchZone(item, zones);
    if (z) zoneProducts[z.id] = [...(zoneProducts[z.id] || []), item];
    else unmatched.push(item);
  }

  const entrance       = zones.find(z => z.type === 'Entrada') ?? zones[0];
  if (!entrance) return [];
  const cajaCandidates = zones.filter(z => z.type === 'Caja' || z.type === 'Salida');
  const pool           = zones.filter(z =>
    zoneProducts[z.id]?.length &&
    z.id !== entrance.id &&
    !cajaCandidates.find(c => c.id === z.id)
  );

  // Build A* pairwise distance matrix [entrance, ...pool]
  const pts = [entrance, ...pool];
  const n   = pts.length;
  const D: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      D[i][j] = D[j][i] = astarLen(grid, pts[i], pts[j]);

  // Solve TSP (entrance always at position 0)
  let bestOrder: number[];

  if (n <= 9) {
    // Brute-force — guaranteed optimal
    const inner = Array.from({ length: n - 1 }, (_, k) => k + 1);
    let bestCost = Infinity;
    bestOrder = [0, ...inner];
    for (const perm of genPerms(inner)) {
      const order = [0, ...perm];
      const cost  = tourCost(order, D);
      if (cost < bestCost) { bestCost = cost; bestOrder = order; }
    }
  } else {
    // Greedy nearest-neighbor + 2-opt + OR-opt
    const visited = new Set([0]);
    bestOrder = [0];
    while (bestOrder.length < n) {
      const last = bestOrder[bestOrder.length - 1];
      let bj = -1, bd = Infinity;
      for (let j = 0; j < n; j++) {
        if (!visited.has(j) && D[last][j] < bd) { bd = D[last][j]; bj = j; }
      }
      if (bj < 0) break;
      visited.add(bj); bestOrder.push(bj);
    }
    // 2-opt
    let imp = true;
    while (imp) {
      imp = false;
      for (let i = 1; i < bestOrder.length - 1; i++) {
        for (let j = i + 1; j < bestOrder.length; j++) {
          const trial = [...bestOrder.slice(0, i), ...bestOrder.slice(i, j + 1).reverse(), ...bestOrder.slice(j + 1)];
          if (tourCost(trial, D) < tourCost(bestOrder, D) - 1) { bestOrder = trial; imp = true; }
        }
      }
    }
    // OR-opt
    bestOrder = orOpt(bestOrder, D);
  }

  const ordered = bestOrder.slice(1).map(i => pts[i]);

  // Nearest Caja/Salida by A* distance from last product stop
  let exitZone: Zone | undefined;
  if (cajaCandidates.length > 0) {
    const ref = ordered.length > 0 ? ordered[ordered.length - 1] : entrance;
    let minLen = Infinity;
    for (const c of cajaCandidates) {
      const l = astarLen(grid, ref, c);
      if (l < minLen) { minLen = l; exitZone = c; }
    }
  }

  const stopZones = [entrance, ...ordered];
  if (exitZone && !stopZones.find(z => z.id === exitZone!.id)) stopZones.push(exitZone);

  const stops: Stop[] = stopZones.map((z, i) => ({ zone: z, products: zoneProducts[z.id] || [], order: i + 1 }));
  if (unmatched.length > 0) {
    const t = stops.find(s => s.order > 1 && s.products.length === 0) ?? stops[stops.length > 1 ? 1 : 0];
    if (t) t.products.push(...unmatched);
  }
  return stops;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const RouteView = ({ setView, market, cart }: Props) => {
  const [zones,   setZones]   = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapUrl,  setMapUrl]  = useState<string | null>(market?.map_image_url ?? null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [activeStop, setActiveStop] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // ── Load zones + map URL ──────────────────────────────────────────────────
  useEffect(() => {
    if (!market?.id) { setLoading(false); return; }
    const load = async () => {
      try {
        const { data: md } = await supabase.from('supermarkets').select('map_image_url,user_id').eq('id', market.id).single();
        if (md?.map_image_url) {
          setMapUrl(md.map_image_url);
        } else if (md?.user_id) {
          const { data: files } = await supabase.storage.from('supermarket-maps').list(md.user_id, { limit: 10, sortBy: { column: 'created_at', order: 'desc' } });
          if (files?.length) {
            const { data: u } = supabase.storage.from('supermarket-maps').getPublicUrl(`${md.user_id}/${files[0].name}`);
            if (u?.publicUrl) {
              setMapUrl(u.publicUrl);
              await supabase.from('supermarkets').update({ map_image_url: u.publicUrl }).eq('id', market.id);
            }
          }
        }
        const { data, error } = await (supabase as any).from('supermarket_zones').select('*').eq('supermarket_id', market.id);
        if (!error) {
          setZones((data || []).map((r: any) => ({ id: r.id, name: r.name, type: r.type, x: r.x, y: r.y, width: r.width, height: r.height })));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [market, cart]);

  // ── Track image rendered size ─────────────────────────────────────────────
  useEffect(() => {
    if (!imgRef.current) return;
    const obs = new ResizeObserver(() => { if (imgRef.current) setImgSize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight }); });
    obs.observe(imgRef.current);
    return () => obs.disconnect();
  }, [loading]);

  const onImgLoad = () => { if (imgRef.current) setImgSize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight }); };

  // ── Walkable grid (Estantería / No transitable = obstacle) ────────────────
  const walkableGrid = useMemo(() => buildGrid(zones), [zones]);

  // ── Route stops — derived from zones + cart + grid ─────────────────────
  const stops = useMemo(() => {
    if (zones.length === 0 || cart.length === 0) return [];
    return buildRoute(zones, cart, walkableGrid);
  }, [zones, cart, walkableGrid]);

  // ── A* full corridor path through all stops ───────────────────────────────
  const svgPolylinePoints = useMemo(() => {
    if (stops.length < 2) return '';
    const allPts: GP[] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const from = zoneGP(stops[i].zone);
      const to   = zoneGP(stops[i + 1].zone);
      const seg  = rdp(astar(walkableGrid, from, to), 0.8);
      if (i === 0) allPts.push(...seg);
      else allPts.push(...seg.slice(1));
    }
    return allPts.map(p => { const s = toSVG(p); return `${s.x},${s.y}`; }).join(' ');
  }, [stops, walkableGrid]);

  const stopCoords = useMemo(() => stops.map(s => { const p = toSVG(zoneGP(s.zone)); return { cx: p.x, cy: p.y }; }), [stops]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rv-loading">
        <div className="rv-spinner" />
        <p>Calculando la ruta óptima...</p>
      </div>
    );
  }

  const hasZones = zones.length > 0;

  return (
    <div className="rv-page">
      {/* Header */}
      <div className="rv-header">
        <button className="rv-btn-back" onClick={() => setView('shopping-view')}>← Volver a la tienda</button>
        <div>
          <h1 className="rv-title">🗺️ Tu Ruta de Compra</h1>
          <p className="rv-subtitle">{market?.name} &mdash; {stops.filter(s => s.products.length > 0).length} paradas</p>
        </div>
        <div className="rv-header-stats">
          <span className="rv-stat">🛒 {cart.length} productos</span>
          <span className="rv-stat">📍 {stops.length} paradas</span>
        </div>
      </div>

      <div className="rv-body">
        {/* Map Panel */}
        <div className="rv-map-panel">
          {!mapUrl ? (
            <div className="rv-no-map"><p>⚠️ Este supermercado no tiene mapa configurado.</p></div>
          ) : !hasZones ? (
            <div className="rv-no-zones">
              <img src={mapUrl} alt="Mapa" className="rv-map-img-only" />
              <div className="rv-no-zones-msg">⚠️ No hay zonas definidas. Ve a "Editar mapa" para configurarlas.</div>
            </div>
          ) : (
            <div className="rv-map-container">
              <img ref={imgRef} src={mapUrl} alt="Mapa del supermercado" className="rv-map-img" onLoad={onImgLoad} draggable={false} />

              {imgSize && (
                <svg className="rv-svg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: imgSize.w, height: imgSize.h }}>
                  {stops.length > 1 && (
                    <polyline className="rv-route-line" points={svgPolylinePoints} fill="none" stroke="#f97316" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
                  )}
                  {stopCoords.map((c, i) => {
                    const stop = stops[i];
                    const active = activeStop === stop.order;
                    const hasProducts = stop.products.length > 0;
                    return (
                      <g key={i} className="rv-stop-group" onClick={() => setActiveStop(active ? null : stop.order)} style={{ cursor: 'pointer' }}>
                        <circle cx={c.cx} cy={c.cy} r={active ? 3.5 : 2.8} fill={hasProducts ? '#f97316' : '#94a3b8'} stroke="white" strokeWidth="0.6" className={active ? 'rv-stop-circle--active' : ''} />
                        <text x={c.cx} y={c.cy} textAnchor="middle" dominantBaseline="middle" fontSize="1.8" fill="white" fontWeight="bold" style={{ userSelect: 'none', pointerEvents: 'none' }}>{stop.order}</text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          )}

          <div className="rv-legend">
            <span className="rv-legend-item"><span className="rv-dot" style={{ background: '#f97316' }} /> Parada con productos</span>
            <span className="rv-legend-item"><span className="rv-dot" style={{ background: '#94a3b8' }} /> Paso de tránsito</span>
            <span className="rv-legend-item rv-legend-line"><span className="rv-line-sample" /> Ruta óptima</span>
          </div>
        </div>

        {/* Sidebar */}
        <div className="rv-sidebar">
          <h2 className="rv-sidebar-title">📋 Lista de paradas</h2>
          {stops.length === 0 ? (
            <div className="rv-sidebar-empty">
              <p>No hay paradas que mostrar.</p>
              <p>Asegúrate de tener zonas definidas en el mapa.</p>
            </div>
          ) : (
            <ul className="rv-stop-list">
              {stops.map(stop => {
                const colors   = zoneColor(stop.zone.type);
                const isActive = activeStop === stop.order;
                return (
                  <li key={stop.order} className={`rv-stop-item ${isActive ? 'rv-stop-item--active' : ''} ${stop.products.length === 0 ? 'rv-stop-item--empty' : ''}`} onClick={() => setActiveStop(isActive ? null : stop.order)}>
                    <div className="rv-stop-number" style={{ background: stop.products.length ? '#f97316' : '#94a3b8' }}>{stop.order}</div>
                    <div className="rv-stop-content">
                      <div className="rv-stop-header-row">
                        <span className="rv-stop-zone-name">{stop.zone.name}</span>
                        <span className="rv-stop-type" style={{ background: colors.bg, color: colors.border, border: `1px solid ${colors.border}` }}>{stop.zone.type}</span>
                      </div>
                      {stop.products.length > 0 ? (
                        <ul className="rv-product-list">
                          {stop.products.map((p, pi) => (
                            <li key={pi} className="rv-product-item">
                              <span className="rv-product-bullet">•</span>
                              <span className="rv-product-name">{p.name}</span>
                              <span className="rv-product-qty">×{p.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="rv-stop-no-products">Paso de tránsito</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="rv-summary">
            <div className="rv-summary-row"><span>Total productos</span><strong>{cart.reduce((a, i) => a + i.quantity, 0)}</strong></div>
            <div className="rv-summary-row"><span>Total estimado</span><strong>{cart.reduce((a, i) => a + i.price * i.quantity, 0).toFixed(2)} €</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};

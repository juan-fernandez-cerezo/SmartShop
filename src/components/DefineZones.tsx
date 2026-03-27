import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import './DefineZones.css';
import type { ViewState } from '../App';

// ─── Types ────────────────────────────────────────────────────────────────────

type ZoneType = 'Entrada' | 'Estantería' | 'Caja' | 'No transitable' | 'Salida';

interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DrawingRect {
  startX: number; startY: number; currentX: number; currentY: number;
}

const ZONE_COLORS: Record<ZoneType, { bg: string; border: string }> = {
  Entrada: { bg: 'rgba(34,197,94,0.28)', border: '#16a34a' },
  Salida: { bg: 'rgba(16,185,129,0.28)', border: '#059669' },
  Estantería: { bg: 'rgba(59,130,246,0.28)', border: '#2563eb' },
  Caja: { bg: 'rgba(168,85,247,0.28)', border: '#9333ea' },
  'No transitable': { bg: 'rgba(100,116,139,0.35)', border: '#475569' },
};

const ZONE_TYPES: ZoneType[] = ['Entrada', 'Salida', 'Estantería', 'Caja', 'No transitable'];

const ZONE_ICONS: Record<ZoneType, string> = {
  Entrada: '🚪',
  Salida: '🏁',
  Estantería: '🛒',
  Caja: '💳',
  'No transitable': '🚫',
};

interface Props {
  setView: (v: ViewState) => void;
  session: any;
  supermarketId: string | null;
}

export const DefineZones = ({ setView, supermarketId }: Props) => {
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [drawing, setDrawing] = useState<DrawingRect | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pendingRect, setPendingRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState<ZoneType>('Estantería');
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!supermarketId) { setLoading(false); return; }
    const load = async () => {
      const { data: market } = await supabase.from('supermarkets').select('map_image_url').eq('id', supermarketId).single();
      if (market?.map_image_url) setMapUrl(market.map_image_url);

      const { data: existing } = await (supabase as any).from('supermarket_zones').select('*').eq('supermarket_id', supermarketId);
      if (existing?.length) {
        setZones(existing.map((z: any) => ({
          id: z.id, name: z.name, type: z.type as ZoneType,
          x: z.x, y: z.y, width: z.width, height: z.height,
        })));
      }
      setLoading(false);
    };
    load();
  }, [supermarketId]);

  // ── Canvas helpers ───────────────────────────────────────────────────────────

  const toRelative = useCallback((e: React.MouseEvent) => {
    const img = imgRef.current;
    if (!img) return { rx: 0, ry: 0 };
    const r = img.getBoundingClientRect();
    return {
      rx: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      ry: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (showModal || editingZoneId) return;
    const { rx, ry } = toRelative(e);
    setDrawing({ startX: rx, startY: ry, currentX: rx, currentY: ry });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const { rx, ry } = toRelative(e);
    setDrawing(prev => prev ? { ...prev, currentX: rx, currentY: ry } : null);
  };

  const handleMouseUp = () => {
    if (!drawing) return;
    const x = Math.min(drawing.startX, drawing.currentX);
    const y = Math.min(drawing.startY, drawing.currentY);
    const w = Math.abs(drawing.currentX - drawing.startX);
    const h = Math.abs(drawing.currentY - drawing.startY);
    setDrawing(null);
    if (w < 0.01 || h < 0.01) return;
    setPendingRect({ x, y, width: w, height: h });
    setShowModal(true);
  };

  // ── Zone CRUD ────────────────────────────────────────────────────────────────

  const confirmZone = () => {
    if (!pendingRect || !newZoneName.trim()) return;
    setZones(prev => [...prev, {
      id: crypto.randomUUID(),
      name: newZoneName.trim(),
      type: newZoneType,
      ...pendingRect,
    }]);
    setShowModal(false);
    setNewZoneName('');
    setNewZoneType('Estantería');
    setPendingRect(null);
  };

  const cancelModal = () => {
    setShowModal(false);
    setNewZoneName('');
    setPendingRect(null);
  };

  const deleteZone = (id: string) => setZones(prev => prev.filter(z => z.id !== id));

  const startEditing = (zone: Zone, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingZoneId(zone.id);
    setEditingName(zone.name);
  };

  const confirmEdit = () => {
    if (!editingZoneId) return;
    setZones(prev => prev.map(z => z.id === editingZoneId ? { ...z, name: editingName.trim() || z.name } : z));
    setEditingZoneId(null);
    setEditingName('');
  };

  const cancelEdit = () => { setEditingZoneId(null); setEditingName(''); };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!supermarketId) { setView('upload-products'); return; }
    setSaving(true);
    try {
      await (supabase as any).from('supermarket_zones').delete().eq('supermarket_id', supermarketId);
      if (zones.length > 0) {
        const rows = zones.map(z => ({ supermarket_id: supermarketId, name: z.name, type: z.type, x: z.x, y: z.y, width: z.width, height: z.height }));
        const { error } = await (supabase as any).from('supermarket_zones').insert(rows);
        if (error) throw error;
      }
      setView('upload-products');
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Zone overlay render ───────────────────────────────────────────────────────

  const renderZoneOverlay = (zone: Zone) => {
    const colors = ZONE_COLORS[zone.type];
    const isHovered = hoveredZoneId === zone.id;
    return (
      <div
        key={zone.id}
        className={`zone-rect ${isHovered ? 'zone-rect--hovered' : ''}`}
        style={{ left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.width * 100}%`, height: `${zone.height * 100}%`, background: colors.bg, borderColor: colors.border }}
        onMouseEnter={() => setHoveredZoneId(zone.id)}
        onMouseLeave={() => setHoveredZoneId(null)}
      >
        <span className="zone-label" style={{ color: colors.border }}>{zone.name}</span>
        {isHovered && (
          <button className="zone-delete-btn" onClick={e => { e.stopPropagation(); deleteZone(zone.id); }} title="Eliminar zona">×</button>
        )}
      </div>
    );
  };

  const renderDrawingRect = () => {
    if (!drawing) return null;
    const x = Math.min(drawing.startX, drawing.currentX);
    const y = Math.min(drawing.startY, drawing.currentY);
    const w = Math.abs(drawing.currentX - drawing.startX);
    const h = Math.abs(drawing.currentY - drawing.startY);
    return <div className="zone-drawing-ghost" style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }} />;
  };

  // ── JSX ──────────────────────────────────────────────────────────────────────

  if (loading) return <div className="dz-loading"><div className="dz-spinner" /><p>Cargando mapa...</p></div>;

  return (
    <div className="dz-page">
      {/* Header */}
      <div className="dz-header">
        <div className="dz-header-left">
          <button className="dz-btn-back" onClick={() => setView('manage-supermarkets')}>← Return</button>
          <div>
            <h1 className="dz-title">🗺️ Draw the zones of the map</h1>
            <p className="dz-subtitle">Draw rectangles over the map to mark the different zones</p>
          </div>
        </div>
        <div className="dz-header-actions">
          <button className="dz-btn-skip" onClick={() => setView('upload-products')}>Skip →</button>
          <button className="dz-btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save and Continue'}</button>
        </div>
      </div>

      <div className="dz-body">
        {/* Map Canvas */}
        <div className="dz-map-panel">
          <div className="dz-hint"><span>🖱️</span> Haz clic y arrastra para definir una zona</div>

          {mapUrl ? (
            <div className="dz-map-container" ref={containerRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
              <img ref={imgRef} src={mapUrl} alt="Mapa del supermercado" className="dz-map-img" draggable={false} />
              {zones.map(renderZoneOverlay)}
              {renderDrawingRect()}
            </div>
          ) : (
            <div className="dz-no-map">
              <p>⚠️ No map available. Upload the map image first.</p>
              <button className="dz-btn-skip" onClick={() => setView('upload-map')}>Go to upload map</button>
            </div>
          )}

          {/* Legend */}
          <div className="dz-legend">
            {ZONE_TYPES.map(t => (
              <div key={t} className="dz-legend-item">
                <span className="dz-legend-dot" style={{ background: ZONE_COLORS[t].border }} />
                {ZONE_ICONS[t]} {t}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="dz-sidebar">
          <h2 className="dz-sidebar-title">Zonas definidas <span className="dz-badge">{zones.length}</span></h2>

          {zones.length === 0 ? (
            <div className="dz-sidebar-empty">
              <p>You haven't defined any zones yet.</p>
              <p>Draw on the map to start.</p>
            </div>
          ) : (
            <ul className="dz-zone-list">
              {zones.map(zone => {
                const colors = ZONE_COLORS[zone.type];
                const isEditing = editingZoneId === zone.id;
                return (
                  <li key={zone.id} className="dz-zone-item">
                    <span className="dz-zone-color-dot" style={{ background: colors.border }} />
                    <div className="dz-zone-info">
                      {isEditing ? (
                        <input
                          className="dz-zone-name-input"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit(); }}
                          onBlur={confirmEdit}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="dz-zone-name" title="Click to edit the name">{zone.name}</span>
                      )}
                      <span className="dz-zone-type-badge" style={{ background: colors.bg, color: colors.border, border: `1px solid ${colors.border}` }}>
                        {ZONE_ICONS[zone.type]} {zone.type}
                      </span>
                    </div>
                    <div className="dz-zone-actions">
                      {isEditing ? (
                        <>
                          <button className="dz-zone-edit dz-zone-edit--confirm" onClick={confirmEdit} title="Confirm">✓</button>
                          <button className="dz-zone-edit dz-zone-edit--cancel" onClick={cancelEdit} title="Cancel">✕</button>
                        </>
                      ) : (
                        <button className="dz-zone-edit" onClick={e => startEditing(zone, e)} title="Edit name">✏️</button>
                      )}
                      <button className="dz-zone-delete" onClick={() => deleteZone(zone.id)} title="Delete">×</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Modal — new zone */}
      {showModal && (
        <div className="dz-modal-overlay" onClick={cancelModal}>
          <div className="dz-modal" onClick={e => e.stopPropagation()}>
            <h3 className="dz-modal-title">✏️ New Zone</h3>

            <div className="dz-modal-field">
              <label>Zone name</label>
              <input
                type="text"
                className="dz-modal-input"
                placeholder="Ej: Frutas y Verduras"
                value={newZoneName}
                onChange={e => setNewZoneName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmZone(); if (e.key === 'Escape') cancelModal(); }}
                autoFocus
              />
            </div>

            <div className="dz-modal-field">
              <label>Zone type</label>
              <div className="dz-type-grid">
                {ZONE_TYPES.map(t => (
                  <button
                    key={t}
                    className={`dz-type-btn ${newZoneType === t ? 'dz-type-btn--active' : ''}`}
                    style={newZoneType === t ? { background: ZONE_COLORS[t].bg, borderColor: ZONE_COLORS[t].border, color: ZONE_COLORS[t].border } : {}}
                    onClick={() => setNewZoneType(t)}
                  >
                    {ZONE_ICONS[t]} {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="dz-modal-actions">
              <button className="dz-modal-cancel" onClick={cancelModal}>Cancel</button>
              <button className="dz-modal-confirm" onClick={confirmZone} disabled={!newZoneName.trim()}>Add zone</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

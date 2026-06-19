'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { suscribirAPush, estaSuscrito } from '@/utils/push';
import { supabase } from '@/lib/supabaseClient';

const ESTADOS = {
  pendiente: { label: 'Pendiente', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
  en_proceso: { label: 'En Proceso', bg: 'bg-blue-100 text-blue-900 border-blue-300' },
  resuelto: { label: 'Resuelto', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  rechazado: { label: 'Rechazado', bg: 'bg-gray-100 text-gray-900 border-gray-300' },
};

const CATEGORIAS = {
  bache: { label: 'Bache o Hoyo', icon: '🕳️' },
  luminaria: { label: 'Luz Fundida', icon: '💡' },
  basura: { label: 'Basura o Basurero', icon: '🗑️' },
  fuga_agua: { label: 'Fuga de Agua', icon: '🚰' },
  camino_rural: { label: 'Camino Feo', icon: '🚜' },
  drenaje: { label: 'Drenaje Tapado', icon: '🌊' },
  otro: { label: 'Otro Problema', icon: '📋' },
};

function ReporteCard({ report, onAmpliarFoto, userSession, onLogin }) {
  const [expandido, setExpandido] = useState(false);
  const [suscritoPush, setSuscritoPush] = useState(false);
  const [suscribiendoPush, setSuscribiendoPush] = useState(false);

  useEffect(() => {
    if (report.id) {
      setSuscritoPush(estaSuscrito(report.id));
    }
  }, [report.id]);
  
  const cat = CATEGORIAS[report.categoria] || CATEGORIAS.otro;
  const est = ESTADOS[report.estado] || ESTADOS.pendiente;
  
  const fecha = new Date(report.creado_at).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const tieneDetalles = report.ubicacion_texto || report.audio_url || report.respuesta_ayuntamiento || (report.latitud && report.longitud);

  const imprimirComprobante = () => {
    const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}/reportes?folio=${report.folio}` : '';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(trackingUrl)}`;
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      alert('Por favor permite los popups en tu navegador para imprimir el comprobante.');
      return;
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Comprobante de Reporte #${report.folio}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Outfit', sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
          }
          .ticket-container {
            width: 100%;
            max-width: 420px;
            background: #ffffff;
            border: 2px dashed #cbd5e1;
            border-radius: 16px;
            padding: 30px 24px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
            text-align: center;
            box-sizing: border-box;
            position: relative;
          }
          .ticket-header {
            margin-bottom: 20px;
          }
          .logo {
            width: 70px;
            height: 70px;
            object-fit: cover;
            border-radius: 12px;
            margin-bottom: 12px;
            border: 1px solid #e2e8f0;
          }
          .title {
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .subtitle {
            font-size: 13px;
            font-weight: 600;
            color: #64748b;
            margin: 4px 0 0 0;
          }
          .divider {
            border-top: 2px dashed #e2e8f0;
            margin: 20px 0;
          }
          .folio-section {
            background-color: #f0f9ff;
            border: 1px solid #e0f2fe;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
          }
          .folio-label {
            font-size: 10px;
            font-weight: 800;
            color: #0369a1;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
          }
          .folio-number {
            font-size: 32px;
            font-weight: 900;
            color: #0c4a6e;
            margin: 4px 0 0 0;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            margin-bottom: 24px;
          }
          .details-table tr {
            border-bottom: 1px solid #f1f5f9;
          }
          .details-table tr:last-child {
            border-bottom: none;
          }
          .details-table th, .details-table td {
            padding: 10px 0;
            vertical-align: top;
          }
          .details-table th {
            font-size: 11px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            width: 35%;
          }
          .details-table td {
            font-size: 13px;
            font-weight: 600;
            color: #334155;
            width: 65%;
          }
          .qr-section {
            background-color: #f8fafc;
            border-radius: 12px;
            border: 1px solid #f1f5f9;
            padding: 20px;
            display: inline-block;
            margin-bottom: 24px;
          }
          .qr-code {
            width: 140px;
            height: 140px;
            display: block;
            margin: 0 auto 12px auto;
          }
          .qr-text {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            max-width: 250px;
            margin: 0 auto;
            line-height: 1.4;
          }
          .footer-note {
            font-size: 10px;
            font-weight: 500;
            color: #94a3b8;
            line-height: 1.5;
            margin: 0;
          }
          .actions {
            margin-top: 24px;
            display: flex;
            gap: 12px;
            justify-content: center;
          }
          .btn {
            font-family: 'Outfit', sans-serif;
            font-size: 13px;
            font-weight: 800;
            padding: 10px 20px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.15s;
          }
          .btn-print {
            background-color: #059669;
            color: #ffffff;
          }
          .btn-print:hover {
            background-color: #047857;
          }
          .btn-close {
            background-color: #e2e8f0;
            color: #475569;
          }
          .btn-close:hover {
            background-color: #cbd5e1;
          }
          @media print {
            body {
              background-color: #ffffff;
              padding: 0;
              display: block;
            }
            .ticket-container {
              border: none;
              box-shadow: none;
              padding: 0;
              margin: 0 auto;
              max-width: 100%;
            }
            .actions {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <div class="ticket-header">
            <img src="/icons/icon-192x192.png" alt="Jalapa Reporta Logo" class="logo" />
            <h1 class="title">Jalapa Reporta</h1>
            <p class="subtitle">H. Ayuntamiento de Jalapa, Tabasco</p>
          </div>
          
          <div class="divider"></div>
          
          <div class="folio-section">
            <p class="folio-label">Comprobante de Reporte</p>
            <h2 class="folio-number">Folio #${report.folio}</h2>
          </div>
          
          <table class="details-table">
            <tr>
              <th>Fecha</th>
              <td>${fecha}</td>
            </tr>
            <tr>
              <th>Categoría</th>
              <td>${cat.label}</td>
            </tr>
            <tr>
              <th>Comunidad</th>
              <td>${report.localidades?.nombre || 'No especificada'}</td>
            </tr>
            ${report.ubicacion_texto ? `
            <tr>
              <th>Referencias</th>
              <td>${report.ubicacion_texto}</td>
            </tr>
            ` : ''}
            ${report.latitud && report.longitud ? `
            <tr>
              <th>Coordenadas</th>
              <td>${report.latitud.toFixed(6)}, ${report.longitud.toFixed(6)}</td>
            </tr>
            ` : ''}
          </table>
          
          <div class="divider"></div>
          
          <div class="qr-section">
            <img src="${qrUrl}" alt="Código QR de Seguimiento" class="qr-code" />
            <p class="qr-text">
              Escanea este código con la cámara de tu celular para consultar el avance de tu reporte en cualquier momento.
            </p>
          </div>
          
          <p class="footer-note">
            Este es un comprobante digital oficial emitido por la plataforma Jalapa Reporta. Agradecemos tu participación para mejorar nuestro municipio.
          </p>
          
          <div class="actions no-print">
            <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
            <button class="btn btn-close" onclick="window.close()">Cerrar</button>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-md hover:shadow-lg transition-shadow flex flex-col md:flex-row animate-fade-in">
      
      {/* Imagen del reporte */}
      {report.foto_url && (
        <div className="relative w-full md:w-44 h-48 md:h-auto shrink-0 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100">
          <img 
            src={report.foto_url} 
            alt={cat.label} 
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
            loading="lazy"
            onClick={() => onAmpliarFoto(report.foto_url)}
          />
        </div>
      )}

      {/* Contenido del reporte */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          
          {/* Fila superior: Categoría y Estado */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-lg font-extrabold text-gray-900 flex items-center gap-1">
              <span>{cat.icon}</span> {cat.label}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-black border ${est.bg}`}>
              {est.label}
            </span>
          </div>

          {/* Localidad y Fecha */}
          <div className="text-xs text-gray-500 font-bold flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-blue-600">🏘️ {report.localidades?.nombre || 'Comunidad Desconocida'}</span>
            <span>•</span>
            <span>📅 {fecha}</span>
            <span>•</span>
            <span className="text-gray-400">Folio: #{report.folio}</span>
          </div>

          {/* Detalles colapsables */}
          {expandido && (
            <div className="space-y-3 pt-2 animate-fade-in">
              {/* Descripción o Referencias */}
              {report.ubicacion_texto && (
                <div className="space-y-1">
                  <span className="block font-black text-[10px] text-gray-400 uppercase tracking-wider">📍 Referencias / Dirección:</span>
                  <p className="text-sm text-gray-700 bg-gray-50/70 p-3 rounded-xl border border-gray-100 font-semibold italic">
                    "{report.ubicacion_texto}"
                  </p>
                </div>
              )}

              {/* Audio explicativo de nota de voz */}
              {report.audio_url && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1 shrink-0">🎙️ Nota de Voz:</span>
                  <audio src={report.audio_url} controls className="w-full h-8 max-w-[280px]" />
                </div>
              )}

              {/* Respuesta oficial de atención */}
              {report.respuesta_ayuntamiento && (
                <div className="text-sm bg-emerald-50 text-emerald-950 p-3.5 rounded-xl border border-emerald-100 space-y-1">
                  <span className="block font-black text-xs text-emerald-800 uppercase tracking-wider">💬 Respuesta Oficial:</span>
                  <p className="font-semibold text-gray-800">{report.respuesta_ayuntamiento}</p>
                </div>
              )}

              {/* Enlace de GPS */}
              <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs">
                {report.latitud && report.longitud ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${report.latitud},${report.longitud}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-black flex items-center gap-1 active:scale-95 transition-all"
                  >
                    🗺️ Ver Ubicación en Google Maps ↗
                  </a>
                ) : (
                  <span className="text-gray-400 font-bold">📍 Sin GPS registrado</span>
                )}

                {report.respuesta_ayuntamiento && (
                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                    ✅ Con respuesta oficial
                  </span>
                )}
              </div>

              {/* Código QR de Seguimiento (Punto 5) */}
              {report.folio && (
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/reportes?folio=${report.folio}` : '')}`} 
                    alt="Código QR de Seguimiento" 
                    className="w-16 h-16 rounded-lg bg-white p-1 border border-gray-250 shrink-0" 
                  />
                  <div>
                    <span className="block font-black text-[9px] text-gray-400 uppercase tracking-wider">Código QR de Seguimiento:</span>
                    <p className="text-[10px] text-gray-650 font-bold leading-normal">
                      Escanea este código con otro celular para ver o compartir este reporte instantáneamente.
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const trackingUrl = `${window.location.origin}/reportes?folio=${report.folio}`;
                          navigator.clipboard.writeText(trackingUrl);
                          alert('¡Enlace de seguimiento copiado al portapapeles!');
                        }}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-extrabold flex items-center gap-1 active:scale-95 transition-all"
                      >
                        📋 Copiar enlace
                      </button>
                      <span className="text-[10px] text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={imprimirComprobante}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-extrabold flex items-center gap-1 active:scale-95 transition-all"
                      >
                        🖨️ Imprimir Comprobante
                      </button>
                      <span className="text-[10px] text-gray-300">|</span>
                      {suscritoPush ? (
                        <span className="text-[10px] text-emerald-700 font-black flex items-center gap-0.5 animate-fade-in">
                          🔔 Suscrito
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={suscribiendoPush}
                          onClick={async () => {
                            setSuscribiendoPush(true);
                            const res = await suscribirAPush(report.id, report.folio);
                            setSuscribiendoPush(false);
                            if (res.success) {
                              setSuscritoPush(true);
                              alert('🔔 ¡Notificaciones activadas! Recibirás una alerta en este dispositivo cuando cambie el estado de este reporte.');
                            } else {
                              alert(`⚠️ No se pudieron activar las notificaciones: ${res.error}`);
                            }
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-700 font-extrabold flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {suscribiendoPush ? '🔄 Activando...' : '🔔 Recibir Notificaciones'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sección de Comentarios de la Comunidad */}
              <ComentariosSection
                reporteId={report.id}
                userSession={userSession}
                onLogin={onLogin}
              />
            </div>
          )}

        </div>

        {/* Botón de expandir/colapsar — siempre visible para acceder a comentarios */}
        <button
          type="button"
          onClick={() => setExpandido(!expandido)}
          className="w-full py-2 px-3 border border-gray-150 rounded-xl text-xs font-black text-blue-600 bg-blue-50/20 hover:bg-blue-50 hover:text-blue-700 transition-all active:scale-98 flex items-center justify-center gap-1.5 mt-4"
        >
          <span>{expandido ? '🔼 Ocultar' : '🔽 Ver Detalles y Comentarios'}</span>
          {!expandido && report.respuesta_ayuntamiento && (
            <span className="bg-emerald-600 text-white rounded-full w-2 h-2 animate-pulse" title="Tiene respuesta oficial"></span>
          )}
          {!expandido && report.audio_url && (
            <span className="text-[10px]" title="Contiene nota de voz">🎙️</span>
          )}
        </button>

      </div>

    </div>
  );
}

// ─── Componente de Comentarios con Google OAuth ───────────────────────────────
function ComentariosSection({ reporteId, userSession, onLogin }) {
  const [comentarios, setComentarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [textoEdicion, setTextoEdicion] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const esAdmin = userSession?.user?.email?.endsWith('@jalapa.gob.mx');
  const userId = userSession?.user?.id;

  useEffect(() => {
    if (!reporteId) return;
    const cargar = async () => {
      setCargando(true);
      const { data } = await supabase
        .from('comentarios')
        .select('id, user_id, user_name, user_avatar, contenido, creado_at')
        .eq('reporte_id', reporteId)
        .order('creado_at', { ascending: true });
      setComentarios(data || []);
      setCargando(false);
    };
    cargar();
  }, [reporteId]);

  const enviarComentario = async () => {
    if (!texto.trim() || !userSession || enviando) return;
    setEnviando(true);
    setErrorMsg('');
    const user = userSession.user;
    const { data, error } = await supabase
      .from('comentarios')
      .insert({
        reporte_id: reporteId,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Ciudadano',
        user_avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        contenido: texto.trim()
      })
      .select('id, user_id, user_name, user_avatar, contenido, creado_at')
      .single();
    if (!error && data) {
      setComentarios(prev => [...prev, data]);
      setTexto('');
    } else {
      setErrorMsg('No se pudo enviar el comentario. Intenta de nuevo.');
    }
    setEnviando(false);
  };

  const iniciarEdicion = (c) => {
    setEditandoId(c.id);
    setTextoEdicion(c.contenido);
    setErrorMsg('');
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setTextoEdicion('');
  };

  const guardarEdicion = async () => {
    if (!textoEdicion.trim() || !editandoId || guardandoEdicion) return;
    setGuardandoEdicion(true);
    setErrorMsg('');
    const { data, error } = await supabase
      .from('comentarios')
      .update({ contenido: textoEdicion.trim() })
      .eq('id', editandoId)
      .select('id, user_id, user_name, user_avatar, contenido, creado_at')
      .single();
    if (!error && data) {
      setComentarios(prev => prev.map(c => c.id === editandoId ? data : c));
      setEditandoId(null);
      setTextoEdicion('');
    } else {
      setErrorMsg('No se pudo guardar la edición. Intenta de nuevo.');
    }
    setGuardandoEdicion(false);
  };

  const eliminarComentario = async (id) => {
    if (!window.confirm('¿Eliminar este comentario? Esta acción no se puede deshacer.')) return;
    const { error } = await supabase.from('comentarios').delete().eq('id', id);
    if (!error) {
      setComentarios(prev => prev.filter(c => c.id !== id));
    } else {
      setErrorMsg('No se pudo eliminar el comentario. Intenta de nuevo.');
    }
  };

  const GOOGLE_SVG = (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  const avatar = (nombre, url, size = 'w-7 h-7') => url
    ? <img src={url} alt={nombre} className={`${size} rounded-full border border-gray-200 shrink-0 object-cover`} />
    : <div className={`${size} rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0`}>
        <span className="text-[11px] font-black text-white">{(nombre || '?')[0].toUpperCase()}</span>
      </div>;

  return (
    <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
      <span className="block font-black text-[10px] text-gray-400 uppercase tracking-wider">
        💬 Comentarios de la Comunidad ({cargando ? '…' : comentarios.length})
      </span>

      {/* Lista de comentarios */}
      {cargando ? (
        <p className="text-xs text-gray-400 font-semibold animate-pulse">Cargando comentarios…</p>
      ) : comentarios.length === 0 ? (
        <p className="text-xs text-gray-400 font-semibold italic">Aún no hay comentarios. ¡Sé el primero!</p>
      ) : (
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-0.5">
          {comentarios.map(c => {
            const esMio = userId && c.user_id === userId;
            const puedeEditar = esMio;
            const puedeBorrar = esMio || esAdmin;
            const estandoEditando = editandoId === c.id;

            return (
              <div key={c.id} className="flex items-start gap-2 group">
                {avatar(c.user_name, c.user_avatar)}
                <div className="flex-1 min-w-0">
                  {estandoEditando ? (
                    /* Modo edición inline */
                    <div className="bg-blue-50 rounded-xl px-3 py-2 border-2 border-blue-200">
                      <textarea
                        value={textoEdicion}
                        onChange={e => setTextoEdicion(e.target.value.slice(0, 500))}
                        rows={2}
                        autoFocus
                        className="w-full bg-transparent outline-none text-xs font-semibold text-gray-700 resize-none placeholder-gray-400"
                        onKeyDown={e => { if (e.key === 'Escape') cancelarEdicion(); }}
                      />
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-[9px] font-bold ${textoEdicion.length > 450 ? 'text-amber-500' : 'text-gray-400'}`}>
                          {textoEdicion.length}/500
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={cancelarEdicion}
                            className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-black transition-all active:scale-95"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={guardarEdicion}
                            disabled={!textoEdicion.trim() || guardandoEdicion}
                            className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black disabled:opacity-40 transition-all active:scale-95"
                          >
                            {guardandoEdicion ? '⏳' : '✅ Guardar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Modo visualización */
                    <div className="flex-1 bg-gray-50/80 rounded-xl px-3 py-2 border border-gray-100 relative">
                      <div className="flex items-baseline justify-between gap-1 flex-wrap mb-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-black text-gray-700 truncate">{c.user_name}</span>
                          {esAdmin && !esMio && (
                            <span className="text-[8px] bg-amber-100 text-amber-700 font-black px-1 rounded uppercase tracking-wide">otro</span>
                          )}
                          {esMio && (
                            <span className="text-[8px] bg-blue-100 text-blue-700 font-black px-1 rounded uppercase tracking-wide">tú</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] text-gray-400 font-semibold">
                            {new Date(c.creado_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {/* Botones acción — aparecen al pasar el mouse */}
                          {(puedeEditar || puedeBorrar) && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {puedeEditar && (
                                <button
                                  type="button"
                                  onClick={() => iniciarEdicion(c)}
                                  title="Editar comentario"
                                  className="w-5 h-5 flex items-center justify-center rounded bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] transition-all active:scale-95"
                                >
                                  ✏️
                                </button>
                              )}
                              {puedeBorrar && (
                                <button
                                  type="button"
                                  onClick={() => eliminarComentario(c.id)}
                                  title={esAdmin && !esMio ? 'Eliminar como admin' : 'Eliminar comentario'}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-rose-50 hover:bg-rose-100 text-rose-500 text-[10px] transition-all active:scale-95"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 font-medium leading-relaxed">{c.contenido}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {errorMsg && (
        <p className="text-[11px] text-rose-600 font-bold bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">{errorMsg}</p>
      )}

      {/* Formulario o botón de login */}
      {userSession ? (
        <div className="flex items-start gap-2 pt-1">
          {avatar(
            userSession.user?.email || '?',
            userSession.user?.user_metadata?.avatar_url || userSession.user?.user_metadata?.picture
          )}
          <div className="flex-1">
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value.slice(0, 500))}
              placeholder="Escribe tu comentario… (Enter para enviar)"
              rows={2}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs font-semibold resize-none placeholder-gray-400 transition-all"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarComentario(); } }}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-[9px] font-bold ${texto.length > 450 ? 'text-amber-500' : 'text-gray-400'}`}>
                {texto.length}/500
              </span>
              <button
                type="button"
                onClick={enviarComentario}
                disabled={!texto.trim() || enviando}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black disabled:opacity-40 transition-all active:scale-95 flex items-center gap-1"
              >
                {enviando ? '⏳' : '💬 Comentar'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onLogin}
          className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs font-bold text-gray-600 group"
        >
          {GOOGLE_SVG}
          <span className="group-hover:text-blue-600 transition-colors">Inicia sesión con Google para comentar</span>
        </button>
      )}
    </div>
  );
}

export default function ReportesClient({ initialReportes = [] }) {
  // Estado de sesión de Google OAuth (comentarios)
  const [userSession, setUserSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUserSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const loginConGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? window.location.href : undefined }
    });
  };

  const logoutGoogle = async () => {
    await supabase.auth.signOut();
    setUserSession(null);
  };

  // Estados de los Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('recientes'); // 'recientes' (más nuevos), 'antiguos' (más antiguos)
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  // Leer parámetro 'folio' de la URL para pre-filtrar la búsqueda al cargar la página (Punto 5)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const folioParam = params.get('folio');
      if (folioParam) {
        setBusqueda(folioParam);
      }
    }
  }, []);

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltroCategoria('todos');
    setFiltroEstado('todos');
    setFiltroFechaInicio('');
    setFiltroFechaFin('');
    setBusqueda('');
    setOrden('recientes');
  };

  // Validar si el rango de fechas es lógico
  const fechaRangoValido = !filtroFechaInicio || !filtroFechaFin || (filtroFechaInicio <= filtroFechaFin);

  // Calcular estadísticas públicas basadas en todo el histórico (initialReportes) (Punto 4)
  const totalReportes = initialReportes.length;
  const resueltosCount = initialReportes.filter((r) => r.estado === 'resuelto').length;
  const enProcesoCount = initialReportes.filter((r) => r.estado === 'en_proceso').length;
  const pendientesCount = initialReportes.filter((r) => r.estado === 'pendiente').length;
  const activosCount = enProcesoCount + pendientesCount;

  const porcentajeResolucion = totalReportes > 0 
    ? Math.round((resueltosCount / totalReportes) * 100) 
    : 0;

  // Determinar la categoría con mayor número de reportes
  const conteoCategorias = initialReportes.reduce((acc, curr) => {
    acc[curr.categoria] = (acc[curr.categoria] || 0) + 1;
    return acc;
  }, {});
  
  let categoriaMasComun = 'otro';
  let maxCategoriaCount = 0;
  Object.entries(conteoCategorias).forEach(([cat, count]) => {
    if (count > maxCategoriaCount) {
      maxCategoriaCount = count;
      categoriaMasComun = cat;
    }
  });
  const catMasComunInfo = totalReportes > 0 && maxCategoriaCount > 0
    ? (CATEGORIAS[categoriaMasComun] || { label: 'Ninguno', icon: '📋' })
    : { label: 'Ninguno', icon: '📋' };

  // Filtrado y ordenamiento de los reportes
  const reportesFiltrados = initialReportes
    .filter((report) => {
      // 1. Filtro por Categoría
      const cumpleCategoria = filtroCategoria === 'todos' || report.categoria === filtroCategoria;

      // 2. Filtro por Estado (Estatus)
      const cumpleEstado = filtroEstado === 'todos' || report.estado === filtroEstado;

      // 3. Filtro por Búsqueda (Folio, localidad o referencias)
      const cumpleBusqueda = !busqueda || 
        report.folio.toString().includes(busqueda) ||
        (report.ubicacion_texto || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (report.localidades?.nombre || '').toLowerCase().includes(busqueda.toLowerCase());

      // 4. Filtro por Rango de Fechas (en huso horario local)
      let cumpleFecha = true;
      if (fechaRangoValido && (filtroFechaInicio || filtroFechaFin)) {
        const dateObj = new Date(report.creado_at);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const fechaReporte = `${year}-${month}-${day}`;

        if (filtroFechaInicio && fechaReporte < filtroFechaInicio) {
          cumpleFecha = false;
        }
        if (filtroFechaFin && fechaReporte > filtroFechaFin) {
          cumpleFecha = false;
        }
      }

      return cumpleCategoria && cumpleEstado && cumpleBusqueda && cumpleFecha;
    })
    .sort((a, b) => {
      // 5. Ordenamiento dinámico en el cliente
      const dateA = new Date(a.creado_at).getTime();
      const dateB = new Date(b.creado_at).getTime();
      return orden === 'recientes' ? dateB - dateA : dateA - dateB;
    });

  // Función para exportar a Excel (CSV con UTF-8 BOM para soporte total de acentos)
  const exportarAExcel = (listado, nombreArchivo) => {
    const headers = [
      'Folio',
      'Fecha de Reporte',
      'Categoría',
      'Comunidad / Localidad',
      'Referencias de Ubicación',
      'Estatus',
      'Respuesta Oficial del Ayuntamiento',
      'Latitud',
      'Longitud',
      'Enlace Google Maps'
    ];

    const rows = listado.map((r) => {
      const cat = CATEGORIAS[r.categoria] || { label: r.categoria };
      const est = ESTADOS[r.estado] || { label: r.estado };
      const fecha = new Date(r.creado_at).toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return [
        r.folio,
        fecha,
        cat.label,
        r.localidades?.nombre || 'Desconocida',
        r.ubicacion_texto || '',
        est.label,
        r.respuesta_ayuntamiento || '',
        r.latitud || '',
        r.longitud || '',
        r.latitud && r.longitud ? `https://www.google.com/maps/search/?api=1&query=${r.latitud},${r.longitud}` : ''
      ];
    });

    // Formatear CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const text = String(val).trim();
        // Duplicar comillas dobles y envolver la cadena si tiene comas, saltos o comillas
        if (text.includes(',') || text.includes('\n') || text.includes('\r') || text.includes('"')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      }).join(','))
    ].join('\r\n');

    // BOM UTF-8 para garantizar que Excel abra el CSV sin problemas de acentos/eñes
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const fechaHoy = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `${nombreArchivo}_${fechaHoy}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtrosModificados = filtroCategoria !== 'todos' || 
                              filtroEstado !== 'todos' || 
                              filtroFechaInicio !== '' || 
                              filtroFechaFin !== '' || 
                              busqueda !== '' ||
                              orden !== 'recientes';

  // Contar cantidad de filtros avanzados modificados (Punto 5)
  let cantFiltrosActivos = 0;
  if (filtroCategoria !== 'todos') cantFiltrosActivos++;
  if (filtroEstado !== 'todos') cantFiltrosActivos++;
  if (filtroFechaInicio !== '' || filtroFechaFin !== '') cantFiltrosActivos++;

  return (
    <div className="w-full max-w-2xl mx-auto px-2 pb-12">
      
      {/* Barra de Navegación superior */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2.5">
          <Link href="/" title="Volver al inicio" className="shrink-0 active:scale-95 transition-all">
            <img src="/icons/icon-192x192.png" alt="Logo" className="w-12 h-12 rounded-xl shadow-sm border border-gray-100 object-cover bg-white" />
          </Link>
          <div>
            <h2 className="text-2xl font-black text-gray-900 leading-tight">Pizarrón de Reportes</h2>
            <p className="text-xs text-gray-500 font-bold">Portal ciudadano de transparencia y seguimiento</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Botón Google OAuth */}
          {userSession ? (
            <div className="flex items-center gap-2">
              {(userSession.user?.user_metadata?.avatar_url || userSession.user?.user_metadata?.picture) && (
                <img
                  src={userSession.user.user_metadata.avatar_url || userSession.user.user_metadata.picture}
                  alt="Tu foto"
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm object-cover"
                  title={userSession.user.user_metadata?.full_name || userSession.user.email}
                />
              )}
              <button
                onClick={logoutGoogle}
                className="text-xs font-black text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-all active:scale-95 border border-gray-200"
              >
                Salir 👋
              </button>
            </div>
          ) : (
            <button
              onClick={loginConGoogle}
              title="Inicia sesión para comentar reportes"
              className="text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
          )}
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-sm transition-all active:scale-95 shadow-md shadow-blue-100 flex items-center gap-1.5"
          >
            <span>✍️</span> Nuevo Reporte
          </Link>
        </div>
      </div>

      {/* Tarjetas de Estadísticas Públicas (Punto 4) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        
        {/* Tarjeta 1: Total de Reportes */}
        <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/60 border border-blue-100 rounded-2xl p-4.5 shadow-sm transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between min-h-[105px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-indigo-700/80 uppercase tracking-wider">Reportes Totales</span>
            <span className="text-lg filter drop-shadow-xs">📋</span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-indigo-950 tracking-tight leading-none mt-2">{totalReportes}</h3>
            <p className="text-[10px] text-indigo-650/80 font-bold mt-1">Folios ciudadanos</p>
          </div>
        </div>

        {/* Tarjeta 2: Tasa de Resolución */}
        <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/60 border border-emerald-100 rounded-2xl p-4.5 shadow-sm transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between min-h-[105px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-emerald-750 uppercase tracking-wider">Resueltos</span>
            <span className="text-lg filter drop-shadow-xs">✅</span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-emerald-950 tracking-tight leading-none mt-2">{porcentajeResolucion}%</h3>
            <p className="text-[10px] text-emerald-700/80 font-bold mt-1">{resueltosCount} reportes atendidos</p>
          </div>
        </div>

        {/* Tarjeta 3: Casos Activos (En Proceso y Pendientes) */}
        <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-amber-100 rounded-2xl p-4.5 shadow-sm transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between min-h-[105px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-amber-750 uppercase tracking-wider">Por Atender</span>
            <span className="text-lg filter drop-shadow-xs">🛠️</span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-amber-950 tracking-tight leading-none mt-2">{activosCount}</h3>
            <p className="text-[10px] text-amber-700/80 font-bold mt-1">{enProcesoCount} en proceso, {pendientesCount} pend.</p>
          </div>
        </div>

        {/* Tarjeta 4: Categoría con Mayor Incidencia */}
        <div className="bg-gradient-to-br from-rose-50/60 to-pink-50/60 border border-rose-100 rounded-2xl p-4.5 shadow-sm transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between min-h-[105px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-rose-750 uppercase tracking-wider">Mayor Queja</span>
            <span className="text-lg filter drop-shadow-xs">🔥</span>
          </div>
          <div className="truncate">
            <h3 className="text-sm font-black text-rose-950 tracking-tight leading-none mt-2 flex items-center gap-1 truncate" title={catMasComunInfo.label}>
              <span>{catMasComunInfo.icon}</span>
              <span className="truncate">{catMasComunInfo.label}</span>
            </h3>
            <p className="text-[10px] text-rose-700/80 font-bold mt-1">
              {totalReportes > 0 && maxCategoriaCount > 0 ? `${maxCategoriaCount} reportes` : 'Sin reportes'}
            </p>
          </div>
        </div>

      </div>

      {/* Panel de Filtros Interactivos Visuales */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-md mb-6 space-y-5">
        
        {/* Cabecera del Panel de Filtros */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <span className="text-sm font-black text-gray-800 flex items-center gap-1.5">
            <span>🔍</span> Buscar y Filtrar Reportes
          </span>
          {filtrosModificados && (
            <button 
              onClick={limpiarFiltros}
              className="text-xs text-blue-600 hover:text-blue-700 font-black active:scale-95 transition-all bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100"
            >
              Restablecer Filtros ⟳
            </button>
          )}
        </div>

        {/* Buscador de Texto General */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar por folio, calle de referencia o comunidad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-xs font-bold text-gray-700 bg-gray-50/20"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Fila de Control para filtros colapsables (Punto 5) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
            className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-xs font-black text-gray-650 bg-gray-50/50 hover:bg-gray-100/50 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <span>{mostrarFiltrosAvanzados ? '🔼 Ocultar Filtros Avanzados' : '⚙️ Mostrar Filtros Avanzados'}</span>
            {cantFiltrosActivos > 0 && (
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black animate-pulse">
                {cantFiltrosActivos}
              </span>
            )}
          </button>
          
          <div className="text-xs text-gray-400 font-bold text-center sm:text-right shrink-0">
            Mostrando {reportesFiltrados.length} de {initialReportes.length} reportes
          </div>
        </div>

        {/* Sección de Filtros Avanzados Colapsables (Punto 5) */}
        {mostrarFiltrosAvanzados && (
          <div className="space-y-5 pt-3 border-t border-gray-100 animate-fade-in">
            {/* Categorías Visuales (Chips/Píldoras) */}
            <div className="space-y-2">
              <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Filtrar por Categoría:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFiltroCategoria('todos')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center gap-1 ${
                    filtroCategoria === 'todos'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-black'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100/70'
                  }`}
                >
                  📋 Todos
                </button>
                {Object.entries(CATEGORIAS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setFiltroCategoria(key)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center gap-1.5 ${
                      filtroCategoria === key
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-black'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100/70'
                    }`}
                  >
                    <span>{val.icon}</span>
                    <span>{val.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Estatus Visuales (Chips/Píldoras) */}
            <div className="space-y-2">
              <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Filtrar por Estatus del Reporte:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFiltroEstado('todos')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    filtroEstado === 'todos'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-black'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100/70'
                  }`}
                >
                  Todos los estatus
                </button>
                {Object.entries(ESTADOS).map(([key, val]) => {
                  const activo = filtroEstado === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setFiltroEstado(key)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                        activo
                          ? `${val.bg} border-blue-600 font-black ring-2 ring-blue-100`
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100/70'
                      }`}
                    >
                      {val.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rango de Fechas + Ordenamiento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Inputs de Rango de Fechas */}
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Rango de Fecha de Creación:</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="date"
                    value={filtroFechaInicio}
                    max={filtroFechaFin || undefined}
                    onChange={(e) => setFiltroFechaInicio(e.target.value)}
                    className={`w-full p-2.5 border-2 rounded-xl focus:border-blue-500 outline-none text-xs font-bold text-gray-700 ${
                      !fechaRangoValido ? 'border-rose-300 bg-rose-50/55' : 'border-gray-200 bg-gray-50/50'
                    }`}
                  />
                  <span className="text-gray-400 text-xs font-bold">a</span>
                  <input 
                    type="date"
                    value={filtroFechaFin}
                    min={filtroFechaInicio || undefined}
                    onChange={(e) => setFiltroFechaFin(e.target.value)}
                    className={`w-full p-2.5 border-2 rounded-xl focus:border-blue-500 outline-none text-xs font-bold text-gray-700 ${
                      !fechaRangoValido ? 'border-rose-300 bg-rose-50/55' : 'border-gray-200 bg-gray-50/50'
                    }`}
                  />
                </div>
                
                {/* Mensaje de Error de Rango de Fecha */}
                {!fechaRangoValido && (
                  <div className="text-[11px] text-rose-700 font-black bg-rose-50 border border-rose-100 p-2 rounded-lg flex items-center gap-1">
                    <span>⚠️</span> La fecha de inicio debe ser menor o igual a la fecha final.
                  </div>
                )}
              </div>

              {/* Selector de Orden */}
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Orden del listado:</span>
                <div className="bg-gray-100/80 p-1 rounded-xl flex gap-1 w-full h-[41px] items-center">
                  <button
                    type="button"
                    onClick={() => setOrden('recientes')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95 ${
                      orden === 'recientes'
                        ? 'bg-white text-gray-950 shadow-sm border border-gray-200/50'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    ⏰ Más Nuevos
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrden('antiguos')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95 ${
                      orden === 'antiguos'
                        ? 'bg-white text-gray-950 shadow-sm border border-gray-200/50'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    ⏳ Más Antiguos
                  </button>
                </div>
              </div>

            </div>

            {/* Acciones de Exportar Excel — solo visible para admins del ayuntamiento */}
            {userSession?.user?.email?.endsWith('@jalapa.gob.mx') && (
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">🔐 Admin:</span>
                <button
                  type="button"
                  onClick={() => exportarAExcel(reportesFiltrados, 'reportes_filtrados')}
                  disabled={reportesFiltrados.length === 0}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 border ${
                    reportesFiltrados.length === 0
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-md shadow-emerald-50'
                  }`}
                >
                  <span>📊</span> Descargar Excel (Filtrados)
                </button>
                <button
                  type="button"
                  onClick={() => exportarAExcel(initialReportes, 'todos_los_reportes')}
                  disabled={initialReportes.length === 0}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 border ${
                    initialReportes.length === 0
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed shadow-none'
                      : 'bg-emerald-750 hover:bg-emerald-800 text-white border-emerald-800 shadow-md shadow-emerald-50'
                  }`}
                >
                  <span>📥</span> Descargar Excel (Todos)
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Resultados de la búsqueda */}
      {reportesFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-md">
          <span className="text-5xl">🔎</span>
          <h3 className="text-lg font-bold text-gray-800 mt-4">No se encontraron reportes</h3>
          <p className="text-gray-500 text-sm mt-1">Prueba cambiando tus filtros de búsqueda arriba.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reportesFiltrados.map((report) => (
            <ReporteCard
              key={report.id}
              report={report}
              onAmpliarFoto={setFotoAmpliada}
              userSession={userSession}
              onLogin={loginConGoogle}
            />
          ))}
        </div>
      )}

      {/* Modal para ver la imagen completa */}
      {fotoAmpliada && (
        <div 
          className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4 backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setFotoAmpliada(null)}
        >
          <button 
            onClick={() => setFotoAmpliada(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 active:scale-95 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-xl border border-white/20 transition-all"
            aria-label="Cerrar vista completa"
          >
            ✕
          </button>
          <div 
            className="relative max-w-full max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()} // Evitar cerrar al hacer clic en la imagen
          >
            <img 
              src={fotoAmpliada} 
              alt="Visualización completa del reporte" 
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
      {/* Pie de Página */}
      <footer className="mt-12 text-center text-xs text-gray-400 font-semibold pb-8 flex flex-col items-center gap-2 border-t border-gray-100 pt-6">
        <p>Plataforma Ciudadana Digital</p>
        <Link href="/admin" title="Panel de Administración" className="text-gray-300 hover:text-blue-500 hover:underline flex items-center gap-1 transition-all active:scale-95 py-1 px-2 rounded bg-gray-100/30 border border-gray-100/10">
          <span>🔐</span> Acceso Ayuntamiento
        </Link>
      </footer>
    </div>
  );
}

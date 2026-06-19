'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import ComentariosSection from '@/components/ComentariosSection';

const ESTADOS = [
  { id: 'pendiente', label: 'Pendiente', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'en_proceso', label: 'En Proceso', color: 'bg-blue-100 text-blue-900 border-blue-300' },
  { id: 'resuelto', label: 'Resuelto', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { id: 'rechazado', label: 'Rechazado', color: 'bg-gray-100 text-gray-900 border-gray-300' }
];

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Estados de Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Estados del Dashboard
  const [reportes, setReportes] = useState([]);
  const [localidades, setLocalidades] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroLocalidad, setFiltroLocalidad] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  // Estado de edición/actualización de reporte
  const [actualizandoId, setActualizandoId] = useState(null);
  const [mensajeUpdate, setMensajeUpdate] = useState({ id: null, tipo: '', texto: '' });
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  // Función para exportar a Excel (CSV con UTF-8 BOM)
  const exportarAExcel = (listado, nombreArchivo) => {
    const CATEGORIAS_MAP = {
      bache: 'Bache o Hoyo',
      luminaria: 'Luz Fundida',
      basura: 'Basura o Basurero',
      fuga_agua: 'Fuga de Agua',
      camino_rural: 'Camino Feo',
      drenaje: 'Drenaje Tapado',
      otro: 'Otro Problema'
    };

    const ESTADOS_MAP = {
      pendiente: 'Pendiente',
      en_proceso: 'En Proceso',
      resuelto: 'Resuelto',
      rechazado: 'Rechazado'
    };

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
      const catLabel = CATEGORIAS_MAP[r.categoria] || r.categoria;
      const estLabel = ESTADOS_MAP[r.estado] || r.estado;
      const locNombre = localidades[r.localidad_id] || 'Comunidad Desconocida';
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
        catLabel,
        locNombre,
        r.ubicacion_texto || '',
        estLabel,
        r.respuesta_ayuntamiento || '',
        r.latitud || '',
        r.longitud || '',
        r.latitud && r.longitud ? `https://www.google.com/maps/search/?api=1&query=${r.latitud},${r.longitud}` : ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const text = String(val).trim();
        if (text.includes(',') || text.includes('\n') || text.includes('\r') || text.includes('"')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      }).join(','))
    ].join('\r\n');

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

  // 1. Manejo de la Sesión de Supabase de forma robusta (evita spinner infinito)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (err) {
        console.error('Error al comprobar sesión de Supabase:', err);
      } finally {
        setLoadingSession(false);
      }
    };

    checkSession();

    let subscription;
    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });
      subscription = sub;
    } catch (err) {
      console.error('Error en listener de cambio de autenticación:', err);
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch de datos (Reportes y Localidades)
  const fetchReportes = useCallback(async () => {
    setLoadingData(true);
    try {
      // Obtener localidades primero para mapear los nombres
      const { data: locData, error: locError } = await supabase
        .from('localidades')
        .select('id, nombre');

      if (locError) throw locError;

      const locMap = {};
      locData.forEach(l => { locMap[l.id] = l.nombre; });
      setLocalidades(locMap);

      // Obtener reportes
      const { data: repData, error: repError } = await supabase
        .from('reportes')
        .select('*, comentarios(count)')
        .order('creado_at', { ascending: false });

      if (repError) throw repError;
      setReportes(repData || []);
    } catch (err) {
      console.error('Error al cargar datos del panel:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchReportes();
    }
  }, [session, fetchReportes]);

  // 3. Inicio de Sesión
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoggingIn(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      console.error('Error de autenticación:', err);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NO CONFIGURADO';
      setAuthError(`${err.message} | URL: ${supabaseUrl.substring(0, 30)}...`);
    } finally {
      setLoggingIn(false);
    }
  };

  // 4. Cerrar Sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setReportes([]);
  };

  // 5. Actualizar Estado de Reporte en Supabase
  const handleUpdateReporte = async (id, nuevoEstado, respuestaText) => {
    setActualizandoId(id);
    setMensajeUpdate({ id, tipo: 'info', texto: 'Guardando cambios...' });

    try {
      const { error } = await supabase
        .from('reportes')
        .update({ 
          estado: nuevoEstado, 
          respuesta_ayuntamiento: respuestaText,
          actualizado_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setMensajeUpdate({ id, tipo: 'success', texto: '¡Cambios guardados con éxito!' });
      
      // Actualizar el estado en memoria
      setReportes(prev => prev.map(rep => 
        rep.id === id 
          ? { ...rep, estado: nuevoEstado, respuesta_ayuntamiento: respuestaText, actualizado_at: new Date().toISOString() }
          : rep
      ));

      // Disparar notificación push (Opción 6)
      try {
        fetch('/api/push/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reporteId: id,
            nuevoEstado,
            respuestaText
          })
        }).catch(err => console.error('Fallo asíncrono al disparar push:', err));
      } catch (pushErr) {
        console.error('Error al disparar notificación push:', pushErr);
      }

      setTimeout(() => {
        setMensajeUpdate({ id: null, tipo: '', texto: '' });
      }, 3000);

    } catch (err) {
      console.error('Error al actualizar reporte:', err);
      setMensajeUpdate({ id, tipo: 'error', texto: `Error: ${err.message || 'No se pudo actualizar el reporte'}` });
    } finally {
      setActualizandoId(null);
    }
  };

  // Función para eliminar un reporte por completo (incluye dependencias)
  const handleDeleteReporte = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este reporte de forma permanente? Esta acción borrará también todos los comentarios asociados y no se puede deshacer.')) {
      return;
    }

    try {
      // Eliminar dependencias manualmente para evitar fallos de clave foránea si no hay CASCADE
      await supabase.from('comentarios').delete().eq('reporte_id', id);
      await supabase.from('suscripciones_push').delete().eq('reporte_id', id);

      const { error } = await supabase
        .from('reportes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Actualizar el estado local
      setReportes(prev => prev.filter(rep => rep.id !== id));
      alert('Reporte eliminado correctamente.');
    } catch (err) {
      console.error('Error al eliminar reporte:', err);
      alert(`Error al eliminar el reporte: ${err.message || 'Error desconocido'}`);
    }
  };

  // 6. Filtrado y búsqueda
  const reportesFiltrados = reportes.filter(rep => {
    const cumpleEstado = filtroEstado === 'todos' || rep.estado === filtroEstado;
    const cumpleLocalidad = filtroLocalidad === 'todos' || rep.localidad_id?.toString() === filtroLocalidad;
    const locNombre = localidades[rep.localidad_id] || '';
    const cumpleBusqueda = 
      rep.folio.toString().includes(busqueda) ||
      locNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      rep.categoria.toLowerCase().includes(busqueda.toLowerCase());

    return cumpleEstado && cumpleLocalidad && cumpleBusqueda;
  });

  // Pantalla de Carga de Sesión
  if (loadingSession) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin text-3xl text-blue-600">⚙️</div>
      </div>
    );
  }

  // PANTALLA A: LOGIN (Si no está autenticado)
  if (!session) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-6 flex flex-col items-center">
          <Link href="/" title="Volver al inicio" className="active:scale-95 hover:opacity-90 transition-all">
            <img src="/icons/icon-512x512.png" alt="Jalapa Reporta Logo" className="w-20 h-20 rounded-2xl shadow-md mb-2 object-cover border border-gray-100" />
          </Link>
          <h2 className="text-2xl font-black text-gray-900 mt-2">Panel de Control</h2>
          <p className="text-sm text-gray-500 font-semibold mt-1">Exclusivo para personal autorizado</p>
        </div>

        {authError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-950 p-4 rounded-xl text-sm font-bold text-center mb-4">
            {authError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase">Correo Electrónico:</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@jalapa.gob.mx"
              className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-base font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase">Contraseña:</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-base font-semibold"
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-4 rounded-xl text-lg font-black text-white bg-blue-600 hover:bg-blue-700 transition active:scale-95 shadow-md shadow-blue-100 flex items-center justify-center"
          >
            {loggingIn ? 'Ingresando... 🔌' : 'INICIAR SESIÓN 🔑'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-400 font-semibold">
          Para pruebas, añade una cuenta en Supabase Dashboard {`>`} Authentication.
        </div>
      </div>
    );
  }

  // PANTALLA B: DASHBOARD (Si está autenticado)
  return (
    <div className="w-full max-w-4xl mx-auto pb-16">
      
      {/* Cabecera del Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white rounded-2xl p-6 mb-8 shadow-md">
        <div>
          <span className="text-xs font-black bg-blue-600 px-2.5 py-1 rounded-md tracking-wider">PANEL DE CONTROL</span>
          <h2 className="text-2xl font-black tracking-tight mt-1">Gestión de Reportes</h2>
          <p className="text-xs text-slate-400 font-semibold">{session.user.email}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all"
        >
          Cerrar Sesión 🚪
        </button>
      </div>

      {/* Controles de Filtros y Búsqueda */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 w-full">
          {/* Buscador */}
          <div className="flex-1 space-y-1">
            <label className="text-xs font-black text-gray-700 uppercase">Buscar reporte:</label>
            <input 
              type="text"
              placeholder="Buscar por folio, localidad o tipo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold"
            />
          </div>

          {/* Selector de Estado */}
          <div className="w-full md:w-64 space-y-1">
            <label className="text-xs font-black text-gray-700 uppercase">Filtrar por estado:</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none text-sm font-bold text-gray-700 bg-gray-50/50"
            >
              <option value="todos">Todos los reportes</option>
              <option value="pendiente">Pendientes</option>
              <option value="en_proceso">En Proceso</option>
              <option value="resuelto">Resueltos</option>
              <option value="rechazado">Rechazados</option>
            </select>
          </div>

          {/* Selector de Localidad */}
          <div className="w-full md:w-64 space-y-1">
            <label className="text-xs font-black text-gray-700 uppercase">Filtrar por localidad:</label>
            <select
              value={filtroLocalidad}
              onChange={(e) => setFiltroLocalidad(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none text-sm font-bold text-gray-700 bg-gray-50/50"
            >
              <option value="todos">Todas las localidades</option>
              {Object.entries(localidades).map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Botón de recarga rápida */}
          <button
            onClick={fetchReportes}
            disabled={loadingData}
            className="md:self-end py-3 px-5 border-2 border-blue-100 text-blue-600 hover:bg-blue-50 active:scale-95 rounded-xl font-bold text-sm transition-all"
          >
            {loadingData ? '🔄' : 'Recargar ⟳'}
          </button>
        </div>

        {/* Acciones del Reporte Excel en el Admin */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportarAExcel(reportesFiltrados, 'reportes_admin_filtrados')}
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
              onClick={() => exportarAExcel(reportes, 'todos_los_reportes_admin')}
              disabled={reportes.length === 0}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 border ${
                reportes.length === 0
                  ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed shadow-none'
                  : 'bg-emerald-750 hover:bg-emerald-800 text-white border-emerald-800 shadow-md shadow-emerald-50'
              }`}
            >
              <span>📥</span> Descargar Excel (Todos)
            </button>
          </div>

          <div className="text-xs text-gray-400 font-bold">
            Mostrando {reportesFiltrados.length} de {reportes.length} reportes
          </div>
        </div>
      </div>

      {/* Listado de Reportes para Administrar */}
      {loadingData && reportes.length === 0 ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin text-3xl text-blue-600">⚙️</div>
        </div>
      ) : reportesFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-md">
          <span className="text-4xl">🔎</span>
          <p className="text-gray-500 font-bold mt-2">No se encontraron reportes con estos filtros.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reportesFiltrados.map((report) => (
            <ReporteAdminCard 
              key={report.id}
              report={report}
              localidades={localidades}
              isUpdating={actualizandoId === report.id}
              mensaje={mensajeUpdate.id === report.id ? mensajeUpdate : null}
              onSave={handleUpdateReporte}
              onVerFoto={setFotoAmpliada}
              userSession={session}
              onDelete={handleDeleteReporte}
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

    </div>
  );
}

// Subcomponente de Tarjeta de Edición Individual (mantiene su propio estado de edición de respuesta colapsable)
function ReporteAdminCard({ report, localidades, isUpdating, mensaje, onSave, onVerFoto, userSession, onDelete }) {
  const [estado, setEstado] = useState(report.estado);
  const [respuesta, setRespuesta] = useState(report.respuesta_ayuntamiento || '');
  const [expandido, setExpandido] = useState(false);
  const [comentariosCount, setComentariosCount] = useState(report.comentarios?.[0]?.count || 0);

  // Sincronizar estados locales si la data cambia desde el servidor
  useEffect(() => {
    setEstado(report.estado);
    setRespuesta(report.respuesta_ayuntamiento || '');
    setComentariosCount(report.comentarios?.[0]?.count || 0);
  }, [report]);

  const catEmoji = {
    bache: '🕳️',
    luminaria: '💡',
    basura: '🗑️',
    fuga_agua: '🚰',
    camino_rural: '🚜',
    drenaje: '🌊'
  }[report.categoria] || '📋';

  const fecha = new Date(report.creado_at).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const estInfo = ESTADOS.find(e => e.id === report.estado) || { 
    label: report.estado, 
    color: 'bg-gray-100 text-gray-900 border-gray-300' 
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden flex flex-col md:flex-row animate-fade-in">
      
      {/* Miniatura de la Foto */}
      {report.foto_url && (
        <div className="w-full md:w-52 h-52 md:h-auto shrink-0 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 relative">
          <img 
            src={report.foto_url} 
            alt={report.categoria} 
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
            loading="lazy"
            onClick={() => onVerFoto && onVerFoto(report.foto_url)}
          />
        </div>
      )}

      {/* Contenido principal y controles */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        
        {/* Cabecera del reporte */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <span className="text-lg font-black text-gray-900 flex items-center gap-1">
              <span>{catEmoji}</span> {report.categoria.toUpperCase()}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${estInfo.color}`}>
                {estInfo.label}
              </span>
              <span className="text-xs font-bold text-gray-400">Folio: #{report.folio}</span>
            </div>
          </div>

          <div className="text-xs text-gray-500 font-bold flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-blue-600">🏘️ {localidades[report.localidad_id] || 'Cargando comunidad...'}</span>
            <span>•</span>
            <span>📅 {fecha}</span>
            {comentariosCount > 0 && (
              <>
                <span>•</span>
                <span className="text-indigo-650 bg-indigo-50/70 border border-indigo-100 rounded-lg px-2 py-0.5 text-[10px] font-black flex items-center gap-0.5" title={`${comentariosCount} comentarios`}>
                  💬 {comentariosCount}
                </span>
              </>
            )}
          </div>

          {/* Detalles colapsables */}
          {expandido && (
            <div className="space-y-4 pt-3 border-t border-gray-100 animate-fade-in">
              {report.ubicacion_texto && (
                <div className="space-y-1">
                  <span className="block font-black text-[10px] text-gray-400 uppercase tracking-wider">📍 Referencias / Dirección:</span>
                  <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-semibold italic">
                    "{report.ubicacion_texto}"
                  </p>
                </div>
              )}
              {report.audio_url && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1 shrink-0">🎙️ Nota de Voz:</span>
                  <audio src={report.audio_url} controls className="w-full h-8 max-w-[280px]" />
                </div>
              )}
              {report.latitud && report.longitud && (
                <div className="text-xs font-bold pt-1">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${report.latitud},${report.longitud}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-750 font-black flex items-center gap-1 active:scale-95 transition-all"
                  >
                    🗺️ Ver ubicación en Google Maps ↗
                  </a>
                </div>
              )}

              {/* Código QR de Seguimiento (Punto 5) */}
              {report.folio && (
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/reportes?folio=${report.folio}` : '')}`} 
                    alt="Código QR de Seguimiento" 
                    className="w-16 h-16 rounded-lg bg-white p-1 border border-gray-200 shrink-0" 
                  />
                  <div>
                    <span className="block font-black text-[9px] text-slate-400 uppercase tracking-wider">Código QR de Seguimiento:</span>
                    <p className="text-[10px] text-gray-650 font-bold leading-normal">
                      Escanea este código o comparte el enlace para que el ciudadano pueda ver la atención del reporte.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const trackingUrl = `${window.location.origin}/reportes?folio=${report.folio}`;
                        navigator.clipboard.writeText(trackingUrl);
                        alert('¡Enlace de seguimiento copiado al portapapeles!');
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-extrabold flex items-center gap-1 mt-1 active:scale-95 transition-all"
                    >
                      📋 Copiar enlace de seguimiento
                    </button>
                  </div>
                </div>
              )}

              {/* Sección de Edición de Estatus */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 mt-3">
                
                {/* Selección de Estatus mediante Botones */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Estatus del Reporte:</label>
                  <div className="flex flex-wrap gap-2">
                    {ESTADOS.map(est => (
                      <button
                        key={est.id}
                        type="button"
                        onClick={() => setEstado(est.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          estado === est.id 
                            ? `${est.color} ring-2 ring-blue-500 scale-102 font-black border-blue-400`
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {est.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Respuesta oficial */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Respuesta oficial al ciudadano:</label>
                  <textarea
                    value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)}
                    placeholder="Escribe el estado del bache/luminaria, fecha de reparación, etc..."
                    rows={2}
                    className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none text-xs font-semibold bg-white placeholder-gray-400"
                  />
                </div>

                {/* Fila de Envío / Alertas */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  
                  {/* Alerta de guardado individual */}
                  <div className="flex-1">
                    {mensaje && (
                      <span className={`text-[11px] font-bold block ${
                        mensaje.tipo === 'success' ? 'text-emerald-700' :
                        mensaje.tipo === 'error' ? 'text-rose-700' :
                        'text-blue-700'
                      }`}>
                        {mensaje.texto}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Botón Eliminar Reporte */}
                    <button
                      type="button"
                      onClick={() => onDelete && onDelete(report.id)}
                      className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-100 transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <span>🗑️</span> Eliminar Reporte
                    </button>

                    {/* Botón guardar */}
                    <button
                      type="button"
                      disabled={isUpdating || (estado === report.estado && respuesta === (report.respuesta_ayuntamiento || ''))}
                      onClick={() => onSave(report.id, estado, respuesta)}
                      className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow-md transition-all active:scale-95 ${
                        isUpdating || (estado === report.estado && respuesta === (report.respuesta_ayuntamiento || ''))
                          ? 'bg-gray-300 shadow-none cursor-not-allowed text-gray-500'
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-50'
                      }`}
                    >
                      {isUpdating ? 'Guardando...' : 'Guardar Cambios ✓'}
                    </button>
                  </div>

                </div>

              </div>

              {/* Sección de Comentarios de la comunidad en el panel Admin */}
              <ComentariosSection
                reporteId={report.id}
                userSession={userSession}
                onLogin={null}
                onCountChange={setComentariosCount}
              />
            </div>
          )}

        </div>

        {/* Botón de alternancia */}
        <button
          type="button"
          onClick={() => setExpandido(!expandido)}
          className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs font-black text-blue-600 bg-slate-50 hover:bg-slate-100/70 transition-all active:scale-98 flex items-center justify-center gap-1.5 mt-4"
        >
          <span>{expandido ? '🔼 Ocultar Panel de Gestión' : '⚙️ Gestionar y Ver Detalles'}</span>
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

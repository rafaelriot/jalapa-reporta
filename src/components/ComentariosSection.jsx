'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ComentariosSection({ reporteId, userSession, onLogin, onCountChange }) {
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

  // Sincronizar conteo con el padre (ReporteCard) cuando cambie
  useEffect(() => {
    if (!cargando && onCountChange) onCountChange(comentarios.length);
  }, [comentarios.length, cargando]);

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

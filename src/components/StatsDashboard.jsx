'use client';

import React from 'react';

export default function StatsDashboard({ reportes }) {
  const total = reportes.length;

  // 1. Estadísticas de Estatus
  const pendientes = reportes.filter((r) => r.estado === 'pendiente').length;
  const enProceso = reportes.filter((r) => r.estado === 'en_proceso').length;
  const resueltos = reportes.filter((r) => r.estado === 'resuelto').length;
  const rechazados = reportes.filter((r) => r.estado === 'rechazado').length;

  const pctPendientes = total > 0 ? Math.round((pendientes / total) * 100) : 0;
  const pctEnProceso = total > 0 ? Math.round((enProceso / total) * 100) : 0;
  const pctResueltos = total > 0 ? Math.round((resueltos / total) * 100) : 0;
  const pctRechazados = total > 0 ? Math.round((rechazados / total) * 100) : 0;

  // 1.5. Calificación y Satisfacción Promedio
  const reportesConCalificacion = reportes.filter((r) => r.calificacion !== undefined && r.calificacion !== null);
  const totalCalificaciones = reportesConCalificacion.length;
  const sumaCalificaciones = reportesConCalificacion.reduce((acc, curr) => acc + curr.calificacion, 0);
  const promedioSatisfaccion = totalCalificaciones > 0 ? (sumaCalificaciones / totalCalificaciones).toFixed(1) : '0.0';

  // 2. Estadísticas de Categorías
  const CATEGORIAS = {
    bache: { label: 'Bache o Hoyo', icon: '🕳️', color: 'bg-rose-500', barColor: 'bg-rose-500', textColor: 'text-rose-700' },
    luminaria: { label: 'Luz Fundida', icon: '💡', color: 'bg-amber-500', barColor: 'bg-amber-500', textColor: 'text-amber-700' },
    basura: { label: 'Basura', icon: '🗑️', color: 'bg-emerald-500', barColor: 'bg-emerald-500', textColor: 'text-emerald-700' },
    fuga_agua: { label: 'Fuga de Agua', icon: '🚰', color: 'bg-blue-500', barColor: 'bg-blue-500', textColor: 'text-blue-700' },
    camino_rural: { label: 'Camino Feo', icon: '🚜', color: 'bg-orange-500', barColor: 'bg-orange-500', textColor: 'text-orange-700' },
    drenaje: { label: 'Drenaje Tapado', icon: '🌊', color: 'bg-cyan-500', barColor: 'bg-cyan-500', textColor: 'text-cyan-700' },
    otro: { label: 'Otros', icon: '📋', color: 'bg-indigo-500', barColor: 'bg-indigo-500', textColor: 'text-indigo-700' }
  };

  const conteoCategorias = reportes.reduce((acc, curr) => {
    const cat = curr.categoria || 'otro';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const categoriasData = Object.entries(CATEGORIAS).map(([key, info]) => {
    const count = conteoCategorias[key] || 0;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return { key, count, pct, ...info };
  }).sort((a, b) => b.count - a.count); // Ordenar de mayor a menor

  // SVG Circular progress ring constants
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pctResueltos / 100) * circumference;

  const pctSatisfaccion = totalCalificaciones > 0 ? Math.round((sumaCalificaciones / (totalCalificaciones * 5)) * 100) : 0;
  const strokeDashoffsetSatisfaccion = circumference - (pctSatisfaccion / 100) * circumference;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-md space-y-6 animate-fade-in">
      
      {/* Cabecera del Dashboard de Estadísticas */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <span className="text-sm font-black text-gray-800 flex items-center gap-1.5">
          <span>📊</span> Métricas de Desempeño y Categorías
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Gráfico 1: Anillo de Tasa de Resolución */}
        <div className="bg-gradient-to-br from-emerald-50/20 to-teal-50/20 rounded-2xl p-4 border border-emerald-150/20 flex flex-col items-center justify-center text-center space-y-3">
          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Eficiencia de Solución</span>
          
          <div className="relative flex items-center justify-center w-24 h-24">
            {/* SVG Circular Ring */}
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-emerald-100"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Foreground circle */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-emerald-600 transition-all duration-500 ease-out"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-black text-emerald-950">{pctResueltos}%</span>
              <span className="text-[8px] font-black text-emerald-700/80 uppercase">Resueltos</span>
            </div>
          </div>
          
          <div className="text-[11px] font-bold text-gray-500">
            {resueltos} de {total} reportes resueltos con éxito.
          </div>
        </div>

        {/* Gráfico 1.5: Anillo de Satisfacción Ciudadana */}
        <div className="bg-gradient-to-br from-amber-50/20 to-yellow-50/20 rounded-2xl p-4 border border-amber-150/20 flex flex-col items-center justify-center text-center space-y-3">
          <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Satisfacción Ciudadana</span>
          
          <div className="relative flex items-center justify-center w-24 h-24">
            {/* SVG Circular Ring */}
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-amber-100"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Foreground circle */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-amber-500 transition-all duration-500 ease-out"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffsetSatisfaccion}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-black text-amber-950">{promedioSatisfaccion}</span>
              <span className="text-[8px] font-black text-amber-700/80 uppercase">★ estrellas</span>
            </div>
          </div>
          
          <div className="text-[11px] font-bold text-gray-500">
            Basado en {totalCalificaciones} calificaciones recibidas.
          </div>
        </div>

        {/* Gráfico 2: Proporción de Estatus (Stacked Bar) */}
        <div className="space-y-4 bg-gray-50/30 border border-gray-100 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Distribución de Estatus</span>
          
          {/* Stacked Segmented Bar */}
          <div className="h-6 w-full rounded-xl overflow-hidden flex shadow-xs border border-gray-200">
            {pctResueltos > 0 && (
              <div 
                style={{ width: `${pctResueltos}%` }} 
                className="bg-emerald-500 h-full transition-all duration-300 relative group"
                title={`Resueltos: ${resueltos} (${pctResueltos}%)`}
              />
            )}
            {pctEnProceso > 0 && (
              <div 
                style={{ width: `${pctEnProceso}%` }} 
                className="bg-blue-500 h-full transition-all duration-300 relative group"
                title={`En Proceso: ${enProceso} (${pctEnProceso}%)`}
              />
            )}
            {pctPendientes > 0 && (
              <div 
                style={{ width: `${pctPendientes}%` }} 
                className="bg-amber-500 h-full transition-all duration-300 relative group"
                title={`Pendientes: ${pendientes} (${pctPendientes}%)`}
              />
            )}
            {pctRechazados > 0 && (
              <div 
                style={{ width: `${pctRechazados}%` }} 
                className="bg-gray-400 h-full transition-all duration-300 relative group"
                title={`Rechazados: ${rechazados} (${pctRechazados}%)`}
              />
            )}
          </div>

          {/* Estatus Grid Labels */}
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <span className="block text-[10px] font-black text-gray-700">Resuelto: {resueltos}</span>
                <span className="text-[9px] text-gray-400 font-bold">{pctResueltos}% del total</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <div>
                <span className="block text-[10px] font-black text-gray-700">En Proceso: {enProceso}</span>
                <span className="text-[9px] text-gray-400 font-bold">{pctEnProceso}% del total</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <div>
                <span className="block text-[10px] font-black text-gray-700">Pendiente: {pendientes}</span>
                <span className="text-[9px] text-gray-400 font-bold">{pctPendientes}% del total</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400 shrink-0" />
              <div>
                <span className="block text-[10px] font-black text-gray-700">Rechazado: {rechazados}</span>
                <span className="text-[9px] text-gray-400 font-bold">{pctRechazados}% del total</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Gráfico 3: Desglose de Categorías */}
      <div className="space-y-3.5 pt-2 border-t border-gray-100">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Incidencias por Categoría</span>
        
        <div className="space-y-2.5">
          {categoriasData.map((cat) => (
            <div key={cat.key} className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-gray-700">
                <span className="flex items-center gap-1.5">
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </span>
                <span className={cat.textColor}>
                  {cat.count} {cat.count === 1 ? 'reporte' : 'reportes'} ({cat.pct}%)
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${cat.barColor} transition-all duration-500 ease-out`}
                  style={{ width: `${cat.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

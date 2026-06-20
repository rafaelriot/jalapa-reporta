'use client';

import React, { useEffect, useRef } from 'react';

export default function MapComponent({ reportes }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Dynamic import of Leaflet on client-side
    let L;
    
    // Dynamically load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    import('leaflet').then((leafletModule) => {
      L = leafletModule.default;

      if (!mapRef.current && mapContainerRef.current) {
        // Definir límites de Jalapa, Tabasco (Bounding Box)
        const jalapaBounds = L.latLngBounds(
          L.latLng(17.50, -92.95), // Suroeste
          L.latLng(17.90, -92.65)  // Noreste
        );

        // Initialize Map centered on Jalapa, Tabasco with bounds constraints
        mapRef.current = L.map(mapContainerRef.current, {
          center: [17.7214, -92.8122],
          zoom: 13,
          zoomControl: true,
          maxBounds: jalapaBounds,
          maxBoundsViscosity: 1.0,
          minZoom: 10
        });

        // Add OpenStreetMap tiles (Voyager Theme)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(mapRef.current);
      }

      const map = mapRef.current;

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Filter reports with valid coordinates
      const reportesConCoordenadas = reportes.filter(
        (r) => r.latitud && r.longitud && !isNaN(r.latitud) && !isNaN(r.longitud)
      );

      // Category emojis
      const catEmoji = {
        bache: '🕳️',
        luminaria: '💡',
        basura: '🗑️',
        fuga_agua: '🚰',
        camino_rural: '🚜',
        drenaje: '🌊'
      };

      const estadoLabel = {
        pendiente: 'Pendiente ⏳',
        en_proceso: 'En Proceso 🛠️',
        resuelto: 'Resuelto ✅',
        rechazado: 'Rechazado ✕'
      };

      const estadoColor = {
        pendiente: 'bg-amber-100 text-amber-900 border-amber-300',
        en_proceso: 'bg-blue-100 text-blue-900 border-blue-300',
        resuelto: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        rechazado: 'bg-gray-100 text-gray-900 border-gray-300'
      };

      reportesConCoordenadas.forEach((rep) => {
        const emoji = catEmoji[rep.categoria] || '📋';
        
        // Custom HTML Marker Icon
        const customIcon = L.divIcon({
          html: `<div class="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-lg border-2 border-blue-500 hover:scale-110 hover:border-blue-700 transition-all duration-200 text-xl cursor-pointer">${emoji}</div>`,
          className: 'custom-leaflet-marker',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const est = estadoLabel[rep.estado] || rep.estado;
        const colorClass = estadoColor[rep.estado] || 'bg-gray-100 text-gray-900 border-gray-300';
        const localidadNombre = rep.localidades?.nombre || 'Jalapa';

        // Popup HTML Template
        const popupContent = `
          <div class="p-1.5 space-y-2 text-xs min-w-[180px]">
            <div class="flex justify-between items-center gap-2">
              <span class="font-extrabold text-gray-900 uppercase">${emoji} ${rep.categoria}</span>
              <span class="text-[9px] text-gray-400 font-black">#${rep.folio}</span>
            </div>
            ${rep.foto_url ? `<img src="${rep.foto_url}" class="w-full h-24 object-cover rounded-lg shadow-sm border border-gray-100" />` : ''}
            <div class="space-y-1">
              <span class="block text-[10px] text-blue-600 font-black">🏘️ ${localidadNombre}</span>
              <span class="inline-block px-2 py-0.5 rounded-full text-[9px] font-black border ${colorClass}">${est}</span>
            </div>
            ${rep.ubicacion_texto ? `<p class="text-[10px] text-gray-500 italic font-medium leading-tight">"${rep.ubicacion_texto}"</p>` : ''}
            <button 
              onclick="window.dispatchEvent(new CustomEvent('focus-reporte', { detail: '${rep.folio}' }))"
              style="width: 100%; display: block; text-align: center; margin-top: 6px; padding: 6px 12px; background-color: #2563eb; color: #ffffff; border-radius: 8px; font-size: 10px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s;"
              onmouseover="this.style.backgroundColor='#1d4ed8';"
              onmouseout="this.style.backgroundColor='#2563eb';"
            >
              🔍 Ver Detalle en Lista
            </button>
          </div>
        `;

        const marker = L.marker([rep.latitud, rep.longitud], { icon: customIcon })
          .bindPopup(popupContent, { closeButton: false })
          .addTo(map);

        markersRef.current.push(marker);
      });

      // Fit map bounds to show all markers
      if (reportesConCoordenadas.length > 0) {
        const group = new L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.15));
      }
    });

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, [reportes]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-[450px] rounded-3xl border border-gray-100 shadow-md bg-slate-50 relative overflow-hidden z-10 animate-fade-in"
    />
  );
}

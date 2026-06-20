'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { compressImage } from '@/utils/compress';
import { saveOfflineReport, getOfflineReports, deleteOfflineReport } from '@/utils/db';
import { suscribirAPush, estaSuscrito } from '@/utils/push';

const CATEGORIAS = [
  { id: 'bache', label: 'Bache o Hoyo', icon: '🕳️', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900' },
  { id: 'luminaria', label: 'Luz Fundida', icon: '💡', bg: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-300 text-yellow-900' },
  { id: 'basura', label: 'Basura o Basurero', icon: '🗑️', bg: 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-900' },
  { id: 'fuga_agua', label: 'Fuga de Agua', icon: '🚰', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-900' },
  { id: 'camino_rural', label: 'Camino Feo', icon: '🚜', bg: 'bg-orange-50 hover:bg-orange-100 border-orange-300 text-orange-900' },
  { id: 'drenaje', label: 'Drenaje Tapado', icon: '🌊', bg: 'bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-900' },
];

export default function ReportForm({ localidades = [] }) {
  // Estado del Formulario
  const [foto, setFoto] = useState(null);
  const [previewFoto, setPreviewFoto] = useState('');
  const [compressing, setCompressing] = useState(false);
  
  const [categoria, setCategoria] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [ubicacionTexto, setUbicacionTexto] = useState('');
  
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle, loading, success, error

  // Estados del Grabador de Nota de Voz
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [previewAudio, setPreviewAudio] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Estados de carga y feedback
  const [enviando, setEnviando] = useState(false);
  const [mensajeStatus, setMensajeStatus] = useState({ tipo: '', texto: '' });
  const [isOnline, setIsOnline] = useState(true);
  const [reporteExitoso, setReporteExitoso] = useState(null);

  // Estado para notificaciones push (Opción 6)
  const [suscritoPush, setSuscritoPush] = useState(false);
  const [suscribiendoPush, setSuscribiendoPush] = useState(false);

  useEffect(() => {
    if (reporteExitoso && reporteExitoso.id) {
      setSuscritoPush(estaSuscrito(reporteExitoso.id));
    }
  }, [reporteExitoso]);

  // Cola offline y sincronización (Opción 3)
  const [colaPendientesCount, setColaPendientesCount] = useState(0);
  const [sincronizando, setSincronizandoState] = useState(false);
  const sincronizandoRef = useRef(false);

  const setSincronizando = (val) => {
    sincronizandoRef.current = val;
    setSincronizandoState(val);
  };

  const actualizarCountCola = async () => {
    try {
      const offlineReports = await getOfflineReports();
      setColaPendientesCount(offlineReports ? offlineReports.length : 0);
    } catch (err) {
      console.error('Error al actualizar contador de cola:', err);
    }
  };

  // Monitorear conexión a internet y sincronizar pendientes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      actualizarCountCola();
      setIsOnline(navigator.onLine);
      const goOnline = () => {
        setIsOnline(true);
        setMensajeStatus({ tipo: 'success', texto: '¡Señal recuperada! Sincronizando reportes guardados...' });
        syncOfflineReports();
      };
      const goOffline = () => {
        setIsOnline(false);
        setMensajeStatus({ tipo: 'warning', texto: 'Se perdió la señal. Los reportes se guardarán en tu teléfono.' });
      };

      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      
      // Intentar sincronización inicial si ya estamos online
      if (navigator.onLine) {
        syncOfflineReports();
      }

      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }
  }, []);

  // 1. Manejo de Captura y Compresión de Foto
  const handleFotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCompressing(true);
    setMensajeStatus({ tipo: 'info', texto: 'Comprimiendo foto para ahorrar tus datos...' });
    
    // Vista previa local inmediata para el ciudadano
    setPreviewFoto(URL.createObjectURL(file));

    const compressed = await compressImage(file);
    setFoto(compressed);
    setCompressing(false);
    setMensajeStatus({ tipo: 'success', texto: '¡Foto optimizada y lista para enviar!' });
  };

  // 2. Captura de GPS
  const obtenerGPS = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      setMensajeStatus({ tipo: 'error', texto: 'Tu teléfono no soporta GPS. Por favor escribe la dirección abajo.' });
      return;
    }

    setGpsStatus('loading');
    setMensajeStatus({ tipo: 'info', texto: 'Buscando tu ubicación por GPS satelital...' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Bounding Box para Jalapa, Tabasco
        const minLat = 17.50;
        const maxLat = 17.90;
        const minLng = -92.95;
        const maxLng = -92.65;

        if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) {
          setGpsStatus('error');
          setMensajeStatus({ 
            tipo: 'error', 
            texto: `⚠️ Tu ubicación actual (${lat.toFixed(4)}, ${lng.toFixed(4)}) está fuera del municipio de Jalapa, Tabasco. Por favor escribe la dirección y referencias abajo.` 
          });
          return;
        }

        setGpsCoords({ lat, lng });
        setGpsStatus('success');
        
        let msgExito = 'Ubicación GPS registrada correctamente.';

        // Fallback local de coordenadas para las 10 comunidades iniciales
        const COORDENADAS_FALLBACK = {
          1: { lat: 17.7214, lng: -92.8122 }, // Cabecera Municipal
          2: { lat: 17.8042, lng: -92.8252 }, // Astapa
          3: { lat: 17.7661, lng: -92.8153 }, // Jahuacapa
          4: { lat: 17.7011, lng: -92.7489 }, // Chipilinar 1ra Sección
          5: { lat: 17.6834, lng: -92.7301 }, // Chipilinar 2da Sección
          6: { lat: 17.6521, lng: -92.7712 }, // Lomas Alegres
          7: { lat: 17.7022, lng: -92.8398 }, // Tequila
          8: { lat: 17.8091, lng: -92.8791 }, // Francisco J. Santamaría (Cacao)
          9: { lat: 17.7915, lng: -92.7918 }, // Guanal 1ra Sección
          10: { lat: 17.6987, lng: -92.8611 } // Calicanto
        };

        if (localidades && localidades.length > 0) {
          let masCercana = null;
          let distanciaMinima = Infinity;

          localidades.forEach((loc) => {
            const locLat = loc.latitud !== undefined && loc.latitud !== null ? loc.latitud : COORDENADAS_FALLBACK[loc.id]?.lat;
            const locLng = loc.longitud !== undefined && loc.longitud !== null ? loc.longitud : COORDENADAS_FALLBACK[loc.id]?.lng;

            if (locLat && locLng) {
              const dist = Math.sqrt(Math.pow(lat - locLat, 2) + Math.pow(lng - locLng, 2));
              if (dist < distanciaMinima) {
                distanciaMinima = dist;
                masCercana = loc;
              }
            }
          });

          if (masCercana) {
            setLocalidad(masCercana.id.toString());
            msgExito = `Ubicación GPS registrada. Comunidad seleccionada por cercanía: "${masCercana.nombre}".`;
          }
        }

        setMensajeStatus({ tipo: 'success', texto: msgExito });
      },
      (error) => {
        console.error('Error GPS:', error);
        setGpsStatus('error');
        setMensajeStatus({ tipo: 'warning', texto: 'No pudimos obtener tu GPS. Escribe la dirección abajo.' });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Cronómetro del grabador de voz
  useEffect(() => {
    let interval;
    if (recording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 30) {
            detenerGrabacion();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [recording, mediaRecorder]);

  // Funciones de Grabación de Audio
  const iniciarGrabacion = async () => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices || !window.MediaRecorder) {
        setMensajeStatus({ tipo: 'error', texto: 'Tu navegador no soporta la grabación de audio.' });
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setPreviewAudio(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setRecording(true);
      setMensajeStatus({ tipo: 'info', texto: 'Grabando nota de voz... (Hablado, máx. 30s)' });
    } catch (err) {
      console.error('Error micrófono:', err);
      setMensajeStatus({ tipo: 'error', texto: '⚠️ ERROR MICRÓFONO: Permite el acceso al micrófono de tu dispositivo.' });
    }
  };

  const detenerGrabacion = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setRecording(false);
      setMensajeStatus({ tipo: 'success', texto: '¡Nota de voz guardada con éxito!' });
    }
  };

  const borrarGrabacion = () => {
    setAudioBlob(null);
    setPreviewAudio('');
    setRecordingSeconds(0);
  };

  // 3. Envío del reporte (Soporta Offline / Online)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!foto) {
      setMensajeStatus({ tipo: 'error', texto: '⚠️ FALTA FOTO: Toma una foto del problema primero.' });
      return;
    }
    if (!categoria) {
      setMensajeStatus({ tipo: 'error', texto: '⚠️ FALTA CATEGORÍA: Presiona el dibujo que represente tu problema.' });
      return;
    }
    if (!localidad) {
      setMensajeStatus({ tipo: 'error', texto: '⚠️ FALTA LOCALIDAD: Selecciona tu comunidad de la lista.' });
      return;
    }

    setEnviando(true);
    setMensajeStatus({ tipo: 'info', texto: 'Enviando reporte...' });

    const reportId = crypto.randomUUID();
    
    // Preparar datos del reporte
    const reportData = {
      id: reportId,
      categoria,
      localidad_id: parseInt(localidad, 10),
      ubicacion_texto: ubicacionTexto,
      latitud: gpsCoords?.lat || null,
      longitud: gpsCoords?.lng || null,
      creado_at: new Date().toISOString()
    };

    if (isOnline) {
      try {
        // A. Subir foto a Supabase Storage (Bucket 'fotos-reportes')
        const fileExt = foto.name ? foto.name.split('.').pop() : 'jpg';
        const fileName = `${reportId}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('fotos-reportes')
          .upload(fileName, foto);

        if (uploadError) throw uploadError;

        // Obtener URL Pública
        const { data: { publicUrl } } = supabase.storage
          .from('fotos-reportes')
          .getPublicUrl(fileName);

        // B. Opcional: Subir nota de voz si existe
        let publicAudioUrl = null;
        if (audioBlob) {
          const audioFileName = `${reportId}.webm`;
          const { error: audioUploadError } = await supabase.storage
            .from('fotos-reportes')
            .upload(audioFileName, audioBlob);

          if (audioUploadError) throw audioUploadError;

          const { data: { publicUrl: audioUrl } } = supabase.storage
            .from('fotos-reportes')
            .getPublicUrl(audioFileName);
          publicAudioUrl = audioUrl;
        }

        // C. Crear registro en la DB
        const { data, error: dbError } = await supabase
          .from('reportes')
          .insert([{ ...reportData, foto_url: publicUrl, audio_url: publicAudioUrl }])
          .select('id, folio')
          .single();

        if (dbError) throw dbError;

        const folioGenerado = data?.folio;
        const trackingUrl = typeof window !== 'undefined'
          ? `${window.location.origin}/reportes?folio=${folioGenerado}`
          : '';

        const dateStr = new Date().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const selectedLocalidadName = localidades.find(l => l.id.toString() === localidad.toString())?.nombre || 'No especificada';
        const selectedCategoriaLabel = CATEGORIAS.find(c => c.id === categoria)?.label || categoria;
        const coordenadasStr = gpsCoords ? `${gpsCoords.lat.toFixed(6)}, ${gpsCoords.lng.toFixed(6)}` : null;
        const referenciasStr = ubicacionTexto || null;

        const reporteDetalle = {
          id: data?.id,
          folio: folioGenerado,
          trackingUrl,
          fecha: dateStr,
          categoria: selectedCategoriaLabel,
          localidad: selectedLocalidadName,
          referencias: referenciasStr,
          coordenadas: coordenadasStr
        };

        // Guardar en Mis Reportes localmente
        if (typeof window !== 'undefined') {
          try {
            const listado = JSON.parse(localStorage.getItem('mis_reportes') || '[]');
            if (!listado.some(item => item.id === data?.id)) {
              listado.push({
                id: data?.id,
                folio: folioGenerado,
                categoria: categoria,
                creado_at: reportData.creado_at
              });
              localStorage.setItem('mis_reportes', JSON.stringify(listado));
            }
          } catch (e) {
            console.error('Error al guardar en mis_reportes:', e);
          }
        }

        resetForm();
        setReporteExitoso(reporteDetalle);
        setMensajeStatus({ tipo: 'success', texto: `¡Muchas gracias! Tu reporte ha sido registrado con éxito con el folio #${folioGenerado}. 🇲🇽` });
      } catch (error) {
        console.error('Error al subir:', error);
        saveOfflineFallback(reportData);
      }
    } else {
      saveOfflineFallback(reportData);
    }
  };

  const saveOfflineFallback = async (reportData) => {
    try {
      // Convertir archivo de foto a Base64 para guardarlo en IndexedDB
      const readerFoto = new FileReader();
      readerFoto.readAsDataURL(foto);
      readerFoto.onloadend = async () => {
        const base64Foto = readerFoto.result;
        
        // Si hay audio, convertirlo a Base64 y guardarlo
        if (audioBlob) {
          const readerAudio = new FileReader();
          readerAudio.readAsDataURL(audioBlob);
          readerAudio.onloadend = async () => {
            const base64Audio = readerAudio.result;
            const offlineReport = {
              ...reportData,
              foto_base64: base64Foto,
              audio_base64: base64Audio,
              pendingSync: true
            };
            await saveOfflineReport(offlineReport);
            await actualizarCountCola();
            resetForm();
            setMensajeStatus({ 
              tipo: 'warning', 
              texto: '💾 Guardado localmente. No tienes internet. Tu reporte y nota de voz se enviarán automáticamente al recuperar red.' 
            });
          };
        } else {
          const offlineReport = {
            ...reportData,
            foto_base64: base64Foto,
            pendingSync: true
          };
          await saveOfflineReport(offlineReport);
          await actualizarCountCola();
          resetForm();
          setMensajeStatus({ 
            tipo: 'warning', 
            texto: '💾 Guardado localmente. No tienes buena señal de red. Tu reporte se enviará automáticamente al recuperar internet.' 
          });
        }
      };
    } catch (err) {
      console.error('Error al guardar offline:', err);
      setMensajeStatus({ tipo: 'error', texto: 'Error al guardar el reporte localmente.' });
      setEnviando(false);
    }
  };

  const syncOfflineReports = async () => {
    if (sincronizandoRef.current) return;
    setSincronizando(true);
    try {
      const offlineReports = await getOfflineReports();
      if (!offlineReports || offlineReports.length === 0) {
        setSincronizando(false);
        return;
      }

      console.log(`Sincronizando ${offlineReports.length} reportes guardados en cola...`);

      for (const report of offlineReports) {
        try {
          // Convertir Base64 de vuelta a Blob/File
          const res = await fetch(report.foto_base64);
          const blob = await res.blob();

          const fileExt = 'jpg';
          const fileName = `${report.id}.${fileExt}`;

          // Subir foto
          const { error: uploadError } = await supabase.storage
            .from('fotos-reportes')
            .upload(fileName, blob);

          if (uploadError && !uploadError.message.includes('already exists')) {
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('fotos-reportes')
            .getPublicUrl(fileName);

          // Subir nota de voz si existía offline
          let publicAudioUrl = null;
          if (report.audio_base64) {
            const audioRes = await fetch(report.audio_base64);
            const audioBlobObj = await audioRes.blob();
            const audioFileName = `${report.id}.webm`;
            
            const { error: audioUploadError } = await supabase.storage
              .from('fotos-reportes')
              .upload(audioFileName, audioBlobObj);

            if (audioUploadError && !audioUploadError.message.includes('already exists')) {
              throw audioUploadError;
            }

            const { data: { publicUrl: audioUrl } } = supabase.storage
              .from('fotos-reportes')
              .getPublicUrl(audioFileName);
            publicAudioUrl = audioUrl;
          }

          // Eliminar fotos/audios temporales en base64 del objeto
          const { foto_base64, audio_base64, pendingSync, ...cleanReport } = report;

          // Insertar reporte en la DB y obtener folio generado
          const { data: syncData, error: dbError } = await supabase
            .from('reportes')
            .insert([{ ...cleanReport, foto_url: publicUrl, audio_url: publicAudioUrl }])
            .select('id, folio')
            .single();

          if (dbError) throw dbError;

          // Guardar reporte sincronizado en Mis Reportes localmente
          if (syncData && typeof window !== 'undefined') {
            try {
              const listado = JSON.parse(localStorage.getItem('mis_reportes') || '[]');
              if (!listado.some(item => item.id === syncData.id)) {
                listado.push({
                  id: syncData.id,
                  folio: syncData.folio,
                  categoria: cleanReport.categoria,
                  creado_at: cleanReport.creado_at
                });
                localStorage.setItem('mis_reportes', JSON.stringify(listado));
              }
            } catch (e) {
              console.error('Error al guardar reporte sincronizado en mis_reportes:', e);
            }
          }

          // Borrar de IndexedDB
          await deleteOfflineReport(report.id);
          console.log(`Reporte ${report.id} sincronizado exitosamente.`);
          await actualizarCountCola();
        } catch (err) {
          console.error(`Error al sincronizar reporte individual ${report.id}:`, err);
        }
      }
    } catch (error) {
      console.error('Error en proceso de sincronización:', error);
    } finally {
      setSincronizando(false);
      await actualizarCountCola();
    }
  };

  const resetForm = () => {
    setFoto(null);
    setPreviewFoto('');
    setCategoria('');
    setLocalidad('');
    setUbicacionTexto('');
    setGpsCoords(null);
    setGpsStatus('idle');
    setAudioBlob(null);
    setPreviewAudio('');
    setRecordingSeconds(0);
    setEnviando(false);
  };

  const imprimirComprobante = () => {
    if (!reporteExitoso) return;
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reporteExitoso.trackingUrl)}`;
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
        <title>Comprobante de Reporte #${reporteExitoso.folio}</title>
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
            <h2 class="folio-number">Folio #${reporteExitoso.folio}</h2>
          </div>
          
          <table class="details-table">
            <tr>
              <th>Fecha</th>
              <td>${reporteExitoso.fecha}</td>
            </tr>
            <tr>
              <th>Categoría</th>
              <td>${reporteExitoso.categoria}</td>
            </tr>
            <tr>
              <th>Comunidad</th>
              <td>${reporteExitoso.localidad}</td>
            </tr>
            ${reporteExitoso.referencias ? `
            <tr>
              <th>Referencias</th>
              <td>${reporteExitoso.referencias}</td>
            </tr>
            ` : ''}
            ${reporteExitoso.coordenadas ? `
            <tr>
              <th>Coordenadas</th>
              <td>${reporteExitoso.coordenadas}</td>
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

  if (reporteExitoso) {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(reporteExitoso.trackingUrl)}`;

    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-md mx-auto text-center space-y-6 animate-fade-in">
        <div className="flex flex-col items-center">
          <span className="text-6xl animate-bounce">🎉</span>
          <h2 className="text-2xl font-black text-gray-900 mt-4">¡Reporte Enviado!</h2>
          <p className="text-sm text-gray-500 font-semibold mt-1">El personal del ayuntamiento ya lo está revisando.</p>
        </div>

        {/* Folio destacadísimo */}
        <div className="bg-blue-50 border border-blue-100 p-4.5 rounded-2xl shadow-inner">
          <span className="block text-[10px] font-black text-blue-600/80 uppercase tracking-wider">Tu Número de Folio:</span>
          <h3 className="text-4xl font-black text-blue-950 tracking-tight mt-1">#{reporteExitoso.folio}</h3>
          <p className="text-xs text-blue-700/80 font-bold mt-1.5">Guárdalo para dar seguimiento a la atención.</p>
        </div>

        {/* Código QR */}
        <div className="flex flex-col items-center space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Escanea para Seguimiento Fácil:</span>
          <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
            <img src={qrCodeUrl} alt="Código QR de Seguimiento" className="w-40 h-40" />
          </div>
          <p className="text-[11px] text-gray-500 font-semibold max-w-[280px]">
            Toma captura de este QR o escanéalo para abrir tu reporte de forma directa en el pizarrón.
          </p>
        </div>

        {/* Acciones */}
        <div className="space-y-3">
          {suscritoPush ? (
            <div className="w-full py-3.5 px-4 bg-emerald-50 border border-emerald-150 text-emerald-800 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 animate-fade-in shadow-inner">
              <span>🔔</span>
              <span>Notificaciones activas en este celular</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={suscribiendoPush}
              onClick={async () => {
                setSuscribiendoPush(true);
                const res = await suscribirAPush(reporteExitoso.id, reporteExitoso.folio);
                setSuscribiendoPush(false);
                if (res.success) {
                  setSuscritoPush(true);
                  alert('🔔 ¡Notificaciones activas con éxito! Te enviaremos una alerta cuando el personal del ayuntamiento atienda este reporte.');
                } else {
                  alert(`⚠️ No se pudieron activar las notificaciones: ${res.error}`);
                }
              }}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed active:scale-97 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {suscribiendoPush ? (
                <>
                  <span className="animate-spin text-base">🔄</span>
                  <span>Activando Notificaciones...</span>
                </>
              ) : (
                <>
                  <span>🔔</span>
                  <span>Activar Notificaciones de Estado</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={imprimirComprobante}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-97 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>🖨️</span>
            <span>Imprimir / Guardar PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(reporteExitoso.trackingUrl);
              alert('¡Enlace de seguimiento copiado al portapapeles!');
            }}
            className="w-full py-3 px-4 bg-indigo-650 hover:bg-indigo-700 active:scale-97 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>📋</span>
            <span>Copiar Enlace de Seguimiento</span>
          </button>

          <button
            type="button"
            onClick={() => setReporteExitoso(null)}
            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 active:scale-97 text-gray-755 font-black text-sm rounded-xl transition-all"
          >
            ✍️ Registrar Otro Reporte
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-md mx-auto p-5 bg-white rounded-2xl shadow-xl border border-gray-100 pb-8">
      
      {/* Banner de Reportes en Cola (Opción 3) */}
      {colaPendientesCount > 0 && (
        isOnline ? (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4.5 rounded-2xl shadow-sm text-sm text-indigo-950 flex flex-col gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5 font-bold">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span>
                Tienes <strong className="text-indigo-800 font-extrabold">{colaPendientesCount}</strong> {colaPendientesCount === 1 ? 'reporte' : 'reportes'} en cola listo{colaPendientesCount === 1 ? '' : 's'} para enviar.
              </span>
            </div>
            <p className="text-xs text-indigo-700 font-semibold leading-relaxed">
              Hay señal de internet. Puedes sincronizar tus reportes guardados localmente ahora mismo.
            </p>
            <button
              type="button"
              onClick={syncOfflineReports}
              disabled={sincronizando}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-97 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:bg-indigo-300 disabled:cursor-not-allowed"
            >
              {sincronizando ? (
                <>
                  <span className="animate-spin text-base">🔄</span>
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Sincronizar Ya</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4.5 rounded-2xl shadow-sm text-sm text-amber-950 flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center gap-2.5 font-bold">
              <span className="relative flex h-3 w-3">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span>
                Tienes <strong className="text-amber-800 font-extrabold">{colaPendientesCount}</strong> {colaPendientesCount === 1 ? 'reporte' : 'reportes'} a salvo en el teléfono.
              </span>
            </div>
            <p className="text-xs text-amber-700 font-semibold leading-relaxed">
              Se enviarán automáticamente cuando recuperes la conexión a internet.
            </p>
          </div>
        )
      )}

      {/* Indicador de red offline */}
      {!isOnline && colaPendientesCount === 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-sm text-amber-900 rounded-r-lg font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span><strong>Sin Internet:</strong> Trabajando sin conexión. Guardaremos tu reporte en el teléfono.</span>
        </div>
      )}

      {/* Retroalimentación en tiempo real */}
      {mensajeStatus.texto && (
        <div className={`p-4 rounded-xl text-sm font-bold text-center border ${
          mensajeStatus.tipo === 'success' ? 'bg-emerald-50 text-emerald-950 border-emerald-200' :
          mensajeStatus.tipo === 'warning' ? 'bg-amber-50 text-amber-950 border-amber-200' :
          mensajeStatus.tipo === 'error' ? 'bg-rose-50 text-rose-950 border-rose-200' :
          'bg-blue-50 text-blue-950 border-blue-200'
        }`}>
          {mensajeStatus.texto}
        </div>
      )}

      {/* PASO 1: Captura de Foto Obligatoria */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm">1</span>
            Toma Foto del Problema <span className="text-red-500">*</span>
          </label>
        </div>
        
        {!previewFoto ? (
          <label className="flex flex-col items-center justify-center w-full h-52 border-4 border-dashed border-blue-200 rounded-2xl cursor-pointer hover:bg-blue-50/50 hover:border-blue-400 transition-all active:scale-98 bg-blue-50/10">
            <span className="text-6xl mb-2 filter drop-shadow">📷</span>
            <span className="text-lg font-extrabold text-blue-700">Presiona para Abrir Cámara</span>
            <span className="text-xs text-gray-500 font-semibold mt-1">Se comprime al instante para ahorrar datos</span>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={handleFotoChange}
            />
          </label>
        ) : (
          <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-50 shadow-inner">
            <img src={previewFoto} alt="Previsualización" className="w-full h-52 object-cover" />
            <button 
              type="button" 
              onClick={() => { setFoto(null); setPreviewFoto(''); setMensajeStatus({ tipo: '', texto: '' }); }} 
              className="absolute top-2 right-2 bg-rose-600 text-white rounded-full px-3 py-1.5 text-xs font-black shadow-md hover:bg-rose-700 active:scale-95"
            >
              Cambiar Foto ❌
            </button>
            {compressing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white font-extrabold">
                <span className="animate-spin text-3xl mb-2">⚙️</span>
                <span>Optimizando foto...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PASO 2: Selección Visual de Categoría */}
      <div className="space-y-3 border-t border-gray-50 pt-5">
        <label className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm">2</span>
          ¿Qué problema es? <span className="text-red-500">*</span>
        </label>
        
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoria(cat.id)}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 text-center min-h-[90px] ${
                categoria === cat.id 
                  ? `${cat.bg} border-blue-600 scale-[1.03] shadow-md ring-4 ring-blue-100 font-black` 
                  : 'border-gray-200 hover:bg-gray-50 text-gray-800 font-bold'
              }`}
            >
              <span className="text-4xl mb-1 filter drop-shadow-sm">{cat.icon}</span>
              <span className="text-xs md:text-sm tracking-tight">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* PASO 3: Ubicación GPS + Campos */}
      <div className="space-y-5 border-t border-gray-50 pt-5">
        <label className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm">3</span>
          ¿Dónde está el problema? <span className="text-red-500">*</span>
        </label>

        {/* Botón de Ubicación GPS de un toque */}
        <button
          type="button"
          onClick={obtenerGPS}
          className={`w-full py-4.5 px-6 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-98 border-2 shadow-sm ${
            gpsStatus === 'success' ? 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700' :
            gpsStatus === 'loading' ? 'bg-amber-500 border-amber-600 text-white animate-pulse' :
            gpsStatus === 'error' ? 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100' :
            'bg-blue-600 border-blue-700 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
          }`}
        >
          <span className="text-xl">📍</span>
          <span>
            {gpsStatus === 'success' ? 'GPS Registrado ✅' :
             gpsStatus === 'loading' ? 'Obteniendo GPS... 🛰️' :
             gpsStatus === 'error' ? 'Fallo GPS (Escribe abajo)' :
             'Usar mi Ubicación GPS'}
          </span>
        </button>

        {/* Localidad */}
        <div className="space-y-1.5">
          <label className="block text-sm font-black text-gray-800">Comunidad / Localidad:</label>
          <select
            value={localidad}
            onChange={(e) => setLocalidad(e.target.value)}
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-base font-bold text-gray-700 bg-gray-50/50"
          >
            <option value="">-- Elige tu Comunidad --</option>
            {localidades.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.nombre}</option>
            ))}
          </select>
        </div>

        {/* Grabador de Notas de Voz */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
          <label className="block text-sm font-black text-gray-850 flex items-center gap-1.5">
            <span>🎙️</span> Nota de voz explicativa (Opcional):
          </label>
          <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">
            Si te cuesta escribir la dirección o referencias del problema, presiona el botón para grabar un audio explicativo.
          </p>

          <div className="flex items-center gap-3">
            {!previewAudio ? (
              <button
                type="button"
                onClick={recording ? detenerGrabacion : iniciarGrabacion}
                className={`py-3 px-5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 border ${
                  recording 
                    ? 'bg-rose-600 border-rose-700 text-white animate-pulse font-black'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm">{recording ? '⏹️' : '🎤'}</span>
                <span>{recording ? `Detener Grabación (${recordingSeconds}s)` : 'Grabar nota de voz (Máx. 30s)'}</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                <audio src={previewAudio} controls className="h-9 flex-1 max-w-[240px]" />
                <button
                  type="button"
                  onClick={borrarGrabacion}
                  className="bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border border-rose-200 py-2.5 px-4 rounded-xl text-xs font-black transition-all active:scale-95"
                >
                  Borrar 🗑️
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dirección Textual (Fallback y Referencia) */}
        <div className="space-y-1.5">
          <label className="block text-sm font-black text-gray-800">
            Escribe referencias (Ej. Frente a la escuela, portón verde):
          </label>
          <textarea
            value={ubicacionTexto}
            onChange={(e) => setUbicacionTexto(e.target.value)}
            placeholder="Describe cómo llegar o la calle exacta..."
            rows={3}
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-base font-semibold text-gray-700 placeholder-gray-400 bg-gray-50/50"
          />
        </div>
      </div>

      {/* Botón de Enviar Reporte */}
      <button
        type="submit"
        disabled={enviando || compressing}
        className={`w-full py-5 rounded-2xl text-xl font-black text-white shadow-xl transition-all duration-150 active:scale-[0.97] ${
          enviando || compressing
            ? 'bg-gray-400 cursor-not-allowed shadow-none'
            : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-100'
        }`}
      >
        {enviando ? 'Enviando Reporte... 📨' : '¡ENVIAR MI REPORTE! 🚀'}
      </button>

    </form>
  );
}

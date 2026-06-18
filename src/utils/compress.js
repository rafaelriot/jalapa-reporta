import imageCompression from 'browser-image-compression';

export async function compressImage(file) {
  const options = {
    maxSizeMB: 0.18, // < 200KB garantizado
    maxWidthOrHeight: 1200, // Resolución adecuada para ver los baches/luminarias
    useWebWorker: true,
    initialQuality: 0.8,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`Comprimido: de ${(file.size / 1024).toFixed(2)}KB a ${(compressedFile.size / 1024).toFixed(2)}KB`);
    return compressedFile;
  } catch (error) {
    console.error('Error al comprimir la imagen:', error);
    return file; // Retorno de fallback en caso de error extremo
  }
}

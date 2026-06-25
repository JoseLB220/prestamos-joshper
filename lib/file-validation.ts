import { fileTypeFromBuffer } from 'file-type';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  mimeType?: string;
  extension?: string;
}

export async function validateFileBuffer(
  buffer: Buffer,
  originalName: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const result: ValidationResult = { isValid: false, errors };

  // 1. Validar tamaño (10MB máximo)
  const maxSize = 10 * 1024 * 1024;
  if (buffer.length > maxSize) {
    errors.push(`Archivo demasiado grande: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (máximo: 10MB)`);
  }

  // 2. Detección real del tipo MIME usando magic bytes
  const fileType = await fileTypeFromBuffer(buffer as Uint8Array);

  if (!fileType) {
    errors.push('No se pudo determinar el tipo de archivo');
    result.isValid = false;
    return result;
  }

  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf'
  ];

  if (!allowedMimes.includes(fileType.mime)) {
    errors.push(`Tipo de archivo no permitido: ${fileType.mime}`);
  }

  // 3. Validar extensión vs tipo real
  const extension = originalName.toLowerCase().split('.').pop();
  const expectedExtensions: { [key: string]: string[] } = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'application/pdf': ['pdf'],
  };

  if (expectedExtensions[fileType.mime] && !expectedExtensions[fileType.mime].includes(extension || '')) {
    errors.push(`Extensión no coincide con el tipo real del archivo`);
  }

  // 4. Sanitizar nombre
  const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  if (safeName !== originalName) {
    errors.push('Nombre de archivo contiene caracteres inválidos');
  }

  result.isValid = errors.length === 0;
  result.mimeType = fileType.mime;
  result.extension = fileType.ext;

  return result;
}

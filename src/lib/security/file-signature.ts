export type DetectedMimeType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  if (bytes.length < prefix.length) {
    return false;
  }
  return prefix.every((value, index) => bytes[index] === value);
}

export function detectMimeType(bytes: Uint8Array): DetectedMimeType | null {
  if (hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46])) {
    return "application/pdf";
  }
  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 6) {
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    if (signature === "GIF87a" || signature === "GIF89a") {
      return "image/gif";
    }
  }
  return null;
}

const b64dict = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToByteArray(base64str: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    // Node.js
    return Uint8Array.from(Buffer.from(base64str, 'base64'));
  } else {
    // Browser
    const binaryString = globalThis.atob(base64str);
    return Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
  }
}

export function byteArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    // Node.js
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
  } else {
    // Browser: manual base64 encoding
    let result = '';
    for (let i = 0; i < bytes.length - 2; i += 3) {
      result += b64dict[bytes[i] >> 2];
      result += b64dict[((bytes[i] & 0x03) << 4) | (bytes[i + 1] >> 4)];
      result += b64dict[((bytes[i + 1] & 0x0f) << 2) | (bytes[i + 2] >> 6)];
      result += b64dict[bytes[i + 2] & 0x3f];
    }
    if (bytes.length % 3 === 1) {
      result += b64dict[bytes[bytes.length - 1] >> 2];
      result += b64dict[(bytes[bytes.length - 1] & 0x03) << 4];
      result += '==';
    }
    if (bytes.length % 3 === 2) {
      result += b64dict[bytes[bytes.length - 2] >> 2];
      result += b64dict[((bytes[bytes.length - 2] & 0x03) << 4) | (bytes[bytes.length - 1] >> 4)];
      result += b64dict[(bytes[bytes.length - 1] & 0x0f) << 2];
      result += '=';
    }
    return result;
  }
}

function asBytes(input) {
  if (typeof input === 'string') return new TextEncoder().encode(input);
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError('SHA-256 input must be a string or byte array');
}

export function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
    throw new TypeError('Invalid hexadecimal string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function concatBytes(...parts) {
  const arrays = parts.map(asBytes);
  const output = new Uint8Array(arrays.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of arrays) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function reverseBytes(input) {
  return Uint8Array.from(asBytes(input)).reverse();
}

export async function sha256Bytes(input) {
  const digest = await crypto.subtle.digest('SHA-256', asBytes(input));
  return new Uint8Array(digest);
}

/** SHA-256 digest displayed as hexadecimal. */
export async function sha256Hex(input) {
  return bytesToHex(await sha256Bytes(input));
}

/** Bitcoin HASH256: the second SHA-256 consumes the raw 32-byte first digest. */
export async function hash256Bytes(input) {
  return sha256Bytes(await sha256Bytes(input));
}

export async function hash256Hex(input) {
  return bytesToHex(await hash256Bytes(input));
}

/** Both SHA-256 rounds plus Bitcoin's conventional reversed display hash. */
export async function hash256Trace(input) {
  const first = await sha256Bytes(input);
  const second = await sha256Bytes(first);
  return {
    firstHash: bytesToHex(first),
    secondHash: bytesToHex(second),
    displayHash: bytesToHex(reverseBytes(second)),
  };
}

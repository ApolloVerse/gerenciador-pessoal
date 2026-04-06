
/**
 * Utility for browser-side encryption using Web Crypto API (AES-GCM)
 */

const ITERATIONS = 100000;
const KEY_LEN = 256;
const ALGO = 'AES-GCM';

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: ALGO, length: KEY_LEN },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const key = await deriveKey(password, salt);
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    encoder.encode(data)
  );

  const encryptedArray = new Uint8Array(encryptedContent);
  
  // Combine salt + iv + encrypted content into a single base64 string
  const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(encryptedArray, salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptData(encryptedBase64: string, password: string): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
  );

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encryptedContent = combined.slice(28);

  const key = await deriveKey(password, salt);
  
  try {
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      encryptedContent
    );
    return new TextDecoder().decode(decryptedContent);
  } catch (e) {
    throw new Error('Senha incorreta ou dados corrompidos.');
  }
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

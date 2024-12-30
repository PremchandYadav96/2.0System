export async function encrypt(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await getEncryptionKey();
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = encoder.encode(data);
  
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    encodedData
  );

  const encryptedArray = new Uint8Array(encryptedData);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv);
  combined.set(encryptedArray, iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(data: string): Promise<string> {
  const key = await getEncryptionKey();
  const decoder = new TextDecoder();
  
  const combined = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);
  
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    encryptedData
  );
  
  return decoder.decode(decryptedData);
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const storedKey = localStorage.getItem('encryption_key');
  
  if (storedKey) {
    const keyData = Uint8Array.from(
      atob(storedKey),
      c => c.charCodeAt(0)
    );
    
    return crypto.subtle.importKey(
      'raw',
      keyData,
      'AES-GCM',
      true,
      ['encrypt', 'decrypt']
    );
  }

  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );

  const exportedKey = await crypto.subtle.exportKey('raw', key);
  const keyArray = new Uint8Array(exportedKey);
  localStorage.setItem(
    'encryption_key',
    btoa(String.fromCharCode(...keyArray))
  );

  return key;
}
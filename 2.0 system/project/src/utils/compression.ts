export async function compress(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  
  // Use CompressionStream when available
  if ('CompressionStream' in window) {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    await writer.write(bytes);
    await writer.close();
    
    const compressedBytes = await new Response(
      cs.readable
    ).arrayBuffer();
    
    return btoa(
      String.fromCharCode(...new Uint8Array(compressedBytes))
    );
  }
  
  // Fallback to basic encoding
  return btoa(data);
}

export async function decompress(data: string): Promise<string> {
  // Use DecompressionStream when available
  if ('DecompressionStream' in window) {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    await writer.write(bytes);
    await writer.close();
    
    const decompressedBytes = await new Response(
      ds.readable
    ).arrayBuffer();
    
    const decoder = new TextDecoder();
    return decoder.decode(decompressedBytes);
  }
  
  // Fallback to basic decoding
  return atob(data);
}
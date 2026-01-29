/**
 * Parse a connection endpoint (e.g., "led1:A" -> { partId: "led1", pin: "A" })
 */
export function parseEndpoint(endpoint: string): { partId: string; pin: string } {
  const colonIndex = endpoint.indexOf(':');
  if (colonIndex === -1) {
    return { partId: endpoint, pin: '' };
  }
  return {
    partId: endpoint.substring(0, colonIndex),
    pin: endpoint.substring(colonIndex + 1),
  };
}

/**
 * UUIDv7 generator - Time-ordered UUID generation
 *
 * UUIDv7 format:
 * - 48 bits: Unix timestamp (milliseconds since epoch)
 * - 4 bits: version (0111 = 7)
 * - 12 bits: random
 * - 2 bits: variant (10)
 * - 62 bits: random
 *
 * Total: 128 bits = 16 bytes
 */

/**
 * Generate a UUIDv7 string
 * Format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
 * where y is one of 8, 9, a, or b (variant bits)
 */
export function generateUUID(): string {
  const bytes = generateUUIDv7Bytes();
  return bytesToUUIDString(bytes);
}

/**
 * Generate the 16 bytes of a UUIDv7
 */
function generateUUIDv7Bytes(): Uint8Array {
  const bytes = new Uint8Array(16);
  const timestamp = Date.now();

  // Timestamp (48 bits, big-endian) - bytes 0-5
  // Use division instead of bit shift to avoid 32-bit truncation in JavaScript
  bytes[0] = Math.floor(timestamp / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(timestamp / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(timestamp / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(timestamp / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(timestamp / 2 ** 8) & 0xff;
  bytes[5] = timestamp & 0xff;

  // Version (4 bits = 0111) + random (12 bits) - bytes 6-7
  bytes[6] = 0x70 | (getRandomByte() & 0x0f); // version 7 in high nibble
  bytes[7] = getRandomByte();

  // Variant (2 bits = 10) + random (62 bits) - bytes 8-15
  bytes[8] = 0x80 | (getRandomByte() & 0x3f); // variant 10 in high 2 bits
  bytes[9] = getRandomByte();
  bytes[10] = getRandomByte();
  bytes[11] = getRandomByte();
  bytes[12] = getRandomByte();
  bytes[13] = getRandomByte();
  bytes[14] = getRandomByte();
  bytes[15] = getRandomByte();

  return bytes;
}

/**
 * Get a random byte (0-255)
 */
function getRandomByte(): number {
  return Math.floor(Math.random() * 256);
}

/**
 * Convert 16 bytes to UUID string format
 */
function bytesToUUIDString(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

  // Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * Validate if a string is a valid UUIDv7
 */
export function isValidUUID(uuid: string): boolean {
  // Basic format check
  const uuidv7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidv7Regex.test(uuid);
}

/**
 * Extract the timestamp from a UUIDv7
 * Returns the Unix timestamp in milliseconds, or null if invalid
 */
export function extractTimestampFromUUID(uuid: string): number | null {
  if (!isValidUUID(uuid)) {
    return null;
  }

  // UUIDv7 format: tttttttt-tttt-Vxxx-yxxx-xxxxxxxxxxxx
  // t = timestamp bytes (48 bits total)
  // First field: bytes 0-3 (32 bits)
  // Second field: bytes 4-5 (16 bits)
  // Total timestamp: 48 bits

  // Extract hex parts (without hyphens)
  const parts = uuid.split('-');
  // parts[0] = first 4 bytes of timestamp (8 hex chars)
  // parts[1] = last 2 bytes of timestamp (4 hex chars)

  const timeHex = parts[0] + parts[1]; // 48 bits = 12 hex chars

  // Parse as BigInt then convert to Number (safe for timestamps within ~285 million years)
  const timestampMs = Number(BigInt('0x' + timeHex));

  return timestampMs;
}

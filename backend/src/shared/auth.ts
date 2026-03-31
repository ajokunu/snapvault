import { createVerify } from "crypto";
import { IncomingHttpHeaders } from "http";

interface JwtHeader {
  kid: string;
  alg: string;
}

interface JwtPayload {
  sub: string;
  iss: string;
  client_id?: string;
  aud?: string;
  token_use: string;
  exp: number;
  iat: number;
  email?: string;
}

interface JwksKey {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

interface JwksResponse {
  keys: JwksKey[];
}

let jwksCache: JwksResponse | null = null;
let jwksCacheExpiry = 0;

const JWKS_CACHE_TTL = 3600_000; // 1 hour

function getRegionAndPoolId(): { region: string; userPoolId: string } {
  const region = process.env.AWS_REGION ?? "us-east-1";
  const userPoolId = process.env.USER_POOL_ID;
  if (!userPoolId) {
    throw new Error("USER_POOL_ID environment variable is required");
  }
  return { region, userPoolId };
}

function getIssuer(): string {
  const { region, userPoolId } = getRegionAndPoolId();
  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
}

async function fetchJwks(): Promise<JwksResponse> {
  const now = Date.now();
  if (jwksCache && now < jwksCacheExpiry) {
    return jwksCache;
  }

  const issuer = getIssuer();
  const response = await fetch(`${issuer}/.well-known/jwks.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }

  jwksCache = (await response.json()) as JwksResponse;
  jwksCacheExpiry = now + JWKS_CACHE_TTL;
  return jwksCache;
}

function base64UrlDecode(str: string): Buffer {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded, "base64url");
}

function rsaPublicKeyFromJwk(jwk: JwksKey): string {
  const n = base64UrlDecode(jwk.n);
  const e = base64UrlDecode(jwk.e);

  // Build DER-encoded RSA public key
  const nBytes = n[0]! >= 0x80 ? Buffer.concat([Buffer.from([0x00]), n]) : n;
  const eBytes = e[0]! >= 0x80 ? Buffer.concat([Buffer.from([0x00]), e]) : e;

  function derLength(len: number): Buffer {
    if (len < 0x80) return Buffer.from([len]);
    if (len < 0x100) return Buffer.from([0x81, len]);
    return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
  }

  function derSequence(...items: Buffer[]): Buffer {
    const content = Buffer.concat(items);
    return Buffer.concat([Buffer.from([0x30]), derLength(content.length), content]);
  }

  function derInteger(val: Buffer): Buffer {
    return Buffer.concat([Buffer.from([0x02]), derLength(val.length), val]);
  }

  function derBitString(val: Buffer): Buffer {
    return Buffer.concat([Buffer.from([0x03]), derLength(val.length + 1), Buffer.from([0x00]), val]);
  }

  const rsaOid = Buffer.from([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
    0x01, 0x05, 0x00,
  ]);

  const rsaPublicKey = derSequence(derInteger(nBytes), derInteger(eBytes));
  const publicKeyInfo = derSequence(rsaOid, derBitString(rsaPublicKey));

  return `-----BEGIN PUBLIC KEY-----\n${publicKeyInfo.toString("base64").match(/.{1,64}/g)!.join("\n")}\n-----END PUBLIC KEY-----`;
}

export async function verifyToken(
  headers: IncomingHttpHeaders | Record<string, string | undefined>
): Promise<JwtPayload> {
  const authHeader = headers["authorization"] ?? headers["Authorization"];
  if (!authHeader || typeof authHeader !== "string") {
    throw new AuthError("Missing Authorization header", 401);
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AuthError("Invalid token format", 401);
  }

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  // Decode header to get kid
  const header = JSON.parse(
    base64UrlDecode(headerB64).toString()
  ) as JwtHeader;

  if (header.alg !== "RS256") {
    throw new AuthError("Unsupported algorithm", 401);
  }

  // Fetch JWKS and find matching key
  const jwks = await fetchJwks();
  const key = jwks.keys.find((k) => k.kid === header.kid);
  if (!key) {
    // Invalidate cache and retry once
    jwksCache = null;
    const freshJwks = await fetchJwks();
    const freshKey = freshJwks.keys.find((k) => k.kid === header.kid);
    if (!freshKey) {
      throw new AuthError("Unknown signing key", 401);
    }
    return verifyWithKey(freshKey, headerB64, payloadB64, signatureB64);
  }

  return verifyWithKey(key, headerB64, payloadB64, signatureB64);
}

function verifyWithKey(
  key: JwksKey,
  headerB64: string,
  payloadB64: string,
  signatureB64: string
): JwtPayload {
  const pem = rsaPublicKeyFromJwk(key);
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);

  const signatureBuffer = base64UrlDecode(signatureB64);
  if (!verifier.verify(pem, signatureBuffer)) {
    throw new AuthError("Invalid signature", 401);
  }

  const payload = JSON.parse(
    base64UrlDecode(payloadB64).toString()
  ) as JwtPayload;

  // Verify claims
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new AuthError("Token expired", 401);
  }

  const expectedIssuer = getIssuer();
  if (payload.iss !== expectedIssuer) {
    throw new AuthError("Invalid issuer", 401);
  }

  if (payload.token_use !== "access" && payload.token_use !== "id") {
    throw new AuthError("Invalid token_use", 401);
  }

  return payload;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function corsHeaders(): Record<string, string> {
  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Content-Type": "application/json",
  };
}

/** Reads the `exp` claim (seconds since epoch) out of a JWT without verifying
 * the signature -- the token was already issued to us by our own backend
 * over TLS, we just need the expiry to know when to refresh it. */
export function jwtExpiryMs(token: string): number {
  const payload = token.split(".")[1];
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  return decoded.exp * 1000;
}

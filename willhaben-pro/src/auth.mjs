import crypto from 'crypto';
import { loadConfig } from './config.mjs';

const sessions = new Map();
const SESSION_MS = 8 * 60 * 60 * 1000;

export function isAuthEnabled() {
  const pw = loadConfig().adminPanel?.password;
  return typeof pw === 'string' && pw.length > 0;
}

export function verifyPassword(password) {
  const expected = loadConfig().adminPanel?.password || '';
  if (!expected) return true;
  if (typeof password !== 'string') return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_MS);
  return { token, expiresAt: new Date(Date.now() + SESSION_MS).toISOString() };
}

export function isValidToken(token) {
  if (!isAuthEnabled()) return true;
  if (!token || typeof token !== 'string') return false;
  const exp = sessions.get(token);
  if (!exp) return false;
  if (Date.now() > exp) {
    sessions.delete(token);
    return false;
  }
  sessions.set(token, Date.now() + SESSION_MS);
  return true;
}

export function revokeToken(token) {
  if (token) sessions.delete(token);
}

export function getTokenFromRequest(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}

export function requireAuth(req, res) {
  if (!isAuthEnabled()) return true;
  if (isValidToken(getTokenFromRequest(req))) return true;
  jsonAuthError(res);
  return false;
}

function jsonAuthError(res) {
  res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Jelszó szükséges', authRequired: true }));
}

export function publicConfig(config) {
  const c = structuredClone(config);
  if (c.adminPanel?.password) {
    c.adminPanel = { ...c.adminPanel, password: '***' };
  }
  return c;
}

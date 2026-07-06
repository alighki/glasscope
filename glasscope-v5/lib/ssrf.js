import { URL } from 'url';
import dns from 'dns/promises';
const BLOCKED = [/^127\./,/^10\./,/^192\.168\./,/^172\.(1[6-9]|2\d|3[01])\./,/^0\./,/^169\.254\./,/^::1$/,/^fc00:/,/^fe80:/,/^localhost$/i,/^metadata\.google\.internal$/i,/^169\.254\.169\.254$/];
export async function validateURL(raw) {
  let p;
  try { p = new URL(raw); } catch { throw new Error('URL نامعتبر است'); }
  if (!['http:','https:'].includes(p.protocol)) throw new Error('فقط HTTP/HTTPS مجاز است');
  if (p.port && ['22','23','25','3306','5432','6379','27017'].includes(p.port)) throw new Error('پورت مجاز نیست');
  const host = p.hostname;
  for (const r of BLOCKED) if (r.test(host)) throw new Error('آدرس داخلی مجاز نیست');
  try { const addrs = await dns.resolve4(host); for (const ip of addrs) for (const r of BLOCKED) if (r.test(ip)) throw new Error('آدرس داخلی مجاز نیست'); } catch(e) { if (e.message.includes('داخلی')) throw e; }
  return p.href;
}

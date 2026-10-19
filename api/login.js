// 관리자 로그인/로그아웃 — 비밀번호는 Vercel 환경 변수 ADMIN_PASSWORD
import { json, fail, sleep, checkPassword, passwordConfigured, sessionCookie, clearCookie } from '../lib/store.js';
import { useRequestAuth } from '../lib/store.js';

export async function POST(request) {
  useRequestAuth(request);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  if (body.logout) return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
  if (!passwordConfigured()) return fail('관리자 비밀번호(ADMIN_PASSWORD 환경 변수, 6자 이상)가 설정되지 않았습니다.', 500);
  if (!checkPassword(body.password)) { await sleep(800); return json({ error: 'AUTH' }, 401); }
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie() });
}

// 공용 함수: Vercel Blob(비공개) 저장소 읽기·쓰기, 관리자 세션
import { put, get, list, del } from '@vercel/blob';
import crypto from 'node:crypto';

export const DEFAULT_CONFIG = {
  sites: [
    { name: '대구국가산단 A7-1BL 1공구 시공단계', leader: '채규숙' },
    { name: '아이센스 마곡 R&D', leader: '백승탁' },
    { name: '인천지방검찰청 북부지청 신축공사', leader: '김운용' },
    { name: 'LH_양산사송 A-6BL 및 B-1BL 민간참여 아파트 건설공사', leader: '윤태주' },
    { name: 'LH_도청이전신도시 RH12BL 건설공사 5공구', leader: '이종실' },
    { name: '일산병원 건강 통합관리센터 건립공사', leader: '양기영' },
    { name: 'LH_울산다운2 A-1, 2, 10BL 아파트', leader: '류재구' },
    { name: '충남형 도시리브투게더 첫사업', leader: '김두한' },
    { name: '조선대 호남권 감염병원', leader: '김영철' },
    { name: 'LH_남양주왕숙 A-3,B-1,B-2BL(민간참여)', leader: '정재현' },
    { name: '충남 국제전시컨벤션센터 건립공사', leader: '최정익' },
    { name: '고려대학교 안암병원 본관 1,2병동외벽 리모델링 및 수술부 증축공사', leader: '임채영' },
    { name: 'LH_의정부우정 A-1BL 아파트 건설공사 시공단계', leader: '김태익' },
    { name: '양산부산대학교병원 스마트 진료지원교육물류센터', leader: '이병택' },
    { name: '서남병원 증축 및 리모델링공사', leader: '덩종표' },
    { name: '평택 브레인시티 공동5BL 공동주택 신축공사', leader: '조영호' },
    { name: '곤지암역세권 A1-1BL 공동주택 신축공사', leader: '최종근' },
    { name: '광명제5R구역 주택재개발정비사업', leader: '김충현' },
    { name: '화성동탄2 A76-2, A78블록 주택건설사업', leader: '이광주' },
    { name: '24-A-00부대 건설사업관리용역(A137)', leader: '김수철' },
    { name: 'LH_충남도청이전도시 RH15BL 아파트 건설공사', leader: '이장무' },
    { name: '판교 제2테크노벨리 스마트모빌리티 실증허브 조성사업', leader: '박민우' },
    { name: '도시정비본부_잠실5단지', leader: '최배근' }
  ],
  devices: ['A8', 'Active5'],
  gradeA: 70,
  gradeB: 40,
  deadline: ''
};

const PRIVATE = { access: 'private' };
export const CONFIG_PATH = 'config/settings.json';
export const PHOTO_ID = /^[a-f0-9]{24}$/;

/* ---------- 저장소 인증 ---------- */
// Vercel이 요청마다 넘겨주는 OIDC 토큰을 SDK가 읽을 수 있게 환경 변수로 옮겨 둠
export function useRequestAuth(request) {
  const t = request && request.headers && request.headers.get('x-vercel-oidc-token');
  if (t) process.env.VERCEL_OIDC_TOKEN = t;
}
export function storeProblem(e) {
  const m = String((e && e.message) || e || '');
  if (/No blob credentials|No read-write token|storeId/i.test(m)) return 'Blob 저장소가 이 프로젝트에 연결되지 않았거나, 연결한 뒤 다시 배포(Redeploy)하지 않았습니다.';
  if (/access|private|public/i.test(m)) return 'Blob 저장소의 접근 방식이 Private인지 확인하세요. (' + m.slice(0, 160) + ')';
  return m.slice(0, 200);
}

/* ---------- 응답 도우미 ---------- */
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
  });
}
export const fail = (message, status = 400) => json({ error: message }, status);
export const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Blob 저장소 ---------- */
export async function putJson(pathname, data, overwrite = false) {
  return put(pathname, JSON.stringify(data), { ...PRIVATE, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: overwrite });
}
export async function putPhoto(pathname, buffer, contentType) {
  return put(pathname, buffer, { ...PRIVATE, contentType, addRandomSuffix: false, allowOverwrite: false });
}
export async function readJson(pathname, fresh = false) {
  const r = await get(pathname, fresh ? { ...PRIVATE, useCache: false } : PRIVATE);
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}
export async function readBlob(pathname) {
  const r = await get(pathname, PRIVATE);
  return r && r.statusCode === 200 ? r : null;
}
export async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}
export async function remove(pathnames) {
  const paths = pathnames.filter(Boolean);
  if (paths.length) await del(paths);
}
export async function getConfig() {
  try { return normalizeConfig((await readJson(CONFIG_PATH, true)) || DEFAULT_CONFIG); } catch (e) { return DEFAULT_CONFIG; }
}
export function normalizeConfig(c) {
  const out = {
    sites: (Array.isArray(c.sites) ? c.sites : []).filter(s => s && s.name).slice(0, 500).map(s => ({ name: String(s.name).slice(0, 120), leader: String(s.leader || '').slice(0, 40) })),
    devices: (Array.isArray(c.devices) ? c.devices : []).map(String).filter(Boolean).slice(0, 30),
    gradeA: Number(c.gradeA) || 70,
    gradeB: Number.isFinite(Number(c.gradeB)) ? Number(c.gradeB) : 40,
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(c.deadline || '') ? c.deadline : ''
  };
  if (!out.devices.length) out.devices = DEFAULT_CONFIG.devices.slice();
  return out;
}
// 응답 파일 경로: responses/<현장 키>/<응답ID>.json — 목록만 보고도 참여 현장 수를 셀 수 있게 현장명을 경로에 넣음
export const siteKey = site => crypto.createHash('sha1').update(String(site)).digest('hex').slice(0, 16);
export const responsePath = (site, rid) => `responses/${siteKey(site)}/${rid}.json`;
export const photoPaths = id => [`photos/${id}.jpg`, `photos/${id}_t.jpg`];

export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

/* ---------- 관리자 세션 (ADMIN_PASSWORD로 서명한 쿠키) ---------- */
const COOKIE = 'smartcm_admin';
const SESSION_HOURS = 12;
const sign = v => crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || '').update(v).digest('base64url');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

export function passwordConfigured() { return (process.env.ADMIN_PASSWORD || '').length >= 6; }
export function checkPassword(p) {
  if (!passwordConfigured() || typeof p !== 'string') return false;
  return same(sign('pw:' + p), sign('pw:' + process.env.ADMIN_PASSWORD));
}
export function sessionCookie() {
  const exp = String(Date.now() + SESSION_HOURS * 3600e3);
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export function isAdmin(request) {
  if (!passwordConfigured()) return false;
  const raw = (request.headers.get('cookie') || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (!raw) return false;
  const [exp, mac] = raw.slice(COOKIE.length + 1).split('.');
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  return same(mac, sign(exp));
}

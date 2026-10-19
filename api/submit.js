// 누구나: 설문 1건 제출 → responses/<현장 키>/<응답ID>.json
import { json, fail, putJson, responsePath, PHOTO_ID } from '../lib/store.js';
import { useRequestAuth } from '../lib/store.js';

const str = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';

export async function POST(request) {
  useRequestAuth(request);
  let body;
  try { body = await request.json(); } catch (e) { return fail('잘못된 요청입니다.'); }
  const r = body && body.resp;
  if (!r || typeof r !== 'object' || !/^[a-z0-9]{6,40}$/.test(String(r.rid || ''))) return fail('잘못된 요청입니다.');
  const info = r.info || {};
  if (!str(info.site, 200) || !str(info.inspector, 60)) return fail('현장명과 점검자 이름은 필수입니다.');
  const photos = {};
  Object.keys(r.photos || {}).slice(0, 30).forEach(k => {
    const ids = (Array.isArray(r.photos[k]) ? r.photos[k] : []).filter(id => PHOTO_ID.test(String(id))).slice(0, 6);
    if (ids.length) photos[String(k).slice(0, 12)] = ids;
  });
  const clean = {
    rid: r.rid, v: 1, year: 2026,
    submittedAt: str(r.submittedAt, 40), receivedAt: new Date().toISOString(),
    info: {
      site: str(info.site, 200), leader: str(info.leader, 60), device: str(info.device, 60), inspector: str(info.inspector, 60),
      date: /^\d{4}-\d{2}-\d{2}$/.test(info.date || '') ? info.date : new Date().toISOString().slice(0, 10),
      startMonth: /^\d{4}-\d{2}$/.test(info.startMonth || '') ? info.startMonth : '',
      trade: str(info.trade, 20), users: Number.isFinite(Number(info.users)) && info.users !== null && info.users !== '' ? Number(info.users) : null
    },
    a: r.a && typeof r.a === 'object' ? r.a : {},
    photos,
    score: Number(r.score) || 0
  };
  const text = JSON.stringify(clean);
  if (text.length > 100000) return fail('응답 내용이 너무 깁니다.');
  try {
    await putJson(responsePath(clean.info.site, clean.rid), clean, false);
  } catch (e) {
    if (/exist/i.test(String(e && e.message))) return json({ ok: true, duplicate: true });
    console.error(e);
    return fail('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 500);
  }
  return json({ ok: true });
}

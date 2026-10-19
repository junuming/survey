// 관리자 전용: 전체 응답 조회, 응답 삭제(사진 포함), 설정 저장
import { json, fail, isAdmin, listAll, readJson, putJson, remove, getConfig, normalizeConfig, mapLimit, photoPaths, CONFIG_PATH, PHOTO_ID } from '../lib/store.js';
import { useRequestAuth } from '../lib/store.js';

export async function GET(request) {
  useRequestAuth(request);
  if (!isAdmin(request)) return json({ error: 'AUTH' }, 401);
  try {
    const blobs = await listAll('responses/');
    const rows = await mapLimit(blobs, 16, async b => {
      try { return await readJson(b.pathname); } catch (e) { return null; }
    });
    return json({ responses: rows.filter(r => r && r.info), config: await getConfig() });
  } catch (e) {
    console.error(e);
    return fail('응답을 불러오지 못했습니다.', 500);
  }
}

export async function POST(request) {
  useRequestAuth(request);
  if (!isAdmin(request)) return json({ error: 'AUTH' }, 401);
  let body;
  try { body = await request.json(); } catch (e) { return fail('잘못된 요청입니다.'); }

  if (body.action === 'delete') {
    const rid = String(body.rid || '');
    if (!/^[a-z0-9]{6,40}$/.test(rid)) return fail('잘못된 요청입니다.');
    const blobs = await listAll('responses/');
    const hit = blobs.find(b => b.pathname.endsWith('/' + rid + '.json'));
    if (!hit) return json({ ok: false });
    const r = await readJson(hit.pathname).catch(() => null);
    const photos = [];
    Object.values((r && r.photos) || {}).forEach(ids => (ids || []).forEach(id => { if (PHOTO_ID.test(id)) photos.push(...photoPaths(id)); }));
    await remove([hit.pathname, ...photos]);
    return json({ ok: true });
  }

  if (body.action === 'config') {
    const c = normalizeConfig(body.config || {});
    if (!(c.gradeA > c.gradeB && c.gradeB >= 0 && c.gradeA <= 100)) return fail('A등급 기준은 B등급 기준보다 커야 합니다.');
    await putJson(CONFIG_PATH, c, true);
    return json(c);
  }

  return fail('알 수 없는 요청입니다.');
}

// 관리자 전용: 비공개 저장소의 사진을 보여줌. ?id=<사진ID>&t=1 이면 썸네일
import { fail, isAdmin, readBlob, photoPaths, PHOTO_ID } from '../lib/store.js';

export async function GET(request) {
  if (!isAdmin(request)) return fail('AUTH', 401);
  const q = new URL(request.url).searchParams;
  const id = q.get('id') || '';
  if (!PHOTO_ID.test(id)) return fail('잘못된 요청입니다.');
  const [full, thumb] = photoPaths(id);
  let r = q.get('t') ? await readBlob(thumb).catch(() => null) : null;
  if (!r) r = await readBlob(full).catch(() => null);
  if (!r) return fail('사진이 없습니다.', 404);
  return new Response(r.stream, {
    headers: {
      'Content-Type': r.blob.contentType || 'image/jpeg',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=86400'
    }
  });
}

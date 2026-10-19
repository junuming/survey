// 누구나: 설문 사진 올리기(원본 + 썸네일)와, 제출 전에 지운 사진 삭제
import crypto from 'node:crypto';
import { json, fail, putPhoto, remove, photoPaths, PHOTO_ID } from '../lib/store.js';

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request) {
  const type = (request.headers.get('content-type') || '').split(';')[0].trim();
  if (!/^image\/(jpeg|png|webp)$/.test(type)) return fail('사진 파일만 올릴 수 있습니다.', 415);
  const buf = Buffer.from(await request.arrayBuffer());
  if (buf.length < 100) return fail('빈 파일입니다.');
  if (buf.length > MAX_BYTES) return fail('사진 용량이 너무 큽니다.', 413);
  const thumbOf = new URL(request.url).searchParams.get('thumbOf');
  try {
    if (thumbOf) {
      if (!PHOTO_ID.test(thumbOf)) return fail('잘못된 요청입니다.');
      await putPhoto(photoPaths(thumbOf)[1], buf, type);
      return json({ ok: true });
    }
    const id = crypto.randomBytes(12).toString('hex');
    await putPhoto(photoPaths(id)[0], buf, type);
    return json({ id });
  } catch (e) {
    console.error(e);
    return fail('사진을 저장하지 못했습니다.', 500);
  }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!PHOTO_ID.test(id)) return fail('잘못된 요청입니다.');
  try { await remove(photoPaths(id)); } catch (e) { console.error(e); }
  return json({ ok: true });
}

// 설정 점검용: 비밀값은 보여주지 않고 '있음/없음'과 저장소 연결 결과만 알려줌
import { list } from '@vercel/blob';
import { json, useRequestAuth, storeProblem, passwordConfigured } from '../lib/store.js';

export async function GET(request) {
  useRequestAuth(request);
  const env = {
    BLOB_STORE_ID: !!process.env.BLOB_STORE_ID,
    BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
    VERCEL_OIDC_TOKEN: !!process.env.VERCEL_OIDC_TOKEN,
    ADMIN_PASSWORD: passwordConfigured()
  };
  let store = 'ok';
  try { await list({ prefix: 'responses/', limit: 1 }); } catch (e) { store = storeProblem(e); }
  return json({ ok: store === 'ok' && env.ADMIN_PASSWORD, store, env });
}

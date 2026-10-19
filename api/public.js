// 누구나: 설문 설정(현장 목록 등)과 전체 제출 건수·참여 현장 수만 돌려줌. 개별 점수는 없음.
import { json, fail, getConfig, listAll, storeProblem } from '../lib/store.js';
import { useRequestAuth } from '../lib/store.js';

export async function GET(request) {
  useRequestAuth(request);
  try {
    const [config, blobs] = await Promise.all([getConfig(), listAll('responses/')]);
    const sites = new Set(blobs.map(b => b.pathname.split('/')[1]));
    return json({ config, total: blobs.length, sites: sites.size });
  } catch (e) {
    console.error(e);
    return fail('저장소에 연결하지 못했습니다. ' + storeProblem(e), 500);
  }
}

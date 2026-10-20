// 오프라인용 서비스 워커
// - 화면(index.html)은 인터넷이 되면 항상 최신으로 받고, 안 되면 기기에 저장된 사본을 씀
// - /api/ 요청은 저장하지 않음 (응답·사진은 화면 쪽에서 기기에 보관했다가 보냄)
const SHELL_CACHE = 'smartcm-shell-v1';
const CDN_CACHE = 'smartcm-cdn';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];
const CDN_HOSTS = /^(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;
const NAV_TIMEOUT_MS = 4000;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('smartcm-') && k !== SHELL_CACHE && k !== CDN_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) return;

    // 페이지 열기: 인터넷 우선(약한 신호면 4초 뒤 저장본), 실패하면 저장본
    if (req.mode === 'navigate') {
      const live = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(SHELL_CACHE).then(c => c.put('/', copy)); }
        return res;
      });
      event.respondWith(
        withTimeout(live, NAV_TIMEOUT_MS)
          .catch(() => caches.match('/').then(hit => hit || live))
      );
      return;
    }

    // 아이콘·매니페스트 등: 저장본 우선
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(SHELL_CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // 글꼴·라이브러리: 한 번 받은 것은 저장해 두고 씀
  if (CDN_HOSTS.test(url.hostname)) {
    event.respondWith(
      caches.open(CDN_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      })))
    );
  }
});

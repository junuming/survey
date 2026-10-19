# 스마트CM 태블릿PC 연말 사용 보고

현장용 설문(사진 첨부)과 관리자 대시보드가 하나로 묶인 웹사이트입니다. GitHub에 올리고 Vercel로 배포합니다.

- 현장: 로그인 없이 링크나 QR로 설문을 제출합니다. 다른 현장의 점수는 볼 수 없습니다.
- 관리자: 같은 사이트의 [관리자]에서 비밀번호로 대시보드를 엽니다. 응답 개별 삭제, CSV·사진 ZIP 내려받기, 현장 공유(링크·안내문·QR), 설정(현장 목록·마감일·등급 기준)을 할 수 있습니다.
- 저장: 응답과 사진은 Vercel Blob **비공개(Private)** 저장소에 들어갑니다. 사진은 관리자 로그인 상태에서만 열립니다.

## 배포 순서

### 1. GitHub에 올리기
1. GitHub에서 [New repository]로 새 저장소를 만듭니다. 예: `smartcm-tablet-yearend`, **Private** 권장.
2. 저장소 화면의 [uploading an existing file](또는 [Add file] > [Upload files])을 누릅니다.
3. 압축을 푼 폴더 안의 내용(`index.html`, `api` 폴더, `lib` 폴더, `package.json`, `README.md`, `.gitignore`)을 끌어다 놓고 [Commit changes]를 누릅니다.
   - `api`, `lib` 폴더가 폴더째 올라갔는지 확인하세요.

### 2. Vercel에 배포하기
1. vercel.com 에 GitHub 계정으로 로그인하고 [Add New…] > [Project]를 누릅니다.
2. 방금 만든 저장소를 [Import]합니다. Framework Preset은 **Other** 그대로 두고 [Deploy]를 누릅니다.

### 3. 저장소(Blob) 연결
1. 배포된 프로젝트에서 [Storage] 탭 > [Create] > **Blob**을 고릅니다.
2. 접근 방식(Access)을 **Private**로 고르고 만든 뒤, 이 프로젝트에 연결합니다(모든 환경).

### 4. 관리자 비밀번호 설정
1. [Settings] > [Environment Variables]에서 아래 값을 추가합니다.
   - Name: `ADMIN_PASSWORD`
   - Value: 6자 이상의 관리자 비밀번호 (현장에는 알려주지 마세요)
2. [Deployments] 탭에서 최신 배포의 [⋯] > [Redeploy]를 눌러 다시 배포합니다. 환경 변수와 저장소는 다시 배포해야 적용됩니다.

### 5. 확인
1. `https://<프로젝트>.vercel.app` 을 열어 홈 화면이 나오는지 봅니다.
2. 오른쪽 위 [관리자]에서 비밀번호로 로그인합니다. 응답이 없을 때 대시보드는 샘플 데이터로 채워집니다.
3. [현장 공유]에서 설문 링크(`/?page=survey`), 안내문, QR 코드를 복사해 현장에 보냅니다.
4. 현장 한 곳에서 사진까지 포함해 1건을 먼저 제출해 보고, 대시보드에 들어오는지 확인한 뒤 전체 발송하세요.

## 수정하고 다시 배포하기
GitHub 저장소의 파일을 고쳐 커밋하면 Vercel이 자동으로 다시 배포합니다. 주소는 바뀌지 않습니다.

## 구조

| 경로 | 역할 |
| --- | --- |
| `index.html` | 화면 전체 (홈, 설문, 관리자 대시보드) |
| `api/public.js` | 설문 설정과 전체 제출 건수·참여 현장 수 (누구나) |
| `api/upload.js` | 사진 올리기·삭제 (누구나, 제출 전 사진만) |
| `api/submit.js` | 설문 제출 (누구나) |
| `api/login.js` | 관리자 로그인·로그아웃 (쿠키 12시간) |
| `api/admin.js` | 전체 응답 조회, 응답 삭제, 설정 저장 (관리자) |
| `api/photo.js` | 사진 보기 (관리자) |
| `lib/store.js` | 저장소 읽기·쓰기, 기본 현장 목록, 관리자 세션 |

Blob 저장소 안의 위치는 다음과 같습니다.

- 응답: `responses/<현장 키>/<응답ID>.json`
- 사진: `photos/<사진ID>.jpg` (썸네일 `photos/<사진ID>_t.jpg`)
- 설정: `config/settings.json` (없으면 `lib/store.js`의 기본값 사용)

## 알아둘 점
- Vercel Hobby(무료) 요금제는 개인·비상업 용도로 제한됩니다. 회사 업무용으로 계속 쓰려면 Pro 요금제가 필요할 수 있습니다.
- 사진은 올리기 전에 브라우저에서 긴 변 1920px JPEG로 줄입니다(장당 1MB 안팎). 서버 한도는 장당 4MB입니다.
- 관리자 비밀번호를 바꾸면 기존 관리자 로그인이 모두 풀립니다.
- 현장의 '이 기기의 제출 내역'은 그 기기 브라우저에만 저장됩니다.
- 로컬에서 실행하려면 Vercel CLI로 프로젝트를 연결한 뒤 `vercel env pull` 후 `vercel dev`를 실행합니다.

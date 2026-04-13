# 🔧 ngrok 오류 해결 가이드 (ERR_NGROK_3200)

## 📋 현재 상태

✅ **백엔드 ngrok**: 실행 중
- URL: `https://5c19edbb7a3c.ngrok-free.app`
- 포트: 8000
- 상태: 정상 작동

✅ **프론트엔드 서버**: 실행 중
- URL: `http://localhost:3000`
- 상태: 정상 작동

❌ **오류 URL**: `6234ff34a39f.ngrok-free.app`
- 상태: 오프라인 (오래된 ngrok URL)

---

## 🔍 문제 원인

`ERR_NGROK_3200` 오류는 ngrok 터널이 오프라인 상태일 때 발생합니다.

오류에 표시된 URL `6234ff34a39f.ngrok-free.app`은:
- 오래된 ngrok URL이거나
- 종료된 ngrok 터널의 URL입니다

---

## ✅ 해결 방법

### 방법 1: 로컬에서 접근 (가장 간단)

프론트엔드를 로컬에서 실행 중이므로, 브라우저에서 다음 URL로 접근하세요:

```
http://localhost:3000
```

또는 특정 페이지:
```
http://localhost:3000/instagram-integration-console
http://localhost:3000/onboard/meta
```

---

### 방법 2: 프론트엔드용 ngrok 터널 생성 (외부 접근 필요 시)

외부에서 프론트엔드에 접근해야 하는 경우:

1. **새 터미널 열기**

2. **프론트엔드용 ngrok 실행**
```bash
ngrok http 3000
```

3. **새 ngrok URL 확인**
터미널에 표시되는 URL:
```
Forwarding  https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:3000
```

4. **브라우저에서 새 URL로 접근**
```
https://xxxx-xxxx-xxxx.ngrok-free.app/instagram-integration-console
```

---

### 방법 3: 백엔드 ngrok URL만 사용

프론트엔드는 로컬에서 실행하고, API 호출만 ngrok URL을 사용하는 경우:

1. **프론트엔드 config.js 확인**
   - 파일: `frontend/src/lib/config.js`
   - 현재 백엔드 ngrok URL: `https://5c19edbb7a3c.ngrok-free.app`
   - ✅ 이미 올바르게 설정되어 있습니다

2. **브라우저에서 로컬 프론트엔드 접근**
   ```
   http://localhost:3000
   ```

3. **프론트엔드는 로컬에서 실행되고, API 호출은 백엔드 ngrok URL로 자동 전송됩니다**

---

## 🔄 ngrok URL 변경 시 업데이트 필요 사항

ngrok URL이 변경되면 다음을 업데이트해야 합니다:

### 1. 프론트엔드 config.js (백엔드 ngrok URL)

```javascript
// frontend/src/lib/config.js
const backendNgrokUrl = "https://새-ngrok-url.ngrok-free.app"
```

### 2. 환경 변수 (선택사항)

`.env` 파일에 설정:
```bash
REACT_APP_INSTAGRAM_API_BASE_URL=https://새-ngrok-url.ngrok-free.app
```

### 3. Facebook/Meta 개발자 콘솔 (웹훅 설정)

웹훅 URL 업데이트:
1. [Facebook Developers Console](https://developers.facebook.com/) 접속
2. 앱 선택
3. Webhooks 섹션으로 이동
4. Callback URL을 새 ngrok URL로 업데이트:
   ```
   https://새-ngrok-url.ngrok-free.app/instagram/webhook
   ```

---

## 🧪 현재 ngrok 상태 확인

### 백엔드 ngrok 확인
```bash
curl http://localhost:4040/api/tunnels
```

또는 브라우저에서:
```
http://localhost:4040
```

### ngrok 프로세스 확인
```bash
ps aux | grep ngrok
```

---

## 💡 권장 설정

### 로컬 개발 환경
- 프론트엔드: `http://localhost:3000` (ngrok 불필요)
- 백엔드: `http://localhost:8000` 또는 ngrok URL
- API 호출: 프론트엔드는 config.js에서 자동으로 백엔드 ngrok URL 사용

### 외부 접근이 필요한 경우
- 프론트엔드: `ngrok http 3000` (새 터미널)
- 백엔드: `ngrok http 8000` (현재 실행 중)
- 두 개의 ngrok 터널이 필요합니다

---

## ⚠️ 주의사항

1. **ngrok 무료 계정 제한**
   - 동시에 2개 터널만 실행 가능
   - URL은 ngrok 재시작 시마다 변경됨
   - 8시간 세션 제한

2. **브라우저 캐시**
   - 오래된 ngrok URL이 브라우저에 캐시되어 있을 수 있습니다
   - 브라우저 캐시를 지우거나 시크릿 모드로 접근해보세요

3. **고정 URL이 필요한 경우**
   - ngrok 유료 플랜 필요
   - 또는 실제 도메인과 SSL 인증서 설정

---

## 📝 현재 설정 요약

✅ **백엔드 ngrok**: `https://5c19edbb7a3c.ngrok-free.app` (포트 8000)
✅ **프론트엔드 config.js**: 백엔드 ngrok URL 올바르게 설정됨
✅ **프론트엔드 서버**: `http://localhost:3000` 실행 중

**추천 접근 방법**: `http://localhost:3000`로 접근하세요!


# Instagram Auth Service Frontend

인스타그램 연동을 위한 프론트엔드 애플리케이션입니다.

## 설치

```bash
npm install
```

## 실행

```bash
npm start
```

프론트엔드 서버가 http://localhost:3000 에서 실행됩니다.

## 환경 변수 설정

`.env` 파일을 생성하고 다음을 설정하세요:

```
REACT_APP_INSTAGRAM_API_BASE_URL=http://localhost:8000
```

ngrok 사용 시:
```
REACT_APP_INSTAGRAM_API_BASE_URL=https://your-ngrok-url.ngrok-free.app
```

## 주요 페이지

- `/onboard/meta` - Meta 온보딩 페이지
- `/instagram-integration-console` - 통합 콘솔 (메인)
- `/instagram-integration-guide` - 연동 가이드




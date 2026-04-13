# 사용자 플로우 (User Flow)

## 전체 플로우 개요

```
첫 방문 → 로그인/회원가입 → Meta OAuth 인증 → Instagram 계정 연동 → 대시보드
   ↓                                                                      ↑
재방문 (customer_id 있음) ────────────────────────────────────────────────┘
```

## 상세 플로우

### 1. 첫 방문 (신규 사용자)

```
[/] (InstagramIntegrationConsole)
  ↓
[워크스페이스 정보 입력]
  - 이름, 이메일, 전화번호 등
  ↓
[Google 로그인] (선택)
  ↓
[Meta(Facebook) 로그인 시작]
  ↓
[/auth/meta/login?use_business_login=false]
  ↓
[Facebook OAuth 인증 화면]
  - pages_show_list
  - pages_read_engagement
  - pages_manage_metadata
  - instagram_basic
  - instagram_manage_messages
  - pages_messaging
  ↓
[/auth/meta/callback?code=xxx]
  ↓
[/onboard/meta?customer_id=xxx&meta_logged_in=true]
  ↓
[Instagram 계정 선택 및 연동]
  - Facebook Page 선택
  - 연결된 Instagram Business Account 확인
  - "연동 확정" 버튼 클릭
  ↓
[localStorage에 customer_id 저장]
  ↓
[3초 대기 (웹훅 상태/인사이트 로드)]
  ↓
[자동 리다이렉트: /dashboard]
```

### 2. 재방문 (기존 사용자)

```
[/] (InstagramIntegrationConsole)
  ↓
[localStorage에서 customer_id 확인]
  ↓
[customer_id가 있으면?]
  ↓
[자동 리다이렉트: /dashboard]
```

### 3. 대시보드 접근 제어

```
[/dashboard 접근 시도]
  ↓
[PrivateRoute 체크]
  ↓
[localStorage에 customer_id 있음?]
  - 있음 → Dashboard 표시
  - 없음 → / 로 리다이렉트 (로그인 필요)
```

### 4. 로그아웃

```
[Dashboard 우측 상단 프로필 메뉴]
  ↓
["로그아웃" 클릭]
  ↓
[localStorage에서 customer_id 제거]
  ↓
[/ 로 리다이렉트]
```

## 주요 컴포넌트 역할

### 1. InstagramIntegrationConsole (`/`)
- **역할**: 로그인/회원가입 페이지
- **상태 체크**: customer_id가 있으면 /dashboard로 자동 이동 (PublicRoute)
- **기능**:
  - 워크스페이스 생성 (이름, 이메일, 전화번호 입력)
  - Google 로그인 (선택)
  - Meta(Facebook) 로그인 시작

### 2. InstagramMetaOnboard (`/onboard/meta`)
- **역할**: OAuth 콜백 + Instagram 계정 연동
- **기능**:
  - Meta OAuth 완료 후 customer_id 수신
  - 고객 정보 입력 (신규 고객인 경우)
  - Instagram Business Account 선택
  - 계정 연동 완료 후:
    - localStorage에 customer_id 저장
    - 3초 후 /dashboard로 자동 이동

### 3. Dashboard (`/dashboard`)
- **역할**: 메인 대시보드
- **상태 체크**: customer_id가 없으면 /로 자동 이동 (PrivateRoute)
- **기능**:
  - 통계 표시 (응답 시간, 자동응답 커버리지 등)
  - 메뉴: Inbox, Flows, Campaigns, Contacts, Templates, Reports, Settings
  - 로그아웃 기능

### 4. PrivateRoute & PublicRoute
- **PrivateRoute**: 로그인 필요 페이지 보호 (customer_id 필수)
- **PublicRoute**: 이미 로그인된 사용자를 대시보드로 이동

## localStorage 데이터 구조

```javascript
// 로그인 상태 저장
localStorage.setItem('customer_id', 'uuid-here')

// 로그아웃 시 제거
localStorage.removeItem('customer_id')
```

## 백엔드 API 엔드포인트

### 인증 관련
- `GET /auth/meta/login?use_business_login=false` - Meta OAuth 시작
- `GET /auth/meta/callback?code=xxx` - Meta OAuth 콜백

### 고객 관리
- `POST /customers/workspace` - 워크스페이스 생성
- `GET /customers/{customer_id}/status` - 고객 상태 조회

### Instagram 계정 관리
- `GET /instagram/accounts/options?customer_id=xxx` - 연결 가능한 IG 계정 목록
- `POST /instagram/accounts/link` - IG 계정 연동
- `GET /instagram/accounts/{customer_id}/webhook-status` - 웹훅 구독 상태
- `GET /instagram/accounts/{customer_id}/page-insights` - 페이지 인사이트

## 보안 고려사항

1. **customer_id 보안**
   - localStorage 저장 (XSS 취약점 주의)
   - 향후 httpOnly 쿠키 또는 세션 기반 인증 고려

2. **토큰 갱신**
   - Meta Access Token은 백엔드에서 관리
   - 프론트엔드는 customer_id만 보관

3. **OAuth State 검증**
   - 백엔드에서 state 파라미터 검증
   - CSRF 공격 방지

## 향후 개선 사항

1. **JWT 기반 인증**
   - localStorage의 customer_id → JWT 토큰으로 전환
   - httpOnly 쿠키 사용

2. **자동 로그인 유지**
   - Refresh Token 구현
   - Access Token 만료 시 자동 갱신

3. **멀티 워크스페이스 지원**
   - 한 사용자가 여러 워크스페이스 관리
   - 워크스페이스 전환 UI

4. **권한 관리 (RBAC)**
   - 관리자, 매니저, 에이전트 역할 구분
   - 기능별 접근 제어


# OAuth 권한 확인 가이드

## ⚠️ 중요: 권한 동의 화면에 나타나지 않는 경우

`pages_read_engagement`와 `pages_manage_metadata` 권한이 OAuth URL에 포함되어 있어도, **Meta 앱 설정에서 이 권한들이 "Advanced Access"로 설정되어 있으면 권한 동의 화면에 나타나지 않을 수 있습니다.**

## 확인 방법

### 1. OAuth URL 확인

백엔드 로그에서 OAuth URL 생성 시 다음 로그를 확인하세요:

```
🔍 OAuth Authorization URL 생성 (검수용)
   요청된 권한 목록:
   ⭐  1. pages_show_list
   ⭐  2. pages_read_engagement  ← 이게 있어야 함
   ⭐  3. pages_manage_metadata   ← 이게 있어야 함
   ...
```

### 2. Meta 앱 설정 확인

1. **Facebook 개발자 콘솔 접속**
   - https://developers.facebook.com/apps/
   - 앱 선택

2. **권한 및 기능 확인**
   - 왼쪽 메뉴: "앱 검수" → "권한 및 기능"
   - `pages_read_engagement` 찾기
   - `pages_manage_metadata` 찾기

3. **접근 수준 확인**
   - 각 권한의 "접근 수준" 확인:
     - **Standard Access**: 모든 사용자에게 권한 동의 화면에 나타남
     - **Advanced Access**: 앱 검수 승인 후에만 권한 동의 화면에 나타남

### 3. 실제 OAuth URL 테스트

1. **OAuth URL 생성**
   ```
   GET /auth/meta/login?use_business_login=false
   ```

2. **응답에서 `authorization_url` 복사**

3. **브라우저에서 직접 접속**
   - URL을 브라우저 주소창에 붙여넣기
   - 로그인 후 권한 동의 화면 확인
   - `pages_read_engagement`, `pages_manage_metadata`가 목록에 있는지 확인

## 문제 해결

### 문제 1: 권한이 OAuth URL에 포함되어 있지만 화면에 나타나지 않음

**원인**: Meta 앱 설정에서 이 권한들이 "Advanced Access"로 설정되어 있음

**해결 방법**:
1. Meta 앱 검수 제출 (이미 진행 중)
2. 검수 승인 후 권한 동의 화면에 나타남
3. 또는 테스트 계정으로는 나타나지 않을 수 있음 (앱이 Live 모드여도)

### 문제 2: 권한이 OAuth URL에 포함되지 않음

**원인**: `.env` 파일의 `META_REQUIRED_SCOPES`에 권한이 없음

**해결 방법**:
1. `.env` 파일 확인:
   ```
   META_REQUIRED_SCOPES=pages_show_list,pages_read_engagement,pages_manage_metadata,...
   ```

2. 백엔드 재시작

### 문제 3: 권한이 화면에 나타나지만 사용자가 거부함

**원인**: 이전에 권한을 거부한 경우

**해결 방법**:
1. `auth_type=rerequest,reauthenticate` 파라미터가 OAuth URL에 포함되어 있음
2. 이 파라미터로 인해 거부된 권한을 다시 요청할 수 있음
3. 하지만 앱이 검수되지 않았으면 여전히 나타나지 않을 수 있음

## 검수용 스크린캐스트 제작 시 주의사항

### 현재 상황 (앱 검수 대기 중)

1. **권한 동의 화면에 나타나지 않을 수 있음**
   - `pages_read_engagement`, `pages_manage_metadata`가 "Advanced Access"인 경우
   - 앱 검수 승인 전에는 테스트 계정으로도 나타나지 않을 수 있음

2. **대안 방법**
   - **Graph API Explorer 사용**: 
     - https://developers.facebook.com/tools/explorer/
     - 앱 선택 → "Generate Access Token" → 권한 선택 화면에서 `pages_read_engagement`, `pages_manage_metadata` 확인
     - 이 화면을 스크린캐스트에 포함
   
   - **앱 검수 제출 노트에 명시**:
     ```
     Note: pages_read_engagement and pages_manage_metadata are Advanced Access permissions.
     These permissions will appear in the OAuth consent screen after App Review approval.
     For the screencast, we demonstrate the permission request flow using Graph API Explorer
     and show how the app uses these permissions after they are granted.
     ```

### 검수 승인 후

1. **권한 동의 화면에 나타남**
   - 앱 검수 승인 후 실제 OAuth 플로우에서 권한 동의 화면에 나타남
   - 이때 스크린캐스트를 다시 제작하면 완벽함

## 체크리스트

스크린캐스트 제작 전 확인:

- [ ] 백엔드 로그에서 OAuth URL에 `pages_read_engagement`, `pages_manage_metadata` 포함 확인
- [ ] Meta 앱 설정에서 이 권한들의 접근 수준 확인 (Standard/Advanced)
- [ ] 실제 OAuth URL로 접속하여 권한 동의 화면 확인
- [ ] 권한이 나타나지 않으면 Graph API Explorer 화면 포함
- [ ] 앱 검수 제출 노트에 권한 접근 수준 명시


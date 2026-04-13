# 웹훅 감지 실패 원인 분석

## 전체 플로우 개요

```
1. 로그인 플로우 (OAuth)
   ↓
2. Instagram 계정 연동 (page_id, instagram_user_id, access_token 저장)
   ↓
3. 웹훅 구독 (subscribe_page_to_webhook)
   ↓
4. 웹훅 수신 (instargram_google_cloud의 /instagram/webhook)
   ↓
5. 고객 식별 (page_id로 instagram-auth-service API 호출)
   ↓
6. 메시지 처리
```

## 문제점 분석

### 1. 웹훅 구독 문제

**위치**: `instagram-auth-service/app/services/meta_oauth.py`의 `subscribe_page_to_webhook` 메서드

**문제 가능성**:
- 웹훅 구독이 실패했지만 에러가 무시되고 있을 수 있음
- 웹훅 URL이 잘못 설정되었을 수 있음
- Page Access Token이 없어서 구독이 실패했을 수 있음

**확인 방법**:
```python
# instagram-auth-service에서 웹훅 구독 상태 확인
GET /instagram/accounts/{customer_id}/webhook-status
```

### 2. page_id 저장 문제

**위치**: `instagram-auth-service/app/services/token_store.py`의 `save_instagram_account` 메서드

**문제 가능성**:
- OAuth 과정에서 page_id를 찾지 못했을 수 있음
- page_id가 None으로 저장되었을 수 있음
- 여러 계정이 있을 때 잘못된 page_id가 저장되었을 수 있음

**확인 방법**:
```python
# DB에서 page_id 확인
SELECT customer_id, page_id, instagram_user_id, access_token 
FROM instagram_accounts 
WHERE customer_id = 'xxx';
```

### 3. integration_status 문제

**위치**: `instagram-auth-service/app/routers/instagram_accounts.py`의 `get_account_by_page_id` 메서드

**문제 가능성**:
- 고객의 `integration_status`가 `APPROVED`가 아닐 수 있음
- 웹훅 API는 `APPROVED` 상태인 고객만 조회함

**확인 방법**:
```python
# DB에서 integration_status 확인
SELECT id, name, integration_status 
FROM customers 
WHERE id = 'xxx';
```

### 4. 웹훅에서 받은 page_id와 DB의 page_id 불일치

**위치**: 
- 웹훅 수신: `instargram_google_cloud/.../main.py`의 `instagram_webhook_receive`
- 고객 식별: `instargram_google_cloud/.../instagram_ai_bridge.py`의 `_handle_single_message`

**문제 가능성**:
- 웹훅의 `entry.id`가 DB에 저장된 `page_id`와 다를 수 있음
- 웹훅의 `entry.id`가 `instagram_user_id`일 수도 있음 (Instagram Business Account ID)

**현재 처리 로직**:
```python
# instagram_ai_bridge.py:185
if page_id:
    instagram_account_info = await get_instagram_account_from_auth_service(page_id=page_id)
```

**instagram-auth-service의 처리**:
```python
# instagram_accounts.py:748-756
# 1. 먼저 page_id로 직접 조회
instagram_account = await customer_service.get_instagram_account_by_page_id(db, page_id)

# 2. 찾지 못한 경우, instagram_user_id로 조회 (Instagram Business Account ID일 수 있음)
if not instagram_account:
    instagram_account = await customer_service.get_instagram_account_by_instagram_user_id(db, page_id)
```

### 5. 웹훅 구독이 제대로 되지 않음

**위치**: `instagram-auth-service/app/services/meta_oauth.py`의 `subscribe_page_to_webhook` 메서드

**확인 사항**:
- 웹훅 URL이 올바른지 확인
- 웹훅 verify token이 올바른지 확인
- Page Access Token이 유효한지 확인

## 해결 방법

### 1. 웹훅 구독 상태 확인

```bash
# instagram-auth-service에서 실행
python check_webhook_detection.py
```

### 2. DB 데이터 확인

```bash
# instagram-auth-service에서 실행
python check_stored_accounts.py
```

### 3. 웹훅 로그 분석

```bash
# instagram-auth-service에서 실행
python analyze_webhook_log.py
```

### 4. 수동 웹훅 구독

```bash
# instagram-auth-service API 호출
POST /instagram/accounts/{customer_id}/subscribe-webhook
```

### 5. page_id 수동 업데이트

```bash
# instagram-auth-service에서 실행
python update_page_id.py
```

## 체크리스트

- [ ] 고객의 `integration_status`가 `APPROVED`인가?
- [ ] `instagram_accounts` 테이블에 `page_id`가 저장되어 있는가?
- [ ] `instagram_accounts` 테이블에 `access_token`이 저장되어 있는가?
- [ ] 웹훅 구독이 성공했는가? (`/instagram/accounts/{customer_id}/webhook-status` 확인)
- [ ] 웹훅 URL이 올바른가? (Meta 개발자 대시보드에서 확인)
- [ ] 웹훅에서 받은 `entry.id`가 DB의 `page_id`와 일치하는가?
- [ ] `INSTAGRAM_AUTH_SERVICE_URL` 환경변수가 올바르게 설정되어 있는가?

## 디버깅 명령어

```bash
# 1. 웹훅 감지 가능 여부 확인
cd instagram-auth-service
python check_webhook_detection.py

# 2. 저장된 계정 정보 확인
python check_stored_accounts.py

# 3. 웹훅 로그 분석
python analyze_webhook_log.py

# 4. 특정 계정 디버깅
python debug_specific_account.py
```


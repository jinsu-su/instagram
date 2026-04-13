# 🚨 웹훅 감지 실패 - 긴급 확인 사항

## 현재 상황
- ✅ 서버 실행 중 (포트 8001)
- ✅ instagram-auth-service 실행 중 (포트 8000)
- ✅ muk._.bo_ 계정 정보 정상 (APPROVED)
- ❌ **웹훅 POST 요청이 수신되지 않음**

## 🔍 즉시 확인해야 할 사항

### 1. Facebook 개발자 대시보드 웹훅 설정 확인

**URL**: https://developers.facebook.com/apps/1518061046002074/instagram-graph-api/

**확인 사항**:
1. **콜백 URL**이 다음 중 하나와 일치하는지:
   - `https://14cc85ba6d58.ngrok-free.app/instagram/webhook` (현재 ngrok URL)
   - 또는 다른 ngrok URL

2. **인증 토큰**이 올바른지 확인

3. **Instagram 계정** 드롭다운에서:
   - **muk._.bo_ 계정이 선택되어 있는지 확인**
   - 다른 계정이 선택되어 있으면 muk._.bo_로 변경

4. **구독 필드** 확인:
   - `messages` ✅ 구독 중인지 확인
   - `messaging_postbacks` ✅ 구독 중인지 확인

### 2. ngrok URL 확인

현재 ngrok URL: `https://14cc85ba6d58.ngrok-free.app`

**확인 방법**:
```bash
# ngrok이 실행 중인지 확인
ps aux | grep ngrok

# ngrok URL 확인
curl http://localhost:4040/api/tunnels
```

**중요**: ngrok URL이 변경되었다면 Facebook 대시보드에서 업데이트해야 합니다!

### 3. 서버 포트 확인

현재 서버가 **포트 8001**에서 실행 중입니다.

**확인 사항**:
- ngrok이 포트 8001을 포워딩하고 있는지 확인
- Facebook 대시보드의 웹훅 URL이 올바른 포트를 가리키는지 확인

### 4. 실제 메시지 전송 테스트

1. **다른 Instagram 계정으로 로그인**
2. **muk._.bo_ 계정으로 메시지 전송**
3. **로그 실시간 확인**:
   ```bash
   cd instargram_google_cloud/.../gemini_embedding_api/gemini_embedding_api
   tail -f logs/*.log | grep -E "웹훅|webhook|POST|Instagram"
   ```

### 5. 웹훅 구독 재설정

만약 위 사항들이 모두 올바르다면:

1. Facebook 개발자 대시보드에서:
   - 웹훅 구독 해제
   - 웹훅 구독 재설정
   - "Test" 버튼 클릭하여 웹훅 테스트

2. 또는 `instagram-auth-service`의 `subscribe_webhook` API 호출:
   ```bash
   curl -X POST "http://localhost:8000/instagram/accounts/{customer_id}/subscribe-webhook"
   ```

## 💡 다음 단계

1. **Facebook 개발자 대시보드 확인** (가장 중요!)
2. **ngrok URL 확인**
3. **메시지 재전송 후 로그 확인**
4. **로그 결과 공유**

## 📋 확인 체크리스트

- [ ] Facebook 대시보드에서 콜백 URL 확인
- [ ] Facebook 대시보드에서 Instagram 계정이 muk._.bo_인지 확인
- [ ] Facebook 대시보드에서 messages 필드 구독 확인
- [ ] ngrok URL이 올바른지 확인
- [ ] ngrok이 올바른 포트를 포워딩하는지 확인
- [ ] 메시지 재전송 후 로그 확인


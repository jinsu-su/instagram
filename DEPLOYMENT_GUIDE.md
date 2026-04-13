# 🚀 대시보드 실서비스 배포 가이드 (GCP + Cloudflare)

이 가이드는 현재 파이썬 백엔드를 **최저 비용($0)과 최대 보안**으로 배포하기 위한 절차를 안내합니다.

---

## 1. 사전 준비 (GCP 초기 세팅)

1. **GCP 계정 생성 및 프로젝트 생성**: [Google Cloud Console](https://console.cloud.google.com/)에서 새 프로젝트를 만듭니다.
2. **gcloud CLI 설치**: 사장님 컴퓨터에 [gcloud CLI](https://cloud.google.com/sdk/docs/install)를 설치하고 로그인합니다.
   ```bash
   gcloud auth login
   gcloud config set project [프로젝트_ID]
   ```
3. **필수 API 활성화**: 아래 명령어들을 터미널에 입력하여 구글 클라우드 기능을 켭니다.
   ```bash
   gcloud services enable run.googleapis.com \
                          cloudbuild.googleapis.com \
                          artifactregistry.googleapis.com \
                          cloudscheduler.googleapis.com
   ```

---

## 2. 서버 배포 (Google Cloud Run)

터미널에서 제가 만들어둔 스크립트를 실행하기만 하면 됩니다. 이 스크립트는 **비용 방지용 안전장치(Max Instances=2)**가 자동으로 포함되어 있습니다.

```bash
chmod +x deploy_gcr.sh
./deploy_gcr.sh
```

- 배포가 완료되면 `https://[서비스이름].a.run.app` 형태의 주소가 출력됩니다. 이 주소가 사장님의 **API 서버 주소**입니다.

---

## 3. 24시간 자동 작업 예약 (Cloud Scheduler)

서버가 잠들어 있을 때도 봇을 깨우기 위해 **구글 클라우드 스케줄러** 설정을 해야 합니다.

1. [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler)로 이동합니다.
2. **작업 만들기** 클릭:
   - **이름**: `token-refresh-bot`
   - **빈도**: `0 0 * * *` (매일 자정마다 실행)
   - **타겟**: `HTTP`
   - **URL**: `https://[서버주소]/internal/tasks/refresh-tokens`
   - **HTTP 메서드**: `GET`
   - **인증 헤더**: `X-Internal-Token` 추가 (값은 `.env`의 `STATE_SECRET_KEY`)

3. **구독 관리 봇**도 같은 방식으로 추가합니다:
   - **이름**: `subscription-bot`
   - **빈도**: `0 */12 * * *` (12시간마다 실행)
   - **URL**: `https://[서버주소]/internal/tasks/process-subscriptions`

---

## 4. 최종 연결 (Cloudflare)

1. 사장님의 도메인을 Cloudflare에 연결합니다.
2. **DNS 설정**: `api` 서브도메인을 Cloud Run의 주소로 `CNAME` 연결합니다.
3. **주황색 구름(Proxy)**을 켭니다.
4. 이제 `https://api.yourdomain.com`을 통해 전 세계 어디서든 안전하고 빠르게 접속됩니다.

---

## 5. SaaS 보안 심화 설정 (ManyChat급 보안)

고객의 소중한 데이터를 보호하기 위해 아래 두 가지 설정은 **반드시** 완료해 주세요.

### 🛡️ Cloudflare WAF (방화벽) 활성화
1. Cloudflare 대시보드 -> **Security** -> **WAF**로 이동합니다.
2. **Managed Rules**를 활성화하여 SQL 인젝션, XSS 등 자동화된 공격을 차단합니다.
3. **Bot Fight Mode**를 활성화하여 악성 크롤러가 서버 리소스를 갉아먹지 못하게 막습니다.

### 🔐 Supabase RLS (데이터 격리) 설정
DB 주소가 노출되어도 다른 사람의 데이터를 볼 수 없게 만드는 가장 강력한 방법입니다. Supabase SQL Editor에서 아래 명령어를 실행하세요.

```sql
-- 예: 인스타그램 계정 테이블에 대한 RLS 설정
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own accounts" 
ON instagram_accounts 
FOR ALL 
USING (customer_id = auth.uid());
```
*(※ 모든 핵심 테이블에 대해 위와 같은 정책을 적용하는 것을 권장합니다.)*

---

## 💡 유지보수 팁
- 코드를 수정하면 다시 `./deploy_gcr.sh`를 실행하기만 하면 자동으로 업데이트됩니다.
- 비용 확인은 GCP 콘솔의 **[결제]** 탭에서 확인 가능하며, 제가 설정한 `max-instances 2` 덕분에 큰 비용이 나오지 않습니다.
- 보안 사고 의심 시 즉시 `.env`의 `JWT_SECRET_KEY`를 변경하고 재배포하세요.

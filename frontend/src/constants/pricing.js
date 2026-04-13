export const PRICING_PLANS = {
    basic: [
        {
            id: 'basic-free',
            name: '무료 플랜',
            badge: 'Basic',
            price: 0,
            priceUsd: 0,
            track: 'Basic',
            features: [
                '자동 DM 발송 (월 50건)',
                '전체 게시물 자동 댓글',
                '❌ 게시물별 개별 자동화',
                '키워드 자동 응답 (최대 3개)',
                '❌ 스토리 멘션 즉시 답장',
                '❌ 카드형/버튼형 리치 메시지',
                '❌ AI 정밀 분석/챗봇 미지원',
                '지능형 속도 제한 (계정 보호)',
                '제재 징후 자동 중단 시스템'
            ],
            featuresEn: [
                '50 Auto DMs/mo',
                'All-post Auto Comment',
                '❌ Per-post Automation',
                'Keyword Reply (Max 3)',
                '❌ Instant Story Reply',
                '❌ Card/Button Rich Msg',
                '❌ No AI Analysis/Chatbot',
                'Intelligent Rate Limiting',
                'Auto Suspension for Saftey'
            ],
            recommended: false,
            color: 'slate'
        },
        {
            id: 'basic-starter',
            name: 'Starter',
            badge: '실행력 강화',
            price: 19000,
            priceUsd: 14,
            track: 'Basic',
            features: [
                '자동 DM 발송 (월 5,000건)',
                '전체 게시물 자동 댓글',
                '게시물별 개별 자동화 설정',
                '무제한 키워드/자동화 플로우',
                '스토리/포스트 멘션 자동 답장',
                '카드형/버튼형 리치 메시지',
                '상담원 개입 감지 (Pause)',
                '지능형 속도 제한 (계정 보호)',
                '제재 징후 자동 중단 시스템'
            ],
            featuresEn: [
                '5,000 Auto DMs/mo',
                'All-post Auto Comment',
                'Per-post Automation',
                'Unlimited Keyword/Flows',
                'Story/Post Mention Auto-reply',
                'Card/Button Rich Msg',
                'Human Handoff (AI Pause)',
                'Intelligent Rate Limiting',
                'Auto Suspension for Saftey'
            ],
            recommended: true,
            color: 'blue'
        },
        {
            id: 'basic-pro',
            name: 'Pro',
            badge: '매니지먼트용',
            price: 49000,
            priceUsd: 36,
            track: 'Basic',
            features: [
                '자동 DM 무제한 발송',
                '전체 게시물 자동 댓글',
                '게시물별 개별 자동화 설정',
                '무제한 키워드/자동화 플로우',
                '스토리/포스트 멘션 자동 답장 (무제한)',
                '카드형/버튼형 리치 메시지',
                '광고 표시 없이 자동 DM 발송',
                '단체 DM (브로드캐스트)',
                'DM 내 고객 이름 자동 삽입',
                '지능형 속도 제한 (계정 보호)',
                '제재 징후 자동 중단 시스템'
            ],
            featuresEn: [
                'Unlimited Auto DMs',
                'All-post Auto Comment',
                'Per-post Automation',
                'Unlimited Keyword/Flows',
                'Unlimited Story/Post Mentions',
                'Card/Button Rich Msg',
                'No-ad Auto DMs',
                'Broadcast Messaging',
                'Insert Customer Name in DM',
                'Intelligent Rate Limiting',
                'Auto Suspension for Saftey'
            ],
            recommended: false,
            color: 'cyan'
        },
        {
            id: 'basic-custom',
            name: 'Custom',
            badge: '맞춤 가격 지원',
            price: '별도 협의',
            priceUsd: 'Contact Us',
            track: 'Basic',
            isCustom: true,
            features: [
                'AIDM 모든 자동화 및 AI 기능 전수 제공',
                'MAU 및 발송 데이터 : 무제한 협의',
                '1:N 다계정 통합 관제 및 정산 시스템',
                '대형 브랜드용 AIDM Boost 기술 엔진',
                '사용 사례별 AI 모델 맞춤 튜닝 지원',
                '팀 워크스페이스 및 상세 권한 제어'
            ],
            featuresEn: [
                'All AIDM Automation & AI Features',
                'Unlimited MAU & Sends (Negotiable)',
                '1:N Multi-account Master Control',
                'Enterprise AIDM Boost Engine',
                'Custom AI Model Fine-tuning',
                'Team Workspace & Permission Control'
            ],
            recommended: false,
            color: 'indigo'
        }
    ],
    ai: [
        {
            id: 'ai-free',
            name: 'AI 체험',
            badge: '무료 AI',
            price: 0,
            priceUsd: 0,
            track: 'AI',
            features: [
                'AI 바이럴 분석 (월 1회)',
                'AI 답변 초안 추천 (기본)',
                '댓글-DM 성장 비서 (기본)',
                '기본 CRM 고객 리스트',
                '❌ AI 정밀 비평 미지원'
            ],
            featuresEn: [
                '1 AI Viral Analysis/mo',
                'Basic AI Draft Mode',
                'Comment-DM Assistant',
                'Basic CRM List',
                '❌ No Precision Critique'
            ],
            recommended: false,
            color: 'purple'
        },
        {
            id: 'ai-starter',
            name: 'AI Starter',
            badge: '인기 플랜',
            price: 49000,
            priceUsd: 36,
            track: 'AI',
            features: [
                'AI 댓글 정밀 분석 (월 20회)',
                'AI 클린 가드 (자동 모더레이션)',
                'AI 멘션 감지 및 자동 답장 (월 50건)',
                'AI 답변 초안 모드 무제한',
                '댓글-DM 성장 비서 무제한',
                '고객 구매 여정 자동 추적',
                '고객별 팬덤 지수 분석',
                'DM 속 AI 챗봇 (2,000건)',
                '지능형 속도 제한 (계정 보호)',
                '상담원 보호 시스템 (Handoff)'
            ],
            featuresEn: [
                '20 AI Analysis/mo',
                'AI Clean Guard (Moderation)',
                'AI Mention Detection & Reply (50/mo)',
                'Unlimited AI Drafts',
                'Unlimited Growth Assistant',
                'Auto Buying Phase Track',
                'Engagement Score Analysis',
                '2,000 AI Chatbot Messages',
                'Intelligent Rate Limiting',
                'Human Handoff Protection'
            ],
            recommended: true,
            color: 'indigo'
        },
        {
            id: 'ai-pro',
            name: 'AI Pro',
            badge: '파워 크리에이터',
            price: 99000,
            priceUsd: 73,
            track: 'AI',
            features: [
                'AI 댓글 정밀 분석 (월 100회)',
                'AI 클린 가드 (실시간 탐지)',
                'AI 멘션 실시간 분석 및 맞춤 답장',
                'AI 바이럴 포스트 생성 (10회)',
                '초정밀 AI 영상 크리틱 (5회)',
                'AI 시맨틱 의도 파악 (오타 대응)',
                '내 데이터 학습 AI 챗봇 무제한',
                '고객별 행성 요약 AI 리포트',
                '태그 기반 정밀 오디언스 타겟팅',
                '지능형 속도 제한 (계정 보호)'
            ],
            featuresEn: [
                '100 AI Analysis/mo',
                'AI Clean Guard (Real-time)',
                'AI Mention Real-time Analysis',
                '10 AI Viral Post Gen',
                '5 Precision Video Critique',
                'Semantic Intent Matching',
                'Unlimited Custom Chatbot',
                'AI Behavioral Summary',
                'Tag-based Targeting',
                'Intelligent Rate Limiting'
            ],
            recommended: false,
            color: 'violet'
        },
        {
            id: 'ai-business',
            name: 'AI Business',
            badge: '전담 디렉터',
            price: 199000,
            priceUsd: 147,
            track: 'AI',
            features: [
                '모든 AI 분석/생성 기능 무제한',
                '초정밀 AI 영상 크리틱 (무제한)',
                '내 데이터 학습 AI 챗봇 무제한',
                '팀 단위 통합 대시보드 리포트',
                '실시간 잠재 고객 탐지 알림',
                '지능형 속도 제한 (계정 보호)',
                '1:1 전략 컨설팅 서포트'
            ],
            featuresEn: [
                'Unlimited AI Analysis/Gen',
                'Unlimited Video Critique',
                'Unlimited Custom Chatbot',
                'Team Insights Dashboard',
                'Real-time Lead Detection',
                'Intelligent Rate Limiting',
                '1:1 Strategic Support'
            ],
            recommended: false,
            color: 'purple'
        },
        {
            id: 'ai-custom',
            name: 'Custom',
            badge: '별도 문의',
            price: '별도 협의',
            priceUsd: 'Contact Us',
            track: 'AI',
            isCustom: true,
            features: [
                'AIDM 모든 자동화 및 AI 기능 전수 제공',
                'MAU 및 발송 데이터 : 무제한 협의',
                '1:N 다계정 통합 관제 및 정산 시스템',
                '대량 자동화용 AIDM Boost 기술 엔진',
                '사용 사례별 AI 모델 맞춤 튜닝 지원',
                '팀 워크스페이스 및 상세 권한 제어'
            ],
            featuresEn: [
                'All AIDM Automation & AI Features',
                'Unlimited MAU & Sends (Negotiable)',
                '1:N Multi-account Master Control',
                'AIDM Boost Engine for Scale',
                'Custom AI Model Fine-tuning',
                'Team Workspace & Permission Control'
            ],
            recommended: false,
            color: 'indigo'
        }
    ]
};

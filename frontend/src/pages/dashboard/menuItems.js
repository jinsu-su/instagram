import {
  BarChart3,
  Bot,
  CreditCard,
  Home,
  MessageCircle,
  MessageSquareText,
  Send,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';

const menuItems = [
  {
    icon: Home,
    label: '종합 대시보드',
    description: '실시간 현황 & AI 요약',
    view: 'dashboard',
    color: 'text-purple-600'
  },
  {
    icon: BarChart3,
    label: '인사이트',
    description: '계정/웹훅 상태 & 인사이트',
    view: 'insights',
    color: 'text-blue-600'
  },
  {
    icon: MessageCircle,
    label: '댓글 분석',
    description: 'IG 댓글 분석 & AI 요약',
    view: 'comments',
    color: 'text-pink-600'
  },
  {
    icon: ShieldCheck,
    label: 'AI Guard',
    description: '악플 및 스팸 실시간 탐지',
    view: 'aiguard',
    color: 'text-green-600'
  },
  {
    icon: Send,
    label: '통합 인박스',
    description: '메시지 & 우선순위 큐',
    view: 'inbox',
    color: 'text-pink-600',
    requiresApproval: true
  },
  {
    icon: Bot,
    label: 'AI 설정',
    description: '나만의 AI 어시스턴트 정의',
    view: 'aisettings',
    color: 'text-indigo-600',
    requiresApproval: true
  },
  {
    icon: Zap,
    label: '자동 응답 시나리오',
    description: '나만의 자동화 흐름 설계',
    view: 'automation',
    color: 'text-indigo-600',
    requiresApproval: true
  },
  {
    icon: MessageSquareText,
    label: '키워드 답장',
    description: '반복되는 문의 자동 대응',
    view: 'keywordsettings',
    color: 'text-indigo-600',
    requiresApproval: true
  },
  {
    icon: Users,
    label: '고객 관리 (AI 요금제)',
    description: '고객 정보 및 세그먼트 관리',
    view: 'contacts',
    color: 'text-pink-600',
    requiresApproval: true
  },
  {
    icon: CreditCard,
    label: '요금제 및 결제',
    description: '구독 관리 및 결제',
    view: 'subscription',
    color: 'text-indigo-600',
    requiresApproval: false
  },
];

export default menuItems;

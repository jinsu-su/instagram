import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "../components/ui/button";
import {
    Sparkles,
    MessageCircle,
    Zap,
    TrendingUp,
    ChevronRight,
    Menu,
    X,
    Bot,
    CheckCircle2,
    ArrowRight,
    Users,
    Instagram,
    DollarSign,
    Clock,
    ShieldCheck,
    BarChart3,
    Layers,
    Palette,
    Activity,
    Target,
    Lightbulb,
    ShoppingBag,
    Briefcase,
    Star,
    Heart,
    Calendar,
    MousePointer2
} from "lucide-react";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { translations } from '../data/translations';

const features = [
    {
        title: "실시간 대화 자동화",
        desc: "댓글, 스토리 답장부터 DM까지 AI가 브랜드 페르소나를 학습해 고객과 실시간으로 소통합니다.",
        icon: MessageCircle,
        color: "from-indigo-500 to-purple-600",
        badges: ["365일 상시 응대", "톤앤매너 학습", "자동 예약"]
    },
    {
        title: "AI 기세 포착 (Lead Detection)",
        desc: "수많은 대화 중 구매 의사가 높은 잠재 고객과 긴급한 문의를 AI가 즉시 감지해 대시보드에 알립니다.",
        icon: Target,
        color: "from-emerald-400 to-teal-500",
        badges: ["세일즈 기회 포착", "긴급 문의 알림"]
    },
    {
        title: "실시간 활동 인텔리전스",
        desc: "계정에서 일어나는 모든 자동화 액션을 타임라인으로 실시간 확인하고 관리할 수 있습니다.",
        icon: Activity,
        color: "from-orange-400 to-pink-500",
        badges: ["라이브 스트림", "투명한 히스토리"]
    }
];

// --- Components ---

const FeatureCard = ({ icon: Icon, title, desc, color, badges }) => (
    <div className="group relative bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 overflow-hidden flex flex-col h-full">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-10 blur-3xl rounded-full -mr-10 -mt-10 transition-opacity group-hover:opacity-20`}></div>

        <div className="mb-6 relative z-10 w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-7 h-7 text-gray-900" />
        </div>

        <div className="flex-1 relative z-10">
            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">{title}</h3>
            <p className="text-gray-500 font-medium leading-relaxed mb-6">
                {desc}
            </p>
        </div>

        {badges && (
            <div className="flex flex-wrap gap-2 mt-auto relative z-10">
                {badges.map((b, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-full text-[11px] font-bold text-gray-600">
                        {b}
                    </span>
                ))}
            </div>
        )}
    </div>
);

const ComparisonRow = ({ title, manual, aidm }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors border-b border-gray-50 last:border-0 items-center">
        <div className="font-bold text-gray-500">{title}</div>
        <div className="flex items-center gap-2 text-gray-400 font-medium text-sm line-through decoration-gray-300">
            <X className="w-4 h-4 text-gray-300" />
            {manual}
        </div>
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm bg-indigo-50/50 py-1 px-3 rounded-lg w-fit">
            <CheckCircle2 className="w-4 h-4" />
            {aidm}
        </div>
    </div>
);

const UseCaseCard = ({ title, target, content, tags, icon: Icon, color }) => (
    <div className="group relative bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col h-full snap-center shrink-0 w-[320px] md:w-[380px]">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-5 blur-3xl rounded-full -mr-10 -mt-10`}></div>

        <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-gray-900" />
            </div>
            <div>
                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-0.5">{target}</div>
                <h4 className="font-bold text-gray-900 text-lg">{title}</h4>
            </div>
        </div>

        <p className="text-gray-500 font-medium leading-relaxed mb-6 flex-1">
            "{content}"
        </p>

        <div className="flex flex-wrap gap-2">
            {tags.map((t, i) => (
                <span key={i} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                    #{t}
                </span>
            ))}
        </div>
    </div>
);

const FAQItem = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden transition-all duration-300 hover:shadow-md">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-6 text-left"
            >
                <span className="font-bold text-lg text-gray-900">{q}</span>
                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${open ? 'rotate-90' : ''}`} />
            </button>
            <div className={`px-6 text-gray-500 font-medium leading-relaxed transition-all duration-300 ${open ? 'pb-6 opacity-100 max-h-40' : 'pb-0 opacity-0 max-h-0 overflow-hidden'}`}>
                {a}
            </div>
        </div>
    );
};

// --- Main Page ---

const Home = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState('KR');

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#FDFDFD] relative overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-r from-indigo-100/40 to-purple-100/40 rounded-full blur-[120px] opacity-60"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-gradient-to-l from-blue-100/40 to-cyan-100/40 rounded-full blur-[100px] opacity-50"></div>
            </div>

            {/* Navbar */}
            {/* Navbar */}
            <Navbar isTransparent={true} />

            {/* Hero Section */}
            <section className="relative pt-32 pb-32 px-6 z-10">
                <div className="max-w-5xl mx-auto text-center">

                    <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-none mb-8 animate-fade-in-up animation-delay-100">
                        SNS 마케팅 고민,<br />
                        <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                            이제 AIDM에게 맡기세요.
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up animation-delay-200">
                        다른 일에 시간 쓰세요. 나머지는 AIDM이 완벽하게 처리합니다.<br />
                        <span className="text-gray-900 font-bold">리드 발굴, 실시간 응대, 소통 관리까지</span><br />
                        SNS 관련 업무는 AI 매니저와 함께 5분 안에 끝납니다.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-32 animate-fade-in-up animation-delay-300">
                        <button
                            onClick={() => navigate('/login')}
                            className="relative group px-10 py-5 bg-gray-900 text-white rounded-[2rem] font-bold text-xl shadow-2xl hover:bg-black transition-all hover:-translate-y-1 hover:shadow-indigo-500/30 overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                시작하기
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        </button>
                    </div>

                    {/* AIDM Function Flow (Phone Mockup) - RESTORED & MODERNIZED */}
                    <div className="relative max-w-5xl mx-auto mb-20">
                        <div className="absolute -inset-4 bg-gradient-to-br from-indigo-100/50 to-purple-100/50 rounded-[3rem] blur-3xl -z-10"></div>

                        <div className="bg-white/40 backdrop-blur-2xl rounded-[3rem] border border-white/50 shadow-2xl overflow-hidden p-8 md:p-12">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                                {/* Left: Phone Mockup */}
                                <div className="relative mx-auto lg:mx-0 w-full max-w-[320px]">
                                    <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl border-[6px] border-gray-800 relative z-10">
                                        <div className="bg-white rounded-[2.2rem] h-[550px] overflow-hidden relative flex flex-col">
                                            {/* Phone Header */}
                                            <div className="pt-8 px-6 pb-4 border-b border-gray-50 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shrink-0"></div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-gray-900 leading-tight">AIDM Official</div>
                                                        <div className="text-[8px] font-bold text-emerald-500">Active now</div>
                                                    </div>
                                                </div>
                                                <div className="w-4 h-4 rounded-full border-2 border-gray-100"></div>
                                            </div>

                                            {/* Chat Area */}
                                            <div className="flex-1 p-4 space-y-4 overflow-hidden">
                                                {/* Incoming */}
                                                <div className="flex justify-start animate-in slide-in-from-left duration-700">
                                                    <div className="bg-gray-100 rounded-2xl rounded-tl-none p-3 max-w-[85%] shadow-sm">
                                                        <p className="text-xs text-gray-800 font-medium">안녕하세요! 이번에 새로 나온 후드티 가격이랑 배송 기간이 궁금해요. 😊</p>
                                                    </div>
                                                </div>

                                                {/* AI Analysis Step */}
                                                <div className="flex justify-center py-2">
                                                    <div className="bg-indigo-50 border border-indigo-100/50 rounded-full py-1.5 px-4 flex items-center gap-2 shadow-sm animate-pulse">
                                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">AIDM Processing...</span>
                                                    </div>
                                                </div>

                                                {/* Outgoing (AI Response) */}
                                                <div className="flex justify-end animate-in slide-in-from-right duration-1000 delay-500">
                                                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl rounded-tr-none p-4 max-w-[90%] shadow-lg shadow-indigo-200">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Sparkles className="w-3 h-3 text-indigo-200" />
                                                            <span className="text-[9px] font-black text-white/70 uppercase">AI Optimized Reply</span>
                                                        </div>
                                                        <p className="text-xs font-bold leading-relaxed mb-3">
                                                            문의주신 후드티는 현재 20% 할인 이벤트 중으로 48,000원입니다! 지금 주문하시면 내일 바로 발송되어 모레 수령 가능하세요. 🚀
                                                        </p>
                                                        <div className="bg-white/10 rounded-lg p-2 border border-white/20">
                                                            <p className="text-[10px] font-bold">👉 지금 바로 구매하기 (링크)</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Phone Input Bar */}
                                            <div className="p-4 border-t border-gray-50 flex items-center gap-2">
                                                <div className="flex-1 h-9 bg-gray-50 rounded-full px-4 border border-gray-100"></div>
                                                <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center">
                                                    <ArrowRight className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Abstract shapes behind phone */}
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-[60px] -z-0"></div>
                                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-400/20 rounded-full blur-[60px] -z-0"></div>
                                </div>

                                {/* Right: Flow Description */}
                                <div className="space-y-10">
                                    <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs">SMART WORKFLOW</div>

                                    <div className="space-y-8">
                                        <div className="flex gap-6 group">
                                            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white shadow-md border border-gray-50 flex items-center justify-center font-black text-indigo-600 group-hover:scale-110 transition-transform">1</div>
                                            <div>
                                                <h4 className="text-xl font-black text-gray-900 mb-2">실시간 문의 감지</h4>
                                                <p className="text-gray-500 font-medium leading-relaxed">댓글, 스토리 답장, DM 등 고객의 모든 액션을 1초 만에 감지하고 대응 준비를 마칩니다.</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-6 group">
                                            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white shadow-md border border-gray-50 flex items-center justify-center font-black text-indigo-600 group-hover:scale-110 transition-transform">2</div>
                                            <div>
                                                <h4 className="text-xl font-black text-gray-900 mb-2">AI 페르소나 분석</h4>
                                                <p className="text-gray-500 font-medium leading-relaxed">브랜드 정보를 학습한 AI가 문의의 의도를 파악하고, 브랜드 고유의 톤앤매너로 답변을 기획합니다.</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-6 group">
                                            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white shadow-md border border-gray-50 flex items-center justify-center font-black text-indigo-600 group-hover:scale-110 transition-transform">3</div>
                                            <div>
                                                <h4 className="text-xl font-black text-gray-900 mb-2">자동 전환 및 관리</h4>
                                                <p className="text-gray-500 font-medium leading-relaxed">단순 응대를 넘어 구매 링크 전송, 예약 확정 등 실제 비즈니스 전환을 유도하고 대시보드에 리포트합니다.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>



                </div>
            </section>

            {/* Pain Points (Why AIDM?) */}
            <section id="comparison" className="py-32 px-6 relative">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-8 leading-tight">
                                SNS 관리가<br />
                                <span className="text-gray-300">본업보다 힘들지 않나요?</span>
                            </h2>
                            <p className="text-xl text-gray-500 font-medium leading-relaxed mb-10">
                                사업가, 마케터, 크리에이터...<br />
                                누구보다 바쁜 당신의 하루를 압니다.
                            </p>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                                        <Clock className="w-6 h-6 text-red-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900 mb-1">응대 골든타임 상실</h4>
                                        <p className="text-gray-500">고객 문의는 쏟아지는데 본업 하느라 답변을 놓치고 계신가요? 1분이 늦어지면 고객의 구매 요인은 사라집니다.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                                        <Target className="w-6 h-6 text-orange-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900 mb-1">잠재 고객 식별 실패</h4>
                                        <p className="text-gray-500">수많은 댓글과 DM 속에서 진짜 '매출로 연결될 문의'를 골라내기 힘드시죠? AIDM이 세일즈 기회만 콕 집어 알려드립니다.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0">
                                        <TrendingUp className="w-6 h-6 text-gray-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900 mb-1">비즈니스 전환 부재</h4>
                                        <p className="text-gray-500">단순히 하트 날리는 소통에만 지치셨나요? 이제 수치로 증명되는 실질적인 비즈니스 전환을 시작하세요.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[3rem] p-8 shadow-2xl border border-gray-100 transform rotate-2 hover:rotate-0 transition-all duration-500">
                            <div className="bg-gray-900 text-white text-center py-4 rounded-2xl mb-8 font-bold">
                                AIDM vs Others
                            </div>
                            <div className="space-y-2">
                                <ComparisonRow title="일 평균 소요 시간" manual="2시간 이상" aidm="5분 컷" />
                                <ComparisonRow title="리드 발굴" manual="댓글/DM 전수 조사" aidm="AI 세일즈 기회 자동 매칭" />
                                <ComparisonRow title="카피라이팅" manual="직접 작성 (막막함)" aidm="브랜드 페르소나 학습" />
                                <ComparisonRow title="활동 모니터링" manual="직접 접속 확인" aidm="실시간 활동 타임라인" />
                                <ComparisonRow title="고객 응대" manual="수동 답장 (골든타임 놓침)" aidm="골든타임 1초 응대" />
                                <ComparisonRow title="비즈니스 기회 관리" manual="기억에 의존한 관리" aidm="실시간 기회 분석 및 알림" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Persona Technology Detail */}
            <section className="py-24 px-6 relative overflow-hidden bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <div className="flex-1">
                            <h2 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4">AIDM Smart Analysis Engine</h2>
                            <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-8 tracking-tight">
                                놓치고 있던<br />비즈니스 기회를 찾습니다.
                            </h3>
                            <p className="text-xl text-gray-500 font-medium mb-12 leading-relaxed">
                                수만 건의 대화 속에 숨겨진 '진짜 고객'의 의도를 AI가 분석합니다.<br />
                                단순한 응대를 넘어 매출로 연결되는 골든타임을 잡아드려요.
                            </p>

                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <div className="text-5xl font-black text-indigo-600 mb-2">95%</div>
                                    <div className="text-gray-500 font-bold text-sm">스타일 일치도</div>
                                </div>
                                <div>
                                    <div className="text-5xl font-black text-indigo-600 mb-2">80%</div>
                                    <div className="text-gray-500 font-bold text-sm">기획 시간 절감</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { title: '잠재 리드 감지', desc: '구매 문의, 가격 요청 등 세일즈 기회를 즉시 분류' },
                                { title: '긴급 문의 처리', desc: '부정적 반응이나 긴급 클레임을 실시간으로 감지' },
                                { title: '맞춤형 액션 플랜', desc: '감지된 리드에 대해 AI가 최적의 대응 전략 제안' },
                                { title: '데이터 기반 인사이트', desc: '어떤 유형의 문의가 매출로 이어지는지 정밀 분석' }
                            ].map((item, i) => (
                                <div key={i} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 hover:border-indigo-200 transition-colors">
                                    <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                                    <p className="text-sm text-gray-500 font-medium">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>


            {/* Features (Bento Grid) */}
            <section id="features" className="py-24 px-6 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                            당신에게 필요한 건<br />단순 도구가 아닌 '팀'입니다.
                        </h2>
                        <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto">
                            AIDM은 당신만 전담하는 AI SNS 마케팅 팀입니다.<br />
                            당신의 브랜드를 학습하고 응대, 분석, 리드 발굴까지 전부 도와드립니다.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* 1. Lead Detection */}
                        <div className="lg:col-span-2">
                            <FeatureCard
                                icon={Target}
                                title="AI 기세 포착 (Lead Detection)"
                                desc="수만 건의 대화 속에 숨겨진 '진짜 고객'의 의도를 AI가 분석합니다. 구매 문의, 가격 요청 등 세일즈 기회를 감지해 대시보드에서 즉시 확인하세요."
                                color="from-indigo-500 to-purple-600"
                                badges={['세일즈 기회 감지', '고객 의도 분석', '실시간 알림']}
                            />
                        </div>

                        {/* 2. Auto Reply */}
                        <div className="lg:col-span-1">
                            <FeatureCard
                                icon={MessageCircle}
                                title="골든타임 1초 응대"
                                desc="단순 인사는 AI가 처리하고, 중요한 세일즈 문의는 당신에게 알립니다. 잠재 고객을 놓치지 마세요."
                                color="from-emerald-400 to-teal-500"
                                badges={['365일 상시 응대', '세일즈 리드 감지']}
                            />
                        </div>

                        {/* 3. Card News (Generative) */}
                        <div className="lg:col-span-1">
                            <div className="group relative bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 flex flex-col h-full">
                                <div className="mb-6 w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center">
                                    <Palette className="w-7 h-7 text-pink-600" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">실시간 활동 인텔리전스</h3>
                                <p className="text-gray-500 font-medium leading-relaxed mb-6">계정에서 발생하는 모든 자동화 액션을 타임라인으로 투명하게 확인하세요.</p>

                                <div className="space-y-4 mb-6 flex-1 text-sm font-bold text-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                        <span>AI 자동응답 발송</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span>플로우 트리거 실행</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                                        <span>스토리 답장 대응</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-full text-[11px] font-bold text-gray-600">라이브 타임라인</span>
                                    <span className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-full text-[11px] font-bold text-gray-600">투명한 히스토리</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. Analytics */}
                        <div className="lg:col-span-2">
                            <div className="group relative bg-gray-900 rounded-[2.5rem] p-8 border border-gray-800 shadow-xl flex flex-col md:flex-row items-center gap-8 overflow-hidden h-full">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 opacity-20 blur-[100px] rounded-full"></div>

                                <div className="flex-1 relative z-10">
                                    <div className="mb-6 w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center text-white">
                                        <BarChart3 className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-3 tracking-tight">AI 바이럴 & 릴스 분석</h3>
                                    <p className="text-gray-400 font-medium leading-relaxed mb-6">
                                        영상을 AI가 직접 시청하고 바이럴 성과를 예측합니다.<br />
                                        초 단위의 1:1 밀착 코칭으로 릴스 떡상의 지름길을 안내해 드립니다.
                                    </p>
                                    <button onClick={() => navigate('/login')} className="text-indigo-400 font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
                                        지금 바로 분석해보기 <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="w-full md:w-1/2 bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50 backdrop-blur-sm">
                                    {/* Mock Chart */}
                                    <div className="flex items-end gap-2 h-32 opacity-80">
                                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                                            <div key={i} className="flex-1 bg-gradient-to-t from-indigo-600 to-purple-500 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* Marketing Automation Section (New) */}
            <section className="py-40 px-6 bg-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto">

                    {/* Sub-section 2: Target Marketing */}
                    <div className="flex flex-col lg:flex-row-reverse items-center gap-20">
                        <div className="flex-1 space-y-10 animate-in fade-in slide-in-from-right duration-1000">
                            <h2 className="text-5xl md:text-6xl font-black text-gray-900 leading-[1.1] tracking-tight">
                                타겟 마케팅으로<br />
                                <span className="text-indigo-600">전환율</span>을 극대화하세요
                            </h2>
                            <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-xl">
                                팔로우 여부에 따라 맞춤형 메시지를 전략적으로 전달합니다.
                                팬덤 로열티를 높이고, 신규 고객을 단숨에 팔로워로 전환시키세요.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="p-8 bg-white border border-indigo-50 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500 group">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                                        <Heart className="w-5 h-5 fill-current" />
                                    </div>
                                    <h4 className="font-black text-gray-900 text-lg mb-3">팔로워 소통</h4>
                                    <p className="text-sm text-gray-500 font-bold leading-relaxed">충성 고객(팬)에게만 보내는 시크릿 혜택과 한정 프로모션 쿠폰 자동 발송</p>
                                </div>
                                <div className="p-8 bg-white border border-pink-50 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500 group">
                                    <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600 mb-6 group-hover:scale-110 transition-transform">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-black text-gray-900 text-lg mb-3">논팔로워 유도</h4>
                                    <p className="text-sm text-gray-500 font-bold leading-relaxed">팔로우 시 즉시 사용 가능한 전용 혜택 제공으로 이탈은 막고 팬은 확보</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 w-full max-w-2xl relative">
                            {/* Visual for Follower/Non-follower flow */}
                            <div className="flex gap-8 items-center justify-center">
                                <div className="bg-gray-900 rounded-[3rem] p-5 shadow-2xl border-[6px] border-gray-800 w-full max-w-[240px] transform -rotate-3 hover:translate-y-[-10px] transition-all duration-500">
                                    <div className="bg-white rounded-[2rem] h-[340px] p-5 flex flex-col justify-between overflow-hidden relative">
                                        <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                                            <div className="w-6 h-6 rounded-full bg-indigo-500"></div>
                                            <div className="h-1.5 w-12 bg-gray-100 rounded-full"></div>
                                        </div>
                                        <div className="flex-1 py-4">
                                            <div className="bg-indigo-50 p-3 rounded-2xl rounded-tl-none space-y-2">
                                                <div className="h-2 w-full bg-indigo-200/50 rounded-full"></div>
                                                <div className="h-2 w-3/4 bg-indigo-200/50 rounded-full"></div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="h-10 w-full bg-indigo-600 rounded-xl flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-indigo-100 uppercase tracking-widest">Secret Coupon</div>
                                            <div className="h-1.5 w-1/2 bg-gray-100 mx-auto rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-900 rounded-[3rem] p-5 shadow-2xl border-[6px] border-gray-800 w-full max-w-[240px] transform rotate-3 mt-12 hover:translate-y-[-10px] transition-all duration-500">
                                    <div className="bg-white rounded-[2rem] h-[380px] p-5 flex flex-col justify-between overflow-hidden">
                                        <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                                            <div className="w-6 h-6 rounded-full bg-pink-500"></div>
                                            <div className="h-1.5 w-12 bg-gray-100 rounded-full"></div>
                                        </div>
                                        <div className="flex-1 py-4">
                                            <div className="bg-pink-50 p-3 rounded-2xl rounded-tl-none space-y-2">
                                                <div className="h-2 w-full bg-pink-200/50 rounded-full"></div>
                                                <div className="h-2 w-5/6 bg-pink-200/50 rounded-full"></div>
                                                <div className="h-2 w-1/2 bg-pink-200/50 rounded-full"></div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="h-12 w-full bg-pink-600 rounded-xl flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-pink-100 uppercase tracking-widest">FOLLOW TO GET</div>
                                            <div className="h-1.5 w-2/3 bg-gray-100 mx-auto rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* Business Use Cases (Replaced Testimonials) */}
            <section id="use-cases" className="py-32 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <h2 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4">AIDM For Business</h2>
                    <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">어떤 비즈니스든,<br />AIDM이 강력한 팀원이 됩니다</h3>
                    <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto">
                        당신의 비즈니스 성격에 맞는 최적의 자동화 시나리오를 확인해보세요.
                    </p>
                </div>

                <div className="flex gap-6 overflow-x-auto pb-10 px-6 snap-x snap-mandatory no-scrollbar justify-start md:justify-center">
                    <UseCaseCard
                        icon={ShoppingBag}
                        target="E-Commerce"
                        title="문의는 늘리고, 이탈은 막고"
                        content="가격 문의, 배송 일정, 구매 링크 요청 등 반복되는 질문에 1초 만에 응대하세요. 고객의 고민 시간을 줄여 구매 전환율을 극대화합니다."
                        tags={['CS자동화', '전환율증대', '실시간링크']}
                        color="from-pink-500 to-rose-500"
                    />
                    <UseCaseCard
                        icon={Briefcase}
                        target="Professional/B2B"
                        title="핵심 리드만 스마트하게 추출"
                        content="단순 인사 댓글 속에 숨겨진 '상담 요청'이나 '협업 제안'을 AI가 즉시 감지합니다. 중요한 비즈니스 기회만 골라내어 당신에게 알립니다."
                        tags={['세일즈기회', '잠재고객발굴', '비즈니스매칭']}
                        color="from-indigo-500 to-blue-500"
                    />
                    <UseCaseCard
                        icon={Heart}
                        target="Creators/Personal Brand"
                        title="24시간 팬 소통 엔진"
                        content="잠든 시간에도 AI가 내 말투(페르소나)를 유지하며 팔로워와 소통합니다. 계정의 활성도를 높이고 팔로워와 끈끈한 관계를 구축하세요."
                        tags={['팬덤관리', '계정활성화', '페르소나학습']}
                        color="from-purple-500 to-indigo-500"
                    />
                </div>
            </section>

            {/* FAQ */}
            <section className="py-24 px-6 bg-gray-50">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-black text-gray-900 mb-4">자주 묻는 질문</h2>
                        <p className="text-gray-500">AIDM에 대해 궁금한 점을 확인하세요.</p>
                    </div>

                        <FAQItem 
                            q="AIDM은 어떤 서비스인가요?" 
                            a="AIDM은 인스타그램 마케팅의 모든 과정을 AI로 자동화하는 지능형 솔루션입니다. 공식 Meta API를 기반으로 댓글, DM, 스토리 소통을 자동화하며, 잠재 고객의 의도를 분석해 실제 매출 기회를 포착하는 '24시간 퍼스널 AI 마케팅 팀' 역할을 수행합니다." 
                        />
                        <FAQItem 
                            q="계정 보안이나 정책 위반 위험은 없나요?" 
                            a="AIDM은 Meta 공식 API 가이드라인을 100% 준수합니다. 비밀번호 공유 없이 공식 OAuth 인증 방식으로 안전하게 연동되며, 인위적인 스팸 활동이 아닌 브랜드 페르소나에 기반한 자연스러운 소통을 지향하므로 계정 정지 등의 위험으로부터 안전합니다." 
                        />
                        <FAQItem 
                            q="도입 및 초기 설정이 복잡하지 않나요?" 
                            a="단 1분이면 충분합니다. 별도의 정보 입력이나 개발 지식 없이 자신의 인스타그램 계정 연동만으로 즉시 시작할 수 있습니다. 브랜드의 말투나 답변 가이드라인 또한 AI가 이전 활동을 분석하여 최적의 제안을 드립니다." 
                        />
                        <FAQItem 
                            q="AI가 남기는 답변을 직접 제어할 수 있나요?" 
                            a="네, 대시보드의 실시간 타임라인을 통해 AI의 모든 활동을 1초 단위로 모니터링할 수 있습니다. 특정 키워드에 대한 응대 규칙을 즉시 수정하거나, 중요한 비즈니스 상담은 알림을 받고 직접 개입하여 처리할 수 있습니다." 
                        />
                        <FAQItem 
                            q="서비스 이용 요금은 어떻게 되나요?" 
                            a="성장을 응원하는 마음으로 누구나 무료로 첫 시작을 하실 수 있습니다. 이후 사용량(응대 횟수)과 계정 규모에 따라 합리적인 요금제가 준비되어 있으며, 요금 발생 전 미리 상세한 안내를 드려 안심하고 사용하실 수 있습니다." 
                        />
                </div>
            </section>

            {/* Mobile Section */}
            <section className="py-24 px-6 relative bg-indigo-600 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                    <div className="max-w-xl">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white font-bold text-xs uppercase tracking-widest mb-6">MOBILE EXPERIENCE</div>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tight">이동 중에도,<br />SNS 관리 고민 끝</h2>
                        <p className="text-xl text-white/70 font-medium mb-10 leading-relaxed">
                            출퇴근길, 점심시간, 잠깐의 짬.<br />
                            모바일에서도 완벽하게 최적화된 AIDM으로<br />
                            언제 어디서든 SNS 계정을 관리하세요.
                        </p>
                        <div className="flex gap-4">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                                <p className="text-xs text-white/50 font-bold mb-1">LEADS</p>
                                <p className="text-white font-black text-lg">실시간 세일즈 리드 감지</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                                <p className="text-xs text-white/50 font-bold mb-1">OPPORTUNITIES</p>
                                <p className="text-white font-black text-lg">놓친 비즈니스 기회 분석</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="w-64 h-[500px] bg-gray-900 rounded-[3rem] border-[8px] border-gray-800 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-20"></div>
                            <div className="p-6 pt-12">
                                <div className="flex items-center gap-2 mb-8">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500"></div>
                                    <div className="h-2 w-20 bg-gray-700 rounded-full"></div>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-40 w-full bg-indigo-500/20 rounded-2xl animate-pulse"></div>
                                    <div className="h-4 w-3/4 bg-gray-800 rounded-full"></div>
                                    <div className="h-4 w-1/2 bg-gray-800 rounded-full"></div>
                                    <div className="pt-4 flex justify-between">
                                        <div className="h-10 w-10 bg-gray-800 rounded-xl"></div>
                                        <div className="h-10 w-24 bg-indigo-600 rounded-xl"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Decorative blobs */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-500 rounded-full blur-[80px] opacity-40 animate-pulse"></div>
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-400 rounded-full blur-[80px] opacity-40 animate-pulse animation-delay-2000"></div>
                    </div>
                </div>
            </section>


            {/* Final CTA */}
            <section className="py-32 px-6">
                <div className="max-w-5xl mx-auto bg-black rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600 rounded-full blur-[150px] opacity-50"></div>
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-pink-600 rounded-full blur-[150px] opacity-50"></div>

                    <div className="relative z-10">
                        <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
                            AI와 함께하는 SNS 마케팅,<br />
                            지금 시작하세요.
                        </h2>
                        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                            계정 연동만 하면 끝. 당신의 AI 팀이 대기 중입니다.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-white text-black px-12 py-5 rounded-full font-bold text-xl hover:scale-105 transition-transform shadow-2xl shadow-indigo-500/50"
                        >
                            시작하기
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <Footer t={translations[currentLang]} />
        </div>
    );
};

export default Home;

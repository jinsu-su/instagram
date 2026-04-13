import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Sparkles, ArrowRight, ShieldCheck, CreditCard as CardIcon, Globe } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import Navbar from '../components/Navbar';
import { PRICING_PLANS } from '../constants/pricing';

const Pricing = () => {
    const navigate = useNavigate();
    const [region, setRegion] = useState(navigator.language.startsWith('ko') ? 'KR' : 'GLOBAL');
    const [currentTrack, setCurrentTrack] = useState('basic');

    const isKorean = region === 'KR';

    // Image helper if needed, similar to Subscription.js
    const Image = ({ src, alt, className }) => <img src={src} alt={alt} className={className} />;

    return (
        <div className="min-h-screen bg-[#FDFDFD] font-sans selection:bg-indigo-100 selection:text-indigo-900">
            <Navbar isTransparent={false} />

            <div className="max-w-7xl mx-auto px-6 py-32 relative overflow-hidden">
                {/* Background Decorative Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-indigo-50/50 to-transparent -z-10 blur-3xl rounded-full"></div>

                {/* Header Section */}
                <div className="text-center mb-20 space-y-6">
                    <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">
                        {isKorean ? <>성공적인 브랜드,<br /><span className="text-indigo-600">최적의 플랜</span>으로 시작하세요</> :
                            <>Scale your brand with<br /><span className="text-indigo-600">The Power of AI</span></>}
                    </h1>

                    <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
                        {isKorean ? '필요한 기능만 담았습니다. 전 세계 어디서든 가장 안전하고 편리하게 구독하세요.' :
                            'Get everything you need to automate your social presence. Secure and simple global payments.'}
                    </p>

                    {/* Region Toggle */}
                    <div className="flex items-center justify-center pt-8">
                        <div className="bg-gray-100/80 backdrop-blur-md p-1.5 rounded-2xl flex gap-1 border border-gray-200">
                            <button
                                onClick={() => setRegion('KR')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${isKorean ? 'bg-white text-indigo-600 shadow-xl scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <Globe className="w-4 h-4" /> 국내결제
                            </button>
                            <button
                                onClick={() => setRegion('GLOBAL')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${!isKorean ? 'bg-white text-indigo-600 shadow-xl scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <Globe className="w-4 h-4" /> 해외결제
                            </button>
                        </div>
                    </div>
                </div>

                {/* Track Selector */}
                <div className="flex items-center justify-center mb-12">
                    <div className="bg-white/80 backdrop-blur-md p-2 rounded-3xl flex gap-2 border border-gray-200 shadow-xl">
                        <button
                            onClick={() => setCurrentTrack('basic')}
                            className={`px-8 py-4 rounded-2xl text-sm font-black transition-all flex items-center gap-2 ${currentTrack === 'basic' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xl scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Zap className="w-5 h-5" /> Basic (순수 자동화)
                        </button>
                        <button
                            onClick={() => setCurrentTrack('ai')}
                            className={`px-8 py-4 rounded-2xl text-sm font-black transition-all flex items-center gap-2 ${currentTrack === 'ai' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Sparkles className="w-5 h-5" /> AI (AI 바이럴 분석)
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className={`grid gap-10 items-stretch ${currentTrack === 'basic' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 2xl:grid-cols-4'}`}>
                    {PRICING_PLANS[currentTrack].map((plan) => (
                        <Card
                            key={plan.id}
                            className={`relative group flex flex-col rounded-[2.5rem] border-0 transition-all duration-500 hover:-translate-y-2
                                ${plan.recommended
                                    ? 'bg-white shadow-[0_32px_64px_-16px_rgba(79,70,229,0.15)] ring-1 ring-gray-200 z-10'
                                    : 'bg-white border border-gray-100/80 shadow-sm hover:shadow-xl'}`}
                        >
                            {plan.recommended && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black tracking-widest px-5 py-1.5 rounded-full shadow-lg z-20">
                                    {isKorean ? '가장 인기 있는 플랜' : 'MOST POPULAR'}
                                </div>
                            )}

                            <div className="p-8 md:p-10 flex flex-col h-full">
                                {/* Header: Name & Badge */}
                                <div className="mb-8">
                                    <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-3 break-words group-hover:text-indigo-600 transition-colors">
                                        {plan.name}
                                    </h3>
                                    <p className="text-sm font-bold text-gray-400 leading-relaxed pr-4">
                                        {isKorean ? `${plan.name}만의 핵심 기능을 제공합니다.` : `Includes essential ${plan.name} features.`}
                                    </p>
                                </div>

                                {/* Price Section */}
                                <div className="mb-8 h-16 flex flex-col justify-center items-center">
                                    <div className="flex items-baseline justify-center gap-1.5 w-full">
                                        <span className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">
                                            {isKorean
                                                ? (plan.price === 0 ? 'Free' : (typeof plan.price === 'number' ? `₩${plan.price.toLocaleString()}` : plan.price))
                                                : (plan.isCustom ? plan.priceUsd : (plan.priceUsd === 0 ? 'Free' : `$${plan.priceUsd}`))}
                                        </span>
                                        {!plan.isCustom && (typeof plan.price === 'number' && plan.price > 0 || typeof plan.priceUsd === 'number' && plan.priceUsd > 0) &&
                                            <span className="text-lg font-bold text-gray-400">/{isKorean ? '월' : 'month'}</span>
                                        }
                                    </div>
                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-2 text-center">{plan.badge}</p>
                                </div>

                                {/* CTA Button: Moved up for conversion */}
                                <div className="mb-10">
                                    <Button
                                        onClick={() => navigate('/login')}
                                        className={`w-full py-8 text-lg font-black rounded-3xl transition-all active:scale-95 shadow-xl group/btn
                                            ${plan.recommended
                                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100' :
                                                'bg-gray-100 hover:bg-gray-900 text-gray-900 hover:text-white shadow-none'}`}
                                    >
                                        {isKorean ? '시작하기' : 'Get Started'}
                                        <ArrowRight className="ml-3 w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
                                    </Button>
                                </div>

                                {/* Features Saparator */}
                                <div className="h-px bg-gray-100 w-full mb-8"></div>

                                {/* Features List */}
                                <div className="flex-1">
                                    <p className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6 opacity-40">주요 혜택</p>
                                    <ul className="space-y-4">
                                        {(isKorean ? plan.features : plan.featuresEn).map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-4">
                                                <div className={`mt-0.5 rounded-full p-1 shrink-0 ${plan.recommended ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
                                                    <Check className="w-3.5 h-3.5" strokeWidth={4} />
                                                </div>
                                                <span className="text-[14px] font-bold text-gray-600 leading-snug break-words">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
            {/* Footer Trust Section */}
            <div className="mt-24 max-w-3xl mx-auto bg-gray-50/50 backdrop-blur-sm border border-white p-8 rounded-[3rem] shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center text-green-500">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-black text-gray-900">{isKorean ? '안전한 결제 보장' : 'Secure Transactions'}</p>
                            <p className="text-xs font-bold text-gray-400 leading-relaxed">
                                {isKorean ? 'PortOne 및 글로벌 표준 보안 SSL을 준수합니다.' : 'Compliant with Meta Global Security Standards.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 opacity-40 grayscale group-hover:grayscale-0 transition-all">
                        <Image src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-6" />
                        <CardIcon className="w-8 h-8 text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-gray-100 bg-white">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                        <img src="/assets/aidm-logo-ultra.png" alt="AIDM" className="h-8 w-auto" />
                        <span className="font-bold text-gray-900">AIDM</span>
                    </div>
                    <div className="flex gap-8 text-sm font-bold text-gray-400">
                        <a href="#" className="hover:text-gray-900">Privacy</a>
                        <a href="#" className="hover:text-gray-900">Terms</a>
                        <a href="#" className="hover:text-gray-900">Contact</a>
                    </div>
                    <p className="text-sm text-gray-400 font-medium">© 2026 AIDM Corp.</p>
                </div>
            </footer>
        </div>
    );
};

export default Pricing;

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    Check, Loader2, CreditCard, Shield, Zap, Globe, Star, Sparkles,
    ArrowRight, ShieldCheck, X, AlertCircle, Calendar, Receipt, ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PRICING_PLANS } from '../constants/pricing';
import { apiFetch } from '../lib/api';

// Constants
const PORTONE_STORE_ID = "store-9df13b7a-e716-40e2-830c-51ffe3284f99";
const CHANNEL_KEY_KR = "channel-key-9ae6fd6e-d1df-4d3c-8439-04fa1a849895"; // Toss
const CHANNEL_KEY_GLOBAL = "channel-key-d870ba02-d96d-4769-b337-ca0f7c8528d0"; // PayPal v2

// Simple Image helper 
const Image = ({ src, alt, className }) => <img src={src} alt={alt} className={className} />;

const Subscription = ({ customerId, subscriptionStatus, showNotify, onClose, onSwitchView, variant = 'page' }) => {
    const safeString = (val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        try {
            if (Array.isArray(val) && val.length > 0) {
                const first = val[0];
                return (typeof first === 'object' && first !== null) ? (first.msg || first.message || JSON.stringify(first)) : String(first);
            }
            if (typeof val === 'object') return val.detail || val.message || val.msg || JSON.stringify(val);
            return String(val);
        } catch (e) { return 'Error'; }
    };

    const [region, setRegion] = useState(navigator.language.startsWith('ko') ? 'KR' : 'GLOBAL');
    const [currentTrack, setCurrentTrack] = useState('ai');
    const [currentPlan, setCurrentPlan] = useState('free');
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [isSdkLoaded, setIsSdkLoaded] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [upgradeInfo, setUpgradeInfo] = useState(null);
    const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const navigate = useNavigate();

    const isKorean = region === 'KR';

    useEffect(() => {
        if (subscriptionStatus) {
            const status = subscriptionStatus.status;
            const rawPlan = subscriptionStatus.plan_name || 'free';

            // ⚠️ ONLY set currentPlan to a paid ID if status is 'active'
            if (status === 'active' && rawPlan !== 'free') {
                // Ensure ID format matches pricing.js (e.g., ai-starter, basic-pro)
                const planId = rawPlan.includes('-') ? rawPlan : `${currentTrack}-${rawPlan}`;
                setCurrentPlan(planId);
            } else {
                // Default to the free plan of the current track
                setCurrentPlan(currentTrack === 'ai' ? 'ai-free' : 'basic-free');
            }
        }
    }, [subscriptionStatus, currentTrack]);

    useEffect(() => {
        if (variant === 'modal' && customerId) {
            fetchHistory();
        }
    }, [variant, customerId]);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await apiFetch('/api/subscription/history');
            if (res.ok) {
                const data = await res.json();
                setPaymentHistory(data);
            }
        } catch (error) {
            
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://cdn.portone.io/v2/browser-sdk.js";
        script.async = true;
        script.onload = () => setIsSdkLoaded(true);
        script.onerror = () => {
            
        };
        document.body.appendChild(script);
        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    const handleSubscribe = async (plan) => {
        if (!isSdkLoaded) {
            showNotify?.("결제 시스템을 불러오는 중입니다. 잠시만 기다려주세요.", "error");
            return;
        }

        // 0. Handle Non-Active Users (Expired, Canceled, or New)
        const isNotActive = !subscriptionStatus || ['canceled', 'expired', 'past_due'].includes(subscriptionStatus.status);

        // ⚠️ IF NOT ACTIVE: Always trigger a NEW purchase (re-subscribe)
        if (isNotActive || currentPlan.includes('-free')) {
            return initiatePayment(plan, isKorean ? plan.price : plan.priceUsd);
        }

        // If same plan and already active, do nothing
        if (plan.id === currentPlan) {
            showNotify?.(isKorean ? "이미 구독 중인 플랜입니다." : "You are already subscribed to this plan.", "info");
            return;
        }

        // 1. Detect Upgrade vs Downgrade for ACTIVE members
        // IDs match pricing.js (track-tier)
        const PLAN_ORDER = {
            'basic-free': 0, 'basic-starter': 1, 'basic-pro': 2, 'basic-custom': 3,
            'ai-free': 0, 'ai-starter': 1, 'ai-pro': 2, 'ai-business': 3, 'ai-custom': 4
        };

        const currentWeight = PLAN_ORDER[currentPlan] || 0;
        const newWeight = PLAN_ORDER[plan.id] || 0;

        setSelectedPlan(plan);

        if (newWeight > currentWeight) {
            // UPGRADE: Fetch pro-rated price
            setLoading(true);
            try {
                const res = await apiFetch(`/api/subscription/calculate-upgrade?new_plan_name=${plan.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setUpgradeInfo(data);
                } else {
                    showNotify?.(isKorean ? "금액 계산 중 오류가 발생했습니다." : "Error calculating price.", "error");
                }
            } catch (error) {
                
            } finally {
                setLoading(false);
            }
        } else {
            // DOWNGRADE: Show confirmation for the next billing cycle
            setShowDowngradeConfirm(true);
        }
    };

    const initiatePayment = async (plan, finalAmount) => {
        setLoading(true);
        const channelKey = isKorean ? CHANNEL_KEY_KR : CHANNEL_KEY_GLOBAL;
        const currency = isKorean ? "KRW" : "USD";
        const payMethod = isKorean ? "CARD" : "PAYPAL";

        try {
            const paymentId = `sub_${new Date().getTime()}`;
            const response = await window.PortOne.requestPayment({
                storeId: PORTONE_STORE_ID,
                channelKey: channelKey,
                paymentId: paymentId,
                orderName: `${plan.name} Plan Subscription`,
                totalAmount: finalAmount,
                currency: currency,
                payMethod: payMethod,
                issueBillingKey: true, // ⚠️ 정기결제 빌링키 발급 명시
                customer: { id: customerId },
                customData: { customer_id: customerId }
            });

            if (response.code != null) {
                const isCanceled = response.code === 'PAY_PROCESS_CANCELED' ||
                    (response.message && (response.message.includes('CANCELED') || response.message.includes('취소')));

                if (isCanceled) {
                    showNotify?.(isKorean ? '결제가 취소 되었습니다.' : 'Payment has been canceled.', 'error');
                } else {
                    showNotify?.(isKorean ? `결제 실패: ${response.message}` : `Payment Failed: ${response.message}`, 'error');
                }
                return;
            }

            const verifyRes = await apiFetch('/api/subscription/complete', {
                method: 'POST',
                body: JSON.stringify({
                    imp_uid: response.paymentId,
                    billing_key: response.billingKey,
                    merchant_uid: paymentId,
                    plan_name: plan.id,
                    amount: finalAmount,
                    currency: currency,
                    pg_provider: isKorean ? 'tosspayments' : 'paypal',
                    card_name: response.card?.name,
                    card_number: response.card?.number
                })
            });

            if (verifyRes.ok) {
                showNotify?.(isKorean ? '업그레이드가 완료되었습니다! 🎉' : 'Upgrade successful! 🎉', 'success');
                setUpgradeInfo(null);
                setTimeout(() => window.location.reload(), 2000);
            } else {
                const errorData = await verifyRes.json().catch(() => ({}));
                showNotify?.(safeString(errorData.detail) || (isKorean ? '서버 오류가 발생했습니다.' : 'Server error.'), 'error');
            }
        } catch (error) {
            
            showNotify?.(isKorean ? '결제 오류가 발생했습니다.' : 'Payment error.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDowngrade = async () => {
        if (!selectedPlan) return;
        setLoading(true);
        try {
            const res = await apiFetch(`/api/subscription/downgrade?new_plan_name=${selectedPlan.id}`, { method: 'POST' });
            if (res.ok) {
                showNotify?.(isKorean ? '요금제 변경이 예약되었습니다.' : 'Plan change scheduled.', 'success');
                setShowDowngradeConfirm(false);
                setTimeout(() => window.location.reload(), 2000);
            } else {
                showNotify?.(isKorean ? '변경 예약 중 오류가 발생했습니다.' : 'Error scheduling change.', 'error');
            }
        } catch (error) {
            
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async () => {
        setLoading(true);
        setShowCancelConfirm(false);
        try {
            const res = await apiFetch('/api/subscription/cancel', { method: 'POST' });
            if (res.ok) {
                showNotify?.(isKorean ? '구독이 해지되었습니다.' : 'Subscription has been canceled.', 'success');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                const errorData = await res.json().catch(() => ({}));
                showNotify?.(safeString(errorData.detail) || (isKorean ? '해지 처리 중 오류가 발생했습니다.' : 'Error canceling subscription.'), 'error');
            }
        } catch (error) {
            
            showNotify?.(isKorean ? '서버 통신 오류가 발생했습니다.' : 'Server communication error.', 'error');
        } finally {
            setLoading(false);
        }
    };
    const renderCancelConfirmModal = () => {
        const modalContent = (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <Card className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <CardContent className="p-10 text-center space-y-6">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-2">
                            <AlertCircle className="w-10 h-10 text-rose-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">정말 구독을 해지하시겠습니까?</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                해지 시 다음 결제 예정일부터 정기 결제가 진행되지 않으며, 프리미엄 기능을 더 이상 이용하실 수 없습니다.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 pt-4">
                            <Button
                                onClick={() => setShowCancelConfirm(false)}
                                className="w-full py-7 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-lg"
                            >
                                계속 이용하기
                            </Button>
                            <Button
                                onClick={handleCancelSubscription}
                                disabled={loading}
                                className="w-full py-7 bg-white border-2 border-rose-100 text-rose-500 rounded-2xl font-black hover:bg-rose-50 transition-all"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "구독 해지"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
        return createPortal(modalContent, document.body);
    };


    const renderUpgradeConfirmModal = () => {
        const modalContent = (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <Card className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <CardContent className="p-10 text-center space-y-6">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Sparkles className="w-10 h-10 text-indigo-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">요금제 업그레이드</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                현재 요금제의 남은 기간만큼 할인 혜택을 드립니다.<br />
                                오늘부터 새로운 {selectedPlan?.name} 플랜이 시작됩니다.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-6 space-y-3">
                            <div className="flex justify-between text-sm font-bold text-gray-500">
                                <span>신규 플랜 정가</span>
                                <span>₩{upgradeInfo.base_price.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-green-600">
                                <span>남은 기간 할인</span>
                                <span>-₩{upgradeInfo.discount.toLocaleString()}</span>
                            </div>
                            <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                                <span className="font-black text-gray-900">최종 결제 금액</span>
                                <span className="text-2xl font-black text-indigo-600">₩{upgradeInfo.final_price.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-4">
                            <Button
                                onClick={() => initiatePayment(selectedPlan, upgradeInfo.final_price)}
                                disabled={loading}
                                className="w-full py-7 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "결제하고 업그레이드"}
                            </Button>
                            <button
                                onClick={() => setUpgradeInfo(null)}
                                className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                취소하기
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
        return createPortal(modalContent, document.body);
    };

    const renderDowngradeConfirmModal = () => {
        const modalContent = (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <Card className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <CardContent className="p-10 text-center space-y-6">
                        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Calendar className="w-10 h-10 text-amber-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">요금제 변경 예약</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                {selectedPlan?.name} 플랜으로의 변경이 예약됩니다.<br />
                                이미 결제하신 이번 달 주기가 끝나는 <strong>{subscriptionStatus?.next_billing_date ? new Date(subscriptionStatus.next_billing_date).toLocaleDateString() : '다음 결제 일'}</strong>부터 변경된 요금제가 적용됩니다.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 pt-4">
                            <Button
                                onClick={handleDowngrade}
                                disabled={loading}
                                className="w-full py-7 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-lg"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "변경 예약하기"}
                            </Button>
                            <button
                                onClick={() => setShowDowngradeConfirm(false)}
                                className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                취소하기
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
        return createPortal(modalContent, document.body);
    };




    // RENDER: Modal Management View
    if (variant === 'modal') {
        const isPaidPlan = currentPlan && !currentPlan.includes('free');
        const hasHistory = paymentHistory.length > 0;
        const isCanceled = subscriptionStatus?.status === 'canceled';

        return (
            <div className="w-full bg-white rounded-[3rem] overflow-hidden relative font-sans">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 z-[60] p-2.5 bg-white border border-gray-100 rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all group pointer-events-auto"
                    >
                        <X className="w-5 h-5 text-gray-400 group-hover:text-gray-900" />
                    </button>
                )}

                <div className="p-6 md:p-10 pt-20 md:pt-20 pb-16 md:pb-24 space-y-10">
                    {/* Top Section: Plan Status & Highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                        <Card className={`md:col-span-8 ${isCanceled ? 'bg-amber-50/30 border-amber-100' : 'bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 border-indigo-100'} rounded-[2.5rem] shadow-sm relative overflow-hidden`}>
                            <CardContent className="p-8 md:p-10 relative z-10">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">현재 이용 중인 플랜</p>
                                            <h3 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                                                {subscriptionStatus?.plan_name && subscriptionStatus.plan_name !== 'free' 
                                                  ? subscriptionStatus.plan_name.toUpperCase().replace('-', ' ') 
                                                  : (paymentHistory.length > 0 && paymentHistory[0].status === 'paid' 
                                                      ? 'BASIC STARTER' 
                                                      : 'FREE PLAN')}
                                            </h3>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                            <Badge className={`${(subscriptionStatus?.status === 'active' || (paymentHistory && paymentHistory.length > 0 && paymentHistory[0].status === 'paid')) ? 'bg-green-50 text-green-700 border-green-100' : 
                                                isCanceled ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'} px-5 py-2 rounded-full font-black text-xs shadow-sm whitespace-nowrap min-w-fit inline-flex items-center`}>
                                                <div className={`w-1.5 h-1.5 rounded-full mr-2.5 ${(subscriptionStatus?.status === 'active' || (paymentHistory && paymentHistory.length > 0 && paymentHistory[0].status === 'paid')) ? 'bg-green-500 animate-pulse' : isCanceled ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                                                {isCanceled ? (isKorean ? '해지 예약됨' : 'Canceled') : 
                                                 (subscriptionStatus?.status === 'active' || (paymentHistory && paymentHistory.length > 0 && paymentHistory[0].status === 'paid')) ? (isKorean ? '사용 중' : 'Active') : (isKorean ? '만료됨' : 'Expired')}
                                            </Badge>
                                            
                                            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-indigo-50 border border-indigo-100 text-[11px] font-black text-indigo-600 whitespace-nowrap shadow-sm min-w-fit inline-flex">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{isKorean ? '다음 결제:' : 'Next Billing:'}</span>
                                                <span className="font-extrabold tracking-tight ml-1">
                                                    {subscriptionStatus?.next_billing_date 
                                                        ? new Date(subscriptionStatus.next_billing_date).toLocaleDateString() 
                                                        : (paymentHistory.length > 0 
                                                            ? new Date(new Date(paymentHistory[0].paid_at).setMonth(new Date(paymentHistory[0].paid_at).getMonth() + 1)).toLocaleDateString() 
                                                            : '-')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-none flex flex-col items-start gap-12 pt-10 md:pt-0 border-t md:border-t-0 md:border-l border-gray-100/80 md:pl-24 w-full md:w-auto min-w-[320px]">
                                        <div className="space-y-4 w-full">
                                            <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none mb-4">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-200"></div>
                                                결제 수단
                                            </div>
                                            <div className="space-y-2.5 pl-4 text-left">
                                                <div className="flex items-center gap-4 whitespace-nowrap">
                                                    <CreditCard className="w-5 h-5 text-indigo-500" />
                                                    <p className="text-[16px] font-black text-gray-900 leading-none tracking-tight">
                                                        {subscriptionStatus?.card_name || paymentHistory[0]?.card_name || (isKorean ? '등록된 카드 없음' : 'No card registered')}
                                                    </p>
                                                </div>
                                                {(subscriptionStatus?.card_number || paymentHistory[0]?.card_number) && (
                                                    <p className="text-[13px] font-bold text-slate-400 tracking-[0.1em] font-mono whitespace-nowrap opacity-80">
                                                        {subscriptionStatus?.card_number || paymentHistory[0]?.card_number}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4 w-full">
                                            <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none mb-4">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-200"></div>
                                                최근 결제일
                                            </div>
                                            <div className="flex items-center gap-4 pl-4 text-left whitespace-nowrap">
                                                <Calendar className="w-5 h-5 text-indigo-500" />
                                                <p className="text-[16px] font-black text-gray-900 leading-none">
                                                    {subscriptionStatus?.last_payment_date 
                                                        ? new Date(subscriptionStatus.last_payment_date).toLocaleDateString() 
                                                        : (paymentHistory[0]?.paid_at ? new Date(paymentHistory[0].paid_at).toLocaleDateString() : '-')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {isCanceled && (
                                    <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-xs font-medium text-amber-800 leading-relaxed">
                                            {isKorean ? 
                                                `구독 해지 신청이 완료되었습니다. ${new Date(subscriptionStatus.next_billing_date).toLocaleDateString()}까지는 모든 프리미엄 기능을 정상적으로 이용하실 수 있습니다.` :
                                                `Cancellation is complete. You can keep using all premium features until ${new Date(subscriptionStatus.next_billing_date).toLocaleDateString()}.`}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Action Card: Management vs Upsell */}
                        <Card className={`md:col-span-12 lg:col-span-4 rounded-[2.5rem] flex flex-col p-8 transition-all duration-500 ${!isPaidPlan ? 'bg-indigo-50/40 backdrop-blur-xl border border-indigo-100/50 shadow-sm shadow-indigo-50' : 'bg-white border border-gray-100'}`}>
                            {!isPaidPlan ? (
                                <div className="space-y-6 flex flex-col h-full">
                                    <div className="space-y-3">
                                        <h4 className="text-xl font-black text-indigo-900 tracking-tight leading-none pt-2">AI Pro로 업그레이드</h4>
                                        <p className="text-xs font-medium text-indigo-600/70 leading-relaxed">
                                            대규모 자동화 엔진과 데이터 기반의 정밀 AI 인사이트로 인스타그램 비즈니스의 압도적인 성장을 실현하세요.
                                        </p>
                                    </div>
                                    <div className="mt-auto space-y-3">
                                        <Button
                                            onClick={() => {
                                                if (onSwitchView) onSwitchView('subscription');
                                                if (onClose) onClose();
                                            }}
                                            className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-indigo-100"
                                        >
                                            전문가 플랜 보기
                                        </Button>
                                        <p className="text-[10px] text-center text-indigo-400 font-bold">언제든 원하는 요금제로 변경 가능합니다.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 flex flex-col h-full">
                                    <div className="space-y-3">
                                        <h4 className="text-xl font-black text-gray-900 tracking-tight">구독 관리</h4>
                                        <p className="text-xs font-medium text-gray-500 leading-relaxed">
                                            현재 요금제를 변경하거나 정기 결제를 관리합니다. 해지 시 다음 결제 예정일부터 결제가 중단됩니다.
                                        </p>
                                    </div>
                                    <div className="mt-auto space-y-3">
                                        <Button
                                            onClick={() => setShowCancelConfirm(true)}
                                            disabled={loading || isCanceled}
                                            className={`w-full py-6 rounded-2xl font-black transition-all ${isCanceled ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' : 'bg-white border-2 border-rose-100 text-rose-500 hover:bg-rose-50'}`}
                                        >
                                            {isCanceled ? (isKorean ? '해지 신청 완료' : 'Payment Stopped') : (isKorean ? '정기 결제 해지하기' : 'Cancel Subscription')}
                                        </Button>
                                        <button
                                            onClick={() => {
                                                if (onSwitchView) onSwitchView('subscription');
                                                if (onClose) onClose();
                                            }}
                                            className="w-full text-center text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors"
                                        >
                                            다른 플랜으로 변경하기
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Transaction History Section */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-4">
                            <h4 className="text-2xl font-black text-gray-900">최근 결제 내역</h4>
                            <div className="flex items-center gap-2 text-gray-400">
                                <Receipt className="w-5 h-5" />
                                <span className="text-sm font-bold">Total {paymentHistory.length} orders</span>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                            {historyLoading ? (
                                <div className="p-20 flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                    <p className="font-black text-gray-400">내역을 불러오는 중...</p>
                                </div>
                            ) : paymentHistory.length === 0 ? (
                                <div className="p-20 text-center space-y-4">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                                        <AlertCircle className="w-10 h-10 text-gray-300" />
                                    </div>
                                    <p className="font-black text-gray-400">결제 내역이 아직 없습니다.</p>
                                </div>
                            ) : (
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar relative">
                                    <table className="w-full border-collapse">
                                        <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                                            <tr>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/4">일시</th>
                                                <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/4">플랜</th>
                                                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/4">금액</th>
                                                <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/4">상태</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {paymentHistory.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-8 py-6 text-left font-bold text-gray-600 text-sm whitespace-nowrap">{new Date(item.paid_at).toLocaleDateString()}</td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className="font-black text-gray-900 uppercase whitespace-nowrap">
                                                            {item.amount >= 149000 ? 'AI PRO' : (item.amount >= 44000 ? 'PRO' : (item.amount >= 19000 ? 'BASIC STARTER' : 'BASIC'))}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right font-black text-gray-900 tabular-nums whitespace-nowrap">
                                                        {item.currency === 'KRW' ? `₩${item.amount.toLocaleString()}` : `$${item.amount.toLocaleString()}`}
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <Badge className="bg-green-50 text-green-700 border-green-100 font-bold px-3 py-1 whitespace-nowrap">Success</Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                {showCancelConfirm && renderCancelConfirmModal()}
                {upgradeInfo && renderUpgradeConfirmModal()}
                {showDowngradeConfirm && renderDowngradeConfirmModal()}
            </div>
        );
    }

    // RENDER: Full Page Sales/Pricing View (variant="page")
    try {
        const plansToRender = PRICING_PLANS?.[currentTrack] || [];

        return (
            <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-10 relative overflow-hidden bg-white md:rounded-[3rem] md:shadow-[0_20px_50px_rgba(0,0,0,0.1)] md:border border-gray-100 min-h-[800px]">
                {/* Close button if in modal mode */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 z-[100] p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all shadow-sm"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                )}

                {/* Background Decorative Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-indigo-50/50 to-transparent -z-10 blur-3xl rounded-full"></div>

                {/* Header Section */}
                <div className="text-center mb-10 md:mb-14 space-y-3 md:space-y-4">
                    <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-3">
                        {isKorean ? <>성공적인 브랜드,<br />최적의 플랜으로 시작하세요</> :
                            <>Scale your brand with<br />The Power of AI</>}
                    </h1>

                    <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed px-6">
                        {isKorean ? '필요한 기능만 담았습니다. 가장 안전하고 편리하게 구독하세요.' :
                            'Get everything you need to automate your social presence. Secure and simple global payments.'}
                    </p>

                    <div className="flex items-center justify-center pt-2">
                        <div className="bg-gray-100/50 p-1.5 rounded-[1.25rem] flex gap-1.5 border border-gray-100 shadow-sm">
                            <button
                                onClick={() => setRegion('KR')}
                                className={`px-7 py-2.5 rounded-2xl text-[13px] font-black transition-all flex items-center gap-2 ${isKorean ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <Globe className="w-4 h-4" /> 국내 이용자
                            </button>
                            <button
                                onClick={() => setRegion('GLOBAL')}
                                className={`px-7 py-2.5 rounded-2xl text-[13px] font-black transition-all flex items-center gap-2 ${!isKorean ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <Globe className="w-4 h-4" /> 해외 이용자
                            </button>
                        </div>
                    </div>
                </div>

                {/* Track Selector */}
                <div className="flex items-center justify-center mb-10 px-4">
                    <div className="bg-gray-100/50 p-1.5 rounded-2xl flex gap-1.5 border border-gray-100 w-fit">
                        <button
                            onClick={() => setCurrentTrack('basic')}
                            className={`px-8 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${currentTrack === 'basic' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Zap className={`w-4 h-4 ${currentTrack === 'basic' ? 'text-indigo-600' : 'text-gray-400'}`} />
                            Basic (순수 자동화)
                        </button>
                        <button
                            onClick={() => setCurrentTrack('ai')}
                            className={`px-8 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${currentTrack === 'ai' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Sparkles className={`w-4 h-4 ${currentTrack === 'ai' ? 'text-purple-600' : 'text-gray-400'}`} />
                            AI (바이럴 분석)
                        </button>
                    </div>
                </div>

                {/* Pricing Cards Layout */}
                <div className="w-full pb-16 pt-10 px-4 md:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-6 lg:gap-8">
                        {plansToRender.map((plan) => (
                            <Card
                                key={plan.id}
                                className={`relative group flex flex-col rounded-[2.5rem] border transition-all duration-500 hover:-translate-y-2 w-full h-auto min-h-full
                                    ${plan.recommended ? 'bg-white border-indigo-500/20 shadow-[0_32px_64px_-16px_rgba(79,70,229,0.15)] ring-4 ring-indigo-500/5' : 'bg-white border-gray-100 shadow-sm hover:shadow-xl'}`}
                            >
                                {plan.recommended && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black tracking-widest px-6 py-2 rounded-full shadow-lg z-20">
                                        {isKorean ? '가장 인기 있는 플랜' : 'MOST POPULAR'}
                                    </div>
                                )}

                                <div className="p-8 md:p-10 flex flex-col h-full">
                                    {/* Header: Name & Badge */}
                                    <div className="mb-6">
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2 break-words group-hover:text-indigo-600 transition-colors">
                                            {plan.name}
                                        </h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-4">{plan.badge}</p>
                                    </div>

                                    {/* Price Section */}
                                    <div className="mb-8 h-12 flex flex-col justify-center items-center">
                                        <div className="flex items-baseline justify-center gap-1.5 flex-wrap w-full">
                                            <span className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter text-center">
                                                {isKorean
                                                    ? (plan.price === 0 ? 'Free' : (typeof plan.price === 'number' ? `₩${plan.price.toLocaleString()}` : plan.price))
                                                    : (plan.isCustom ? plan.priceUsd : (plan.priceUsd === 0 ? 'Free' : `$${plan.priceUsd}`))}
                                            </span>
                                            {!plan.isCustom && (typeof plan.price === 'number' && plan.price > 0 || typeof plan.priceUsd === 'number' && plan.priceUsd > 0) &&
                                                <span className="text-sm md:text-base font-bold text-gray-400">/{isKorean ? '월' : 'month'}</span>
                                            }
                                        </div>
                                    </div>

                                    {/* CTA Button: Moved up */}
                                    <div className="mb-8">
                                        <Button
                                            onClick={() => handleSubscribe(plan)}
                                            disabled={loading}
                                            className={`w-full py-7 rounded-2xl font-black text-lg transition-all duration-300 flex items-center justify-center group/btn shadow-xl ${(plan.id === currentPlan && subscriptionStatus?.status === 'active')
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 shadow-indigo-200'
                                                }`}
                                        >
                                            {loading && selectedPlan?.id === plan.id ? <Loader2 className="w-6 h-6 animate-spin" /> :
                                                plan.id === currentPlan ? (isKorean ? '사용 중' : 'Current Plan') :
                                                    (isKorean ? `${plan.name} 시작하기` : `Start with ${plan.name}`)}
                                            {!loading && plan.id !== currentPlan && <ArrowRight className="ml-3 w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />}
                                        </Button>

                                    </div>

                                    {/* Separator */}
                                    <div className="h-px bg-gray-100 w-full mb-8"></div>

                                    {/* Features List */}
                                    <div className="flex-1">
                                        <ul className="space-y-4 md:space-y-5">
                                            {(isKorean ? plan.features : plan.featuresEn).map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-4">
                                                    <div className={`mt-1 rounded-full p-1.5 shrink-0 ${plan.recommended ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
                                                        <Check className="w-3.5 h-3.5" strokeWidth={4} />
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-600 leading-snug break-words">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Footer removed per user request */}
                {showCancelConfirm && renderCancelConfirmModal()}
                {upgradeInfo && renderUpgradeConfirmModal()}
                {showDowngradeConfirm && renderDowngradeConfirmModal()}
            </div >
        );
    } catch (e) {
        
        return (
            <div className="p-20 bg-rose-50 border-4 border-rose-100 rounded-[3rem] text-center m-10">
                <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
                <h2 className="text-3xl font-black text-rose-900 mb-4">화면 로드 중 오류가 발생했습니다</h2>
                <p className="text-rose-700 font-medium mb-10 italic">{e.message}</p>
                <button onClick={() => window.location.reload()} className="px-12 py-5 bg-rose-600 text-white rounded-2xl font-black shadow-xl hover:bg-rose-700 transition-all">
                    시스템 재시작
                </button>
            </div>
        );
    }
};

export default Subscription;

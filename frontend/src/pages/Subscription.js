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
        const isSubscribed = currentPlan !== 'free';

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
                    {/* Active Plan Detail Card */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                        <Card className={`md:col-span-8 ${subscriptionStatus?.status === 'canceled' ? 'bg-indigo-50/30 border-2 border-indigo-100 shadow-xl text-gray-900' : 'bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900 border border-indigo-100 shadow-xl'} rounded-[2.5rem] overflow-hidden relative transition-all duration-700`}>
                            {subscriptionStatus?.status !== 'canceled' && <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/30 rounded-full -mr-20 -mt-20 blur-3xl"></div>}
                            <CardContent className="p-6 md:p-10 relative z-10">
                                <div className="space-y-6 md:space-y-8">
                                    <div className="flex flex-col items-center text-center space-y-4 md:space-y-6">
                                        <div className="space-y-2">
                                            <p className={`text-[10px] md:text-xs font-black uppercase tracking-widest opacity-80 ${subscriptionStatus?.status === 'canceled' ? 'text-indigo-400' : 'text-indigo-400'}`}>현재 활성 플랜</p>
                                            <h3 className="text-4xl md:text-6xl font-black tracking-tight leading-none break-words bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                                {String(currentPlan || 'FREE').toUpperCase()} PLAN
                                            </h3>
                                        </div>
                                        <div className={`${subscriptionStatus?.status === 'canceled' ? 'bg-white border-indigo-100 text-indigo-600' : 'bg-white border-indigo-100 text-indigo-600'} backdrop-blur-md rounded-full px-6 md:px-8 py-2 md:py-3 border text-center shadow-sm`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full animate-pulse ${subscriptionStatus?.status === 'active' ? 'bg-green-400' :
                                                    subscriptionStatus?.status === 'canceled' ? 'bg-amber-400' :
                                                        ['expired', 'past_due'].includes(subscriptionStatus?.status) ? 'bg-red-400' :
                                                            'bg-gray-400'
                                                    }`}></div>
                                                <p className="text-[10px] md:text-xs font-black uppercase tracking-widest">
                                                    {subscriptionStatus?.status === 'canceled' ? (isKorean ? '해지 예약됨' : 'Canceled') :
                                                        isKorean ? ({ active: '사용 중', expired: '만료됨', past_due: '결제 실패', trialing: '체험 중' }[subscriptionStatus?.status] || subscriptionStatus?.status || '활성')
                                                            : (subscriptionStatus?.status || 'Active')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {subscriptionStatus?.status === 'canceled' && (
                                        <div className="bg-indigo-600/5 border border-indigo-200/50 rounded-[2rem] p-5 md:p-7 flex items-start gap-3 md:gap-5">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200/50">
                                                <ShieldCheck className="w-5 h-5 md:w-6 h-6" />
                                            </div>
                                            <div className="space-y-1 text-left text-gray-600">
                                                <p className="font-bold text-indigo-900 tracking-tight text-base md:text-lg">
                                                    {isKorean ? "구독 해지 및 기간 안내" : "Subscription access details"}
                                                </p>
                                                <p className="text-xs md:text-sm font-medium leading-relaxed text-indigo-900/70">
                                                    {isKorean ?
                                                        `${new Date(subscriptionStatus.next_billing_date).toLocaleDateString()}까지는 프리미엄 기능을 계속 이용하실 수 있으며, 이후 자동 종료됩니다.` :
                                                        `You can keep using premium features until ${new Date(subscriptionStatus.next_billing_date).toLocaleDateString()}. Changes apply automatically.`}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className={`flex flex-wrap gap-x-6 md:gap-x-10 gap-y-6 pt-8 md:pt-10 border-t ${subscriptionStatus?.status === 'canceled' ? 'border-indigo-100' : 'border-indigo-100'} justify-start items-start text-left w-full`}>
                                        <div className="space-y-1.5 min-w-[100px] md:min-w-[120px]">
                                            <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${subscriptionStatus?.status === 'canceled' ? 'text-indigo-400' : 'text-indigo-400'}`}>결제 수단</p>
                                            <div className="flex items-center gap-2">
                                                <CreditCard className={`w-4 h-4 md:w-5 h-5 text-indigo-400`} />
                                                <p className={`font-black text-sm md:text-lg truncate text-gray-800`}>
                                                    {subscriptionStatus?.payment_method === 'tosspayments'
                                                        ? `${subscriptionStatus?.card_name || '카드'}${subscriptionStatus?.card_number ? ` (${subscriptionStatus.card_number})` : ''}`
                                                        : (subscriptionStatus?.payment_method || '신용카드')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 min-w-[100px] md:min-w-[120px]">
                                            <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${subscriptionStatus?.status === 'canceled' ? 'text-indigo-400' : 'text-indigo-400'}`}>최근 결제</p>
                                            <div className="flex items-center gap-2">
                                                <Calendar className={`w-4 h-4 md:w-5 h-5 text-indigo-400`} />
                                                <p className={`font-black text-sm md:text-lg text-gray-800`}>
                                                    {subscriptionStatus?.last_payment_date ? new Date(subscriptionStatus.last_payment_date).toLocaleDateString() : '-'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 min-w-[100px] md:min-w-[120px]">
                                            <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${subscriptionStatus?.status === 'canceled' ? 'text-indigo-400' : 'text-indigo-400'}`}>
                                                {subscriptionStatus?.status === 'canceled' ? (isKorean ? '멤버십 종료일' : 'Access Expires') : (isKorean ? '다음 결제 예정' : 'Next Billing')}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                {subscriptionStatus?.status === 'canceled' ? <ShieldCheck className="w-4 h-4 md:w-5 h-5 text-indigo-600" /> : <Zap className={`w-4 h-4 md:w-5 h-5 text-indigo-400`} />}
                                                <p className={`font-black text-sm md:text-lg text-gray-800`}>
                                                    {subscriptionStatus?.next_billing_date ? new Date(subscriptionStatus.next_billing_date).toLocaleDateString() : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Action Card - Cancellation Focus */}
                        <Card className={`md:col-span-4 ${subscriptionStatus?.status === 'canceled' ? 'bg-rose-50/50 border-rose-100' : 'bg-rose-50/30 border-rose-100'} border rounded-[2.5rem] shadow-sm p-6 md:p-8 flex flex-col justify-between transition-colors duration-500`}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-rose-600">
                                    {subscriptionStatus?.status === 'canceled' ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                    <h4 className="text-xl font-black">
                                        {subscriptionStatus?.status === 'canceled' ? (isKorean ? '구독 해지 완료' : 'Subscription Canceled') : (isKorean ? '구독 해지 및 관리' : 'Cancel & Manage')}
                                    </h4>
                                </div>
                                <p className="text-sm font-medium text-gray-500 leading-relaxed">
                                    {subscriptionStatus?.status === 'canceled' ?
                                        (isKorean ? '정기 결제가 성공적으로 중단되었습니다. 다음 결제일부터는 비용이 청구되지 않습니다.' : 'Your recurring payment has been stopped. No more charges will occur.') :
                                        (isKorean ? '더 이상 서비스를 이용하고 싶지 않으신가요? 해지 시 다음 결제일부터 정기 결제가 중단됩니다.' : 'No longer want to use the service? No more recurring charges will occur.')
                                    }
                                </p>
                            </div>
                            <div className="space-y-4">
                                <Button
                                    onClick={() => setShowCancelConfirm(true)}
                                    disabled={loading || subscriptionStatus?.status === 'canceled'}
                                    className={`w-full py-8 rounded-3xl font-black shadow-sm transition-all ${subscriptionStatus?.status === 'canceled' ? 'bg-rose-100/50 border-2 border-rose-200 text-rose-500' : 'bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50'}`}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : (subscriptionStatus?.status === 'canceled' ? (isKorean ? '정기 결제 중단됨' : 'Payment Stopped') : (isKorean ? '정기 결제 해지하기' : 'Cancel Subscription'))}
                                </Button>

                                <button
                                    onClick={() => {
                                        if (onSwitchView) onSwitchView('subscription');
                                        if (onClose) onClose();
                                    }}
                                    className="w-full text-center text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors underline underline-offset-4"
                                >
                                    다른 요금제로 변경하고 싶으신가요?
                                </button>
                            </div>
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
                                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">일시</th>
                                                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">플랜</th>
                                                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">결제 수단</th>
                                                <th className="px-8 py-5 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">금액</th>
                                                <th className="px-8 py-5 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest">상태</th>
                                            </tr>
                                        </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {paymentHistory.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-6 font-bold text-gray-600 text-sm">{new Date(item.paid_at).toLocaleString()}</td>
                                                <td className="px-8 py-6">
                                                    <span className="font-black text-gray-900 uppercase">
                                                        {item.amount >= 149000 ? 'Pro' : (item.amount >= 49000 ? 'Starter' : 'Free')}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <CreditCard className="w-4 h-4 text-gray-400" />
                                                        <span className="font-bold text-gray-600 text-sm">
                                                            {item.card_name || '카드'} {item.card_number && `(${item.card_number})`}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right font-black text-gray-900">
                                                    {item.currency === 'KRW' ? `₩${item.amount.toLocaleString()}` : `$${item.amount.toLocaleString()}`}
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <Badge className="bg-green-50 text-green-700 border-green-100 font-bold px-3 py-1">Success</Badge>
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

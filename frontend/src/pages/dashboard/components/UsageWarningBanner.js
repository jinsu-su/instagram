import React from 'react';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/button';

const UsageWarningBanner = ({ usageLocked, isExpiredPaidPlan, currentView, onGoSubscription }) => {
  if (!(usageLocked || isExpiredPaidPlan) || currentView === 'subscription') return null;

  return (
    <div className="bg-gradient-to-r from-red-600 to-rose-500 rounded-2xl p-4 shadow-xl mb-6 flex items-center justify-between border border-red-400 group relative overflow-hidden animate-in slide-in-from-top-4 duration-500 fade-in cursor-pointer" onClick={onGoSubscription}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
      <div className="flex items-center gap-4 relative z-10">
        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform">
          <AlertCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-white font-black text-lg mb-0.5 tracking-tight flex items-center gap-2">
            {isExpiredPaidPlan ? '멤버십 기간 만료 / 결제 수단 확인 필요' : '🚨 당월 무료 한도(50건) 소진'}
          </h3>
          <p className="text-red-50 text-sm font-medium opacity-90">
            {isExpiredPaidPlan
              ? '멤버십 기간이 종료되어 모든 자동화 기능이 중지되었습니다. 서비스를 계속 이용하시려면 플랜을 갱신해 주세요.'
              : '자동 답장 봇 기능이 일시 중지되었습니다. 끊김 없는 자동화를 위해 무제한 플랜으로 업그레이드하세요. 과거 기록은 정상적으로 조회 가능합니다.'}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        className="relative z-10 bg-white/10 hover:bg-white text-white hover:text-red-600 border-white/30 h-10 px-6 rounded-xl font-bold transition-all shadow-sm group-hover:shadow-md border-transparent whitespace-nowrap hidden md:flex items-center"
      >
        {isExpiredPaidPlan ? '멤버십 갱신하기' : '무제한 플랜 열기'} <ChevronRight className="w-4 h-4 ml-1 opacity-70" />
      </Button>
    </div>
  );
};

export default UsageWarningBanner;

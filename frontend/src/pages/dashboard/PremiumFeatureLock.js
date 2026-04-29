import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';

const PremiumFeatureLock = ({ title, description, onUpgrade }) => {
  return (
    <div className="relative w-full min-h-[400px] flex items-center justify-center overflow-hidden rounded-[2rem] bg-gray-50 border border-gray-100 group my-4">
      {/* Background decoration elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-pink-500/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 max-w-lg text-center px-8 flex flex-col items-center py-12">
        <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-6 transform group-hover:scale-110 transition-transform duration-500 border border-indigo-50">
          <Lock className="w-8 h-8 text-indigo-600" />
        </div>

        <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">
          {title} <span className="text-indigo-600">(AI 요금제)</span>
        </h2>

        <p className="text-gray-500 font-bold mb-8 leading-relaxed text-sm">
          {description}
        </p>

        <Button
          onClick={onUpgrade}
          className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-[1.5rem] font-black text-lg shadow-[0_15px_30px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(79,70,229,0.6)] hover:scale-[1.02] active:scale-95 transition-all"
        >
          AI 요금제로 업그레이드하기
        </Button>

        <p className="mt-4 text-[11px] text-gray-400 font-bold flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> 프리미엄 기능을 지금 바로 시작해 보세요
        </p>
      </div>

      {/* Glassmorphism blur overlay */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] -z-10"></div>
    </div>
  );
};

export default PremiumFeatureLock;

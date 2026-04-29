import React from 'react';
import { Instagram, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';

const OnboardingView = ({ handleInstagramLogin, loginLoading }) => (
  <>
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in zoom-in duration-700">
      <Card className="w-full max-w-2xl shadow-2xl border border-white/50 bg-white/70 backdrop-blur-2xl relative z-10 rounded-[3rem] overflow-hidden p-6 md:p-12">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-10 p-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[2.5rem] w-fit shadow-2xl shadow-purple-200 animate-float">
            <Instagram className="w-16 h-16 text-white" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-6">
            시작해볼까요?
          </h2>
          <p className="text-gray-500 font-bold text-xl leading-relaxed">
            AIDM의 강력한 AI 기능을 위해<br />
            먼저 <strong>인스타그램 계정</strong>을 안전하게 연결해 주세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-10">
          <div className="space-y-4">
            <button
              onClick={handleInstagramLogin}
              disabled={loginLoading}
              className="group relative w-full py-8 bg-gradient-to-br from-[#7C3AED] to-[#DB2777] text-white rounded-[2.5rem] font-black text-2xl shadow-[0_25px_60px_-15px_rgba(124,58,237,0.5)] hover:shadow-[0_30px_70px_-10px_rgba(219,39,119,0.5)] transition-all duration-500 hover:scale-[1.03] active:scale-95 overflow-hidden border border-white/30 flex items-center justify-center gap-4"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              {loginLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Instagram className="w-8 h-8" />}
              {loginLoading ? '준비 중...' : 'Instagram 연결하기'}
            </button>
            <p className="text-center text-xs text-gray-400 font-bold tracking-tight">
              인스타그램 계정으로 로그인하여 댓글 분석 및 자동 답장 기능을 활성화합니다.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-12 text-center opacity-20 pointer-events-none select-none">
        <h3 className="text-9xl font-black text-gray-200 tracking-tighter">AIDM</h3>
      </div>
    </div>
  </>
);

export default OnboardingView;

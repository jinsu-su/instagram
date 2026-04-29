import React from 'react';
import { AlertCircle, Instagram, Lock, ShieldCheck } from 'lucide-react';

const EmergencyModal = ({ connectionStatus, handleInstagramLogin }) => {
  const isDisconnected = connectionStatus === 'DISCONNECTED';
  const isExpired = connectionStatus === 'EXPIRED';

  if (!isDisconnected && !isExpired) return null;

  if (isExpired) {
    return (
      <div className="fixed inset-0 z-[1110] bg-black/60 backdrop-blur-xl overflow-y-auto custom-scrollbar flex justify-center p-4 py-12 animate-in fade-in duration-700">
        <div className="max-w-md w-full bg-white rounded-[3.5rem] p-10 shadow-[0_35px_100px_-15px_rgba(59,130,246,0.3)] border border-blue-100 relative overflow-hidden animate-in zoom-in-95 duration-300 h-fit my-auto">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner ring-8 ring-blue-50/50 animate-float">
              <ShieldCheck className="w-12 h-12 text-blue-600" />
            </div>

            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4 leading-tight">
              보안 재인증이 필요합니다
            </h2>

            <p className="text-gray-500 font-bold leading-relaxed mb-10 px-2 whitespace-pre-line">
              Meta(인스타그램) 개인정보 보호 정책에 따라,{"\n"}안전을 위해 주기적인 재인증을 진행해 주세요.
            </p>

            <div className="space-y-4 w-full">
              <button
                onClick={handleInstagramLogin}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white h-20 rounded-[2rem] font-black text-xl transition-all shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] hover:shadow-[0_25px_50px_-10px_rgba(79,70,229,0.5)] hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 border border-white/20"
              >
                <Lock className="w-6 h-6" />
                1초만에 안전하게 갱신하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1110] bg-black/80 backdrop-blur-3xl overflow-y-auto custom-scrollbar flex justify-center p-4 py-12 animate-in fade-in duration-700">
      <div className="max-w-md w-full bg-white rounded-[3.5rem] p-10 shadow-[0_35px_100px_-15px_rgba(239,68,68,0.3)] border border-red-100 relative overflow-hidden animate-in zoom-in-95 duration-300 h-fit my-auto">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-red-50 to-rose-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner ring-8 ring-red-50/50 animate-float">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>

          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4 leading-tight">
            연결이 중단되었습니다
          </h2>

          <p className="text-gray-500 font-bold leading-relaxed mb-10 px-2 whitespace-pre-line">
            비밀번호 변경 등으로 인해{"\n"}인스타그램 연동이 해제되었습니다.
          </p>

          <div className="space-y-4 w-full">
            <button
              onClick={handleInstagramLogin}
              className="w-full bg-gradient-to-r from-red-600 to-rose-600 text-white h-20 rounded-[2rem] font-black text-xl transition-all shadow-[0_20px_40px_-10px_rgba(225,29,72,0.4)] hover:shadow-[0_25px_50px_-10px_rgba(225,29,72,0.5)] hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 border border-white/20"
            >
              <Instagram className="w-7 h-7" />
              지금 다시 연결하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyModal;

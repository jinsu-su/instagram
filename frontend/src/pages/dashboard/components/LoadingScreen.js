import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';

const LoadingScreen = ({ initializationError, onRetry }) => {
  if (initializationError) {
    return (
      <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center animate-in fade-in duration-500 p-6 text-center">
        <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 max-w-md w-full shadow-xl shadow-red-50/50">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">연결에 실패했습니다</h2>
          <p className="text-gray-600 font-bold mb-8 leading-relaxed">
            {initializationError}<br />
            서버가 점검 중이거나 일시적인 장애가 있을 수 있습니다.
          </p>
          <Button
            onClick={onRetry}
            className="w-full rounded-2xl bg-gray-900 text-white h-14 font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200"
          >
            다시 연결 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="relative animate-pulse mb-0">
        <img
          src="/assets/aidm-logo-ultra.png"
          alt="AIDM"
          className="h-32 w-auto object-contain"
        />
      </div>
      <div className="-mt-4 text-center space-y-0.5">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight m-0">잠시만 기다려주세요</h2>
        <p className="text-gray-500 font-bold m-0">AIDM 연결을 준비하고 있습니다...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;

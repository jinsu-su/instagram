import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';

const DisconnectConfirmModal = ({ setShowDisconnectConfirm, handleDisconnectAccount }) => {
  return (
    <div
      className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md flex justify-center"
      onClick={(e) => e.target === e.currentTarget && setShowDisconnectConfirm(false)}
    >
      <div className="relative min-h-full flex justify-center p-4 py-12 pointer-events-none">
        <Card className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl scale-in-center overflow-hidden border-none p-8 text-center pointer-events-auto h-fit my-auto">
          <div className="p-4 bg-red-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <LogOut className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-4 tracking-tighter">연결을 해제하시겠습니까?</h3>
          <p className="text-sm text-gray-600 font-bold leading-relaxed mb-8">인스타 연결 해제 시 자동화 및 분석 기능이 중단됩니다.</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDisconnectConfirm(false)}
              className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl text-sm font-black hover:bg-gray-200 transition-all"
            >
              취소
            </Button>
            <Button
              onClick={handleDisconnectAccount}
              className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-sm font-black hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
            >
              해제하기
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DisconnectConfirmModal;

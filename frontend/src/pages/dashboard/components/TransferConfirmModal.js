import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';

const TransferConfirmModal = ({
  setShowTransferConfirm,
  setPendingTransferPageId,
  handleForcedTransfer,
  loginLoading,
}) => {
  return (
    <div
      className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md flex justify-center"
      onClick={(e) => e.target === e.currentTarget && (setShowTransferConfirm(false), setPendingTransferPageId(null))}
    >
      <div className="relative min-h-full flex justify-center p-4 py-12 pointer-events-none">
        <Card className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl scale-in-center overflow-hidden border-none p-8 text-center animate-in zoom-in-95 duration-200 pointer-events-auto h-fit my-auto">
          <div className="p-4 bg-orange-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-orange-500" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-4 tracking-tighter">이미 연결된 계정입니다</h3>
          <p className="text-sm text-gray-600 font-bold leading-relaxed mb-8">
            이 인스타그램 계정은 다른 AIDM 사용자에게 연결되어 있습니다.<br />내 계정으로 가져오시겠습니까?
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowTransferConfirm(false);
                setPendingTransferPageId(null);
              }}
              className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl text-sm font-black hover:bg-gray-200 transition-all"
            >
              취소
            </Button>
            <Button
              onClick={handleForcedTransfer}
              disabled={loginLoading}
              className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-orange-200"
            >
              {loginLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '네, 가져오겠습니다'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TransferConfirmModal;

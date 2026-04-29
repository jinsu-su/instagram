import React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';

const ConversationDeleteModal = ({
  showConversationDeleteModal,
  isDeletingConversation,
  setShowConversationDeleteModal,
  executeDeleteConversation,
}) => {
  if (!showConversationDeleteModal) return null;

  return (
    <div
      className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md flex justify-center"
      onClick={(e) => e.target === e.currentTarget && (!isDeletingConversation && setShowConversationDeleteModal(false))}
    >
      <div className="relative min-h-full flex justify-center p-4 py-12 pointer-events-none">
        <Card className="bg-white rounded-[2.5rem] shadow-2xl border-none p-8 text-center pointer-events-auto overflow-hidden relative h-fit my-auto max-w-md">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
          <div className="p-5 bg-red-50 rounded-[2rem] w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Trash2 className="w-12 h-12 text-red-500" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">채팅방을 삭제하시겠습니까?</h3>
          <p className="text-gray-500 font-bold leading-relaxed mb-10 px-4">이 작업은 취소할 수 없습니다. 채팅방과 모든 메시지 내역이 즉시 영구 삭제됩니다.</p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => !isDeletingConversation && setShowConversationDeleteModal(false)}
              disabled={isDeletingConversation}
              className="flex-1 h-14 bg-gray-50 border-gray-100 text-gray-500 rounded-2xl text-base font-black hover:bg-gray-100 hover:text-gray-900 transition-all border-none disabled:opacity-50"
            >
              취소
            </Button>
            <Button
              onClick={executeDeleteConversation}
              disabled={isDeletingConversation}
              className="flex-1 h-14 bg-red-600 text-white rounded-2xl text-base font-black hover:bg-red-700 shadow-xl shadow-red-200 transition-all active:scale-95 border-none disabled:opacity-50"
            >
              {isDeletingConversation ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  삭제 중...
                </>
              ) : (
                '삭제하기'
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ConversationDeleteModal;

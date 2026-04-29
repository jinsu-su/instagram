import React from 'react';
import { Trash2 } from 'lucide-react';

const KeywordDeleteConfirmModal = ({
  showDeleteConfirm,
  keywordToDelete,
  setShowDeleteConfirm,
  setKeywordToDelete,
  keywordReplies,
  setKeywordReplies,
  saveKeywordSettings,
  showNotify,
}) => {
  if (!showDeleteConfirm || !keywordToDelete) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-md flex items-start justify-center p-4 pt-12 md:pt-32 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-red-50 animate-in zoom-in-95 duration-200 h-fit relative pointer-events-auto">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-red-50/50">
            <Trash2 className="w-10 h-10 text-red-500" />
          </div>

          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">정말로 삭제하시겠습니까?</h2>
          <p className="text-gray-500 font-bold mb-8 text-sm px-4">
            키워드 <span className="text-red-500 font-black">"{keywordToDelete.keyword}"</span> 설정이 영구적으로 삭제됩니다.<br />삭제 후에는 복구할 수 없습니다.
          </p>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setKeywordToDelete(null);
              }}
              className="h-14 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-all border border-gray-100"
            >
              취소
            </button>
            <button
              onClick={async () => {
                const updated = keywordReplies.filter((_, idx) => idx !== keywordToDelete.masterIndex);
                setKeywordReplies(updated);
                setShowDeleteConfirm(false);
                setKeywordToDelete(null);
                await saveKeywordSettings(updated);
                showNotify('자동화가 삭제되었습니다.', 'success');
              }}
              className="h-14 bg-red-500 text-white rounded-2xl font-black text-base shadow-lg shadow-red-200 hover:bg-red-600 transition-all active:scale-[0.98]"
            >
              삭제하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeywordDeleteConfirmModal;

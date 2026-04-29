import React from 'react';
import { EyeOff, Loader2, Trash2 } from 'lucide-react';

const ModerationConfirmModal = ({
  showDeleteConfirmModal,
  moderationActionType,
  idsToConfirmDelete,
  isModerationActionLoading,
  setShowDeleteConfirmModal,
  setIdsToConfirmDelete,
  handleModerationAction,
}) => {
  if (!showDeleteConfirmModal) return null;

  const isDelete = moderationActionType === 'DELETE';
  const count = idsToConfirmDelete.length;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-md flex items-start justify-center p-4 pt-12 md:pt-32 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-gray-100 animate-in zoom-in-95 duration-200 h-fit relative pointer-events-auto">
        <div className="flex flex-col items-center text-center">
          <div className={`w-20 h-20 ${isDelete ? 'bg-red-50 ring-red-50/50' : 'bg-indigo-50 ring-indigo-50/50'} rounded-3xl flex items-center justify-center mb-6 ring-8`}>
            {isDelete ? (
              <Trash2 className="w-10 h-10 text-red-500" />
            ) : (
              <EyeOff className="w-10 h-10 text-indigo-500" />
            )}
          </div>

          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
            {count}개의 댓글을 {isDelete ? '삭제' : '숨김'}하시겠습니까?
          </h2>
          <p className="text-gray-500 font-bold mb-8 text-sm px-4 leading-relaxed">
            {isDelete
              ? '삭제된 댓글은 인스타그램에서 영구히 사라지며 복구할 수 없습니다.'
              : '숨겨진 댓글은 작성자와 본인에게만 보이며, 타인에겐 노출되지 않습니다.'}
          </p>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              disabled={isModerationActionLoading}
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setIdsToConfirmDelete([]);
              }}
              className="h-14 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-all border border-gray-100 disabled:opacity-50"
            >
              취소
            </button>
            <button
              disabled={isModerationActionLoading}
              onClick={handleModerationAction}
              className={`h-14 ${isDelete ? 'bg-red-500 shadow-red-200 hover:bg-red-600' : 'bg-indigo-500 shadow-indigo-200 hover:bg-indigo-600'} text-white rounded-2xl font-black text-base shadow-lg transition-all active:scale-[0.98] flex items-center justify-center`}
            >
              {isModerationActionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                '확인'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModerationConfirmModal;

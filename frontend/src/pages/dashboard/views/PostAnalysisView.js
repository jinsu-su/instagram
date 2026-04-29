import React from 'react';
import { ArrowLeft, EyeOff, Lock, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

const PostAnalysisView = ({
  postAnalysisResult,
  isAiPremiumLocked,
  moderationSubFilter,
  setModerationSubFilter,
  setIsSelectionMode,
  setSelectedCommentIds,
  isSelectionMode,
  selectedCommentIds,
  setModerationActionType,
  setIdsToConfirmDelete,
  setShowDeleteConfirmModal,
  setSelectedPost,
  setPostAnalysisResult,
  setCurrentView,
}) => {
  if (!postAnalysisResult) return null;

  const allDetectedComments = postAnalysisResult.comments.filter(c =>
    ['TOXIC', 'SPAM', 'COMPLAINT'].includes(c?.analysis?.category)
  );

  const filteredComments = allDetectedComments.filter(c =>
    moderationSubFilter === 'ALL' || c?.analysis?.category === moderationSubFilter
  );

  const counts = {
    ALL: allDetectedComments.length,
    TOXIC: allDetectedComments.filter(c => c?.analysis?.category === 'TOXIC').length,
    SPAM: allDetectedComments.filter(c => c?.analysis?.category === 'SPAM').length,
    COMPLAINT: allDetectedComments.filter(c => c?.analysis?.category === 'COMPLAINT').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-[2.5rem] border border-gray-100 shadow-sm relative z-40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSelectedPost(null);
            setPostAnalysisResult(null);
            setIsSelectionMode(false);
            setSelectedCommentIds(new Set());
          }}
          className="rounded-2xl hover:bg-white hover:shadow-md transition-all h-12 w-12"
        >
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </Button>
        <div>
          <h3 className="text-xl font-black text-gray-900 leading-tight">게시물 분석 결과</h3>
          <p className="text-sm text-gray-500 font-bold">
            {isAiPremiumLocked ? 'AI 클린가드 분석 (AI 요금제)' : (
              <>
                {moderationSubFilter === 'ALL' ? '탐지된 모든 댓글' :
                  moderationSubFilter === 'TOXIC' ? '탐지된 악플' :
                    moderationSubFilter === 'SPAM' ? '탐지된 스팸' : '탐지된 불만'} ({counts[moderationSubFilter]}개)
              </>
            )}
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2.5rem] min-h-[500px]">
        <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 transition-all ${isAiPremiumLocked ? 'blur-md pointer-events-none select-none opacity-40' : ''}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/30 p-6 rounded-[2.5rem] border border-gray-50 shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedCommentIds(new Set());
                }}
                className={`h-11 px-6 rounded-2xl font-bold text-sm transition-all ${isSelectionMode ? 'bg-indigo-600 text-white border-none shadow-lg shadow-indigo-100' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300'}`}
              >
                {isSelectionMode ? '선택 취소' : '선택 삭제'}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  const ids = filteredComments.map(c => c.id);
                  if (ids.length > 0) {
                    setModerationActionType('HIDE');
                    setIdsToConfirmDelete(ids);
                    setShowDeleteConfirmModal(true);
                  }
                }}
                disabled={filteredComments.length === 0 || isSelectionMode}
                className="h-11 px-6 rounded-2xl font-bold text-sm bg-white border-gray-100 text-gray-600 hover:border-gray-300 transition-all disabled:opacity-30"
              >
                <EyeOff className="w-4 h-4 mr-2" />
                {moderationSubFilter === 'ALL' ? '전체 숨김' :
                  moderationSubFilter === 'TOXIC' ? '악플 전체 숨김' :
                    moderationSubFilter === 'SPAM' ? '스팸 전체 숨김' : '불만 전체 숨김'}
              </Button>

              <Button
                onClick={() => {
                  const ids = filteredComments.map(c => c.id);
                  if (ids.length > 0) {
                    setModerationActionType('DELETE');
                    setIdsToConfirmDelete(ids);
                    setShowDeleteConfirmModal(true);
                  }
                }}
                disabled={filteredComments.length === 0 || isSelectionMode}
                className="bg-red-600 text-white hover:bg-red-700 h-11 px-6 rounded-2xl font-black text-sm shadow-lg shadow-red-100 border-none transition-all disabled:opacity-30 disabled:grayscale"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {moderationSubFilter === 'ALL' ? '전체 삭제' :
                  moderationSubFilter === 'TOXIC' ? '악플 전체 삭제' :
                    moderationSubFilter === 'SPAM' ? '스팸 전체 삭제' : '불만 전체 삭제'}
              </Button>
            </div>
          </div>

          {isSelectionMode && selectedCommentIds.size > 0 && (
            <div className="flex items-center justify-between gap-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300">
              <span className="text-sm font-black text-indigo-900 ml-2">
                {selectedCommentIds.size}개의 댓글 선택됨
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setModerationActionType('HIDE');
                    setIdsToConfirmDelete(Array.from(selectedCommentIds));
                    setShowDeleteConfirmModal(true);
                  }}
                  className="bg-white border-indigo-200 text-indigo-600 h-10 px-4 rounded-xl font-bold text-sm"
                >
                  <EyeOff className="w-4 h-4 mr-2" />
                  선택 숨김
                </Button>
                <Button
                  onClick={() => {
                    setModerationActionType('DELETE');
                    setIdsToConfirmDelete(Array.from(selectedCommentIds));
                    setShowDeleteConfirmModal(true);
                  }}
                  className="bg-red-500 text-white hover:bg-red-600 h-10 px-4 rounded-xl font-bold text-sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  선택 삭제
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-1 bg-gray-100/50 rounded-2xl w-fit">
            {[
              { id: 'ALL', label: '전체' },
              { id: 'TOXIC', label: '악플' },
              { id: 'SPAM', label: '스팸' },
              { id: 'COMPLAINT', label: '불만' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setModerationSubFilter(tab.id);
                  setIsSelectionMode(false);
                  setSelectedCommentIds(new Set());
                }}
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${moderationSubFilter === tab.id
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {tab.label}
                {!isAiPremiumLocked && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${moderationSubFilter === tab.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {counts[tab.id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filteredComments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredComments.slice(0, 5).map((comment, idx) => (
                <div
                  key={comment.id}
                  className="group p-5 bg-white rounded-2xl border border-gray-100 transition-all duration-300 flex gap-4 items-start"
                >
                  <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm border-2 border-white flex-shrink-0">
                    <img src={comment.user_profile_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.username}`} alt={comment.username} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-sm text-gray-900">@{comment.username}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {new Date(comment.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium leading-relaxed mb-3">
                      {comment.text}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-indigo-50 text-indigo-600 border-none font-bold text-[10px] py-1 rounded-lg">
                        AI 분석됨
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white py-12 rounded-3xl border-2 border-dashed border-gray-100 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-gray-300" />
              </div>
              <h4 className="text-lg font-black text-gray-900 mb-1">탐지된 댓글이 없습니다</h4>
              <p className="text-sm text-gray-500 font-bold">포스트에 깨끗한 댓글만 가득합니다!</p>
            </div>
          )}
        </div>

        {isAiPremiumLocked && (
          <div className="absolute inset-0 z-30 backdrop-blur-md bg-white/40 flex flex-col items-center justify-center p-8 text-center rounded-[2.5rem]">
            <div className="max-w-md bg-white p-10 rounded-[3rem] shadow-2xl border border-indigo-100 flex flex-col items-center animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 relative">
                <Sparkles className="w-10 h-10 text-indigo-600 animate-pulse" />
                <Lock className="absolute -right-1 -bottom-1 w-8 h-8 text-indigo-400 bg-white rounded-full p-1.5 shadow-sm border border-indigo-50" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">AI 댓글 정밀 분석</h3>
              <p className="text-sm font-bold text-gray-500 mb-8 leading-relaxed">
                AI가 수만 개의 댓글 속에서 악플, 스팸, 고객 불만을 자동으로 분류해 드립니다.<br />
                <span className="text-indigo-600">AI 요금제</span>로 업그레이드하고<br />
                번거로운 수동 관리 시간을 90% 이상 절감하세요.
              </p>
              <Button
                onClick={() => setCurrentView('subscription')}
                className="w-full bg-indigo-600 text-white rounded-[2rem] h-14 font-black text-base shadow-[0_15px_30px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(79,70,229,0.6)] active:scale-95 transition-all"
              >
                AI 요금제로 업그레이드하기
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostAnalysisView;

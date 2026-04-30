import React from 'react';
import { Bot, Heart, Lock, MessageCircle, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';

const AiGuardView = ({
  selectedPost,
  isPostAnalyzing,
  renderPostAnalysis,
  isModerationAlertActive,
  setIsModerationAlertActive,
  saveModerationSettings,
  isGalleryLoading,
  galleryPosts,
  isPremiumFeatureLocked,
  showPremiumLockToast,
  isAiPremiumLocked,
  handlePostAnalysis,
  loadGalleryPosts,
  customerId,
}) => {
  if (selectedPost) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {isPostAnalyzing ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in duration-700">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
              <Bot className="absolute inset-0 m-auto w-10 h-10 text-indigo-600 animate-pulse" />
            </div>
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">AI 정밀 분석 중</h3>
              <p className="text-gray-500 font-bold text-lg">
                댓글의 유해성을 판단하고 있습니다...
              </p>
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        ) : (
          renderPostAnalysis()
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full mx-auto py-8 animate-in fade-in duration-500">
      <div className="mb-12 flex flex-col items-center justify-center text-center relative border-b border-gray-100 pb-10 w-full mx-auto">
        <div className="flex flex-col items-center gap-1 mb-6">
          <h1 className="text-2xl lg:text-4xl font-black text-gray-900 tracking-tight mb-3 text-center uppercase">AI Clean Guard</h1>
          <p className="text-gray-500 font-bold text-sm max-w-2xl">
            검사하고 싶은 게시물을 선택하세요. AI가 즉시 스팸과 악성 댓글을 진단합니다.
          </p>
        </div>

        {/* Global Master Toggle */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
            <span className={`text-sm font-black ${isModerationAlertActive ? 'text-indigo-950' : 'text-gray-400'}`}>
              전체 탐지 알림 {isModerationAlertActive ? 'ON' : 'OFF'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newState = !isModerationAlertActive;
                setIsModerationAlertActive(newState);
                saveModerationSettings(newState);
              }}
              className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none ${isModerationAlertActive ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${isModerationAlertActive ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 font-bold">
            * 서비스 전체의 실시간 알림을 한 번에 제어합니다.
          </p>
        </div>

        <div className="md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2 flex items-center gap-4 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100 shrink-0 mt-6 md:mt-0">
          <Button
            variant="white"
            onClick={() => {
              if (isPremiumFeatureLocked) {
                showPremiumLockToast('프리미엄 요금제로 연장해야 데이터를 동기화할 수 있습니다.');
                return;
              }
              if (customerId) {
                loadGalleryPosts(customerId);
              }
            }}
            className="rounded-xl bg-white border border-gray-200 text-gray-900 font-bold h-11 px-5 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm flex items-center gap-2 group"
          >
            <RefreshCw className={`w-4 h-4 transition-transform group-hover:rotate-180 duration-500 ${isGalleryLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm">게시물 새로고침</span>
          </Button>
        </div>
      </div>

      {isGalleryLoading ? (
        <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="w-full aspect-square bg-gray-100 rounded-[2rem] border border-gray-100 shadow-lg animate-pulse relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {galleryPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => {
                if (isPremiumFeatureLocked) {
                  showPremiumLockToast('프리미엄 요금제로 연장해야 포스트를 분석할 수 있습니다.');
                  return;
                }
                if (isAiPremiumLocked) {
                  showPremiumLockToast('AI 댓글 분석은 AI 요금제 전용 기능입니다.');
                  return;
                }
                handlePostAnalysis(post);
              }}
              className="group relative aspect-square bg-white rounded-[2rem] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
            >
              <img
                src={post.thumbnail_url || post.url}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt="Post thumbnail"
              />

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4">
                <div className="bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full flex items-center gap-2 text-white font-bold border border-white/30 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  {isAiPremiumLocked ? <Lock className="w-4 h-4 text-white/70" /> : <Sparkles className="w-4 h-4 text-yellow-300" />}
                  <span>{isAiPremiumLocked ? 'AI 클린가드 (AI 요금제)' : '정밀 분석 시작'}</span>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                <div className="flex gap-2 text-white text-xs font-bold drop-shadow-md">
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3 fill-white" /> {post.like_count}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 fill-white" /> {post.comments_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiGuardView;

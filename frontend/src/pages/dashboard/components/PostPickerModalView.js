import React from 'react';
import { Check, ImageIcon, Loader2, Plus, RotateCw, X, Zap } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';

const PostPickerModalView = ({
  showPostPicker,
  setShowPostPicker,
  mediaList,
  mediaListLoading,
  builderTargetPosts,
  setBuilderTargetPosts,
  MAX_SIMPLE_AUTOMATION_POSTS,
  showNotify,
  nextCursor,
  loadUserMedia,
  customerId,
  isMoreLoading,
}) => {
  if (!showPostPicker) return null;

  const filteredMedia = mediaList || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={() => setShowPostPicker(false)}
      />

      {/* Modal Content */}
      <Card className="relative w-full max-w-4xl h-[85vh] bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border-none overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <CardHeader className="px-8 pt-8 pb-6 border-b border-gray-50 shrink-0">
          <div className="relative">
            <div className="text-center w-full">
              <CardTitle className="text-2xl font-black text-gray-900 tracking-tight">작동할 포스트 선택</CardTitle>
              <CardDescription className="text-sm font-bold text-gray-500 mt-1">자동화 반응을 설정할 게시물을 피드에서 골라주세요.</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPostPicker(false)}
              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {mediaListLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-500 font-bold">인스타그램 게시물을 불러오는 중입니다...</p>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <ImageIcon className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">불러올 게시물이 없습니다</h3>
              <p className="text-gray-500 mt-2 max-w-xs">최근 업로드한 게시물이 없는 것 같습니다. 인스타그램에 먼저 게시물을 올려주세요.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredMedia.map((media) => {
                  const isSelected = builderTargetPosts.some(p => p.id === media.id);
                  return (
                    <div
                      key={media.id}
                      onClick={() => {
                        if (isSelected) {
                          setBuilderTargetPosts(builderTargetPosts.filter(p => p.id !== media.id));
                        } else {
                          if (builderTargetPosts.length >= MAX_SIMPLE_AUTOMATION_POSTS) {
                            showNotify(`최대 ${MAX_SIMPLE_AUTOMATION_POSTS}개의 게시물까지만 선택할 수 있습니다.`, 'warning');
                            return;
                          }
                          setBuilderTargetPosts([...builderTargetPosts, media]);
                        }
                      }}
                      className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:ring-8 hover:ring-indigo-50 ${isSelected ? 'ring-8 ring-indigo-500 ring-offset-0 scale-[0.98]' : ''
                        }`}
                    >
                      <img
                        src={media.media_url}
                        alt="Instagram Post"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <p className="text-white text-[10px] font-bold line-clamp-2 leading-tight">
                          {media.caption || "내용 없음"}
                        </p>
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-0 duration-300">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}

                      {/* Media Type Icon */}
                      <div className="absolute top-3 left-3 px-2 py-1 bg-black/30 backdrop-blur-md rounded-lg flex items-center gap-1.5 border border-white/10">
                        {media.media_type === 'VIDEO' ? (
                          <Zap className="w-3 h-3 text-white fill-white" />
                        ) : (
                          <ImageIcon className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {nextCursor && (
                <div className="mt-10 flex justify-center pb-10">
                  <Button
                    onClick={() => loadUserMedia(customerId, nextCursor)}
                    disabled={isMoreLoading}
                    variant="outline"
                    className="rounded-[1.5rem] px-10 py-6 border-2 border-indigo-100 hover:border-indigo-600 hover:bg-indigo-50 text-indigo-600 font-black shadow-sm transition-all group"
                  >
                    {isMoreLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        불러오는 중...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                        이전 게시물 더 불러오기
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>

        <CardFooter className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => loadUserMedia(customerId)}
            className="rounded-xl font-bold text-xs flex items-center gap-2 border-gray-200 bg-white"
          >
            <RotateCw className={`w-3.5 h-3.5 ${mediaListLoading ? 'animate-spin' : ''}`} />
            전체 목록 새로고침
          </Button>

          <div className="flex items-center gap-4">
            <p className="text-xs font-bold text-gray-500">
              {builderTargetPosts.length}개의 게시물 선택됨
            </p>
            <Button
              onClick={() => setShowPostPicker(false)}
              disabled={builderTargetPosts.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 font-black shadow-lg shadow-indigo-100"
            >
              선택 완료
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PostPickerModalView;

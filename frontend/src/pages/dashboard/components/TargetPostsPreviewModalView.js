import React from 'react';
import { ImageIcon, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

const TargetPostsPreviewModalView = ({
  showTargetPostsPreview,
  targetPostsPreview,
  setShowTargetPostsPreview,
  setShowPostPicker,
  setTargetPostPreview,
  setShowTargetPostPreview,
}) => {
  if (!showTargetPostsPreview) return null;

  const posts = Array.isArray(targetPostsPreview) ? targetPostsPreview : [];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        onClick={() => setShowTargetPostsPreview(false)}
      />

      <Card className="relative w-full max-w-4xl h-[85vh] bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] border-none overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <CardHeader className="px-8 pt-8 pb-6 border-b border-gray-50 shrink-0">
          <div className="relative">
            <div className="text-center w-full">
              <CardTitle className="text-2xl font-black text-gray-900 tracking-tight">대상 게시물</CardTitle>
              <CardDescription className="text-sm font-bold text-gray-500 mt-1">
                이 자동화가 반응하는 게시물 목록입니다. 썸네일을 눌러 미리보기를 확인하세요.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTargetPostsPreview(false)}
              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <ImageIcon className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">게시물 정보를 불러오지 못했습니다</h3>
              <p className="text-gray-500 mt-2 max-w-xs">게시물 변경하기를 눌러 다시 선택해주세요.</p>
              <Button
                onClick={() => {
                  setShowTargetPostsPreview(false);
                  setShowPostPicker(true);
                }}
                className="mt-6 h-12 px-6 rounded-2xl font-black bg-gray-900 text-white hover:bg-gray-800"
              >
                게시물 변경하기
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {posts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setTargetPostPreview(p);
                      setShowTargetPostPreview(true);
                    }}
                    className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:ring-8 hover:ring-gray-50"
                  >
                    <img
                      src={p.thumbnail_url || p.media_url}
                      alt="Target post"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <p className="text-white text-[10px] font-bold line-clamp-2 leading-tight">
                        {p.caption || '내용 없음'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8">
                <Button
                  onClick={() => {
                    setShowTargetPostsPreview(false);
                    setShowPostPicker(true);
                  }}
                  className="w-full h-12 rounded-2xl font-black bg-gray-900 text-white hover:bg-gray-800"
                >
                  게시물 변경하기
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TargetPostsPreviewModalView;

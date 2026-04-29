import React from 'react';
import { ImageIcon, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

const TargetPostPreviewModalView = ({
  showTargetPostPreview,
  targetPostPreview,
  setShowTargetPostPreview,
  setShowPostPicker,
}) => {
  if (!showTargetPostPreview || !targetPostPreview) return null;

  const caption = (targetPostPreview.caption || '').trim();
  const src = targetPostPreview.thumbnail_url || targetPostPreview.media_url || null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        onClick={() => setShowTargetPostPreview(false)}
      />

      <Card className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] border-none overflow-hidden animate-in zoom-in-95 duration-200">
        <CardHeader className="px-8 pt-8 pb-6 border-b border-gray-50">
          <div className="relative">
            <div className="text-center w-full">
              <CardTitle className="text-2xl font-black text-gray-900 tracking-tight">대상 게시물</CardTitle>
              <CardDescription className="text-sm font-bold text-gray-500 mt-1">이 자동화가 반응하는 게시물 미리보기입니다.</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTargetPostPreview(false)}
              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 aspect-square">
              {src ? (
                <img src={src} alt="Target post" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-200" />
                </div>
              )}
            </div>

            <div className="flex flex-col">
              {caption ? (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm text-gray-700 font-medium leading-relaxed line-clamp-[10]">
                  {caption}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm text-gray-400 font-bold">
                  캡션이 없는 게시물입니다.
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setShowTargetPostPreview(false);
                    setShowPostPicker(true);
                  }}
                  className="w-full h-12 rounded-2xl font-black bg-gray-900 text-white hover:bg-gray-800"
                >
                  게시물 변경하기
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TargetPostPreviewModalView;

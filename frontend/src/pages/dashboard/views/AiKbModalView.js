import React from 'react';
import { CheckCircle2, FileText, Loader2, Upload, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';

const AiKbModalView = ({
  setShowAiKbModal,
  aiKnowledgeBaseUrl,
  getDisplayFilename,
  aiKnowledgeBaseFilename,
  removeAiKb,
  handleAiKbUpload,
  aiKbUploading,
  saveAiSettings,
}) => {
  return (
    <div
      className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && setShowAiKbModal(false)}
    >
      <div className="relative min-h-full flex justify-center p-4 py-12 pointer-events-none">
        <Card className="w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300 border-none overflow-hidden bg-white rounded-3xl flex flex-col h-fit max-h-[92vh] my-auto pointer-events-auto">
          <CardHeader className="bg-white p-8 border-b border-gray-100">
            <div className="flex items-center justify-between w-full">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-emerald-100">
                <FileText className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="flex-1 text-center px-4">
                <CardTitle className="text-2xl font-black text-emerald-950">AI 참조 파일 설정</CardTitle>
                <p className="text-sm text-emerald-600 font-bold">참고할 파일을 업로드하여 AI의 지능을 높이세요.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAiKbModal(false)} className="rounded-xl hover:bg-emerald-100 transition-all h-12 w-12 group">
                <X className="w-6 h-6 text-emerald-800 group-hover:scale-110 transition-transform" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-10 overflow-y-scroll flex-1">
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  업로드하신 파일은 AI가 답변을 생성할 때 참고 자료로 사용됩니다.
                  상품 가격표, 운영 매뉴얼, 서비스 소개서 등을 등록해보세요.
                </p>
              </div>

              {aiKnowledgeBaseUrl ? (
                <div className="flex flex-col items-center justify-center p-12 bg-emerald-50 rounded-[32px] border-2 border-emerald-100 border-dashed">
                  <div className="p-5 bg-white rounded-3xl shadow-sm mb-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <p className="text-xl font-black text-emerald-950 mb-1">{getDisplayFilename(aiKnowledgeBaseFilename, aiKnowledgeBaseUrl)}</p>
                  <p className="text-sm text-emerald-600 font-bold mb-8 uppercase tracking-widest">Active Knowledge Base</p>

                  <div className="flex flex-col w-full gap-3">
                    <Button
                      className="w-full bg-white text-emerald-600 hover:bg-emerald-100 border-none h-14 rounded-2xl font-black shadow-sm transition-all active:scale-95"
                      onClick={() => {
                        document.getElementById('kb-modal-upload').click();
                      }}
                    >
                      파일 교체하기
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-rose-500 hover:bg-rose-50 h-14 rounded-2xl font-bold transition-all"
                      onClick={removeAiKb}
                    >
                      현재 파일 삭제
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    id="kb-modal-upload"
                    className="hidden"
                    accept=".txt,.pdf,.docx"
                    onChange={handleAiKbUpload}
                    disabled={aiKbUploading}
                  />
                  <label
                    htmlFor="kb-modal-upload"
                    className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-gray-100 rounded-[40px] hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group"
                  >
                    <div className="p-6 bg-gray-50 rounded-[28px] group-hover:bg-emerald-100 transition-colors mb-6 shadow-sm">
                      {aiKbUploading ? (
                        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                      ) : (
                        <Upload className="w-12 h-12 text-gray-400 group-hover:text-emerald-600" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="font-black text-2xl text-gray-900 mb-2">참조 파일 업로드</p>
                      <p className="text-sm text-gray-400 font-bold">TXT, PDF, DOCX 형식을 지원합니다 (최대 10MB)</p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
            <Button
              onClick={() => {
                setShowAiKbModal(false);
                saveAiSettings();
              }}
              className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white hover:opacity-90 font-black px-10 h-14 rounded-2xl text-lg shadow-xl shadow-indigo-200 transition-all active:scale-95 border-none"
            >
              설정 완료 및 저장
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AiKbModalView;

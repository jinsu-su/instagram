import React from 'react';
import { Bot, Clock, FileText, Send } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

const AiSettingsView = ({
  isAiActive,
  setIsAiActive,
  saveAiSettings,
  aiOperateStart,
  setAiOperateStart,
  aiOperateEnd,
  setAiOperateEnd,
  aiPromptSaving,
  setShowAiKbModal,
  aiPrompt,
  setAiPrompt,
  aiPromptLoading,
  builderEditIndex,
}) => (
  <>
    <div className="mb-8 w-full flex flex-col gap-5">
      <div className="w-full flex justify-center">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">
            AI 센터
          </h1>
          <p className="text-gray-400 font-bold text-sm">인스타그램 고객에게 응답할 AI 어시스턴트의 페르소나와 동작 규칙을 설정합니다</p>
        </div>
      </div>

      {/* Master Toggle in end area below title */}
      <div className="w-full flex justify-end">
        <div className="w-full lg:w-auto lg:min-w-[360px]">
          <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white overflow-hidden hover:shadow-md w-full">
            <div className="p-4 px-5 flex items-center justify-between gap-5">
              <div>
                <h3 className="text-base font-black text-gray-900">AI 자동 응답 메인 스위치</h3>
                <p className="text-xs text-gray-500 font-medium">{isAiActive ? '현재 고객 응대가 활성화되어 있습니다.' : 'AI가 휴식 중입니다.'}</p>
              </div>
              <button
                onClick={() => {
                  const newState = !isAiActive;
                  setIsAiActive(newState);
                  setTimeout(() => saveAiSettings(newState), 0);
                }}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none shadow-inner ${isAiActive ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${isAiActive ? 'translate-x-[1.7rem]' : 'translate-x-1'}`} />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>

    {/* Time Settings row */}
    <div className="mb-8 w-full">
      <Card className="border-none shadow-xl rounded-3xl bg-white">
        <CardHeader className="px-6 py-3 border-b border-gray-50">
          <div className="flex items-center justify-center gap-3 text-center">
            <Clock className="w-6 h-6 text-purple-600" />
            <CardTitle className="text-lg font-black text-gray-900">운영 시간 설정</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-6 pt-2 pb-5 space-y-4">
          <p className="text-sm text-gray-500 font-medium">인공지능이 자동으로 응답을 처리할 시간대를 지정합니다.</p>

          <div className="space-y-0 flex flex-col gap-4">
            <div className="flex flex-wrap justify-center items-center gap-3">
                {[
                  { label: '🕒 24시간', start: '00:00', end: '23:59' },
                  { label: '🏢 업무 시간 (09~18)', start: '09:00', end: '18:00' },
                  { label: '🌙 야간 운영 (18~09)', start: '18:00', end: '09:00' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setAiOperateStart(preset.start);
                      setAiOperateEnd(preset.end);
                    }}
                    className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-black border border-purple-100/50 transition-all active:scale-95 shadow-sm"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

            <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-4 lg:gap-6">
              <div className="flex items-center gap-4 lg:gap-6 flex-1">
                <div className="space-y-2 flex-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">시작 시간</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={aiOperateStart}
                      onChange={(e) => setAiOperateStart(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl pl-11 h-12 pr-4 text-sm focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                    >
                      {Array.from({ length: 48 }).map((_, i) => {
                        const h = Math.floor(i / 2).toString().padStart(2, '0');
                        const m = (i % 2 === 0 ? '00' : '30');
                        const time = `${h}:${m}`;
                        return <option key={time} value={time}>{time}</option>;
                      })}
                    </select>
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">종료 시간</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={aiOperateEnd}
                      onChange={(e) => setAiOperateEnd(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl pl-11 h-12 pr-4 text-sm focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                    >
                      {Array.from({ length: 48 }).map((_, i) => {
                        const h = Math.floor(i / 2).toString().padStart(2, '0');
                        const m = (i % 2 === 0 ? '00' : '30');
                        const time = `${h}:${m}`;
                        return <option key={time} value={time}>{time}</option>;
                      })}
                      <option value="23:59">23:59</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => saveAiSettings()}
                disabled={aiPromptSaving}
                className="w-full lg:w-auto lg:min-w-[180px] lg:self-end bg-gradient-to-br from-indigo-600 to-purple-700 hover:opacity-90 text-white font-black h-12 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 border-none"
              >
                {aiPromptSaving ? '저장 중...' : '시간 설정 저장'}
              </Button>
            </div>

            <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100">
              <p className="text-xs text-purple-700 leading-relaxed">
                <span className="font-black">TIP:</span> 밤늦은 시간이나 주말 등 직접 응답이 어려운 시간대에만 AI를 활성화하여 CS 부담을 덜 수 있습니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Left: Persona Prompt */}
      <Card className="border border-gray-100 shadow-sm rounded-[2rem] bg-white flex flex-col h-[600px]">
        <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-white/50 p-6 border-b border-gray-50 flex flex-row items-center justify-between shadow-sm">
          <div>
            <CardTitle className="text-xl font-black text-gray-900">
              AI 페르소나 (프롬프트)
            </CardTitle>
            <p className="text-xs text-gray-500 font-medium mt-1">AI가 어떤 성격으로 대화할지 상세하게 알려주세요.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAiKbModal(true)}
            className="bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl h-9"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            파일 첨부
          </Button>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col relative">
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="예: 당신은 '스테이무드 스테이'의 공식 매니저입니다. 항상 다정하고 친절하게 대답하며, 예약 방법과 주변 맛집을 추천해주세요."
            className="w-full flex-1 p-6 border-0 focus:ring-0 resize-none text-gray-800 text-base leading-relaxed bg-transparent"
            disabled={aiPromptLoading || aiPromptSaving}
          />
        </CardContent>
      </Card>

      {/* Right: AI Simulator Mockup */}
      <Card className="border-4 border-gray-100 shadow-sm bg-gray-50 rounded-[2rem] flex flex-col h-[600px] overflow-hidden">
        <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-center shadow-sm relative z-10">
          <div className="text-center">
            <h3 className="text-sm font-black text-gray-900 leading-tight">
              {builderEditIndex !== null ? '자동화 수정하기' : '새 자동화 만들기'}
            </h3>
            <p className="text-[10px] font-bold text-emerald-500">
              {builderEditIndex !== null ? '기존 자동화 설정을 변경합니다' : '새로운 게시물 자동 응답 플로우를 생성합니다'}
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col">
          <div className="text-center my-4">
            <span className="text-[10px] font-bold text-gray-400 bg-gray-200/50 px-2 py-1 rounded-full">{new Date().toLocaleDateString('ko-KR')}</span>
          </div>

          {/* Mock User Message */}
          <div className="flex justify-end">
            <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm shadow-sm">
              안녕하세요! 금주 주말 예약 가능할까요? 예약 방법 좀 알려주세요.
            </div>
          </div>

          {/* Mock AI Response */}
          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Bot className="w-3 h-3 text-white" />
            </div>
            <div className="bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm shadow-sm space-y-2">
              <p>안녕하세요! 🌟 문의주셔서 감사합니다. 현재 설정하신 프롬프트가 여기에 적용되어 응답이 생성됩니다.</p>
              <div className="bg-indigo-50 p-2 rounded-lg text-xs text-indigo-700 font-medium">
                실제 고객 응대 전, 설정을 저장하고 이 프리뷰 영역 또는 본인 계정으로 DM을 보내 테스트해보세요.
              </div>
            </div>
          </div>
        </div>
        <div className="p-3 bg-white border-t border-gray-200">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full pr-1 pl-4 py-1">
            <input type="text" placeholder="고객을 가장하여 메시지를 보내보세요..." className="flex-1 bg-transparent border-0 focus:ring-0 text-sm h-8" disabled />
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
              <Send className="w-4 h-4 text-white -ml-0.5 mt-0.5" />
            </div>
          </div>
        </div>
      </Card>
    </div>

  </>
);

export default AiSettingsView;

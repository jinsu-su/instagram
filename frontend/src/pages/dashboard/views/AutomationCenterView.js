import React from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  LayoutGrid,
  MessageSquare,
  Plus,
  RotateCw,
  Send,
  Sparkles,
  Target,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import Campaigns from '../../Campaigns';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import PresetSelectorModal from '../components/PresetSelectorModal';
import { FOLLOW_REMINDER_PRESETS, REPLY_PRESETS } from '../presets';

const AutomationCenterView = ({
  automationView,
  setAutomationView,
  setBuilderEditIndex,
  setBuilderTargetPosts,
  setBuilderKeywords,
  setBuilderDmMessage,
  setBuilderFollowCheck,
  renderFlows,
  builderEditIndex,
  mediaList,
  loadUserMedia,
  customerId,
  setShowPostPicker,
  builderTargetPosts,
  setShowTargetPostPreview,
  setTargetPostPreview,
  setShowTargetPostsPreview,
  setTargetPostsPreview,
  setShowPresetModal,
  setPresetModalType,
  setTargetReplyForModal,
  keywordReplies,
  setKeywordReplies,
  saveKeywordSettings,
  keywordRepliesSaving,
  showPresetModal,
  presetModalType,
  targetReplyForModal,
  renderMobileSimulator,
  renderTemplates,
  renderPlaceholder,
  setBuilderFollowMessage,
  setBuilderFollowButtonText,
  isPremiumFeatureLocked,
  setCurrentView,
  builderKeywords,
  keywordInputValue,
  setKeywordInputValue,
  builderDmMessage,
  builderFollowCheck,
  builderFollowMessage,
  builderFollowButtonText,
  handleCreateSimpleFlow,
  flowsSaving,
  setFlowForm,
  setShowFlowModal,
}) => {
  return (
    <div className="space-y-8 p-0 sm:p-2">
      <div className="flex flex-col items-center justify-center text-center mb-12">
        <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-3 text-center">
          자동화 센터
        </h1>
        <p className="text-gray-500 font-medium max-w-2xl text-center px-4">
          고객 유입부터 응대까지, 브랜드 맞춤형 인공지능 자동화를 한 곳에서 관리하세요.
        </p>
      </div>

      {/* Sub-Tabs: Bento Style Navigation */}
      <div className="flex items-center justify-center gap-2 mb-10 bg-gray-100/50 p-1.5 rounded-2xl w-fit mx-auto border border-gray-100">
        <button
          onClick={() => setAutomationView('active')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${automationView === 'active'
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          <Zap className={`w-3.5 h-3.5 ${automationView === 'active' ? 'text-indigo-600' : 'text-gray-400'}`} />
          운영 중인 플로우
        </button>
        <button
          onClick={() => {
            setBuilderEditIndex(null);
            setBuilderTargetPosts([]);
            setBuilderKeywords(['링크', '구매']);
            setBuilderDmMessage('안녕하세요! 요청하신 시크릿 링크를 보내드립니다 😆\n\n👇 아래 링크를 클릭해주세요!');
            setBuilderFollowCheck(false);
            setAutomationView('builder');
          }}
          className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${automationView === 'builder'
            ? 'bg-white text-emerald-600 shadow-sm'
            : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          <Bot className={`w-3.5 h-3.5 ${automationView === 'builder' ? 'text-emerald-600' : 'text-gray-400'}`} />
          초간편 자동화
        </button>
        <button
          onClick={() => setAutomationView('templates')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${automationView === 'templates'
            ? 'bg-white text-purple-600 shadow-sm'
            : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          <LayoutGrid className={`w-3.5 h-3.5 ${automationView === 'templates' ? 'text-purple-600' : 'text-gray-400'}`} />
          마케팅 템플릿
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {automationView === 'active' && (
          <div className="space-y-12">
            {renderFlows()}
          </div>
        )}
        {automationView === 'builder' && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center justify-center text-center mb-8">
              <h2 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight mb-2">
                {builderEditIndex !== null ? '초간편 자동화 수정' : '클릭 3번으로 끝내는 자동화'}
              </h2>
              <p className="text-sm text-gray-500 font-bold max-w-xl">
                {builderEditIndex !== null ? '기존 자동화 설정을 빠르게 수정하고 바로 적용하세요.' : '복잡한 설정 화면 대신, 카드형 빌더로 빠르게 메시지를 세팅하고 우측 가상 시뮬레이터로 실시간 확인하세요.'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Builder Form Area */}
              <div className="space-y-6 flex flex-col justify-center">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 relative group transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="absolute -left-3 -top-3 w-10 h-10 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-lg z-10 shadow-lg shadow-indigo-200">1</div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-indigo-500" /> 어떤 포스트에서 작동할까요?
                  </h3>
                  <div className="flex flex-col gap-4">
                    {builderTargetPosts.length === 0 ? (
                      <Button
                        onClick={() => {
                          if (!mediaList || mediaList.length === 0) loadUserMedia(customerId);
                          setShowPostPicker(true);
                        }}
                        className="w-full h-14 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-2 border-dashed border-indigo-200 rounded-2xl font-black flex items-center justify-center gap-2 transition-all group"
                      >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        작동할 게시물 선택하기
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                          <p className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                            <Check className="w-3 h-3" /> {builderTargetPosts.length}개의 게시물 선택됨
                          </p>
                          <button
                            onClick={() => setShowPostPicker(true)}
                            className="text-[10px] font-black text-gray-400 hover:text-indigo-600 underline underline-offset-4"
                          >
                            게시물 수정하기
                          </button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                          {builderTargetPosts.map((post) => (
                            <div key={post.id} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-sm ring-1 ring-indigo-100 relative group">
                              <img src={post.media_url} className="w-full h-full object-cover" alt="Selected" />
                              <button
                                onClick={() => setBuilderTargetPosts(builderTargetPosts.filter(p => p.id !== post.id))}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                <X className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 relative group transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="absolute -left-3 -top-3 w-10 h-10 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-lg z-10 shadow-lg shadow-emerald-200">2</div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-emerald-500" /> 어떤 댓글에 반응할까요?
                    </h3>
                    {isPremiumFeatureLocked && (
                      <Badge className="bg-indigo-100 text-indigo-700 font-bold border-none px-3 flex items-center gap-1 cursor-pointer hover:bg-indigo-200" onClick={() => setCurrentView('subscription')}>
                        <Sparkles className="w-3 h-3" /> AI 의미 매칭 잠김
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-4">
                    {/* Keyword Tag Display */}
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-1">
                      {builderKeywords.map((kw, idx) => (
                        <Badge
                          key={`${kw}-${idx}`}
                          className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 animate-in zoom-in-0 duration-200"
                        >
                          {kw}
                          <button
                            onClick={() => setBuilderKeywords(builderKeywords.filter((_, i) => i !== idx))}
                            className="hover:bg-emerald-200/50 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                      {builderKeywords.length === 0 && (
                        <p className="text-xs text-gray-400 font-bold flex items-center gap-1.5 py-1">
                          <AlertCircle className="w-3.5 h-3.5" /> 최소 1개 이상의 키워드를 추가해주세요.
                        </p>
                      )}
                    </div>

                    {/* Input Area */}
                    <div className="relative group">
                      <input
                        type="text"
                        placeholder="키워드 입력 후 엔터를 눌러주세요"
                        className="w-full h-14 bg-gray-50 border-none rounded-2xl px-5 pr-14 text-gray-700 font-bold focus:ring-4 focus:ring-emerald-100 transition-all outline-none focus:bg-white border border-transparent focus:border-emerald-200"
                        value={keywordInputValue}
                        onChange={(e) => setKeywordInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing) return; // 한글 조합 중 엔터 무시 (중복 입력 방지)
                          if (e.key === 'Enter' && keywordInputValue.trim()) {
                            e.preventDefault();
                            const newKeyword = keywordInputValue.trim();
                            if (!builderKeywords.includes(newKeyword)) {
                              setBuilderKeywords([...builderKeywords, newKeyword]);
                            }
                            setKeywordInputValue('');
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          if (keywordInputValue.trim()) {
                            const newKeyword = keywordInputValue.trim();
                            if (!builderKeywords.includes(newKeyword)) {
                              setBuilderKeywords([...builderKeywords, newKeyword]);
                            }
                            setKeywordInputValue('');
                          }
                        }}
                        className="absolute right-2 top-2 w-10 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200/50 transition-all active:scale-90"
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 relative group transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="absolute -left-3 -top-3 w-10 h-10 rounded-full bg-rose-500 text-white font-black flex items-center justify-center text-lg z-10 shadow-lg shadow-rose-200">3</div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Send className="w-5 h-5 text-rose-500" /> 어떤 DM을 보낼까요?
                  </h3>
                  <textarea
                    rows="4"
                    placeholder="발송할 메시지를 입력하세요..."
                    className="w-full bg-gray-50 border-none rounded-2xl p-5 text-gray-700 font-bold focus:ring-4 focus:ring-rose-100 transition-all outline-none resize-none"
                    value={builderDmMessage}
                    onChange={(e) => setBuilderDmMessage(e.target.value)}
                  ></textarea>

                  {/* Follow Gate Feature */}
                  <div className="mt-6 pt-6 border-t border-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${builderFollowCheck ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm">팔로워 한정 정보 제공</p>
                          <p className="text-[11px] font-bold text-gray-400">팔로우 여부를 확인한 뒤 메시지를 보냅니다</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setBuilderFollowCheck(!builderFollowCheck)}
                        className={`w-14 h-8 rounded-full transition-all relative ${builderFollowCheck ? 'bg-indigo-500' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${builderFollowCheck ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    {builderFollowCheck && (
                      <>
                        <div className="flex flex-col gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest pl-1">팔로우 유도 문구</label>
                            <textarea
                              rows="3"
                              placeholder="팔로우 안 한 사용자에게 보낼 안내 문구를 입력하세요..."
                              className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-200 transition-all outline-none resize-none"
                              value={builderFollowMessage}
                              onChange={(e) => setBuilderFollowMessage(e.target.value)}
                            ></textarea>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest pl-1">버튼 문구</label>
                            <input
                              type="text"
                              placeholder="버튼에 표시될 텍스트 (예: 정보 바로 받기)"
                              className="w-full h-11 bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 text-sm text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                              value={builderFollowButtonText}
                              onChange={(e) => setBuilderFollowButtonText(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                            메시지 하단에 입력하신 <span className="underline">[{builderFollowButtonText}]</span> 버튼이 자동으로 추가됩니다.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleCreateSimpleFlow}
                  disabled={flowsSaving || builderTargetPosts.length === 0}
                  className="w-full h-16 bg-gray-900 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-gray-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {flowsSaving ? (
                    <RotateCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Zap className="w-6 h-6 fill-white" />
                  )}
                  {builderEditIndex !== null ? '수정 사항 저장하기' : '자동화 생성 및 활성화'}
                </Button>
              </div>

              {/* Mobile Preview Area */}
              <div className="flex justify-center items-center lg:sticky lg:top-24 h-fit">
                {builderFollowCheck ? (
                  renderMobileSimulator([
                    { 
                      content: builderFollowMessage, 
                      buttons: [{ text: builderFollowButtonText, color: 'indigo' }] 
                    },
                    { 
                      content: builderDmMessage 
                    }
                  ])
                ) : (
                  renderMobileSimulator([{ content: builderDmMessage }])
                )}
              </div>
            </div>
          </div>
        )}
        {automationView === 'templates' && (
          <div className="space-y-16">
            <section>
              <div className="flex flex-col items-center justify-center text-center mb-12">
                <h2 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight mb-2">
                  마케팅 템플릿
                </h2>
                <p className="text-sm text-gray-500 font-medium text-center">검증된 마케팅 템플릿을 클릭 한 번으로 시작하세요.</p>
              </div>
              <Campaigns
                customerId={customerId}
                onPromoteToFlow={(campaign) => {
                  setFlowForm({
                    name: `[Advanced] ${campaign.type === 'CUSTOM' ? campaign.config?.name : campaign.type}`,
                    trigger_type: 'keyword',
                    trigger_source: campaign.type === 'COMMENT_GROWTH' ? 'comment' : 'all',
                    match_type: 'contains',
                    keyword: campaign.config?.keyword_trigger || '',
                    nodes: [
                      {
                        id: 'start',
                        type: 'message',
                        content: campaign.config?.message || '',
                        buttons: campaign.config?.buttons || []
                      }
                    ],
                    is_active: campaign.is_active
                  });
                  setShowFlowModal(true);
                }}
              />
            </section>

            <section>
              {renderTemplates()}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationCenterView;

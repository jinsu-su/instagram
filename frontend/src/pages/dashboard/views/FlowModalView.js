import React from 'react';
import { Clock, Filter, ImageIcon, Key, Loader2, Lock, MessageSquare, Plus, Sparkles, Tag, Target, Trash2, Workflow, X } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';

const FlowModalView = ({
  flowForm,
  showNotify,
  isAiPremiumLocked,
  showPremiumLockToast,
  setFlowForm,
  safeFetch,
  INSTAGRAM_API_BASE_URL,
  setShowFlowModal,
  saveFlow,
  flowsSaving,
  loadFlows,
  customerId,
  renderMobileSimulator,
}) => {
  const isNew = !flowForm.id;

  const addNode = (type) => {
    // Global node limit (already 10)
    if (flowForm.nodes.length >= 10) {
      showNotify('노드 추가 제한', 'error', '최대 10개까지만 추가할 수 있습니다.');
      return;
    }

    // [Security Hardening] AI Message Gating
    if (type === 'ai_message' && isAiPremiumLocked) {
      showPremiumLockToast('AI 메시지 기능은 AI 요금제 전용 기능입니다.');
      return;
    }

    // Specific limit for images (Max 3)
    if (type === 'image') {
      const imageCount = flowForm.nodes.filter(n => n.type === 'image').length;
      if (imageCount >= 3) {
        showNotify('이미지 추가 제한', 'error', '이미지는 최대 3개까지만 보낼 수 있습니다.');
        return;
      }
    }

    const newNode = {
      id: Date.now().toString(),
      type,
      content: '',
      buttons: [],
      tag: '', // for 'tag' type
      url: '',  // for 'image' type
      prompt: '', // for 'ai_message' type
      reply_type: 'dm', // for 'ai_message' type
    };
    setFlowForm({ ...flowForm, nodes: [...flowForm.nodes, newNode] });
  };

  const updateNode = (id, data) => {
    setFlowForm({
      ...flowForm,
      nodes: flowForm.nodes.map(n => n.id === id ? { ...n, ...data } : n)
    });
  };

  const removeNode = (id) => {
    setFlowForm({
      ...flowForm,
      nodes: flowForm.nodes.filter(n => n.id !== id)
    });
  };

  const handleImageUpload = async (e, nodeId) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await safeFetch(`${INSTAGRAM_API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      // Construct full URL using the base URL
      const fullUrl = `${INSTAGRAM_API_BASE_URL}${data.url}`;
      updateNode(nodeId, { url: fullUrl });
    } catch (error) {

      alert('이미지 업로드에 실패했습니다. 서버 연결을 확인해주세요.');
    }
  };


  const addButton = (nodeId) => {
    setFlowForm({
      ...flowForm,
      nodes: flowForm.nodes.map(n => {
        if (n.id === nodeId) {
          const newButtons = [...(n.buttons || []), { id: Date.now().toString(), label: '새 버튼', response: '', url: '' }];
          return { ...n, buttons: newButtons };
        }
        return n;
      })
    });
  };

  return (
    <div
      className="fixed inset-0 z-[1110] flex items-center justify-center bg-black/60 backdrop-blur-md p-2"
      onClick={(e) => e.target === e.currentTarget && setShowFlowModal(false)}
    >
      <Card className="w-full max-w-5xl flex flex-row shadow-2xl animate-in zoom-in-95 duration-300 border-none overflow-hidden bg-white shadow-purple-500/10 border border-gray-100 h-[90vh] pointer-events-auto relative">
        {/* Left Column: Editor */}
        <div className="flex-1 flex flex-col h-full min-w-0 border-r border-gray-100">
          {/* Sticky Header */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-8 px-10 border-b border-gray-100 bg-white z-10">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-gray-50 text-gray-900 border border-gray-100">
                <Workflow className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900 tracking-tight">
                  {isNew ? '새 자동화 플로우' : '플로우 수정'}
                </CardTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">인터랙티브 캔버스</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowFlowModal(false)} className="rounded-lg hover:bg-gray-50 transition-all h-10 w-10 group">
              <X className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
            </Button>
          </CardHeader>

          {/* Canvas Scrollable Area */}
          <CardContent className="flex-1 overflow-y-scroll p-10 scrollbar-hide space-y-10 bg-gray-50/20">
            {/* Meta Info Section - Redesigned for Premium UX */}
            <div className="space-y-6">
              <div className="group relative">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">플로우 정보 설정</label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={flowForm.name}
                    onChange={(e) => setFlowForm({ ...flowForm, name: e.target.value })}
                    placeholder="플로우의 이름을 입력하세요 (예: 신상품 안내)"
                    className="w-full text-xl font-black text-gray-900 placeholder:text-gray-400 border-none bg-indigo-50/60 hover:bg-indigo-50/80 focus:bg-indigo-100/70 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none leading-normal shadow-sm border border-indigo-200/50"
                  />
                </div>
                <div className="h-0.5 w-12 bg-gradient-to-r from-indigo-600 to-purple-600 mt-2 rounded-full shadow-sm shadow-indigo-100/50"></div>
              </div>

              {flowForm.trigger_source === 'story_mention' ? (
                <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100/50 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-gray-900 tracking-tight leading-tight mb-1">
                      스토리 멘션 즉시 대응
                    </h4>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      회원님이 누군가의 스토리에 언급되는 즉시 이 플로우가 자동으로 실행됩니다. 별도의 키워드 설정이 필요하지 않습니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      {flowForm.match_type === 'ai_semantic' ? '트리거 의도 (설명)' : '트리거 키워드'}
                    </label>
                    <div className="relative">
                      {flowForm.match_type === 'ai_semantic' ? (
                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-pulse" />
                      ) : (
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                      )}
                      <input
                        type="text"
                        value={flowForm.keyword}
                        onChange={(e) => setFlowForm({ ...flowForm, keyword: e.target.value })}
                        placeholder={flowForm.match_type === 'ai_semantic' ? "예: 가격 및 배송문의" : "예: 가격문의"}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-indigo-600 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">매칭 방식</label>
                    <div className="relative">
                      <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        value={flowForm.match_type}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'ai_semantic' && isAiPremiumLocked) {
                            showPremiumLockToast('AI 의미 매칭은 AI 요금제 전용 기능입니다.');
                            return;
                          }
                          setFlowForm({ ...flowForm, match_type: val });
                        }}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all font-bold text-gray-700 text-sm appearance-none cursor-pointer"
                      >
                        <option value="contains">포함</option>
                        <option value="exact">일치</option>
                        <option value="ai_semantic">AI 의미 매칭</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">작동 채널</label>
                    <div className="relative">
                      <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        value={flowForm.trigger_source}
                        onChange={(e) => setFlowForm({ ...flowForm, trigger_source: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-gray-700 text-sm cursor-pointer appearance-none"
                      >
                        <option value="all">전체 (댓글+DM)</option>
                        <option value="comment">댓글 전용</option>
                        <option value="dm">DM 전용</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* The Visual Chain */}
            <div className="relative space-y-8 before:absolute before:left-[23px] before:top-0 before:bottom-0 before:w-0.5 before:bg-indigo-50 before:rounded-full">
              {flowForm.nodes.map((node, index) => (
                <div key={node.id} className="relative pl-14 group/node">
                  {/* Step Connector Node */}
                  <div className="absolute left-0 top-6 w-12 h-12 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center z-10 group-hover/node:border-indigo-200 transition-colors">
                    {node.type === 'message' ? (
                      <MessageSquare className="w-6 h-6 text-purple-600" />
                    ) : node.type === 'tag' ? (
                      <Tag className="w-6 h-6 text-blue-500" />
                    ) : node.type === 'image' ? (
                      <ImageIcon className="w-6 h-6 text-green-500" />
                    ) : node.type === 'ai_message' ? (
                      <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                    ) : (
                      <Clock className="w-6 h-6 text-pink-500" />
                    )}
                    <span className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-gray-900 text-white text-[10px] font-black flex items-center justify-center shadow-lg">
                      {index + 1}
                    </span>
                  </div>

                  {/* Bubble Content */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-indigo-100 transition-all duration-300 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="outline" className="text-gray-400 border-gray-200 font-bold text-[9px] tracking-wide uppercase px-2 py-0.5">
                        {node.type === 'message' ? '메시지' : node.type === 'tag' ? 'CRM 태그' : node.type === 'image' ? '이미지' : node.type === 'ai_message' ? 'AI 메시지' : '지연'} 액션
                      </Badge>
                      {flowForm.nodes.length > 1 && (
                        <button onClick={() => removeNode(node.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {node.type === 'tag' ? (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">자동으로 부여할 태그</label>
                        <input
                          type="text"
                          value={node.tag || ''}
                          onChange={(e) => updateNode(node.id, { tag: e.target.value })}
                          placeholder="예: 관심고객, 이벤트참여"
                          className="w-full px-5 py-3 border border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 font-bold bg-gray-50/50"
                        />
                      </div>
                    ) : node.type === 'image' ? (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">이미지 업로드</label>

                        {!node.url ? (
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, node.id)}
                              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
                            />
                            <div className="flex items-center gap-2 py-1">
                              <div className="h-px bg-gray-100 flex-1"></div>
                              <span className="text-[9px] text-gray-300 font-black uppercase tracking-widest">또는 URL 직접 입력</span>
                              <div className="h-px bg-gray-100 flex-1"></div>
                            </div>
                            <input
                              type="text"
                              value={node.url || ''}
                              onChange={(e) => updateNode(node.id, { url: e.target.value })}
                              placeholder="https://..."
                              className="w-full px-5 py-3 border border-gray-100 rounded-xl focus:outline-none focus:border-green-500 font-bold bg-gray-50/50 text-sm"
                            />
                          </>
                        ) : (
                          <div className="relative">
                            <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative group bg-gray-50">
                              <img src={node.url} alt="Flow preview" className="w-full h-full object-contain" />

                              {/* Hover Overlay with Filename & Actions */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-700 max-w-[80%] truncate">
                                  {node.url.split('/').pop()}
                                </div>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateNode(node.id, { url: '' })}
                                  className="h-8 text-xs font-bold"
                                >
                                  이미지 변경 / 삭제
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : node.type === 'ai_message' ? (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI 응대 지시사항 (프롬프트)
                          </label>
                          <textarea
                            value={node.prompt || ''}
                            onChange={(e) => updateNode(node.id, { prompt: e.target.value })}
                            placeholder="예: 고객이 가격을 물어보면 친절하게 홈페이지 링크(example.com)를 안내해줘."
                            rows={3}
                            className="w-full px-5 py-4 border border-indigo-100 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 font-bold bg-indigo-50/30 text-indigo-900 placeholder:text-indigo-200 resize-none leading-relaxed"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">답장 채널 방식</label>
                          <div className="flex gap-2">
                            {['dm', 'comment', 'both'].map((type) => (
                              <button
                                key={type}
                                onClick={() => updateNode(node.id, { reply_type: type })}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${node.reply_type === type
                                  ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                                  : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                                  }`}
                              >
                                {type === 'dm' ? 'DM으로 답장' : type === 'comment' ? '댓글로 답장' : 'DM + 댓글 모두'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <textarea
                        value={node.content}
                        onChange={(e) => updateNode(node.id, { content: e.target.value })}
                        placeholder={node.type === 'message' ? "여기에 응답 메시지를 입력하세요..." : "지연 시간(초 단위, 예: 2)"}
                        rows={node.type === 'message' ? 3 : 1}
                        className="w-full p-0 border-none focus:ring-0 text-lg font-bold text-gray-800 placeholder:text-gray-200 bg-transparent resize-none leading-relaxed"
                      />
                    )}

                    {/* Interactive Buttons Slot */}
                    {node.type === 'message' && (
                      <div className="mt-6 pt-5 border-t border-gray-50 flex flex-wrap gap-2">
                        {node.buttons?.map(btn => (
                          <div key={btn.id} className="group/btn relative bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-3 min-w-[200px] hover:border-indigo-200 transition-all">
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">버튼 라벨</label>
                              <input
                                value={btn.label}
                                onChange={(e) => {
                                  const newBtns = node.buttons.map(b => b.id === btn.id ? { ...b, label: e.target.value } : b);
                                  updateNode(node.id, { buttons: newBtns });
                                }}
                                placeholder="버튼 이름 (예: 위치)"
                                className="bg-white border border-gray-200 text-gray-900 px-3 py-1.5 rounded-lg text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">자동 답장 (옵션)</label>
                              <input
                                value={btn.response || ''}
                                onChange={(e) => {
                                  const newBtns = node.buttons.map(b => b.id === btn.id ? { ...b, response: e.target.value } : b);
                                  updateNode(node.id, { buttons: newBtns });
                                }}
                                placeholder="메시지 내용..."
                                className="bg-white border border-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-400 transition-all"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">링크 URL (옵션)</label>
                              <input
                                value={btn.url || ''}
                                onChange={(e) => {
                                  const newBtns = node.buttons.map(b => b.id === btn.id ? { ...b, url: e.target.value } : b);
                                  updateNode(node.id, { buttons: newBtns });
                                }}
                                placeholder="https://..."
                                className="bg-white border border-gray-100 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-400 transition-all"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newBtns = node.buttons.filter(b => b.id !== btn.id);
                                updateNode(node.id, { buttons: newBtns });
                              }}
                              className="absolute -top-4 -right-5 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/btn:opacity-100 transition-all shadow-lg hover:scale-110 z-10"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addButton(node.id)}
                          title="버튼 추가"
                          className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-dashed border-gray-200 text-gray-400 hover:border-purple-400 hover:text-purple-500 hover:bg-purple-50 transition-all shadow-sm"
                        >
                          <Plus className="w-6 h-6" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Action Choice */}
              <div className="pl-16 flex gap-4">
                <button
                  onClick={() => addNode('message')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-purple-400 hover:shadow-lg transition-all"
                >
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <span className="text-[10px] font-black text-gray-400">메시지</span>
                </button>
                <button
                  onClick={() => addNode('ai_message')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border transition-all ${isAiPremiumLocked ? 'border-gray-100 opacity-60 grayscale' : 'border-gray-100 hover:border-indigo-500 hover:shadow-lg'}`}
                >
                  <div className="relative">
                    <Sparkles className={`w-5 h-5 ${isAiPremiumLocked ? 'text-gray-400' : 'text-indigo-600'}`} />
                    {isAiPremiumLocked && <Lock className="absolute -top-1 -right-1 w-2.5 h-2.5 text-gray-500" />}
                  </div>
                  <span className="text-[10px] font-black text-gray-400">AI 메시지</span>
                </button>
                <button
                  onClick={() => addNode('delay')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-pink-400 hover:shadow-lg transition-all"
                >
                  <Clock className="w-5 h-5 text-pink-500" />
                  <span className="text-[10px] font-black text-gray-400">지연</span>
                </button>
                <button
                  onClick={() => addNode('tag')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-blue-400 hover:shadow-lg transition-all"
                >
                  <Tag className="w-5 h-5 text-blue-500" />
                  <span className="text-[10px] font-black text-gray-400">태그</span>
                </button>
                <button
                  onClick={() => addNode('image')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-green-400 hover:shadow-lg transition-all"
                >
                  <ImageIcon className="w-5 h-5 text-green-500" />
                  <span className="text-[10px] font-black text-gray-400">이미지</span>
                </button>
              </div>
            </div>
          </CardContent>

          {/* Sticky Footer */}
          <CardFooter className="px-10 py-6 border-t border-gray-100 bg-white flex justify-between items-center z-10">
            <div className="hidden md:flex"></div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowFlowModal(false)} className="rounded-xl px-6 h-10 text-gray-400 hover:text-gray-600 font-bold text-sm">
                취소
              </Button>
              <Button
                onClick={async () => {
                  const isSpecialTrigger = ['story_mention', 'mention'].includes(flowForm.trigger_source);
                  if (!flowForm.name || (!isSpecialTrigger && !flowForm.keyword)) return;

                  // Convert nodes to backend actions format
                  const backendActions = flowForm.nodes.map(node => {
                    if (node.type === 'delay') {
                      return { type: 'wait', seconds: parseInt(node.content) || 1 };
                    }
                    if (node.type === 'tag') {
                      return { type: 'add_tag', tag: node.tag };
                    }
                    if (node.type === 'image') {
                      return { type: 'send_image', url: node.url };
                    }
                    if (node.type === 'ai_message') {
                      return { type: 'send_ai_message', prompt: node.prompt, reply_type: node.reply_type || 'dm' };
                    }
                    if (node.buttons?.length > 0) {
                      return {
                        type: 'send_rich_message',
                        content: node.content,
                        buttons: node.buttons.map(b => ({
                          label: b.label,
                          payload: b.response ? `TEXT:${b.response}` : `FLOW_${flowForm.id || 'NEW'}_BUTTON_${b.id}`,
                          url: b.url || undefined
                        }))
                      };
                    }
                    return { type: 'send_text', content: node.content };
                  });

                  const success = await saveFlow({
                    ...flowForm,
                    trigger_type: 'keyword',
                    trigger_source: flowForm.trigger_source || 'all',
                    trigger_config: { keyword: flowForm.keyword, match_type: flowForm.match_type || 'exact' },
                    actions: backendActions
                  });
                  if (success) {
                    showNotify('자동화 플로우가 성공적으로 저장되었습니다.');
                    setShowFlowModal(false);
                  }
                }}
                disabled={flowsSaving || !flowForm.name || (!['story_mention', 'mention'].includes(flowForm.trigger_source) && !flowForm.keyword)}
                className="bg-gray-900 text-white rounded-xl px-10 h-12 font-bold text-sm shadow-sm hover:bg-gray-800 transition-all disabled:opacity-30"
              >
                {flowsSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (isNew ? '플로우 저장' : '변경사항 저장')}
              </Button>
            </div>
          </CardFooter>
        </div>

        {/* Right Column: Premium Simulator Preview */}
        <div className="hidden lg:flex w-[400px] h-full bg-gray-50/50 flex-col items-center justify-start pt-12 px-8 border-l border-gray-100">
          {(() => {
            // Find the first message node to preview
            const firstMsgNode = flowForm.nodes.find(n => n.type === 'message') || flowForm.nodes[0];
            const firstImgNode = flowForm.nodes.find(n => n.type === 'image');

            return renderMobileSimulator(
              firstMsgNode?.content || '',
              firstMsgNode?.buttons || [],
              firstImgNode?.url || null
            );
          })()}

          <div className="mt-4 p-4 bg-white rounded-2xl border border-gray-200/50 shadow-sm">
            <p className="text-[10px] text-gray-500 font-bold leading-tight text-center">
              메시지 버튼과 이미지가 실제 인스타그램 DM에서 어떻게 보일지 실시간으로 확인하세요.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FlowModalView;

import React from 'react';
import { AlignLeft, CheckCircle2, ImageIcon, ImagePlus, Key, LinkIcon, Loader2, Lock, MessageCircle, MessageSquare, MessageSquareText, Palette, Plus, RotateCw, Sparkles, Tag, Trash2, Type, UserCheck, X, Zap } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import PresetSelectorModal from '../components/PresetSelectorModal';
import { FOLLOW_REMINDER_PRESETS, REPLY_PRESETS } from '../presets';

const KeywordSettingsView = ({
  keywordReplies,
  selectedMedia,
  setSelectedMedia,
  mediaListLoading,
  mediaList,
  setKeywordReplies,
  keywordRepliesLoading,
  activeTabMap,
  setActiveTabMap,
  saveKeywordSettings,
  setKeywordToDelete,
  setShowDeleteConfirm,
  setTargetReplyForModal,
  setPresetModalType,
  setShowPresetModal,
  showPresetModal,
  presetModalType,
  targetReplyForModal,
  keywordRepliesSaving,
  handleKeywordImageUpload,
  keywordImageUploading,
  apiFetch,
  showNotify,
  INSTAGRAM_API_BASE_URL,
  safeString,
}) => {
  // Filter replies based on selected scope
  const filteredReplies = keywordReplies.filter(reply => {
    if (selectedMedia) {
      return String(reply.media_id) === String(selectedMedia.id);
    }
    return !reply.media_id; // Global
  });

  const getImageUrl = (url) => {
    if (!url) return null;
    if (typeof url !== 'string') return null;
    if (url.startsWith('http')) return url;
    return `${INSTAGRAM_API_BASE_URL}${url}`;
  };

  return (
    <div className="space-y-8 p-0 sm:p-2">
      <div className="flex flex-col items-center justify-center text-center mb-12">
        <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-3 text-center">
          키워드 답장 설정
        </h1>
        <p className="text-gray-500 font-medium max-w-2xl text-center px-4">
          특정 키워드 발견 시 자동으로 전송될 대댓글과 DM 답변을 한 번에 구성하세요.
        </p>
      </div>

      {/* Media Selector */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">키워드를 설정할 게시물 선택</label>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          <div
            onClick={() => {
              if (selectedMedia !== null) {
                setSelectedMedia(null);
              }
            }}
            className={`flex-shrink-0 w-24 h-24 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${!selectedMedia ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'
              }`}
          >
            <span className="text-[11px] font-bold text-center text-gray-900">전체 설정<br />(모든 게시물)</span>
          </div>
          {mediaListLoading ? (
            <div className="flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            mediaList.map((media) => (
              <div
                key={media.id}
                onClick={() => {
                  if (selectedMedia?.id !== media.id) {
                    setSelectedMedia(media);
                  }
                }}
                className={`flex-shrink-0 w-24 h-24 rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${selectedMedia?.id === media.id ? 'border-purple-600 ring-2 ring-purple-200' : 'border-gray-200 hover:border-purple-300'
                  }`}
              >
                <img
                  src={media.url}
                  alt="ig-post"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextElementSibling) return; // Prevent duplicate fallbacks

                    const fallback = document.createElement('div');
                    fallback.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:#f3f4f6;';
                    fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><span style="font-size:9px;color:#9ca3af;font-weight:600;text-align:center;">미리보기 불가</span>';
                    e.target.parentElement.appendChild(fallback);
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-8 mb-16">
        <div className="text-center space-y-3">
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
            {selectedMedia ? '게시물별 개별 답장' : '전체 설정 (모든 게시물)'}
          </h2>
          <p className="text-gray-500 font-medium max-w-2xl">
            {selectedMedia ? '이 게시물에 특화된 자동 응답 규칙을 관리합니다.' : '개별 설정이 없는 모든 게시물에 공통 적용되는 규칙입니다.'}
          </p>
        </div>
        <Button
          onClick={() => {
            const newReply = {
              keyword: '',
              link: '',
              message: '',
              media_id: selectedMedia ? selectedMedia.id : null,
              is_active: true,
              is_follow_check: false,
              interaction_type: 'immediate',
              button_text: '자세히 보기 🔍',
              card_title: '반가워요! 댓글 남겨주셔서 감사합니다.',
              card_subtitle: '상세 내용을 확인하려면 아래 버튼을 클릭하세요.',
              card_image_url: null,
              reply_variations: []
            };
            setKeywordReplies([...keywordReplies, newReply]);
          }}
          className="bg-indigo-600 text-white hover:bg-indigo-700 h-14 px-10 rounded-2xl font-black text-base shadow-xl shadow-indigo-100 transition-all active:scale-95 group"
        >
          <Plus className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
          새 키워드 추가하기
        </Button>
      </div>

      {keywordRepliesLoading ? (
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map((_, i) => (
            <Card key={i} className="animate-pulse border-none shadow-xl bg-white/60 backdrop-blur-3xl rounded-[2.5rem] p-8">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="w-32 h-6 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="space-y-3">
                  <div className="w-full h-12 bg-gray-100 rounded-2xl"></div>
                  <div className="w-3/4 h-12 bg-gray-100 rounded-2xl"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredReplies.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-100 bg-white/50 rounded-[2.5rem] py-24 shadow-none">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6">
              <MessageSquareText className="w-12 h-12 text-gray-300" />
            </div>
            <p className="font-black text-2xl text-gray-900 mb-2">등록된 키워드가 없습니다.</p>
            <p className="text-gray-500 font-medium">새 키워드를 추가하여 편리한 자동응답을 시작해보세요.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {filteredReplies.map((reply) => {
            const masterIndex = keywordReplies.indexOf(reply);
            if (masterIndex === -1) return null;
            const replyKey = masterIndex;
            const activeTab = activeTabMap[replyKey] || 'private';

            return (
              <div
                key={masterIndex}
                className={`group relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] border transition-all duration-500 hover:shadow-[0_32px_64px_-16px_rgba(79,70,229,0.1)] ${reply.is_active ? 'border-gray-100 shadow-sm' : 'border-gray-200 shadow-none grayscale-[0.5] opacity-80'}`}
              >
                <div className="p-8 md:p-10">
                  {/* Card Top: Keyword & Activation Toggle */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
                    <div className="w-full max-w-sm space-y-2">
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">감지할 키워드</label>
                      </div>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-indigo-500 pointer-events-none" />
                        <input
                          type="text"
                          value={reply.keyword}
                          onChange={(e) => {
                            const updated = [...keywordReplies];
                            updated[masterIndex].keyword = e.target.value;
                            setKeywordReplies(updated);
                          }}
                          className="w-full pl-12 pr-4 h-14 bg-gray-50/50 border border-transparent rounded-2xl text-base font-black text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-gray-300"
                          placeholder="예: 가격, 정보, 공구링크"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-50/80 p-2 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3 px-2">
                        <span className={`text-xs font-black tracking-tight transition-colors ${reply.is_active ? 'text-indigo-600' : 'text-gray-400'}`}>
                          {reply.is_active ? '활성화됨' : '비활성'}
                        </span>
                        <div
                          onClick={async () => {
                            const updated = [...keywordReplies];
                            updated[masterIndex].is_active = !updated[masterIndex].is_active;
                            setKeywordReplies(updated);
                            await saveKeywordSettings(updated);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none shadow-inner ${reply.is_active ? 'bg-indigo-600' : 'bg-gray-200'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${reply.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                      </div>
                      <div className="w-px h-6 bg-gray-200 mx-1"></div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        onClick={() => {
                          setKeywordToDelete(reply);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Tab Selection */}
                  <div className="grid grid-cols-2 gap-3 mb-8 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100">
                    <button
                      onClick={() => setActiveTabMap(prev => ({ ...prev, [replyKey]: 'private' }))}
                      className={`flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-xs font-black transition-all ${activeTab === 'private'
                        ? 'bg-white text-gray-900 shadow-md ring-1 ring-gray-100'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                      <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'private' ? 'bg-indigo-50 text-indigo-600' : 'bg-transparent text-gray-400'}`}>
                        <Lock className="w-4 h-4" />
                      </div>
                      비공개 답장 (DM 전송)
                    </button>
                    <button
                      onClick={() => setActiveTabMap(prev => ({ ...prev, [replyKey]: 'public' }))}
                      className={`flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-xs font-black transition-all ${activeTab === 'public'
                        ? 'bg-white text-indigo-600 shadow-md ring-1 ring-indigo-50'
                        : 'text-gray-500 hover:text-indigo-600 hover:bg-white/50'
                        }`}
                    >
                      <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'public' ? 'bg-indigo-50 text-indigo-600' : 'bg-transparent text-gray-400'}`}>
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      공개 답장 (대댓글 작성)
                    </button>
                  </div>

                  {/* Response Editor Area */}
                  <div className="relative">
                    {activeTab === 'private' ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* --- NEW: Smart Interaction Section --- */}
                        <div className="p-6 bg-indigo-50/40 border border-indigo-100/50 rounded-[2.5rem] space-y-6">
                          <div className="flex flex-col items-center justify-center text-center space-y-2">
                            <div>
                              <h4 className="text-base font-black text-indigo-900 leading-tight">스마트 버튼 인터랙션</h4>
                              <p className="text-[10px] text-indigo-400 font-bold mt-1 uppercase tracking-tight">버튼을 클릭하면 상세 정보를 전송합니다.</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 p-1 bg-white/50 backdrop-blur-md rounded-2xl border border-indigo-100/30">
                            <button
                              onClick={() => {
                                const updated = [...keywordReplies];
                                updated[masterIndex].interaction_type = 'immediate';
                                updated[masterIndex].is_follow_check = false;
                                setKeywordReplies(updated);
                              }}
                              className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all ${reply.interaction_type !== 'follow_check' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              <Zap className="w-4 h-4" />
                              <span className="text-[11px] font-black">즉시 전송</span>
                            </button>
                            <button
                              onClick={() => {
                                const updated = [...keywordReplies];
                                updated[masterIndex].interaction_type = 'follow_check';
                                updated[masterIndex].is_follow_check = true;
                                setKeywordReplies(updated);
                              }}
                              className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all relative overflow-hidden ${reply.interaction_type === 'follow_check' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              <UserCheck className="w-4 h-4" />
                              <span className="text-[11px] font-black">팔로우 확인 필수</span>
                            </button>
                          </div>

                          {/* --- NEW: Follow Reminder Message Customization --- */}
                          {reply.interaction_type === 'follow_check' && (
                            <div className="space-y-3 p-5 bg-white/40 rounded-3xl border border-white/50 shadow-inner animate-in slide-in-from-top-2 duration-300">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 px-1">
                                  <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
                                  <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">팔로우 안내 문구 (미팔로워용)</label>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setTargetReplyForModal(reply);
                                    setPresetModalType('follow_fail');
                                    setShowPresetModal(true);
                                  }}
                                  className="bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white font-black text-xs h-9 px-4 rounded-xl shadow-sm transition-all"
                                >
                                  <Sparkles className="w-3 h-3 mr-2" />
                                  추천 문구 꾸러미
                                </Button>
                              </div>
                              <textarea
                                value={reply.follow_fail_message || ''}
                                onChange={(e) => {
                                  const updated = [...keywordReplies];
                                  updated[masterIndex].follow_fail_message = e.target.value;
                                  setKeywordReplies(updated);
                                }}
                                className="w-full p-4 bg-white/80 border border-indigo-50 rounded-2xl text-[11px] font-bold text-indigo-900 h-24 resize-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm placeholder:text-gray-300"
                                placeholder="예: 정보를 받으시려면 먼저 저희 계정을 팔로우해주세요! 😊"
                              />
                              <p className="text-[9px] text-gray-400 font-medium px-1">
                                * 사용자가 팔로우하지 않은 경우에만 전송되는 전용 안내 문구입니다.
                              </p>
                            </div>
                          )}

                          <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                            {/* Card Image Upload */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 px-1">
                                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                                <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">카드 커버 이미지</label>
                              </div>
                              <div className="flex items-center gap-4">
                                {reply.card_image_url ? (
                                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-indigo-100 shadow-sm transition-transform hover:scale-105">
                                    <img src={getImageUrl(reply.card_image_url)} alt="Card Cover" className="w-full h-full object-cover" />
                                    <button
                                      onClick={() => {
                                        const updated = [...keywordReplies];
                                        updated[masterIndex].card_image_url = null;
                                        setKeywordReplies(updated);
                                      }}
                                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => document.getElementById(`card-image-upload-${masterIndex}`).click()}
                                    className="w-24 h-24 rounded-2xl border-2 border-dashed border-indigo-100 bg-white/50 flex flex-col items-center justify-center gap-2 text-indigo-400 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                                  >
                                    <div className="p-2 bg-indigo-50 rounded-xl group-hover:scale-110 transition-transform">
                                      <ImagePlus className="w-5 h-5 text-indigo-500" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-tighter">이미지 추가</span>
                                  </button>
                                )}
                                <input
                                  id={`card-image-upload-${masterIndex}`}
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;

                                    const formData = new FormData();
                                    formData.append('file', file);
                                    try {
                                      const res = await apiFetch('/api/upload', {
                                        method: 'POST',
                                        body: formData,
                                      }, true);
                                      const data = await res.json();
                                      const updated = [...keywordReplies];
                                      updated[masterIndex].card_image_url = data.url;
                                      setKeywordReplies(updated);
                                    } catch (err) {
                                      showNotify('이미지 업로드에 실패했습니다.', 'error');
                                    }
                                  }}
                                />
                                <div className="flex-1">
                                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                                    인스타그램 카드 상단에 노출될 이미지를 선택하세요.<br />
                                    <span className="text-indigo-500 uppercase font-black tracking-tighter">추천 비율: 1.91:1 또는 1:1</span>
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                                  <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">버튼 문구 설정</label>
                                </div>
                                <input
                                  type="text"
                                  value={reply.button_text || '자세히 보기 🔍'}
                                  onChange={(e) => {
                                    const updated = [...keywordReplies];
                                    updated[masterIndex].button_text = e.target.value;
                                    setKeywordReplies(updated);
                                  }}
                                  className="w-full px-4 h-12 bg-white border border-indigo-100 rounded-xl text-xs font-semibold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                  placeholder="버튼에 표시될 문구를 입력하세요... (예: 신청하기)"
                                />
                              </div>

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 px-1">
                                    <Type className="w-3.5 h-3.5 text-indigo-400" />
                                    <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">첫 카드 제목 (Bold)</label>
                                  </div>
                                  <input
                                    type="text"
                                    value={reply.card_title || ''}
                                    onChange={(e) => {
                                      const updated = [...keywordReplies];
                                      updated[masterIndex].card_title = e.target.value;
                                      setKeywordReplies(updated);
                                    }}
                                    className="w-full px-4 h-12 bg-white border border-indigo-100 rounded-xl text-xs font-semibold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    placeholder="카드의 제목을 입력하세요... (최대 80자)"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 px-1">
                                    <AlignLeft className="w-3.5 h-3.5 text-indigo-400" />
                                    <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">첫 카드 부제목 (Gray)</label>
                                  </div>
                                  <input
                                    type="text"
                                    value={reply.card_subtitle || ''}
                                    onChange={(e) => {
                                      const updated = [...keywordReplies];
                                      updated[masterIndex].card_subtitle = e.target.value;
                                      setKeywordReplies(updated);
                                    }}
                                    className="w-full px-4 h-12 bg-white border border-indigo-100 rounded-xl text-xs font-semibold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    placeholder="카드 하단에 표시될 짧은 설명을 입력하세요..."
                                  />
                                </div>

                                {/* Luxury Card Preview */}
                                <div className="mt-6 p-6 bg-[#0f0f0f] rounded-[2.5rem] shadow-2xl relative overflow-hidden group/preview border border-white/5 mx-auto max-w-sm">
                                  <div className="bg-[#1a1a1a] rounded-3xl overflow-hidden border border-white/10 ring-1 ring-white/5 flex flex-col">
                                    {/* Card Preview Image */}
                                    <div className="aspect-[1.91/1] w-full bg-gray-800/50 relative overflow-hidden">
                                      {reply.card_image_url ? (
                                        <img src={getImageUrl(reply.card_image_url)} alt="Preview" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <ImageIcon className="w-8 h-8 text-white/10" />
                                        </div>
                                      )}
                                    </div>

                                    {/* Card Preview Text Content */}
                                    <div className="p-4 space-y-1.5 bg-gradient-to-b from-[#1a1a1a] to-[#161616]">
                                      <p className="text-[13px] text-white font-black leading-snug tracking-tight">
                                        {reply.card_title || '첫 카드 제목을 입력하세요'}
                                      </p>
                                      <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                                        {reply.card_subtitle || '카드 부제목을 보강해주세요'}
                                      </p>
                                    </div>

                                    {/* Card Preview Button */}
                                    <div className="px-4 pb-4 mt-auto">
                                      <div className="w-full py-2.5 bg-white/10 rounded-xl text-center border border-white/10 group-hover/preview:bg-white/20 transition-all cursor-default">
                                        <span className="text-[11px] font-black text-white tracking-tight">{reply.button_text || '자세히 보기 🔍'}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Glass reflection effect */}
                                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/0 via-white/[0.03] to-white/0 translate-y-[100%] group-hover/preview:translate-y-[-100%] transition-transform duration-1000" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 px-1">
                            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                            <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">상세 정보 메시지</label>
                          </div>
                          <textarea
                            value={reply.message}
                            onChange={(e) => {
                              const updated = [...keywordReplies];
                              updated[masterIndex].message = e.target.value;
                              setKeywordReplies(updated);
                            }}
                            className="w-full p-5 bg-white border border-gray-100 rounded-[2rem] text-sm font-medium h-32 resize-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner"
                            placeholder="버튼 클릭 후 전송될 상세 내용을 입력하세요..."
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 px-1">
                            <LinkIcon className="w-3.5 h-3.5 text-gray-400" />
                            <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">상세 확인 링크 (전환용)</label>
                          </div>
                          <div className="relative">
                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-300" />
                            <input
                              type="text"
                              value={reply.link || ''}
                              onChange={(e) => {
                                const updated = [...keywordReplies];
                                updated[masterIndex].link = e.target.value;
                                setKeywordReplies(updated);
                              }}
                              className="w-full pl-12 h-14 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner"
                              placeholder="https://example.com/product-link"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 px-1">
                            <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                            <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">사진 첨부 (최대 3장)</label>
                          </div>
                          <div className="flex flex-wrap gap-4 min-h-[128px]">
                            {/* [MULTI-IMAGE SUPPORT] - Render all attached images */}
                            {((reply.image_urls || []).concat(reply.image_url ? [reply.image_url] : []))
                              .filter((url, idx, self) => url && self.indexOf(url) === idx)
                              .map((url, imgIdx) => (
                                <div key={imgIdx} className="relative group overflow-hidden rounded-[1.5rem] border-2 border-indigo-100 shadow-lg bg-gray-50 w-32 h-32 transform hover:scale-[1.05] transition-all duration-500">
                                  <img
                                    src={getImageUrl(url)}
                                    alt={`Attached ${imgIdx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                    <button
                                      onClick={async () => {
                                        const updated = [...keywordReplies];
                                        if (updated[masterIndex].image_urls) {
                                          updated[masterIndex].image_urls = updated[masterIndex].image_urls.filter(u => u !== url);
                                        }
                                        if (updated[masterIndex].image_url === url) {
                                          updated[masterIndex].image_url = null;
                                        }
                                        setKeywordReplies(updated);
                                        await saveKeywordSettings(updated);
                                      }}
                                      className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg active:scale-90"
                                      title="이미지 제거"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}

                            {/* Upload Button */}
                            {(() => {
                              const allImages = [...(reply.image_urls || []), ...(reply.image_url ? [reply.image_url] : [])];
                              const uniqueImages = [...new Set(allImages)].filter(Boolean);
                              return uniqueImages.length < 3;
                            })() && (
                                <div className="w-32 h-32 relative">
                                  <input
                                    type="file"
                                    className="hidden"
                                    id={`keyword-img-upload-${masterIndex}`}
                                    accept="image/*"
                                    onChange={(e) => handleKeywordImageUpload(e, masterIndex)}
                                  />
                                  <label
                                    htmlFor={`keyword-img-upload-${masterIndex}`}
                                    className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-gray-200 rounded-[1.5rem] bg-gray-50/50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all cursor-pointer group ${keywordImageUploading[masterIndex] ? 'opacity-50 pointer-events-none' : ''}`}
                                  >
                                    {keywordImageUploading[masterIndex] ? (
                                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                    ) : (
                                      <>
                                        <div className="p-2.5 bg-white rounded-lg shadow-sm border border-gray-100 mb-1 group-hover:scale-110 transition-transform">
                                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 group-hover:text-indigo-900 tracking-tighter text-center">사진 추가</p>
                                      </>
                                    )}
                                  </label>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100/50">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
                            <div className="text-center sm:text-left">
                              <h4 className="text-base font-black text-indigo-900 leading-tight">다양한 대댓글 랜덤 응답</h4>
                              <p className="text-xs text-indigo-400 font-bold mt-1">인스타그램 봇 감지를 방지하기 위해 여러 문구를 활용하세요.</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTargetReplyForModal(reply);
                                setPresetModalType('reply');
                                setShowPresetModal(true);
                              }}
                              className="bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white font-black text-xs h-11 px-5 rounded-xl shadow-sm transition-all"
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              추천 문구 꾸러미
                            </Button>
                          </div>

                          <textarea
                            value={reply.reply_variations ? reply.reply_variations.join('\n') : ''}
                            onChange={(e) => {
                              const updated = [...keywordReplies];
                              updated[masterIndex].reply_variations = e.target.value.split('\n');
                              setKeywordReplies(updated);
                            }}
                            className="w-full p-6 bg-white border border-indigo-100 rounded-[2rem] text-sm font-bold text-indigo-900 h-44 resize-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                            placeholder={`공개 답글 내용을 한 줄씩 입력하세요.\n엔터(줄바꿈)로 구분하여 무작위 전송될 문장을 추가할 수 있습니다.`}
                          />

                          <div className="mt-6 flex flex-wrap gap-2">
                            {reply.reply_variations?.filter(v => v.trim()).map((v, i) => (
                              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-indigo-100 text-indigo-600 text-[10px] font-black shadow-sm group/tag">
                                <span className="truncate max-w-[200px]">{v}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredReplies.length > 0 && (
        <div className="sticky bottom-8 left-0 right-0 flex justify-center z-20 pointer-events-none py-10 mt-10">
          <Button
            onClick={saveKeywordSettings}
            disabled={keywordRepliesSaving}
            className="pointer-events-auto h-16 px-12 rounded-full bg-gray-900 hover:bg-black text-white text-lg font-black shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_60px_-10px_rgba(0,0,0,0.4)] transition-all active:scale-95 group border border-white/10 backdrop-blur-sm"
          >
            {keywordRepliesSaving ? (
              <div className="flex items-center gap-3">
                <RotateCw className="w-6 h-6 animate-spin" />
                <span className="tracking-tighter">변경사항 저장 중...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6" />
                <span className="tracking-tighter">모든 설정 저장하기</span>
              </div>
            )}
          </Button>
        </div>
      )}

      {/* Preset Modal Injection */}
      <PresetSelectorModal
        isOpen={showPresetModal && presetModalType === 'reply'}
        onClose={() => setShowPresetModal(false)}
        initialSelected={targetReplyForModal?.reply_variations || []}
        presetData={REPLY_PRESETS}
        title="추천 문구 꾸러미"
        description="원하는 문구들을 체크하여 선택해주세요."
        onSelect={(selected) => {
          if (targetReplyForModal) {
            setKeywordReplies(prev => {
              const updated = [...prev];
              const index = updated.findIndex(r => r === targetReplyForModal);
              if (index === -1) return prev;

              const currentVariations = updated[index].reply_variations || [];
              const merged = [...new Set([...currentVariations, ...selected])].filter(s => s.trim());

              updated[index] = {
                ...updated[index],
                reply_variations: merged
              };
              return updated;
            });
          }
        }}
      />

      <PresetSelectorModal
        isOpen={showPresetModal && presetModalType === 'follow_fail'}
        onClose={() => setShowPresetModal(false)}
        initialSelected={targetReplyForModal?.follow_fail_message ? targetReplyForModal.follow_fail_message.split('\n').filter(Boolean) : []}
        presetData={FOLLOW_REMINDER_PRESETS}
        title="팔로우 안내 문구 추천"
        description="원하는 팔로우 안내 문구를 선택해주세요. (여러 개 선택 시 결합됩니다)"
        onSelect={(selected) => {
          if (targetReplyForModal) {
            setKeywordReplies(prev => {
              const updated = [...prev];
              const index = updated.findIndex(r => r === targetReplyForModal);
              if (index === -1) return prev;

              updated[index] = {
                ...updated[index],
                follow_fail_message: selected.join('\n')
              };
              return updated;
            });
          }
        }}
      />
    </div>
  );
};

export default KeywordSettingsView;

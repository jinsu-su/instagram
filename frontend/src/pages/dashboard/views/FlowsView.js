import React from 'react';
import { Key, LayoutGrid, Loader2, Plus, Settings, Trash2, Workflow, Zap } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';

const FlowsView = ({
  flows,
  keywordReplies,
  flowsLoading,
  keywordRepliesLoading,
  safeString,
  mediaList,
  customerId,
  loadUserMedia,
  setTargetPostPreview,
  setShowTargetPostPreview,
  showNotify,
  setTargetPostsPreview,
  setShowTargetPostsPreview,
  toggleFlowActive,
  setKeywordReplies,
  saveKeywordSettings,
  setFlowForm,
  setShowFlowModal,
  setBuilderEditIndex,
  setBuilderTargetPosts,
  setBuilderKeywords,
  setBuilderDmMessage,
  setBuilderFollowCheck,
  setBuilderFollowMessage,
  setBuilderFollowButtonText,
  setAutomationView,
  setFlowToDelete,
  setShowFlowDeleteConfirm,
  setKeywordToDelete,
  setShowDeleteConfirm,
  setShowScenarioModal,
  setCurrentView,
}) => {
  // Merge standard flows and simple keyword automations for unified management
  const unifiedAutomations = [
    ...flows.map(f => ({ ...f, type: 'advanced' })),
    ...keywordReplies.map((r, idx) => ({
      ...r,
      id: `simple-${idx}`,
      name: r.keyword ? `${r.keyword} 자동 응답` : '초간편 자동화',
      type: 'simple',
      masterIndex: idx
    }))
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center justify-center text-center mb-12 relative w-full">
        <h2 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight mb-2 text-center uppercase">
          자동화 플로우
        </h2>
        <p className="text-sm text-gray-500 font-medium text-center">인스타그램 자동 응답 시퀀스를 효율적으로 관리합니다.</p>
        <div className="mt-6 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
          <Button
            onClick={() => {
              setFlowForm({
                name: '',
                trigger_source: 'all',
                keyword: '',
                match_type: 'contains',
                nodes: [
                  { id: 'start', type: 'message', content: '', buttons: [] }
                ],
                is_active: true
              });
              setShowScenarioModal(true);
            }}
            className="bg-gray-900 text-white hover:bg-gray-800 h-9 px-4 rounded-xl font-bold shadow-sm transition-all text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            새 플로우 만들기
          </Button>
        </div>
      </div>

      {flowsLoading || keywordRepliesLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {unifiedAutomations.length === 0 ? (
            <Card className="py-20 border border-dashed border-gray-200 bg-gray-50/50">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <Workflow className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-900 font-bold text-lg mb-1">생성된 자동화가 없습니다.</p>
                <p className="text-sm text-gray-500">첫 번째 자동화를 만들어보세요.</p>
              </CardContent>
            </Card>
          ) : (
            unifiedAutomations.map((item) => (
              <div key={item.id} className={`group relative bg-white border border-gray-100 rounded-xl p-5 hover:border-indigo-200 hover:shadow-lg transition-all duration-300 ${!item.is_active && 'opacity-70 bg-gray-50/50'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex items-start gap-4">
                    {/* Status Indicator */}
                    <div className="pt-1.5">
                      <div className={`w-3 h-3 rounded-full ${item.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-gray-300'}`} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900 leading-tight">{safeString(item.name)}</h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        {item.type === 'advanced' ? (
                          <>
                            {item.trigger_source === 'story_mention' ? (
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                <span className="font-bold text-gray-700">스토리 @태그 시 즉시 실행</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Key className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="font-bold">"{item.trigger_config?.keyword}"</span>
                                <span className="text-xs text-gray-400">에 반응</span>
                              </div>
                            )}
                            <div className="h-3 w-px bg-gray-200 hidden sm:block"></div>
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <span className="text-xs font-medium text-gray-400">작동 채널:</span>
                              <span className={`text-xs font-bold ${item.trigger_source === 'comment' ? 'text-purple-600' : item.trigger_source === 'dm' ? 'text-blue-600' : 'text-green-600'}`}>
                                {item.trigger_source === 'comment' ? '댓글' : item.trigger_source === 'dm' ? 'DM' : item.trigger_source === 'story_mention' ? 'DM (자동)' : '전체 채널'}
                              </span>
                            </div>
                          </>
                        ) : (() => {
                          const rawMediaIds = [
                            ...(Array.isArray(item.media_ids)
                              ? item.media_ids
                              : typeof item.media_ids === 'string'
                                ? item.media_ids.split(',').map(v => v.trim()).filter(Boolean)
                                : []),
                            ...(item.media_id ? [item.media_id] : []),
                          ];
                          const mediaIds = [...new Set(rawMediaIds.map(id => String(id)).filter(Boolean))];
                          const targetedMedias = (mediaList || []).filter(m => mediaIds.includes(String(m.id)));
                          const fallbackPreviewMedias = (item.media_previews || []).filter(m => mediaIds.includes(String(m.id)));
                          const mergedTargeted = targetedMedias.length > 0 ? targetedMedias : fallbackPreviewMedias;
                          const previewMedias = mergedTargeted.slice(0, 3);
                          const hasMore = mediaIds.length > 3;

                          return (
                            <>
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Key className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="font-bold">"{item.keyword}"</span>
                                <span className="text-xs text-gray-400">에 반응</span>
                              </div>
                              <div className="h-3 w-px bg-gray-200 hidden sm:block"></div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-400">대상:</span>
                                {mediaIds.length === 0 ? (
                                  <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100/50">
                                    <LayoutGrid className="w-3 h-3 text-emerald-500" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">모든 게시물</span>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center gap-2 ${mediaIds.length > 0 ? 'cursor-pointer' : ''}`}
                                    onClick={async () => {
                                      if (mediaIds.length === 0) return;

                                      const ids = mediaIds.map(String);
                                      const from = (arr) => (Array.isArray(arr) ? arr : []).filter(Boolean).filter(mm => ids.includes(String(mm.id)));

                                      // Prefer: loaded mediaList -> saved previews -> current preview stack
                                      let resolved = [
                                        ...from(mediaList),
                                        ...from(item.media_previews),
                                        ...from(previewMedias),
                                      ];

                                      // de-dupe by id
                                      const seen = new Set();
                                      resolved = resolved.filter(mm => {
                                        const key = String(mm.id);
                                        if (seen.has(key)) return false;
                                        seen.add(key);
                                        return true;
                                      });

                                      // If missing and we have customerId, fetch once and retry
                                      if (resolved.length < Math.min(ids.length, 6) && customerId) {
                                        try {
                                          const mediaRes = await loadUserMedia(customerId);
                                          const fetched = mediaRes?.images || [];
                                          for (const mm of from(fetched)) {
                                            const key = String(mm.id);
                                            if (!seen.has(key)) {
                                              seen.add(key);
                                              resolved.push(mm);
                                            }
                                          }
                                        } catch (err) {
                                        }
                                      }

                                      if (ids.length === 1) {
                                        const m = resolved[0] || null;
                                        if (m) {
                                          setTargetPostPreview(m);
                                          setShowTargetPostPreview(true);
                                          return;
                                        }
                                        showNotify('게시물 정보를 찾지 못했습니다. 게시물 변경하기에서 다시 선택해주세요.', 'warning');
                                        return;
                                      }

                                      if (resolved.length > 0) {
                                        setTargetPostsPreview(resolved);
                                        setShowTargetPostsPreview(true);
                                        return;
                                      }

                                      showNotify('게시물 정보를 찾지 못했습니다. 게시물 변경하기에서 다시 선택해주세요.', 'warning');
                                    }}
                                  >
                                    <div className="flex items-center -space-x-2">
                                      {previewMedias.map((m, idx) => (
                                        <div
                                          key={m.id}
                                          className="w-8 h-8 rounded-lg border-2 border-white overflow-hidden shadow-sm hover:scale-110 transition-transform relative"
                                          style={{ zIndex: 10 - idx }}
                                        >
                                          <img src={m.thumbnail_url || m.media_url} alt="post" className="w-full h-full object-cover" />
                                        </div>
                                      ))}
                                      {hasMore && (
                                        <div className="w-8 h-8 rounded-lg border-2 border-white bg-gray-900 flex items-center justify-center shadow-sm relative z-0">
                                          <span className="text-[9px] font-black text-white">+{mediaIds.length - 3}</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="min-w-[96px] px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100/60 text-emerald-700 leading-none whitespace-nowrap text-center">
                                      <span className="text-[10px] font-black">{mediaIds.length}개 게시물 선택</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="mt-3 text-[11px] text-gray-400 bg-gray-50/40 p-2.5 rounded-xl border border-gray-100/50 line-clamp-1 italic max-w-lg">
                        <span className="font-black text-gray-400 mr-2 not-italic uppercase tracking-tighter">Preview:</span>
                        {item.type === 'advanced'
                          ? (item.actions?.find(a => a.type === 'send_text')?.config?.text || item.actions?.find(a => a.type === 'send_text')?.config?.message || '복합 시나리오 실행...')
                          : (item.builderDmMessage || item.message || '답장 메시지가 설정되지 않았습니다.')}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3 pl-7 sm:pl-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (item.type === 'advanced') toggleFlowActive(item);
                        else {
                          const updated = [...keywordReplies];
                          updated[item.masterIndex].is_active = !updated[item.masterIndex].is_active;
                          setKeywordReplies(updated);
                          saveKeywordSettings(updated);
                        }
                      }}
                      className={`h-9 px-4 rounded-lg font-bold text-xs transition-all ${item.is_active ? 'border-gray-200 text-gray-500 hover:bg-gray-50' : 'bg-gray-900 text-white hover:bg-gray-800 border-none'}`}
                    >
                      {item.is_active ? '중단' : '활성화'}
                    </Button>

                    <div className="flex items-center border-l border-gray-100 pl-3 ml-1 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        onClick={async () => {
                          if (item.type === 'advanced') {
                            const flow = item;
                            const frontendNodes = flow.actions.map((action, idx) => {
                              const nodeId = (idx === 0) ? 'start' : `node_${Date.now()}_${idx}`;
                              if (action.type === 'wait' || action.type === 'delay') {
                                return { id: nodeId, type: 'delay', content: (action.seconds || 1).toString(), buttons: [] };
                              }
                              if (action.type === 'add_tag') {
                                return { id: nodeId, type: 'tag', tag: action.tag, content: '', buttons: [] };
                              }
                              return {
                                id: nodeId,
                                type: 'message',
                                content: action.config?.message || action.config?.text || '',
                                buttons: action.config?.buttons || []
                              };
                            });
                            setFlowForm({
                              id: flow.id,
                              name: flow.name,
                              trigger_source: flow.trigger_source || 'all',
                              keyword: flow.trigger_config?.keyword || '',
                              match_type: flow.trigger_config?.match_type || 'contains',
                              nodes: frontendNodes,
                              is_active: flow.is_active
                            });
                            setShowFlowModal(true);
                          } else {
                            // Simple automation edit - take to the builder tab
                            setBuilderEditIndex(item.masterIndex);
                            
                            // Load data into builder
                            const mediaIds = [...new Set([
                              ...(Array.isArray(item.media_ids) ? item.media_ids : typeof item.media_ids === 'string' ? item.media_ids.split(',') : []),
                              ...(item.media_id ? [item.media_id] : [])
                            ].map(String).filter(Boolean))];
                            
                            let targetedMedias = (mediaList || []).filter(m => mediaIds.includes(String(m.id)));
                            let fallbackPreviewMedias = (item.media_previews || []).filter(m => mediaIds.includes(String(m.id)));
                            let mergedTargeted = targetedMedias.length > 0 ? targetedMedias : fallbackPreviewMedias;
                            
                            if (mergedTargeted.length === 0 && mediaIds.length > 0 && customerId) {
                              try {
                                // Fetch fresh if missing
                                const mediaRes = await loadUserMedia(customerId);
                                const fetched = mediaRes?.images || [];
                                const fetchedTargeted = fetched.filter(m => mediaIds.includes(String(m.id)));
                                if (fetchedTargeted.length > 0) {
                                  mergedTargeted = fetchedTargeted;
                                } else {
                                  // Fallback skeleton
                                  mergedTargeted = mediaIds.map(id => ({ id }));
                                }
                              } catch (err) {
                                mergedTargeted = mediaIds.map(id => ({ id }));
                              }
                            } else if (mergedTargeted.length === 0 && mediaIds.length > 0) {
                              mergedTargeted = mediaIds.map(id => ({ id }));
                            }
                            
                            setBuilderTargetPosts(mergedTargeted);
                            setBuilderKeywords(item.keywords || (item.keyword ? [item.keyword] : []));
                            setBuilderDmMessage(item.message || '');
                            
                            const isFollowCheck = item.interaction_type === 'follow_check' || item.is_follow_check;
                            setBuilderFollowCheck(!!isFollowCheck);
                            setBuilderFollowMessage(item.follow_fail_message || item.card_subtitle || '');
                            setBuilderFollowButtonText(item.button_text || '자세히 보기 🔍');
                            
                            // Switch to builder view
                            setAutomationView('builder');
                            showNotify('초간편 자동화 편집 모드로 이동했습니다.', 'info');
                          }
                        }}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        onClick={() => {
                          if (item.type === 'advanced') {
                            setFlowToDelete(item.id);
                            setShowFlowDeleteConfirm(true);
                          } else {
                            setKeywordToDelete(item);
                            setShowDeleteConfirm(true);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FlowsView;

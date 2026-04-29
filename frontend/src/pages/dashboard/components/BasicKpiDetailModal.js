import React from 'react';
import { Image as ImageIcon, MessageCircle, TrendingUp, Workflow, X, Zap } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';

const BasicKpiDetailModal = ({ showBasicKpiDetailModal, setShowBasicKpiDetailModal, basicKpiDetail }) => {
  if (!showBasicKpiDetailModal) return null;

  return (
    <div
      className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md flex justify-center"
      onClick={(e) => e.target === e.currentTarget && setShowBasicKpiDetailModal(false)}
    >
      <div className="relative min-h-full flex justify-center p-4 py-12 pointer-events-none w-full">
        <Card className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-none p-0 pointer-events-auto h-fit my-auto animate-in zoom-in-95 duration-300">
          <div className="relative p-6 md:p-8 lg:p-10 border-b border-gray-50 flex items-center justify-between bg-gradient-to-b from-gray-50/50 to-white min-h-[120px] md:min-h-[160px]">
            <div className={`w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-[1.25rem] flex items-center justify-center shadow-lg z-10 ${
              basicKpiDetail?.type === 'active-automation' ? 'bg-emerald-500 shadow-emerald-200' :
              basicKpiDetail?.type === 'top-posts' ? 'bg-pink-500 shadow-pink-200' :
              basicKpiDetail?.type === 'today-automated' ? 'bg-blue-500 shadow-blue-200' :
              'bg-violet-600 shadow-violet-200'
            }`}>
              {basicKpiDetail?.type === 'top-posts' ? <ImageIcon className="w-6 h-6 md:w-7 md:h-7 text-white" /> :
               basicKpiDetail?.type === 'last7-trend' ? <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-white" /> :
               basicKpiDetail?.type === 'today-automated' ? <Zap className="w-6 h-6 md:w-7 md:h-7 text-white" /> :
               <Workflow className="w-6 h-6 md:w-7 md:h-7 text-white" />}
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-20">
              <div className="space-y-1.5 text-center pointer-events-auto max-w-sm md:max-w-lg">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight leading-tight truncate">
                  {basicKpiDetail?.title || '상세 데이터'}
                </h3>
                <p className="hidden md:block text-[12px] md:text-[13px] font-bold text-gray-400">
                  {basicKpiDetail?.type === 'active-automation' ? '현재 활성화되어 실행 중인 자동화 목록입니다' :
                   basicKpiDetail?.type === 'top-posts' ? '최근 분석된 실시간 반응 최고 게시물입니다' :
                   basicKpiDetail?.type === 'today-automated' ? '오늘 하루 동안 처리된 액션 유형별 실적입니다' :
                   '최근 7일간의 AI 자동화 처리 실적 및 추이입니다'}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBasicKpiDetailModal(false)}
              className="shrink-0 rounded-2xl hover:bg-gray-100 transition-all h-12 w-12 z-10"
            >
              <X className="w-6 h-6 text-gray-400" />
            </Button>
          </div>

          <div className="p-8">
            {basicKpiDetail?.type === 'active-automation' && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3 px-6 mb-1">
                  <div className="md:col-span-4 flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">자동화 이름 / 유형</span>
                  </div>
                  <div className="hidden md:block md:col-span-3 min-w-0">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">트리거 조건</span>
                  </div>
                  <div className="hidden md:block md:col-span-3 text-center">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">대상 및 채널</span>
                  </div>
                  <div className="hidden md:block md:col-span-2 flex items-center justify-between md:justify-end gap-6 pr-2">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">처리 건수 / 상태</span>
                  </div>
                </div>

                {(basicKpiDetail.rows || []).length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center bg-gray-50/30 rounded-[2rem] border border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm ring-1 ring-gray-100">
                      <Zap className="w-10 h-10 text-gray-200" />
                    </div>
                    <p className="text-lg font-black text-gray-400">활성화된 자동화가 없습니다</p>
                    <p className="text-sm font-bold text-gray-300 mt-2">새로운 자동화 시나리오를 만들어보세요</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {(basicKpiDetail.rows || []).map((row, idx) => (
                      <div
                        key={`${row.id || idx}-${row.name}`}
                        className="group grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3 px-6 rounded-2xl bg-white border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/10 transition-all duration-200"
                      >
                        <div className="md:col-span-4 flex items-center gap-2 min-w-0">
                          <h4 className="text-[13px] font-black text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                            {row.name}
                          </h4>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0 ${
                            row.kind === '시나리오' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {row.kind}
                          </span>
                        </div>

                        <div className="md:col-span-3 min-w-0">
                          <span className="text-[13px] font-bold text-gray-600 truncate block">"{row.trigger}"</span>
                        </div>

                        <div className="md:col-span-3 text-center">
                          <span className="text-[13px] font-bold text-gray-500">{row.channel} · {row.target}</span>
                        </div>

                        <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-6 pr-2">
                          <div className="text-[13px] font-black text-gray-900">
                            {row.triggerCount || 0}건
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hidden lg:inline">Live</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {basicKpiDetail?.type === 'top-posts' && (
              <div className="space-y-4">
                {(basicKpiDetail.rows || []).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                      <p className="text-[11px] font-bold text-emerald-700">TOP 게시물 평균 반응</p>
                      <p className="text-lg font-black text-emerald-900 mt-1">
                        {Math.round(
                          (basicKpiDetail.rows || []).reduce((acc, r) => acc + ((r.like_count || 0) + (r.comments_count || 0)), 0) /
                          Math.max(1, (basicKpiDetail.rows || []).length)
                        )}건
                      </p>
                    </div>
                    <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                      <p className="text-[11px] font-bold text-indigo-700">최고 반응 게시물</p>
                      <p className="text-sm font-black text-indigo-900 mt-1 line-clamp-1">
                        {(basicKpiDetail.rows || [])[0]?.caption || '내용 없음'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[11px] font-bold text-gray-600">분석 대상 게시물</p>
                      <p className="text-lg font-black text-gray-900 mt-1">{(basicKpiDetail.rows || []).length}개</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(basicKpiDetail.rows || []).length === 0 ? (
                  <div className="sm:col-span-3 p-5 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-400 text-center">
                    반응 데이터가 아직 없습니다.
                  </div>
                ) : (
                  (basicKpiDetail.rows || []).map((row, idx) => (
                    <div key={row.id || idx} className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
                      <div className="aspect-square bg-gray-50">
                        {(row.thumbnail_url || row.media_url) ? (
                          <img src={row.thumbnail_url || row.media_url} alt="top post detail" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-10 h-10 text-gray-200" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-[11px] font-black text-gray-900 line-clamp-2">{row.caption || '내용 없음'}</p>
                        <p className="mt-2 text-[11px] font-bold text-gray-500">좋아요 {row.like_count || 0} · 댓글 {row.comments_count || 0}</p>
                      </div>
                    </div>
                  ))
                )}
                </div>
              </div>
            )}

            {basicKpiDetail?.type === 'last7-trend' && (() => {
              const maxCount = Math.max(1, ...(basicKpiDetail.rows || []).map(r => r.count));
              const totalCount = (basicKpiDetail.rows || []).reduce((acc, r) => acc + (r.count || 0), 0);
              const avgCount = Math.round((totalCount / Math.max(1, (basicKpiDetail.rows || []).length)) * 10) / 10;
              const sorted = [...(basicKpiDetail.rows || [])].sort((a, b) => (b.count || 0) - (a.count || 0));
              const bestDay = sorted[0] || { dateLabel: '-', count: 0 };

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">7일 총 자동 처리</p>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl font-black text-gray-900">{totalCount}</span>
                        <span className="text-sm font-bold text-gray-500">건</span>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">일평균 처리</p>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl font-black text-gray-900">{avgCount}</span>
                        <span className="text-sm font-bold text-gray-500">건</span>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">최고 처리일</p>
                      <div className="flex flex-col mt-2">
                        <span className="text-xl font-black text-gray-900">{bestDay.dateLabel}</span>
                        <span className="text-sm font-bold text-gray-500 mt-0.5">{bestDay.count}건 달성</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 className="text-sm font-black text-gray-900 mb-6 px-2">일자별 응답 트렌드</h4>
                    <div className="relative bg-gradient-to-b from-gray-50/50 to-white rounded-[2rem] border border-gray-100/80 p-6 md:p-8 pt-16 flex items-end justify-between h-64 gap-2 md:gap-4 shadow-sm">
                      <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8 pointer-events-none opacity-30">
                        <div className="w-full h-px border-t border-dashed border-gray-300"></div>
                        <div className="w-full h-px border-t border-dashed border-gray-300"></div>
                        <div className="w-full h-px border-t border-gray-300"></div>
                      </div>

                      {(basicKpiDetail.rows || []).map((row, idx) => {
                        const heightPct = Math.max(4, Math.round((row.count / maxCount) * 100));
                        const isToday = idx === (basicKpiDetail.rows || []).length - 1;

                        return (
                          <div key={idx} className="relative flex flex-col items-center w-full group pt-4 h-full justify-end z-10 cursor-pointer">
                            <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:-translate-y-1 bg-gray-900 text-white text-xs font-black px-3 py-1.5 rounded-xl pointer-events-none flex flex-col items-center shadow-xl drop-shadow-md">
                              <span className="whitespace-nowrap">{row.count}건</span>
                              <div className="w-2.5 h-2.5 bg-gray-900 rotate-45 transform translate-y-2 -mt-2.5"></div>
                            </div>

                            <div className="w-full max-w-[32px] md:max-w-[48px] h-full flex items-end justify-center relative">
                              <div
                                className={`w-full rounded-t-xl transition-all duration-500 ease-out ${
                                  isToday
                                    ? 'bg-violet-500 shadow-md shadow-violet-300 group-hover:bg-violet-400'
                                    : 'bg-indigo-100 group-hover:bg-indigo-300'
                                }`}
                                style={{ height: `${heightPct}%` }}
                              ></div>
                            </div>

                            <span className={`mt-4 text-[10px] md:text-sm font-black uppercase tracking-wider ${
                              isToday ? 'text-violet-600' : 'text-gray-400 group-hover:text-gray-600'
                            }`}>
                              {isToday ? '오늘' : row.dateLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {basicKpiDetail?.type === 'today-automated' && (
              <div className="space-y-6">
                <div className="w-full">
                  <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">오늘 성공 처리</p>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-4xl sm:text-5xl font-black text-gray-900">{(basicKpiDetail.total || 0).toLocaleString()}</span>
                        <span className="text-lg font-bold text-gray-500 ml-1">건</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-sm font-black text-gray-900 mb-4 px-2">최근 활동 유형별 비율 (100건 기준)</h4>
                  <div className="space-y-3">
                    {((basicKpiDetail.rows || []).reduce((a,b) => a+b.count, 0) === 0) ? (
                       <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 pl-4 pr-4">
                         <p className="text-sm font-bold text-gray-400">최근 수집된 세부 활동 내역이 없습니다</p>
                       </div>
                    ) : (
                      (basicKpiDetail.rows || []).map((row, idx) => {
                        const totalRows = Math.max(1, basicKpiDetail.rows.reduce((a,b) => a + b.count, 0));
                        const widthPct = Math.min(100, Math.max(1, Math.round((row.count / totalRows) * 100)));
                        return (
                          <div key={idx} className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col gap-3">
                             <div className="flex justify-between items-center">
                                <span className="text-[13px] font-black text-gray-700 flex items-center gap-2">
                                   {row.label === '시나리오 기반' ? <Workflow className="w-4 h-4 text-indigo-500" /> :
                                    row.label === 'AI 스마트 응답' ? <Zap className="w-4 h-4 text-pink-500" /> :
                                    <MessageCircle className="w-4 h-4 text-emerald-500" />}
                                   {row.label}
                                </span>
                                <span className="text-sm font-black text-gray-900">{widthPct}% <span className="text-xs text-gray-400 ml-1">({row.count}건)</span></span>
                             </div>
                             <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                    row.label === '시나리오 기반' ? 'bg-indigo-500' :
                                    row.label === 'AI 스마트 응답' ? 'bg-pink-500' :
                                    'bg-emerald-500'
                                  }`}
                                  style={{ width: `${widthPct}%` }}
                                ></div>
                             </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BasicKpiDetailModal;

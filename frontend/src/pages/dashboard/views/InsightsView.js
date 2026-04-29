import React from 'react';
import {
  AlertCircle,
  BarChart3,
  Bot,
  Clock,
  Heart,
  Image as ImageIcon,
  Loader2,
  Lock,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

const InsightsView = ({
  igInsights,
  customerStatus,
  webhookStatus,
  isPremiumFeatureLocked,
  showPremiumLockToast,
  showNotify,
  loadIgInsights,
  customerId,
  loadPerformanceReport,
  igInsightsLoading,
  performanceReportLoading,
  automationStatsLoading,
  automationStats,
  sectionErrors,
  renderDataError,
  loadAutomationStats,
  safeString,
  isAiPremiumLocked,
  setCurrentView,
  performanceReport,
  loadAiInsights,
}) => {
  // Calculate simple engagement metrics
  const recentPosts = igInsights?.recent_media || [];
  const totalLikes = recentPosts.reduce((acc, post) => acc + (post.like_count || 0), 0);
  const totalComments = recentPosts.reduce((acc, post) => acc + (post.comments_count || 0), 0);
  const avgEngagement = recentPosts.length > 0 ? Math.round((totalLikes + totalComments) / recentPosts.length) : 0;
  const totalReach = recentPosts.reduce((acc, post) => acc + (post.reach || 0), 0);
  const avgReach = recentPosts.length > 0 ? Math.round(totalReach / recentPosts.length) : 0;

  // Determine account health status
  const isHealthy = customerStatus?.integration_status === 'APPROVED' && !webhookStatus?.error;

  return (
    <>
      <div className="mb-10 w-full relative flex flex-col items-center justify-center text-center border-b border-gray-100 pb-10 gap-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">
            서비스 인사이트
          </h1>
          <p className="text-gray-400 font-bold text-sm">계정의 주요 성과와 성장 지표를 확인합니다</p>
        </div>
        <div className="md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2 flex items-center justify-center">
          <Button
            variant="outline"
            className="rounded-xl bg-white border border-gray-200 text-gray-900 font-bold h-11 px-5 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm flex items-center gap-2 group"
            onClick={async () => {
              if (isPremiumFeatureLocked) {
                showPremiumLockToast('프리미엄 요금제로 연장해야 지표를 새로고침할 수 있습니다.');
                return;
              }
              showNotify('지표를 새로고침합니다...', 'info');
              await loadIgInsights(customerId);
              loadPerformanceReport(customerId, true);
            }}
          >
            <RefreshCw className={`w-4 h-4 transition-transform group-hover:rotate-180 duration-500 ${igInsightsLoading || performanceReportLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm">지표 새로고침</span>
          </Button>
        </div>
      </div>

      {(automationStatsLoading || (automationStats && automationStats.total_activities > 0)) && (
        <div className="mb-6">
          {!automationStatsLoading ? (
            sectionErrors.automation ? (
              renderDataError("자동화 성과", () => {
                const cid = localStorage.getItem('customer_id');
                if (cid) loadAutomationStats(cid);
              })
            ) : (
              <Card className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden relative">
                <CardContent className="p-8 relative z-10">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-xl font-bold text-indigo-900 flex items-center justify-center md:justify-start gap-2 mb-2">
                        <Clock className="w-6 h-6 text-indigo-600" />
                        AI가 고객님을 위해 절약한 시간
                      </h3>
                      <div className="text-5xl font-black text-indigo-600 tracking-tighter my-4">
                        {Math.floor((automationStats.time_saved_minutes || 0) / 60) > 0 ? `${Math.floor((automationStats.time_saved_minutes || 0) / 60)}시간 ` : ''}
                        {Math.floor((automationStats.time_saved_minutes || 0) % 60)}분
                      </div>
                      <p className="text-indigo-800 font-medium whitespace-pre-wrap">
                        최근 30일 동안 총 <span className="font-bold text-indigo-900 border-b-2 border-indigo-300">{automationStats.total_activities}건</span>의 고객 문의를 자동으로 처리했습니다.
                      </p>
                    </div>

                    <div className="flex-1 w-full bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col gap-4">
                      <h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-2">주요 활성 채널</h4>
                      {(automationStats.event_distribution || []).slice(0, 3).map((item, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-gray-700">
                              {item.type === 'AI_CHAT_REPLY' ? 'AI 자동 상담' :
                                (item.type === 'STORY_REPLY' || item.type === 'MENTION_REPLY') ? '스토리 멘션 응대' :
                                  item.type === 'COMMENT_REPLY' ? '댓글 자동 DM' :
                                    item.type === 'DM_REPLY' ? 'DM 기본형 응대' :
                                      item.type === 'KEYWORD_REPLY' ? '키워드 자동답장' :
                                        item.type === 'FLOW_TRIGGER' ? '시나리오 챗봇' : item.type}
                            </span>
                            <span className="text-indigo-700">{item.count}건</span>
                          </div>
                          <div className="w-full bg-indigo-100/50 rounded-full h-2">
                            <div className="bg-indigo-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min((item.count / automationStats.total_activities) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {(automationStats.intent_distribution || []).length > 0 && (
                      <div className="flex-1 w-full bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-indigo-100 shadow-sm">
                        <h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4">고객 관심사 분석 (Top 3)</h4>
                        <div className="flex flex-col gap-3">
                          {(automationStats.intent_distribution || []).slice(0, 3).map((intent, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-600'}`}>
                                {idx + 1}
                              </div>
                              <span className="text-sm font-medium text-gray-800 truncate flex-1">{intent.intent}</span>
                              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full">{intent.count}건</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          ) : (
            <div className="bg-gray-50/50 rounded-[2.5rem] border border-gray-100 h-[240px] flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Bot className="w-6 h-6 text-indigo-300" />
              </div>
              <p className="text-gray-400 font-medium">자동화 성과를 불러오는 중...</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {sectionErrors.ig_insights ? (
          <div className="md:col-span-3">
            {renderDataError("인사이트 지표", () => {
              const cid = localStorage.getItem('customer_id');
              if (cid) loadIgInsights(cid);
            })}
          </div>
        ) : (
          <>
            <div className="group relative bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-pink-400 opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"></div>
              <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="group-hover:scale-110 transition-transform duration-300 flex justify-center items-center">
                  <img src="/assets/instagram-logo.svg" alt="Instagram" className="w-[52px] h-[52px] object-contain drop-shadow-sm" />
                </div>
                <p className="text-right text-[11px] font-bold text-gray-400 tracking-wide uppercase pt-1">총 팔로워</p>
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
                    {safeString((customerStatus?.instagram_account?.followers_count ?? igInsights?.followers_count)?.toLocaleString()) || '-'}
                  </h3>
                  <span className="text-sm font-bold text-gray-300">명</span>
                </div>
                <p className="text-[11px] font-semibold text-gray-400 mt-2 tracking-wide">Instagram 연동 데이터</p>
              </div>
            </div>

            <div className="group relative bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-rose-400 opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"></div>
              <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="p-3.5 rounded-2xl bg-white border border-gray-100 drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Heart className="w-6 h-6 text-rose-600" />
                </div>
                <p className="text-right text-[11px] font-bold text-gray-400 tracking-wide uppercase pt-1">평균 참여도</p>
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-1.5 mb-2">
                  <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
                    {avgEngagement.toLocaleString()}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 font-bold">
                  <span className="flex items-center gap-1.5" title="Average Likes">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-50" />
                    <span>좋아요 {Math.round(totalLikes / (recentPosts.length || 1))}</span>
                  </span>
                  <span className="w-px h-3 bg-gray-200"></span>
                  <span className="flex items-center gap-1.5" title="Average Comments">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500 fill-blue-50" />
                    <span>댓글 {Math.round(totalComments / (recentPosts.length || 1))}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="group relative bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-indigo-400 opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"></div>
              <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="p-3.5 rounded-2xl bg-white border border-gray-100 drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <ImageIcon className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-right text-[11px] font-bold text-gray-400 tracking-wide uppercase pt-1">총 미디어</p>
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
                    {safeString((customerStatus?.instagram_account?.media_count ?? igInsights?.media_count)?.toLocaleString()) || '-'}
                  </h3>
                  <span className="text-sm font-bold text-gray-300">개</span>
                </div>
                <p className="text-[11px] font-semibold text-gray-400 mt-2 tracking-wide">
                  최근 게시물 {recentPosts.length}개 기준 분석
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="mb-8 overflow-hidden rounded-[2.5rem]">
        <Card className="bg-gradient-to-br from-white via-indigo-50/10 to-white rounded-[2.5rem] border border-indigo-100 shadow-sm overflow-hidden relative min-h-[400px] flex flex-col transition-all duration-500">
          <div className="absolute -left-20 -top-20 w-64 h-64 rounded-full bg-emerald-400 opacity-[0.05] blur-3xl pointer-events-none"></div>
          <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-rose-400 opacity-[0.05] blur-3xl pointer-events-none"></div>
          <div className="absolute left-1/2 -bottom-20 w-64 h-64 rounded-full bg-indigo-400 opacity-[0.05] blur-3xl pointer-events-none -translate-x-1/2"></div>
          {isAiPremiumLocked && (
            <div className="absolute inset-0 z-20 backdrop-blur-3xl bg-white/60 flex flex-col items-center justify-center rounded-[2.5rem]">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-indigo-100 flex flex-col items-center text-center max-w-md mx-4 group hover:scale-[1.02] transition-transform">
                <div className="relative w-20 h-20 mb-6 flex justify-center items-center animate-gentle-bounce">
                  <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-full flex items-center justify-center shadow-inner ring-4 ring-indigo-50">
                    <Lock className="w-8 h-8 text-indigo-50" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">AI 댓글 분석 요약 (AI 요금제)</h3>
                <p className="text-sm font-bold text-gray-500 mb-8 leading-relaxed">경쟁 계정 분석부터 시의적절한 업로드 주기까지, 인공지능이 도출한 완벽한 성장 전략을 받아보세요.</p>
                <Button onClick={() => setCurrentView('subscription')} className="w-full bg-indigo-600 border border-indigo-500 text-white rounded-[2rem] h-14 font-black text-base shadow-[0_15px_30px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(79,70,229,0.6)] active:scale-95 transition-all">
                  리포트 잠금 해제하기
                </Button>
              </div>
            </div>
          )}

          <CardHeader className="border-b border-indigo-100/50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-black flex items-center gap-2 text-indigo-900">
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">AI 콘텐츠 마케팅 전략</span>
              </CardTitle>
              <Badge variant="outline" className="bg-indigo-600 text-white border-none px-3 py-1 font-bold shadow-sm shadow-indigo-300">
                AI Premium 요약 리포트
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-8 flex-1 flex flex-col">
            {sectionErrors.insights ? (
              renderDataError("AI 리포트", () => {
                const cid = localStorage.getItem('customer_id');
                if (cid) {
                  loadAiInsights(cid);
                  loadPerformanceReport(cid);
                }
              })
            ) : performanceReportLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                </div>
                <h4 className="text-lg font-bold text-indigo-900 mb-1">AI가 데이터를 분석 중입니다</h4>
                <p className="text-sm text-indigo-600/70">최근 게시물의 성과를 바탕으로 최적의 전략을 도출하고 있습니다...</p>
              </div>
            ) : performanceReport?.error ? (
              <div className="py-12 text-center bg-white/50 rounded-[2rem] border-2 border-dashed border-indigo-100 mx-4">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Sparkles className="w-8 h-8 text-indigo-300" />
                </div>
                <h4 className="text-lg font-black text-indigo-900 mb-2">AI 분석 리포트 생성 실패</h4>
                <p className="text-gray-500 text-sm max-w-sm mx-auto whitespace-pre-wrap font-medium mb-8 leading-relaxed">
                  {performanceReport.error}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center px-6">
                  <Button
                    onClick={() => {
                      const cid = localStorage.getItem('customer_id');
                      if (cid) loadPerformanceReport(cid, true);
                    }}
                    className="bg-indigo-600 text-white rounded-xl h-11 px-8 font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${performanceReportLoading ? 'animate-spin' : ''}`} />
                    다시 시도하기
                  </Button>

                  {performanceReport.isLimitReached && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentView('subscription')}
                      className="rounded-xl h-11 px-6 font-bold border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                    >
                      내 요금제 한도 확인
                    </Button>
                  )}
                </div>
              </div>
            ) : performanceReport ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {(performanceReport?.stale || performanceReport?.access_restricted) && (
                  <div className="lg:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between shadow-sm mb-2">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-900">이전 분석 리포트 표시 중 (한도 초과)</p>
                        <p className="text-xs text-amber-600/70 font-medium">{performanceReport.upgrade_message || '새로고침하려면 요금제 업그레이드가 필요합니다.'}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-amber-200 text-amber-600 font-bold bg-white hover:bg-amber-50"
                      onClick={() => setCurrentView('subscription')}
                    >
                      업그레이드
                    </Button>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-2">성과 요약</h4>
                    <p className="text-xl font-bold text-gray-900 leading-tight">
                      {safeString(performanceReport.summary)}
                    </p>
                    <p className="mt-4 text-gray-600 leading-relaxed">
                      {safeString(performanceReport.analysis)}
                    </p>
                  </div>

                  {performanceReport.best_post && (
                    <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-indigo-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">🏆 Best Post</Badge>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mb-2 truncate italic">
                        "{safeString(performanceReport.best_post.caption)}"
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed font-medium">
                        {safeString(performanceReport.best_post.reason)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-indigo-900/5 p-6 rounded-3xl border border-indigo-100/50">
                  <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    향후 제언 및 전략
                  </h4>
                  <div className="space-y-4">
                    {performanceReport.strategy?.map((s, idx) => (
                      <div key={idx} className="flex gap-4 group">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700 leading-relaxed group-hover:text-indigo-900 transition-colors">
                            {s.replace(/\*\*/g, '').replace(/^[\d\s\.]+/g, '').trim()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center bg-white/50 rounded-xl border border-dashed border-indigo-200">
                <p className="text-indigo-600 font-medium">상단의 '지표 새로고침'을 눌러 AI 분석 리포트를 생성해 보세요!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 mb-8">
        <Card className="border border-gray-100 shadow-sm bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="border-b border-gray-100 py-5 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                최근 게시물 성과
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-900"
                onClick={() => {
                  if (isPremiumFeatureLocked) {
                    showPremiumLockToast('프리미엄 요금제로 연장해야 지표를 업데이트할 수 있습니다.');
                    return;
                  }
                  loadIgInsights(customerId);
                }}
                disabled={igInsightsLoading}
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                {igInsightsLoading ? '업데이트 중...' : '최근 업데이트'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {igInsightsLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : recentPosts.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {recentPosts.map((post, idx) => {
                  const maxEngagement = Math.max(...recentPosts.map(p => (p.like_count || 0) + (p.comments_count || 0)));
                  const currentEngagement = (post.like_count || 0) + (post.comments_count || 0);
                  const widthPercent = maxEngagement > 0 ? (currentEngagement / maxEngagement) * 100 : 0;

                  return (
                    <div key={idx} className="p-4 px-6 hover:bg-gray-50/50 transition-colors flex items-center gap-6 group">
                      <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        {post.thumbnail_url || post.media_url ? (
                          <img src={post.thumbnail_url || post.media_url} alt="Post" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 grid grid-cols-12 gap-8 items-center">
                        <div className="col-span-12 md:col-span-5">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors mb-1">
                            {post.message || post.caption || '캡션 없음'}
                          </p>
                          <p className="text-[11px] text-gray-500 font-semibold font-mono">
                            {post.timestamp ? new Date(post.timestamp).toLocaleDateString() : '날짜 정보 없음'}
                          </p>
                        </div>

                        <div className="col-span-12 md:col-span-4 flex items-center gap-6">
                          <div className="flex items-center gap-2 min-w-[60px]">
                            <Heart className="w-4 h-4 text-gray-400 group-hover:text-rose-500 transition-colors" />
                            <span className="text-sm font-medium text-gray-700">{post.like_count}</span>
                          </div>
                          <div className="flex items-center gap-2 min-w-[60px]">
                            <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            <span className="text-sm font-medium text-gray-700">{post.comments_count}</span>
                          </div>
                          <div className="flex items-center gap-2 min-w-[70px] border-l border-gray-100 pl-4 ml-2">
                            <Users className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                            <span className="text-sm font-medium text-gray-700">{post.reach?.toLocaleString() || 0}</span>
                          </div>
                        </div>

                        <div className="col-span-12 md:col-span-3 hidden md:block">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] text-gray-400 font-bold w-12 text-right">
                              {post.reach > 0
                                ? Math.min((currentEngagement / post.reach) * 100, 100).toFixed(1) + '%'
                                : (igInsights?.followers_count > 0
                                  ? Math.min((currentEngagement / igInsights.followers_count) * 100, 100).toFixed(1) + '%'
                                  : '0.0%')}
                            </span>
                            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
                              <div
                                className="h-full bg-indigo-500 rounded-full opacity-80"
                                style={{
                                  width: `${Math.min(
                                    post.reach > 0
                                      ? (currentEngagement / post.reach) * 100
                                      : (igInsights?.followers_count > 0
                                        ? (currentEngagement / igInsights.followers_count) * 100
                                        : 0),
                                    100
                                  )}%`
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 uppercase font-bold ml-1">Reach ER</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3">
                  <BarChart3 className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">분석할 최근 게시물이 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default InsightsView;

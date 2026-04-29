import React from 'react';
import {
  ArrowLeft,
  Bookmark,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Eye,
  HelpCircle,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  Lock,
  Meh,
  MessageSquare,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';

const CommentsView = ({
  igInsights,
  analysisSelectedPostId,
  setAnalysisSelectedPostId,
  sectionErrors,
  renderDataError,
  loadIgComments,
  customerId,
  igComments,
  igCommentsLoading,
  selectedPost,
  setSelectedPost,
  setCurrentView,
  isAiPremiumLocked,
  isPremiumFeatureLocked,
  showPremiumLockToast,
  loadRecentPostsForAnalysis,
  loadIgInsights,
  igInsightsLoading,
  analyzePost,
  analysisLoading,
  analysisResult,
  analysisMediaIndex,
  setAnalysisMediaIndex,
  analysisFilterCategory,
  setAnalysisFilterCategory,
  analysisSearchTerm,
  setAnalysisSearchTerm,
}) => {
  const recentPosts = igInsights?.recent_media || [];

  // Shared header for all states in this tab
  const mainHeader = (
    <div className="mb-12 w-full relative">
      {analysisSelectedPostId && (
        <Button
          variant="ghost"
          onClick={() => setAnalysisSelectedPostId(null)}
          className="md:absolute left-0 top-0 mb-4 md:mb-0 hover:bg-gray-100 text-gray-600 font-bold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          목록으로 돌아가기
        </Button>
      )}
      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-3">
          댓글 분석 요약
        </h1>
        <p className="text-gray-500 font-bold">인스타그램 게시물의 댓글 반응을 AI가 실시간으로 분석합니다.</p>
      </div>
    </div>
  );

  let content = null;

  // 0. Error State (Shield Logic)
  if (sectionErrors.comments) {
    content = renderDataError("게시물 목록", () => {
      const cid = localStorage.getItem('customer_id');
      if (cid) loadRecentPostsForAnalysis(cid);
    });
  }
  // 1. Loading State (Initial Fetching - NEW TABLE SKELETON)
  else if (igInsightsLoading && recentPosts.length === 0) {
    content = (
      <div className="w-full bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">썸네일</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">캡션</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">게시 날짜 및 시간</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">좋아요</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">댓글</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">저장됨</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">공유</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">도달</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">조회수</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">반응</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap text-center">참여율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4 whitespace-nowrap"><div className="w-12 h-12 bg-gray-100 rounded-lg"></div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-100 rounded-full w-32"></div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-100 rounded-full w-24"></div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-gray-100 rounded-full w-10 mx-auto"></div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-gray-100 rounded-full w-10 mx-auto"></div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-gray-100 rounded-full w-10 mx-auto"></div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-gray-100 rounded-full w-10 mx-auto"></div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-gray-100 rounded-full w-16 mx-auto"></div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-gray-100 rounded-full w-16 mx-auto"></div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-6 bg-gray-100 rounded-full w-12 mx-auto"></div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-6 bg-gray-100 rounded-md w-16 mx-auto"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  // 2. Empty State (No posts found)
  else if (!igInsightsLoading && recentPosts.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center py-40 bg-gray-50/30 rounded-[3rem] border-2 border-dashed border-gray-100/50">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
          <ImageIcon className="w-10 h-10 text-gray-200" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">게시물이 없습니다</h2>
        <p className="text-gray-500 font-bold">분석할 인스타그램 게시물이 아직 생성되지 않았습니다.</p>
        <Button
          onClick={() => {
            if (isPremiumFeatureLocked) {
              showPremiumLockToast('프리미엄 요금제로 연장해야 데이터를 업데이트할 수 있습니다.');
              return;
            }
            loadIgInsights(customerId);
          }}
          variant="outline"
          className="mt-6 rounded-2xl font-bold border-gray-200 hover:bg-gray-50 h-12 px-8"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>
    );
  }
  // 3. Selection Mode (Post List - NEW TABLE VIEW)
  else if (!analysisSelectedPostId) {
    content = (
      <div className="w-full bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">썸네일</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">캡션</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">게시 날짜 및 시간</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">좋아요</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">댓글</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">저장됨</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">공유</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">도달</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">조회수</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">반응</th>
                <th className="px-6 py-4 text-[13px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">참여율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentPosts.map((post) => {
                const reach = post.reach || post.impressions || 1; // Avoid division by zero
                const engagement = (post.like_count || 0) + (post.comments_count || 0) + (post.share_count || 0) + (post.save_count || 0);
                const engagementRate = Math.min((engagement / reach) * 100, 100).toFixed(2) + '%';

                return (
                  <tr
                    key={post.id}
                    className="hover:bg-purple-50/30 cursor-pointer transition-colors group relative"
                    onClick={() => {
                      if (isAiPremiumLocked) {
                        showPremiumLockToast('AI 댓글 분석은 AI PRO 요금제 전용 기능입니다.');
                        return;
                      }
                      analyzePost(post.id);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
                        {post.thumbnail_url || post.media_url ? (
                          <img
                            src={post.thumbnail_url || post.media_url}
                            alt="thumbnail"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <ImageIcon className="w-full h-full p-3 text-gray-300" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900 line-clamp-1 max-w-[250px]">
                        {post.message || post.caption || '(캡션 없음)'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-[13px] text-gray-500 font-medium whitespace-nowrap">
                        {post.timestamp ? new Date(post.timestamp).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-gray-900 flex items-center justify-center gap-1 whitespace-nowrap">
                        <Heart className="w-3 h-3 fill-gray-900 text-gray-900" />
                        {post.like_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-gray-900 flex items-center justify-center gap-1 whitespace-nowrap">
                        <MessageSquare className="w-3 h-3 fill-gray-900 text-gray-900" />
                        {post.comments_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-gray-900 flex items-center justify-center gap-1 whitespace-nowrap">
                        <Bookmark className="w-3 h-3 fill-gray-900 text-gray-900" />
                        {post.save_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[13px] font-bold text-gray-900 flex items-center justify-center gap-1 whitespace-nowrap">
                        <Share2 className="w-3 h-3 fill-gray-900 text-gray-900" />
                        {post.share_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-gray-700 whitespace-nowrap text-center">{post.reach || 0}</td>
                    <td className="px-6 py-4 text-[13px] font-bold text-gray-700 whitespace-nowrap text-center">{post.view_count || post.plays || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-[12px] font-black border border-purple-100 whitespace-nowrap">
                        {engagement}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[13px] font-black text-gray-900 bg-gray-50 px-2 py-1 rounded-md whitespace-nowrap">
                          {engagementRate}
                        </span>
                        {isAiPremiumLocked && (
                          <div className="w-5 h-5 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100" title="AI 요금제 전용">
                            <Lock className="w-3 h-3 text-indigo-400" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  // 4. Loading Individual Analysis
  else if (analysisLoading && !isAiPremiumLocked) {
    content = (
      <Card className="max-w-3xl mx-auto mt-12 border-none shadow-none bg-transparent">
        <CardContent className="text-center p-12">
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-8">
            <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-white rounded-full p-6 shadow-xl">
              <Sparkles className="w-10 h-10 text-purple-600 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            AI가 댓글을 분석 중입니다
          </h2>
          <p className="text-gray-500 font-bold">
            댓글의 감정, 긴급도, 주요 이슈를 파악하고 요약하고 있습니다...
          </p>
        </CardContent>
      </Card>
    );
  }
  // 5. Analysis Results
  else if (analysisResult) {
    const { post, analysis, comments } = analysisResult;
    if (analysisResult.error) {
      content = (
        <div className="p-12 bg-gray-50 rounded-[2.5rem] flex flex-col items-start text-left">
          <p className="text-red-500 mb-4 font-bold">{analysisResult.error}</p>
        </div>
      );
    } else {
      const cats = analysis?.categories || {};
      const totalAnalyzed = comments?.length || 0;
      content = (
        <div className="animate-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto relative overflow-hidden rounded-[2.5rem]">
          {/* Premium Lock Overlay for Detail View */}
          {isAiPremiumLocked && (
            <div className="absolute inset-0 z-50 backdrop-blur-3xl bg-white/60 flex flex-col items-center justify-center p-8 text-center rounded-[2.5rem]">
              <div className="max-w-md bg-white p-10 rounded-[3rem] shadow-2xl border border-indigo-100 flex flex-col items-center animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 relative">
                  <Sparkles className="w-10 h-10 text-indigo-600 animate-pulse" />
                  <Lock className="absolute -right-1 -bottom-1 w-8 h-8 text-indigo-400 bg-white rounded-full p-1.5 shadow-sm border border-indigo-50" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">AI 댓글 분석 요약 (AI 요금제)</h3>
                <p className="text-sm font-bold text-gray-500 mb-8 leading-relaxed">
                  AI가 모든 댓글을 실시간으로 분석하여 요약 리포트를 생성합니다.<br />
                  감정 분석부터 대응 우선순위까지 한눈에 확인해 보세요.
                </p>
                <Button onClick={() => setCurrentView('subscription')} className="w-full bg-indigo-600 text-white rounded-[2rem] h-14 font-black text-base shadow-[0_15px_30px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(79,70,229,0.6)] active:scale-95 transition-all">
                  AI 요금제로 업그레이드하기
                </Button>
              </div>
            </div>
          )}
          <div className={`transition-all duration-500 ${isAiPremiumLocked ? 'blur-md pointer-events-none opacity-40 select-none' : ''}`}>
            <Card className="mb-8 border border-gray-100 bg-white shadow-sm overflow-hidden rounded-[2.5rem]">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-80 bg-gray-50/30 p-6 flex flex-col justify-center items-center md:border-r border-gray-100">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden mb-4 shadow-sm bg-gray-100 relative group/carousel">
                    {post?.media_url ? (
                      <>
                        {/* Media Display */}
                        <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                          {post.children?.data?.length > 0 ? (
                            <img
                              src={post.children.data[analysisMediaIndex]?.thumbnail_url || post.children.data[analysisMediaIndex]?.media_url || post.thumbnail_url || post.media_url}
                              onError={(e) => { e.target.src = '/assets/instagram-logo.svg'; e.target.className = 'w-12 h-12 opacity-20 object-contain'; }}
                              alt={`Post content ${analysisMediaIndex + 1}`}
                              className="w-full h-full object-cover transition-all duration-500"
                            />
                          ) : (
                            <img
                              src={post.thumbnail_url || post.media_url || '/assets/instagram-logo.svg'}
                              onError={(e) => { e.target.src = '/assets/instagram-logo.svg'; e.target.className = 'w-12 h-12 opacity-20 object-contain'; }}
                              alt="Post content"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Navigation Controls */}
                        {post.children?.data?.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAnalysisMediaIndex(prev => (prev === 0 ? post.children.data.length - 1 : prev - 1));
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-700 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-white"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAnalysisMediaIndex(prev => (prev === post.children.data.length - 1 ? 0 : prev + 1));
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-700 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-white"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>

                            {/* Indicators */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/10 backdrop-blur-sm">
                              {post.children.data.map((_, idx) => (
                                <div
                                  key={idx}
                                  className={`w-1.5 h-1.5 rounded-full transition-all ${idx === analysisMediaIndex ? 'bg-white w-3' : 'bg-white/50'
                                    }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-gray-300" /></div>
                    )}
                  </div>
                  <div className="text-center w-full">
                    <div className="flex items-center justify-center gap-3.5 mb-4 py-2 border-b border-gray-50">
                      <div className="flex items-center gap-1.5 text-gray-900">
                        <Heart className="w-4 h-4 text-gray-900 fill-gray-900" />
                        <span className="text-sm font-bold">{post?.like_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-900">
                        <MessageSquare className="w-4 h-4 text-gray-900 fill-gray-900" />
                        <span className="text-sm font-bold">{post?.comments_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-900">
                        <Share2 className="w-4 h-4 text-gray-900 fill-gray-900" />
                        <span className="text-sm font-bold">{post?.share_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-900">
                        <Bookmark className="w-4 h-4 text-gray-900 fill-gray-900" />
                        <span className="text-sm font-bold">{post?.save_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-900">
                        <Eye className="w-4 h-4 text-gray-900" />
                        <span className="text-sm font-bold">{post?.view_count || post?.impressions || post?.reach || 0}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(post?.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex-1 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-black text-gray-900 uppercase">
                        AI 분석 리포트
                      </h2>
                      <button
                        onClick={() => analyzePost(post.id, true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm"
                        title="분석 결과 최신화"
                      >
                        <RefreshCw className={`w-3 h-3 ${analysisLoading ? 'animate-spin text-indigo-500' : ''}`} />
                        다시 분석
                      </button>
                    </div>
                    {analysis?.dominant_sentiment && (
                      <Badge className={`text-[10px] font-black px-3 py-1 rounded-full border-none shadow-sm ${analysis.dominant_sentiment === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700' :
                        analysis.dominant_sentiment === 'NEGATIVE' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                        {analysis.dominant_sentiment === 'POSITIVE' ? '긍정적 여론' :
                          analysis.dominant_sentiment === 'NEGATIVE' ? '부정적 여론' : '중립적 여론'}
                      </Badge>
                    )}
                  </div>

                  <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 mb-8">
                    <p className="text-gray-700 text-base leading-relaxed font-bold">
                      {analysis?.summary || '요약 정보를 생성하지 못했습니다.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { k: 'PRAISE', label: '칭찬', color: 'text-pink-600', bgColor: 'bg-pink-50 border-pink-100', icon: ThumbsUp, blob: 'bg-pink-400' },
                      { k: 'COMPLAINT', label: '불만', color: 'text-red-600', bgColor: 'bg-red-50 border-red-100', icon: ThumbsDown, blob: 'bg-red-400' },
                      { k: 'QUESTION', label: '문의', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-100', icon: HelpCircle, blob: 'bg-blue-400' },
                      { k: 'FEEDBACK', label: '피드백', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-100', icon: Lightbulb, blob: 'bg-amber-400' },
                      { k: 'NEUTRAL', label: '일반', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-100', icon: Meh, blob: 'bg-gray-400' },
                    ].map(cat => (
                      <div key={cat.k} className="group relative bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden h-28 flex flex-col justify-between">
                        <div className={`absolute -right-4 -top-4 w-12 h-12 rounded-full opacity-5 blur-xl group-hover:opacity-10 transition-opacity ${cat.blob}`}></div>
                        <div className="flex items-start justify-between relative z-10">
                          <div className={`p-2 rounded-lg ${cat.bgColor}`}>
                            <cat.icon className={`w-4 h-4 ${cat.color}`} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{cat.label}</span>
                        </div>
                        <div className="relative z-10">
                          <span className="text-2xl font-black text-gray-900">{cats[cat.k?.toLowerCase()] || cats[cat.k] || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 shrink-0">
                <MessageSquare className="w-5 h-5 text-indigo-500" />
                상세 댓글 분석 ({comments.filter(c => {
                  const catMatch = analysisFilterCategory === 'ALL' || (c.analysis?.category || 'NEUTRAL').toUpperCase() === analysisFilterCategory;
                  const searchLower = analysisSearchTerm.toLowerCase();
                  const searchMatch = !analysisSearchTerm ||
                    (c.text || '').toLowerCase().includes(searchLower) ||
                    (c.username || '').toLowerCase().includes(searchLower);
                  return catMatch && searchMatch;
                }).length})
              </h3>

              <div className="flex flex-col sm:flex-row gap-3 items-center flex-1 justify-end">
                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="댓글 또는 계정 검색..."
                    value={analysisSearchTerm}
                    onChange={(e) => setAnalysisSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold placeholder:text-gray-300 shadow-sm"
                  />
                  {analysisSearchTerm && (
                    <button
                      onClick={() => setAnalysisSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar shadow-inner">
                  {[
                    { id: 'ALL', label: '전체' },
                    { id: 'PRAISE', label: '칭찬' },
                    { id: 'COMPLAINT', label: '불만' },
                    { id: 'QUESTION', label: '문의' },
                    { id: 'FEEDBACK', label: '피드백' },
                    { id: 'NEUTRAL', label: '일반' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setAnalysisFilterCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap ${analysisFilterCategory === cat.id
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(() => {
                const filtered = comments.filter(c => {
                  const catMatch = analysisFilterCategory === 'ALL' || (c.analysis?.category || 'NEUTRAL').toUpperCase() === analysisFilterCategory;
                  const searchLower = analysisSearchTerm.toLowerCase();
                  const searchMatch = !analysisSearchTerm ||
                    (c.text || '').toLowerCase().includes(searchLower) ||
                    (c.username || '').toLowerCase().includes(searchLower);
                  return catMatch && searchMatch;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-200/50 mt-4">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <MessageSquare className="w-8 h-8 text-gray-200" />
                      </div>
                      <p className="text-gray-500 font-black text-lg">해당하는 댓글이 없습니다</p>
                      <p className="text-gray-400 text-sm font-bold mt-1 text-center">검색어나 필터를 변경하거나<br />다시 확인해 보세요.</p>
                      {(analysisSearchTerm || analysisFilterCategory !== 'ALL') && (
                        <Button
                          variant="ghost"
                          className="mt-6 text-indigo-600 font-black hover:bg-indigo-50 rounded-xl h-11 px-6 border border-indigo-100"
                          onClick={() => {
                            setAnalysisFilterCategory('ALL');
                            setAnalysisSearchTerm('');
                          }}
                        >
                          필터 초기화
                        </Button>
                      )}
                    </div>
                  );
                }

                return filtered.map((c) => {
                  const commentAnalysis = c.analysis || {};
                  return (
                    <Card key={c.id} className={`hover:shadow-lg transition-all duration-300 border-l-4 rounded-2xl ${commentAnalysis.urgency === 'HIGH' ? 'border-l-red-500 bg-red-50/30' : 'border-l-gray-300 bg-white'}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`flex items-center justify-center w-12 h-12 rounded-xl border flex-shrink-0 shadow-sm ${commentAnalysis.category === 'PRAISE' ? 'bg-pink-50 border-pink-100 text-pink-600' :
                            commentAnalysis.category === 'COMPLAINT' ? 'bg-red-50 border-red-100 text-red-600' :
                              commentAnalysis.category === 'QUESTION' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                commentAnalysis.category === 'FEEDBACK' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                  'bg-gray-50 border-gray-100 text-gray-400'
                            }`}>
                            {commentAnalysis.category === 'PRAISE' ? <ThumbsUp className="w-5 h-5" /> :
                              commentAnalysis.category === 'COMPLAINT' ? <ThumbsDown className="w-5 h-5" /> :
                                commentAnalysis.category === 'QUESTION' ? <HelpCircle className="w-5 h-5" /> :
                                  commentAnalysis.category === 'FEEDBACK' ? <Lightbulb className="w-5 h-5" /> :
                                    <Meh className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-gray-900">@{c.username || '익명'}</span>
                                <span className="text-[10px] text-gray-400 font-bold">{new Date(c.timestamp).toLocaleDateString()}</span>
                              </div>
                              <div className="flex gap-2">
                                {commentAnalysis.urgency === 'HIGH' && <Badge className="bg-red-500 text-white animate-pulse border-none rounded-full px-3 py-0.5 text-[10px] font-black">긴급</Badge>}
                                {commentAnalysis.category === 'question' && <Badge className="bg-indigo-600 text-white border-none rounded-full px-3 py-0.5 text-[10px] font-black">답변 필요</Badge>}
                              </div>
                            </div>
                            <p className="text-gray-700 mb-3 text-sm font-bold leading-relaxed">{c.text}</p>
                            <div className="bg-gray-50/80 rounded-xl p-3 text-xs border border-gray-100 flex items-start gap-2 shadow-inner">
                              <Sparkles className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                              <p className="text-gray-600 font-medium"><strong className="text-purple-700 mr-2">AI Insight</strong> {commentAnalysis.summary || '상세 분석을 생성하지 못했습니다.'}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      {mainHeader}
      {content}
    </div>
  );
};

export default CommentsView;

import React from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Instagram,
  Lightbulb,
  Loader2,
  Lock,
  MessageCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';

const DashboardMainView = ({
  dashboardStats,
  customerStatus,
  conversations,
  safeString,
  basicSummary,
  activities,
  setBasicKpiDetail,
  setShowBasicKpiDetailModal,
  flows,
  keywordReplies,
  dashboardSearchTerm,
  activitySearchTerm,
  setDashboardViewFilter,
  dashboardViewFilter,
  sectionErrors,
  renderDataError,
  loadDashboardStats,
  loadAiInsights,
  loadAutomationStats,
  loadActivities,
  loadConversations,
  loadPageInsights,
  loadIgInsights,
  loadSubscriptionStatus,
  isPremiumFeatureLocked,
  showPremiumLockToast,
  showNotify,
  igInsightsLoading,
  basicSummaryLoading,
  activityTypeFilter,
  setActivityTypeFilter,
  setDashboardSearchTerm,
  setActivitySearchTerm,
  activitiesLoading,
  aiInsights,
  aiInsightsLoading,
  isAiPremiumLocked,
  setCurrentView,
  customerId,
}) => {
  // 1. Calculate Active Metrics
  const activeCampaignCount = dashboardStats?.active_automations || 0;
  const totalContacts = dashboardStats?.total_contacts || 0;
  const totalAiReplies = dashboardStats?.total_ai_replies || 0;
  const totalFlowTriggers = dashboardStats?.total_flow_triggers || 0;
  // Use followers_count from customerStatus.instagram_account instead of separate API call
  const totalFollowers = customerStatus?.instagram_account?.followers_count?.toLocaleString() || '-';

  // 2. Recent Message Stats (Last 24h)
  const now = new Date().getTime();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const recentMessages = conversations.filter(c => {
    const t = c.latest_message?.created_time ? new Date(c.latest_message.created_time).getTime() : 0;
    return t > oneDayAgo;
  });
  const recentMessageCount = recentMessages.length;

  // 3. Urgent Items (Unread DM or #응대필요 tagged contacts)
  const urgentConversations = conversations.filter(c =>
    (c.unread_count && c.unread_count > 0) ||
    (c.contact?.tags?.includes('응대필요'))
  ).slice(0, 4);

  const statsCards = [
    {
      title: 'AI 자동응답',
      value: safeString(totalAiReplies.toLocaleString()),
      subtitle: totalAiReplies > 0 ? '누적 자동 처리' : '대화가 시작되면 집계됩니다',
      unit: '건',
      renderIcon: (
        <div className="w-[52px] h-[52px] bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50 ring-1 ring-indigo-500/20">
          <span className="text-white font-black text-xl tracking-tight leading-none">AI</span>
        </div>
      ),
      noBg: true,
      icon: Sparkles,
      color: 'text-indigo-600',
      blobColor: 'bg-indigo-400',
      bgColor: 'bg-white border border-gray-100 drop-shadow-sm'
    },
    {
      title: '인스타 팔로워',
      value: safeString(totalFollowers),
      subtitle: 'Instagram 연동 데이터',
      icon: Instagram,
      imageUrl: '/assets/instagram-logo.svg',
      imageClassName: 'w-[52px] h-[52px] object-contain drop-shadow-sm',
      noBg: true,
      color: 'text-pink-600',
      blobColor: 'bg-pink-400',
      bgColor: 'bg-pink-50 border border-pink-100'
    },
    {
      title: '종합 누적 고객',
      value: safeString(totalContacts.toLocaleString()),
      subtitle: totalContacts > 0 ? 'CRM 등록 고객' : '고객 데이터 수집 중',
      unit: '명',
      icon: Users,
      color: 'text-emerald-600',
      blobColor: 'bg-emerald-400',
      bgColor: 'bg-white border border-gray-100'
    },
    {
      title: '24h 유입 문의',
      value: safeString(recentMessageCount.toLocaleString()),
      subtitle: recentMessageCount > 0 ? '최근 24시간 기준' : '새로운 문의 대기 중',
      unit: '건',
      icon: MessageCircle,
      color: 'text-blue-600',
      blobColor: 'bg-blue-400',
      bgColor: 'bg-white border border-gray-100'
    },
  ];

  const todayAutomated = basicSummary?.today_automated || 0;
  const todayFailed = basicSummary?.today_failed || 0;
  const last7 = Array.isArray(basicSummary?.last7_daily_automated) ? basicSummary.last7_daily_automated : [];
  const topPosts = Array.isArray(basicSummary?.top_posts) ? basicSummary.top_posts : [];
  const last7Total = last7.reduce((a, b) => a + (Number(b) || 0), 0);
  const last7Avg = Math.round((last7Total / Math.max(1, last7.length || 7)) * 10) / 10;
  const max7 = Math.max(1, ...last7.map(v => Number(v) || 0));

  const basicCards = [
    {
      title: '오늘 자동 처리',
      value: safeString(todayAutomated.toLocaleString()),
      subtitle: '시나리오/키워드/AI 응답',
      unit: '건',
      icon: Zap,
      color: 'text-gray-800',
      blobColor: 'bg-gray-100',
      bgColor: 'bg-white border border-gray-100',
      onClick: () => {
        const typeDistribution = [
          { label: '시나리오 기반', count: activities.filter(a => a.event_type === 'FLOW_TRIGGER').length },
          { label: 'AI 스마트 응답', count: activities.filter(a => ['AI_CHAT_REPLY', 'AI_COMMENT_REPLY'].includes(a.event_type)).length },
          { label: '키워드 매칭 (기본)', count: activities.filter(a => a.event_type !== 'FLOW_TRIGGER' && !['AI_CHAT_REPLY', 'AI_COMMENT_REPLY'].includes(a.event_type)).length },
        ].sort((a,b) => b.count - a.count);

        setBasicKpiDetail({
          type: 'today-automated',
          title: '오늘 자동 처리 인사이트',
          rows: typeDistribution,
          total: todayAutomated,
          failed: todayFailed
        });
        setShowBasicKpiDetailModal(true);
      }
    },
    {
      title: '활성 자동화 개수',
      value: safeString(activeCampaignCount.toLocaleString()),
      subtitle: activeCampaignCount > 0 ? '현재 실행 중인 자동화' : '활성화된 자동화가 없습니다',
      unit: '개',
      icon: Workflow,
      color: 'text-emerald-600',
      blobColor: 'bg-emerald-400',
      bgColor: 'bg-white border border-gray-100',
      onClick: () => {
        const activeFlowItems = [
          ...flows.filter(f => f.is_active).map(f => {
            const source = f.trigger_source || 'all';
            const channelLabel = source === 'comment'
              ? '댓글'
              : source === 'dm'
                ? 'DM'
                : source === 'story_mention'
                  ? '스토리'
                  : '전체';
            const triggerLabel = source === 'story_mention'
              ? '스토리 @태그'
              : (f.trigger_config?.keyword || '복합 조건');
            return {
              id: f.id,
              name: f.name || '이름 없는 플로우',
              kind: '시나리오',
              trigger: triggerLabel,
              channel: channelLabel,
              target: '전체',
              source: source,
              updatedAt: f.updated_at || f.created_at,
              triggerCount: f.trigger_count || 0
            };
          }),
          ...keywordReplies.filter(r => r.is_active).map(r => {
            const mediaIds = [
              ...(Array.isArray(r.media_ids) ? r.media_ids : []),
              ...(r.media_id ? [r.media_id] : []),
            ].filter(Boolean);
            const targetLabel = mediaIds.length > 0 ? `${mediaIds.length}개 게시물` : '모든 게시물';
            return {
              id: r.id,
              name: r.keyword ? `${r.keyword} 자동 응답` : '초간편 자동화',
              kind: '키워드',
              trigger: r.keyword || '키워드 미설정',
              channel: '댓글/DM',
              target: targetLabel,
              source: 'keyword',
              updatedAt: r.updated_at || r.created_at,
              triggerCount: r.trigger_count || 0
            };
          }),
        ];
        setBasicKpiDetail({
          type: 'active-automation',
          title: '활성 자동화 상세 현황',
          rows: activeFlowItems
        });
        setShowBasicKpiDetailModal(true);
      }
    },
    {
      title: '게시물 TOP3',
      value: safeString(Math.min(topPosts.length || 0, 3).toString()),
      subtitle: topPosts.length > 0 ? '최근 게시물 기준 (좋아요+댓글)' : '데이터 준비 중',
      unit: 'TOP',
      renderIcon: (
        <div className="flex items-center -space-x-3">
          {(topPosts || []).slice(0, 3).map((p, idx) => (
            <div
              key={p.id || idx}
              className="w-[52px] h-[52px] rounded-2xl overflow-hidden border-2 border-white shadow-sm bg-gradient-to-br from-pink-50 to-rose-50"
              style={{ zIndex: 10 - idx }}
            >
              {(p.thumbnail_url || p.media_url) ? (
                <img src={p.thumbnail_url || p.media_url} alt="top post" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-pink-300/70" />
                </div>
              )}
            </div>
          ))}
          {topPosts.length === 0 && (
            <div className="w-[52px] h-[52px] rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center shadow-inner">
              <ImageIcon className="w-6 h-6 text-pink-400" />
            </div>
          )}
        </div>
      ),
      noBg: true,
      icon: ImageIcon,
      color: 'text-pink-600',
      blobColor: 'bg-pink-400',
      bgColor: 'bg-white border border-gray-100',
      onClick: () => {
        setBasicKpiDetail({
          type: 'top-posts',
          title: '게시물 TOP3',
          rows: topPosts
        });
        setShowBasicKpiDetailModal(true);
      }
    },
    {
      title: '최근 7일 추이',
      value: safeString(last7Total.toLocaleString()),
      subtitle: (() => {
        if (last7Total === 0) return '데이터가 쌓이면 추이가 표시됩니다';
        const todayCount = Number(last7[6]) || 0;
        const yesterdayCount = Number(last7[5]) || 0;
        if (todayCount > yesterdayCount && yesterdayCount > 0) {
          const growth = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
          return `어제보다 ${growth}% 더 많이 소통했어요 🚀`;
        } else if (todayCount > 0) {
           return `오늘만 ${todayCount}건 즉시 처리 완료 ✨`;
        }
        return `일평균 ${last7Avg}건의 일을 대신하고 있어요`;
      })(),
      unit: '건',
      icon: TrendingUp,
      color: 'text-violet-600',
      blobColor: 'bg-violet-400',
      bgColor: 'bg-white border border-gray-100',
      onClick: () => {
        const trendRows = (last7.length ? last7 : Array.from({ length: 7 }).map(() => 0)).map((v, idx) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - idx));
          return {
            dateLabel: d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
            count: Number(v) || 0
          };
        });
        setBasicKpiDetail({
          type: 'last7-trend',
          title: '최근 7일 자동 처리 추이',
          rows: trendRows
        });
        setShowBasicKpiDetailModal(true);
      }
    }
  ];

  const filteredActivities = activities.filter(a => {
    if (a.event_type === 'HUMAN_INTERVENTION_NEEDED') return false;

    // Search Match
    const searchLower = dashboardSearchTerm.toLowerCase();
    const activitySearchLower = activitySearchTerm.toLowerCase();

    const globalSearchMatch = !dashboardSearchTerm || (a.contact_username || '').toLowerCase().includes(searchLower);
    const specificSearchMatch = !activitySearchTerm ||
      (a.contact_username || '').toLowerCase().includes(activitySearchLower) ||
      (a.action_text || '').toLowerCase().includes(activitySearchLower);

    if (!globalSearchMatch || !specificSearchMatch) return false;

    // Type Match
    let typeMatch = true;
    if (activityTypeFilter === 'SCENARIO') {
      typeMatch = a.event_type === 'FLOW_TRIGGER';
    } else if (activityTypeFilter === 'AI') {
      typeMatch = a.event_type === 'AI_CHAT_REPLY' || a.event_type === 'AI_COMMENT_REPLY';
    } else if (activityTypeFilter === 'KEYWORD') {
      typeMatch = !['FLOW_TRIGGER', 'AI_CHAT_REPLY', 'AI_COMMENT_REPLY'].includes(a.event_type);
    }

    return typeMatch;
  });

  const filteredOpportunities = (aiInsights?.opportunities || []).filter(opp => {
    const searchLower = dashboardSearchTerm.toLowerCase();
    return !dashboardSearchTerm || (opp.username || '').toLowerCase().includes(searchLower);
  });

  return (
    <>
      {/* Header */}
      <div className="mb-12 relative flex flex-col items-center justify-center text-center border-b border-gray-100 pb-10 w-full mx-auto gap-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">
            종합 대시보드
          </h1>
          <p className="text-gray-400 font-bold text-sm">실시간 현황 & AI 요약</p>
        </div>

        <div className="md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2 flex items-center gap-4 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100 shrink-0">
          <div className="text-right px-3 hidden md:block">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Last Synced</div>
            <div className="text-xs font-black text-gray-900">{new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <Button
            variant="white"
            onClick={() => {
              if (isPremiumFeatureLocked) {
                showPremiumLockToast('프리미엄 요금제로 연장해야 데이터를 동기화할 수 있습니다.');
                return;
              }
              const cid = localStorage.getItem('customer_id');
              if (cid) {
                showNotify('전체 데이터를 동기화합니다...', 'info');
                loadDashboardStats(cid);
                loadAiInsights(cid);
                loadAutomationStats(cid);
                loadActivities(cid);
                loadConversations();
                loadPageInsights(cid);
                loadIgInsights(cid);
                loadSubscriptionStatus();
              }
            }}
            className="rounded-xl bg-white border border-gray-200 text-gray-900 font-bold h-11 px-5 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm flex items-center gap-2 group"
          >
            <RefreshCw className={`w-4 h-4 transition-transform group-hover:rotate-180 duration-500 ${igInsightsLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm">데이터 동기화</span>
          </Button>
        </div>
      </div>

      {/* Basic KPI Summary (Main) */}
      <div className="mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {basicCards.map((stat, index) => (
            <div
              key={index}
              className={`group relative bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ${basicSummaryLoading ? 'animate-pulse' : ''} ${stat.onClick ? 'cursor-pointer' : ''}`}
              onClick={stat.onClick}
            >
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity ${stat.blobColor || 'bg-indigo-400'}`}></div>

              <div className="flex items-start justify-between mb-5 relative z-10">
                <div className={`${stat.noBg ? '' : `p-3.5 rounded-2xl ${stat.bgColor}`} group-hover:scale-110 transition-transform duration-300 flex justify-center items-center`}>
                  {stat.renderIcon ? (
                    stat.renderIcon
                  ) : stat.imageUrl ? (
                    <img src={stat.imageUrl} alt={stat.title} className={stat.imageClassName || "w-6 h-6 rounded-full object-cover ring-2 ring-white shadow-sm"} />
                  ) : (
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  )}
                </div>
                <p className="text-right text-sm font-bold text-gray-400 tracking-wide uppercase text-[11px] pt-1">{stat.title}</p>
              </div>

              <div className="relative z-10">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{basicSummaryLoading ? '...' : stat.value}</h3>
                  {stat.unit && <span className="text-sm font-bold text-gray-400">{stat.unit}</span>}
                </div>
                {stat.subtitle && (
                  <p className="text-[11px] font-semibold text-gray-400 mt-2 tracking-wide min-h-[32px] leading-relaxed">{basicSummaryLoading ? '집계 데이터를 불러오는 중입니다' : stat.subtitle}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 bg-white/50 backdrop-blur-xl p-2 rounded-[2.5rem] border border-gray-100 shadow-sm sticky top-20 z-30">
        <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-2xl w-full md:w-auto">
          {[
            { id: 'TOTAL', label: '종합 현황' },
            { id: 'ACTIVITY', label: '자동화 활동' },
            { id: 'OPPORTUNITY', label: '비즈니스 기회' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDashboardViewFilter(tab.id)}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${dashboardViewFilter === tab.id
                ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100/50 translate-y-[-1px]'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="계정명(username) 검색..."
            value={dashboardSearchTerm}
            onChange={(e) => setDashboardSearchTerm(e.target.value)}
            className="w-full pl-11 pr-5 py-3.5 bg-gray-50 border border-transparent rounded-[1.5rem] text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/20 outline-none transition-all placeholder:text-gray-300"
          />
          {dashboardSearchTerm && (
            <button
              onClick={() => setDashboardSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards (Bento Grid Style) */}
      {dashboardViewFilter === 'TOTAL' && !dashboardSearchTerm && (
        <div className="mb-10">
          {sectionErrors.stats ? (
            renderDataError("통계", () => {
              const cid = localStorage.getItem('customer_id');
              if (cid) loadDashboardStats(cid);
            })
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsCards.map((stat, index) => (
                <div
                  key={index}
                  className="group relative bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  {/* Subtle Gradient Background Blob */}
                  <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity ${stat.blobColor || 'bg-indigo-400'}`}></div>

                  <div className="flex items-start justify-between mb-5 relative z-10">
                    <div className={`${stat.noBg ? '' : `p-3.5 rounded-2xl ${stat.bgColor}`} group-hover:scale-110 transition-transform duration-300 flex justify-center items-center`}>
                      {stat.renderIcon ? (
                        stat.renderIcon
                      ) : stat.imageUrl ? (
                        <img src={stat.imageUrl} alt={stat.title} className={stat.imageClassName || "w-6 h-6 rounded-full object-cover ring-2 ring-white shadow-sm"} />
                      ) : (
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      )}
                    </div>
                    <p className="text-right text-sm font-bold text-gray-400 tracking-wide uppercase text-[11px] pt-1">{stat.title}</p>
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-baseline gap-1.5">
                      <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{stat.value}</h3>
                      {stat.unit && <span className="text-sm font-bold text-gray-300">{stat.unit}</span>}
                    </div>
                    {stat.subtitle && (
                      <p className="text-[11px] font-semibold text-gray-400 mt-2 tracking-wide">{stat.subtitle}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Insights & Activity Sections */}
      <div className="space-y-6 mb-8">


        {(dashboardViewFilter === 'TOTAL' || dashboardViewFilter === 'ACTIVITY') && (
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                실시간 자동화 활동 ({filteredActivities.length})
              </h3>

              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl self-start sm:self-auto border border-gray-100">
                {[
                  { id: 'ALL', label: '전체' },
                  { id: 'SCENARIO', label: '시나리오' },
                  { id: 'KEYWORD', label: '키워드' },
                  { id: 'AI', label: 'AI 응답' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActivityTypeFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${activityTypeFilter === cat.id
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 ml-auto sm:ml-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="아이디 또는 내용 검색..."
                    value={activitySearchTerm}
                    onChange={(e) => setActivitySearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-48 transition-all"
                  />
                  {activitySearchTerm && (
                    <button
                      onClick={() => setActivitySearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <Button
                  variant="white"
                  size="sm"
                  onClick={() => {
                    const storedCustomerId = localStorage.getItem('customer_id');
                    if (storedCustomerId) loadActivities(storedCustomerId);
                  }}
                  disabled={activitiesLoading}
                  className="rounded-xl bg-white border border-gray-200 text-gray-900 font-bold h-9 px-4 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm flex items-center gap-2 group"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${activitiesLoading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                  <span className="text-xs sm:inline hidden">새로고침</span>
                </Button>
              </div>
            </div>

            {/* Timeline Stream Style */}
            <div className="relative">
              {sectionErrors.activities ? (
                renderDataError("활동", () => {
                  const cid = localStorage.getItem('customer_id');
                  if (cid) loadActivities(cid);
                })
              ) : (
                /* Scrollable Container */
                <div className="p-0 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {activitiesLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                      <Loader2 className="w-8 h-8 mb-2 animate-spin text-indigo-500" />
                      <p className="text-sm">활동 내역을 불러오는 중...</p>
                    </div>
                  ) : filteredActivities.length > 0 ? (
                    <div className="relative">
                      {/* Timeline connector line */}
                      <div className="absolute left-[2.25rem] top-8 bottom-8 w-px bg-gradient-to-b from-gray-200 via-gray-100 to-transparent"></div>

                      <div className="space-y-0">
                        {filteredActivities
                          .map((activity) => (
                            <div key={activity.id} className="relative p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6 group">
                              {/* Timeline Dot & Icon */}
                              <div className={`
                                relative z-10 shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border-2 border-white ring-1 ring-gray-100
                                ${activity.event_type === 'AI_CHAT_REPLY' || activity.event_type === 'AI_COMMENT_REPLY' ? 'bg-indigo-50 text-indigo-600' :
                                  activity.event_type === 'FLOW_TRIGGER' ? 'bg-emerald-50 text-emerald-600' :
                                    'bg-blue-50 text-blue-600'}
                              `}>
                                {activity.event_type === 'AI_CHAT_REPLY' || activity.event_type === 'AI_COMMENT_REPLY' ? <Sparkles className="w-5 h-5" /> :
                                  activity.event_type === 'FLOW_TRIGGER' ? <Zap className="w-5 h-5" /> :
                                    <MessageSquareText className="w-5 h-5" />}
                              </div>

                              <div className="flex-1 min-w-0 pt-1">
                                <div className="flex justify-between items-start mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-gray-900">@{activity.contact_username || '고객'}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border-0 tracking-tight ${(activity.event_type === 'AI_CHAT_REPLY' || activity.event_type === 'AI_COMMENT_REPLY') ? 'bg-indigo-600 text-white' :
                                      activity.event_type === 'FLOW_TRIGGER' ? 'bg-emerald-500 text-white' :
                                        'bg-blue-500 text-white'
                                      }`}>
                                      {(activity.event_type === 'AI_CHAT_REPLY' || activity.event_type === 'AI_COMMENT_REPLY') ? 'AI 응답' :
                                        activity.event_type === 'FLOW_TRIGGER' ? '시나리오' :
                                          '키워드'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-medium tabular-nums">{new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                    수신: <span className="text-gray-700 font-medium truncate">{safeString(activity.trigger_text) || '(내용 없음)'}</span>
                                  </p>
                                  <p className="text-sm font-bold text-indigo-600 flex items-start gap-1">
                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                    <span>{safeString(activity.action_text)}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-gray-50/30">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Clock className="w-8 h-8 mb-2 text-gray-200" />
                        <p className="text-sm">{dashboardSearchTerm ? '검색 결과가 없습니다.' : '아직 기록된 자동화 활동이 없습니다.'}</p>
                        <p className="text-xs mt-1">{dashboardSearchTerm ? '계정명을 다시 확인해 주세요.' : '인스타그램 대화가 발생하면 이곳에 타임라인으로 표시됩니다.'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Missed Business Opportunities (AI) */}
        {(dashboardViewFilter === 'TOTAL' || dashboardViewFilter === 'OPPORTUNITY') && (
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden mb-8">
            {isAiPremiumLocked && (
              <div className="absolute inset-0 z-20 backdrop-blur-md bg-white/40 flex flex-col items-center justify-center rounded-[2.5rem] transition-all">
                <div className="bg-white/90 p-6 rounded-[2.5rem] shadow-2xl border border-indigo-50/50 flex flex-col items-center max-w-sm text-center mx-4 group hover:scale-[1.02] transition-transform">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-indigo-200 animate-gentle-bounce">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">놓친 비즈니스 기회 발굴</h3>
                  <p className="text-sm font-bold text-gray-500 mb-6">AI가 대화의 문맥을 분석하여 구매 전환 가능성이 높은 고객을 찾아냅니다.</p>
                  <Button onClick={() => setCurrentView('subscription')} className="w-full bg-gray-900 text-white rounded-2xl h-12 font-black text-sm shadow-xl shadow-gray-200 hover:bg-black active:scale-95 transition-all">
                    프리미엄 요금제 알아보기
                  </Button>
                </div>
              </div>
            )}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

            <div className="relative z-10 flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="bg-gray-900 rounded-lg p-1.5 border border-indigo-500/20">
                  <Lightbulb className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 tracking-tight">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">AI 기반</span> 놓친 비즈니스 기회 ({filteredOpportunities.length})
                </h2>
              </div>
              <Button
                variant="white"
                size="sm"
                onClick={() => { loadAiInsights(customerId); loadAutomationStats(customerId); }}
                disabled={aiInsightsLoading || isAiPremiumLocked}
                className="rounded-xl bg-white border border-gray-200 text-gray-900 font-bold h-9 px-4 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm flex items-center gap-2 group"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${aiInsightsLoading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                <span className="text-xs">새로고침</span>
              </Button>
            </div>

            {/* Smart Notification List Style */}
            <div className="relative min-h-[200px]">
              {sectionErrors.insights ? (
                renderDataError("비즈니스 기회", () => {
                  const cid = localStorage.getItem('customer_id');
                  if (cid) loadAiInsights(cid);
                })
              ) : aiInsightsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-sm text-indigo-600 font-bold animate-pulse">AI 분석 엔진 가동중...</p>
                </div>
              ) : (
                <>
                  {(aiInsights?.meta?.access_restricted || aiInsights?.upgrade_required) && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-amber-800 font-bold leading-tight">
                          이전 분석 결과 표시 중 (한도 초과)
                        </p>
                        <p className="text-[10px] text-amber-700/80 leading-tight">
                          {aiInsights?.meta?.reason || '새로운 인사이트를 보려면 요금제 상향이 필요합니다.'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] font-bold text-amber-700 hover:bg-amber-100 px-2"
                        onClick={() => setCurrentView('subscription')}
                      >
                        업그레이드
                      </Button>
                    </div>
                  )}

                  {filteredOpportunities.length > 0 ? (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {filteredOpportunities.map((opp, idx) => {
                        const rawUsername = String(opp.username || '');
                        const validHandles = rawUsername.match(/[a-zA-Z0-9][\w.]{0,28}[a-zA-Z0-9\w]/g)?.filter(u => u.length <= 30 && u.length >= 1) || [];
                        const displayReason = opp.reason && !opp.reason.includes('{') ? opp.reason : null;

                        return (
                          <div key={idx} className={`flex items-center gap-4 bg-white rounded-2xl px-5 py-4 border-l-4 shadow-sm hover:shadow-md transition-all duration-200 ${opp.type === 'SALES' ? 'border-l-emerald-400' : opp.type === 'URGENT' ? 'border-l-rose-400' : 'border-l-indigo-400'}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider ${opp.type === 'SALES' ? 'bg-emerald-100 text-emerald-700' : opp.type === 'URGENT' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                  {opp.type === 'SALES' ? 'SALES' : opp.type === 'URGENT' ? 'URGENT' : 'VIP'}
                                </span>
                                {validHandles.length > 0 ? validHandles.map((u, i) => (<span key={i} className="font-bold text-gray-900 text-sm">@{u}</span>)) : <span className="font-bold text-gray-400 text-sm">알 수 없는 사용자</span>}
                              </div>
                              {displayReason && <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{displayReason}</p>}
                            </div>
                            <a href={`https://instagram.com/direct/t/${opp.thread_id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all">답장하기 <ArrowRight className="w-3 h-3" /></a>
                          </div>
                        );
                      })}
                    </div>
                  ) : (aiInsights?.error && !aiInsights?.meta?.access_restricted) ? (
                    <div className="py-20 text-center bg-red-50/30 rounded-[2rem] border border-dashed border-red-100">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">분석 오류</h3>
                      <p className="text-gray-600 max-w-xs mx-auto leading-relaxed text-sm whitespace-pre-wrap">{aiInsights?.error}</p>
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 mb-4 shadow-inner ring-4 ring-white">
                        <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-black text-gray-900 mb-1.5">{dashboardSearchTerm ? '검색 결과가 없습니다' : '모든 기회를 잡았습니다!'}</h3>
                      <p className="text-gray-400 max-w-xs mx-auto leading-relaxed font-medium text-sm">
                        {dashboardSearchTerm ? '계정명을 다시 확인해 주세요.' : '놓치고 있는 중요한 대화가 없습니다.'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DashboardMainView;

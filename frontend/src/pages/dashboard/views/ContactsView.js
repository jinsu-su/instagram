import React from 'react';
import { ArrowRight, Filter, Loader2, Lock, RotateCw, Search, User } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import PremiumFeatureLock from '../PremiumFeatureLock';

const ContactsView = ({
  contacts,
  contactsSearch,
  setContactsSearch,
  activeSegment,
  setActiveSegment,
  filterTags,
  setFilterTags,
  filterEngagement,
  setFilterEngagement,
  isAiPremiumLocked,
  dashboardStats,
  setCurrentView,
  contactsLoading,
  selectedContact,
  setSelectedContact,
  showPremiumLockToast,
  loadContacts,
  customerId,
}) => {
  // 1. Filter Logic using real contact state
  const filteredContacts = (contacts || []).filter(c => {
    // Search text
    const matchesSearch = !contactsSearch ||
      (c.username?.toLowerCase().includes(contactsSearch.toLowerCase()) ||
        c.full_name?.toLowerCase().includes(contactsSearch.toLowerCase()) ||
        (c.instagram_id && c.instagram_id.includes(contactsSearch)));

    // AI Segments
    let matchesSegment = true;
    if (activeSegment === 'new') {
      // 최초 소통 인원: 최근 48시간 이내 생성된 컨택트
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      matchesSegment = new Date(c.created_at) >= twoDaysAgo;
    }
    if (activeSegment === 'review') {
      // 미응대/우선 검토: '응대필요' 태그가 있는 경우
      matchesSegment = c.tags?.includes('응대필요');
    }
    if (activeSegment === 'vip') {
      // VIP 오디언스: 참여도 80% 이상
      matchesSegment = (c.engagement_score || 0) >= 80;
    }
    if (activeSegment === 'casual') {
      matchesSegment = c.buying_phase === '일상소통';
    }
    if (activeSegment === 'inquiry') {
      matchesSegment = c.buying_phase === '정보/문의';
    }
    if (activeSegment === 'biz') {
      matchesSegment = c.buying_phase === '비즈니스';
    }

    // Tag Filter
    const matchesTags = filterTags.length === 0 || filterTags.every(t => c.tags?.includes(t));

    // Engagement Filter
    const matchesEngagement = (c.engagement_score || 0) >= filterEngagement;

    return matchesSearch && matchesSegment && matchesTags && matchesEngagement;
  });

  const allAvailableTags = Array.from(new Set((contacts || []).flatMap(c => c.tags || [])));

  return (
    <div className="space-y-6">
      <div className="mb-12 w-full flex flex-col items-center justify-center text-center space-y-4 relative">
        <div className="flex flex-col items-center">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2 text-center">
            고객 관리
          </h2>
          <p className="text-gray-500 font-medium text-center">실시간으로 소통 중인 고객들을 AI가 똑똑하게 분류해 드립니다.</p>
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => {
            if (isAiPremiumLocked) {
              showPremiumLockToast('고객 데이터 실시간 분석은 AI 요금제 전용 기능입니다.');
              return;
            }
            loadContacts(customerId);
          }}
          disabled={contactsLoading}
          className={`absolute right-0 top-0 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all active:scale-95 group overflow-hidden ${isAiPremiumLocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
        >
          <div className={`flex items-center gap-2 ${contactsLoading ? 'opacity-50' : ''}`}>
            {isAiPremiumLocked ? (
              <Lock className="w-4 h-4 text-gray-400" />
            ) : (
              <RotateCw className={`w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors ${contactsLoading ? 'animate-spin' : ''}`} />
            )}
            <span className="text-xs font-black text-gray-400 group-hover:text-indigo-600">
              {isAiPremiumLocked ? '데이터 분석 잠김' : '새로고침'}
            </span>
          </div>
        </button>
      </div>

      {/* Search Bar - Centered */}
      <div className="flex justify-center mb-10">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="고객 아이디, 이름 검색..."
            className="w-full pl-12 pr-6 py-4 bg-white border-2 border-gray-100 rounded-[1.5rem] text-base focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-semibold shadow-sm"
            value={contactsSearch}
            onChange={(e) => setContactsSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Audience Segments & Advanced Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-9 xl:col-span-9 border-gray-200 shadow-sm bg-white">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveSegment('all')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                전체 현황
              </button>
              <button
                onClick={() => setActiveSegment('new')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                최초 소통
              </button>
              <button
                onClick={() => setActiveSegment('vip')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'vip' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                핵심 오디언스 (VIP)
              </button>
              <button
                onClick={() => setActiveSegment('casual')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'casual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                일상 소통
              </button>
              <button
                onClick={() => setActiveSegment('inquiry')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'inquiry' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                정보 / 문의
              </button>
              <button
                onClick={() => setActiveSegment('biz')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'biz' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                비즈니스
              </button>
              <button
                onClick={() => setActiveSegment('review')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSegment === 'review' ? 'bg-rose-500 text-white shadow-md' : 'text-rose-400 hover:text-rose-500'}`}
              >
                미응대 / 우선 검토
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">참여도</span>
                <input
                  type="range"
                  min="0" max="100"
                  value={filterEngagement}
                  onChange={(e) => setFilterEngagement(parseInt(e.target.value))}
                  className="w-24 accent-gray-900"
                />
                <span className="text-xs font-bold text-gray-900 w-8">{filterEngagement}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 xl:col-span-3 border-gray-200 shadow-sm bg-white">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">필터링된 오디언스</p>
            <p className="text-2xl font-black text-gray-900">{isAiPremiumLocked ? (dashboardStats?.total_contacts || 0) : filteredContacts.length}<span className="text-xs text-gray-400 ml-1">명</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Tag Cloud Filter */}
      {allAvailableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">인기 태그:</span>
          {allAvailableTags.slice(0, 10).map(tag => (
            <button
              key={tag}
              onClick={() => {
                if (filterTags.includes(tag)) setFilterTags(filterTags.filter(t => t !== tag));
                else setFilterTags([...filterTags, tag]);
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${filterTags.includes(tag) ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
            >
              #{tag}
            </button>
          ))}
          {filterTags.length > 0 && (
            <button
              onClick={() => setFilterTags([])}
              className="text-[10px] font-bold text-red-500 hover:underline ml-2"
            >
              필터 초기화
            </button>
          )}
        </div>
      )}

      {isAiPremiumLocked ? (
        <div className="relative overflow-hidden">
          {/* Partial Blur for the background list structure */}
          <div className="opacity-20 blur-sm pointer-events-none select-none">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-12 gap-4 px-6 py-2 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
                <div className="col-span-4">오디언스 정보</div>
                <div className="col-span-3 text-center">소통 지수 / 누적 횟수</div>
                <div className="col-span-3 text-center">최근 소통일</div>
                <div className="col-span-2 text-right">상세 보기</div>
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 h-24"></div>
              ))}
            </div>
          </div>
          {/* The Lock Overlay Card */}
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
            <PremiumFeatureLock
              title="AI 고객 관리"
              description="AI가 고객의 성향을 분석하고 스마트하게 세그먼트를 관리합니다. AI 요금제로 업그레이드하고 정교한 고객 관리를 시작해 보세요."
              onUpgrade={() => setCurrentView('subscription')}
            />
          </div>
        </div>
      ) : contactsLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2 className="w-10 h-10 text-gray-900 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">고객 데이터를 분석하며 불러오고 있습니다...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-gray-200 border-dashed text-center p-12">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 mx-auto">
            <Filter className="w-10 h-10 text-gray-200" />
          </div>
          <p className="text-gray-900 font-bold text-xl">조건에 맞는 고객이 없습니다</p>
          <p className="text-gray-500 text-sm mt-3 max-w-sm mx-auto leading-relaxed">필터 조건을 변경하거나 검색어를 다르게 입력해 보세요.<br />아직 소통이 없다면 첫 댓글이나 DM을 기다려야 합니다.</p>
          <Button
            variant="outline"
            className="mt-6 border-gray-200 font-bold text-gray-600 rounded-xl"
            onClick={() => {
              setContactsSearch('');
              setActiveSegment('all');
              setFilterTags([]);
              setFilterEngagement(0);
            }}
          >
            모든 필터 초기화
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Contacts List Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            <div className="col-span-4">오디언스 정보</div>
            <div className="col-span-3 text-center">소통 지수 / 누적 횟수</div>
            <div className="col-span-3 text-center">최근 소통일</div>
            <div className="col-span-2 text-right">상세 보기</div>
          </div>

          {/* Contacts Rows */}
          <div className="space-y-3">
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`grid grid-cols-12 gap-4 items-center p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer group ${selectedContact?.id === contact.id ? 'ring-2 ring-indigo-500 shadow-lg' : ''}`}
              >
                <div className="col-span-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0 group-hover:rotate-3 transition-transform">
                    {contact.profile_pic ? (
                      <img src={contact.profile_pic} alt={contact.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-gray-900 truncate text-sm tracking-tight flex items-center gap-2">
                      @{contact.username || contact.instagram_id}
                      {(contact.engagement_score || 0) > 85 && <Badge className="bg-rose-400 text-white border-0 text-[8px] px-1.5 h-3.5 font-black">SUPER FAN</Badge>}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{contact.full_name || contact.username || `Instagram User (${(contact.instagram_id || '').slice(-4)})`}</p>
                    {contact.buying_phase && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-gray-50 text-gray-500 text-[9px] font-black rounded-md border border-gray-100">
                        {contact.buying_phase}
                      </span>
                    )}
                  </div>
                </div>

                <div className="col-span-3 flex justify-center">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black text-gray-900">{Math.round(contact.engagement_score || 0)}%</span>
                      <span className="text-[10px] text-gray-400 font-bold">({contact.interaction_count || 0}회)</span>
                    </div>
                    <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${(contact.engagement_score || 0) > 70 ? 'bg-rose-500' : (contact.engagement_score || 0) > 40 ? 'bg-orange-500' : 'bg-gray-400'}`}
                        style={{ width: `${contact.engagement_score || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-3 flex justify-center">
                  <Badge variant="outline" className="text-[10px] py-0.5 px-3 bg-white border-gray-100 text-gray-400 font-bold rounded-lg shadow-sm whitespace-nowrap">
                    {contact.last_interaction_at ? new Date(contact.last_interaction_at).toLocaleDateString() : '소통 전'}
                  </Badge>
                </div>

                <div className="col-span-2 flex justify-end">
                  <Button variant="ghost" size="sm" className="rounded-xl group-hover:bg-rose-50 group-hover:text-rose-600 text-gray-200 transition-all">
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            ))}
          </div>


        </div>
      )}
    </div>
  );
};

export default ContactsView;

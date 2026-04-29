import React from 'react';
import { Bell, ChevronDown, CreditCard, LogOut, Menu, Settings } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

const DashboardTopNav = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  navigate,
  customerStatus,
  loadAccountOptions,
  setShowAccountModal,
  subscriptionMenuRef,
  subscriptionLoading,
  subscriptionStatus,
  paymentHistory,
  showSubscriptionMenu,
  setShowSubscriptionMenu,
  setShowSubscriptionModal,
  notificationMenuRef,
  showNotificationMenu,
  setShowNotificationMenu,
  activities,
  setSelectedContact,
  setCurrentView,
  showProfileMenu,
  setShowProfileMenu,
  profileImage,
  displayName,
  handleLogout,
}) => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-50">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/assets/aidm-logo-ultra.png"
              alt="AIDM"
              className="h-16 w-auto object-contain cursor-pointer"
              onClick={() => navigate('/')}
            />
          </div>

          {customerStatus?.instagram_account && (
            <div className="ml-8">
              <button
                onClick={() => {
                  loadAccountOptions();
                  setShowAccountModal(true);
                }}
                className="flex items-center gap-3 px-6 py-2.5 bg-gray-50/50 border border-gray-200 rounded-[2rem] hover:bg-white hover:border-gray-300 hover:shadow-xl hover:shadow-gray-100 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">연결된 계정</span>
                  <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                  <span className="text-sm font-black text-gray-900 tracking-tight">
                    @{customerStatus.instagram_account.instagram_username}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-y-0.5 transition-all" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={subscriptionMenuRef}>
            {!subscriptionLoading && subscriptionStatus && (
              <div
                className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all hover:shadow-sm ${subscriptionStatus?.plan_name !== 'free'
                  ? 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
                  : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                  }`}
                onClick={() => setShowSubscriptionMenu(!showSubscriptionMenu)}
              >
                <div className={`w-2 h-2 rounded-full ${(subscriptionStatus?.status === 'active' || (paymentHistory && paymentHistory.length > 0 && paymentHistory[0].status === 'paid')) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className={`text-xs font-bold ${subscriptionStatus?.plan_name !== 'free' || (paymentHistory && paymentHistory.length > 0 && paymentHistory[0].status === 'paid') ? 'text-indigo-900' : 'text-slate-700'}`}>
                  {subscriptionStatus?.plan_name && subscriptionStatus.plan_name !== 'free'
                    ? subscriptionStatus.plan_name.toUpperCase().replace('-', ' ')
                    : (paymentHistory && paymentHistory.length > 0 && paymentHistory[0].status === 'paid'
                        ? (paymentHistory[0].amount >= 5000 ? (paymentHistory[0].amount >= 149000 ? 'AI PRO' : 'BASIC STARTER') : 'BASIC PLAN')
                        : 'Free Plan')}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showSubscriptionMenu ? 'rotate-180 text-indigo-600' : 'text-indigo-400'}`} />
              </div>
            )}

            {showSubscriptionMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-2xl rounded-2xl p-4 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">구독 정보</span>
                  <Badge className={(subscriptionStatus?.status === 'active' || (paymentHistory && paymentHistory.length > 0 && paymentHistory[0].status === 'paid')) ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-100 text-slate-600'}>
                    {(subscriptionStatus?.status === 'active' || (paymentHistory && paymentHistory.length > 0 && paymentHistory[0].status === 'paid')) ? '사용 중' : '만료됨'}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-2 rounded-xl bg-gray-50/50">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 font-medium">현재 플랜</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight">
                        {subscriptionStatus?.plan_name && subscriptionStatus.plan_name !== 'free'
                          ? subscriptionStatus.plan_name.toUpperCase().replace('-', ' ')
                          : (paymentHistory.length > 0 && paymentHistory[0].status === 'paid'
                              ? 'BASIC STARTER'
                              : 'FREE PLAN')}
                      </p>
                    </div>
                  </div>

                  {subscriptionStatus?.last_payment_date && (
                    <div className="px-1 space-y-1">
                      <div className="flex justify-between items-center text-[13px]">
                        <span className="text-gray-500">최근 결제일</span>
                        <span className="font-semibold text-gray-900">
                          {new Date(subscriptionStatus.last_payment_date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-start text-[13px] gap-4">
                        <span className="text-gray-500 whitespace-nowrap pt-0.5">결제 수단</span>
                        <div className="font-semibold text-gray-900 text-right flex flex-col items-end">
                          <span>
                            {subscriptionStatus.payment_method === 'tosspayments'
                              ? '토스페이먼츠'
                              : (subscriptionStatus.payment_method || '카드결제')}
                          </span>
                          {subscriptionStatus.card_name && (
                            <span className="text-[11px] text-gray-500 mt-0.5 whitespace-nowrap tracking-tight font-medium">
                              {subscriptionStatus.card_name} {subscriptionStatus.card_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setShowSubscriptionModal(true);
                      setShowSubscriptionMenu(false);
                    }}
                    className="w-full py-2 px-3 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    구독 및 결제 상세 관리
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={notificationMenuRef}>
            <button
              onClick={() => setShowNotificationMenu(!showNotificationMenu)}
              className={`relative p-2 rounded-lg transition-colors ${showNotificationMenu ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <Bell className="w-5 h-5" />
              {activities?.some(a => ['HUMAN_INTERVENTION_NEEDED', 'AUTH_ERROR', 'SALES_OPPORTUNITY', 'SYSTEM_ALERT'].includes(a.event_type)) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-bounce border-2 border-white shadow-sm"></span>
              )}
            </button>

            {showNotificationMenu && (
              <div className="absolute right-0 mt-3 w-[360px] bg-white border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight">알림</h3>
                </div>

                <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                  {(() => {
                    const displayAlerts = activities?.filter(a =>
                      a.event_type === 'HUMAN_INTERVENTION_NEEDED' ||
                      a.event_type === 'AUTH_ERROR' ||
                      a.event_type === 'SALES_OPPORTUNITY' ||
                      a.event_type === 'SYSTEM_ALERT'
                    ) || [];

                    if (displayAlerts.length > 0) {
                      return (
                        <div className="divide-y divide-gray-50">
                          {displayAlerts.map((alert) => {
                            const isUrgent = alert.type === 'URGENT' || alert.event_type === 'HUMAN_INTERVENTION_NEEDED' || alert.event_type === 'AUTH_ERROR';
                            const isSales = alert.type === 'SALES' || alert.event_type === 'SALES_OPPORTUNITY';
                            const isSystem = alert.type === 'SYSTEM' || alert.event_type === 'SYSTEM_ALERT';

                            return (
                              <div
                                key={alert.id}
                                className={`p-4 transition-colors cursor-pointer group border-l-4 ${isUrgent ? 'hover:bg-red-50/30 border-red-500' :
                                  isSales ? 'hover:bg-emerald-50/30 border-emerald-500' :
                                    isSystem ? 'hover:bg-amber-50/30 border-amber-500' :
                                      'hover:bg-indigo-50/30 border-indigo-500'
                                  }`}
                                onClick={() => {
                                  if (!alert.id.startsWith('demo') && alert.contact_id) {
                                    setSelectedContact({ id: alert.contact_id });
                                    setCurrentView('dashboard');
                                  }
                                  setShowNotificationMenu(false);
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-gray-900">{alert.contact_username ? `@${alert.contact_username}` : 'System'}</span>
                                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-0 font-bold uppercase ${isUrgent ? 'bg-red-50 text-red-700' :
                                          isSales ? 'bg-emerald-50 text-emerald-700' :
                                            isSystem ? 'bg-amber-50 text-amber-700' :
                                              'bg-indigo-50 text-indigo-700'
                                          }`}>
                                          {alert.event_type === 'AUTH_ERROR' ? 'AUTH' : (alert.type || 'Activity')}
                                        </Badge>
                                      </div>
                                      <span className="text-[10px] text-gray-400 font-medium tabular-nums">
                                        {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className={`text-[13px] font-bold leading-snug line-clamp-2 mb-1.5 ${isUrgent ? 'text-red-700' :
                                      isSales ? 'text-emerald-700' :
                                        isSystem ? 'text-amber-700' :
                                          'text-indigo-700'
                                      }`}>
                                      {alert.action_text}
                                    </p>
                                    {alert.trigger_text && (
                                      <div className={`rounded-lg p-2 border ${isUrgent ? 'bg-white/50 border-red-100/50' :
                                        isSales ? 'bg-white/50 border-emerald-100/50' :
                                          isSystem ? 'bg-white/50 border-amber-100/50' :
                                            'bg-white/50 border-indigo-100/50'
                                        }`}>
                                        <p className="text-[11px] text-gray-500 font-medium truncate italic">
                                          "{alert.trigger_text}"
                                        </p>
                                      </div>
                                    )}

                                    {alert.event_type === 'AUTH_ERROR' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCurrentView('settings');
                                          setShowNotificationMenu(false);
                                        }}
                                        className="mt-2 w-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-md transition-colors shadow-sm flex items-center justify-center gap-1.5"
                                      >
                                        <i className="fa-solid fa-link"></i>
                                        계정 다시 연결하기
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return (
                      <div className="py-12 px-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                          <Bell className="w-6 h-6 text-gray-200" />
                        </div>
                        <p className="text-sm font-bold text-gray-400">새로운 알림이 없습니다.</p>
                      </div>
                    );
                  })()}
                </div>

                <div className="p-3 bg-gray-50/50 border-t border-gray-50">
                  <Button
                    variant="ghost"
                    className="w-full text-[11px] font-bold text-gray-500 hover:text-indigo-600 py-1"
                    onClick={() => setShowNotificationMenu(false)}
                  >
                    알림 닫기
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-1">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="avatar"
                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white text-base font-medium">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
                  <p className="text-xs font-bold text-gray-900 truncate">{customerStatus?.email || displayName}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-red-50 flex items-center gap-2 text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardTopNav;

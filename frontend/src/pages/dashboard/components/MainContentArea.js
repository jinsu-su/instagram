import React from 'react';
import DashboardViewContent from './DashboardViewContent';
import MessagingEligibilityBanner from './MessagingEligibilityBanner';
import UsageWarningBanner from './UsageWarningBanner';

const MainContentArea = ({
  sidebarCollapsed,
  usageLocked,
  isExpiredPaidPlan,
  currentView,
  setCurrentView,
  showOnboarding,
  pageConnected,
  messagingAllowed,
  eligibilityLoading,
  messagingDetailText,
  renderOnboarding,
  renderDashboard,
  renderInsights,
  renderComments,
  renderAiGuard,
  renderInbox,
  renderAutomationCenter,
  renderContacts,
  renderTemplates,
  renderKeywordSettings,
  renderAiSettings,
  renderAiViralPostMaker,
  renderSubscription,
}) => {
  return (
    <main className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? 'pl-16' : 'pl-60'}`}>
      <div className="p-6 relative z-10 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-64px)] flex flex-col">
        <UsageWarningBanner
          usageLocked={usageLocked}
          isExpiredPaidPlan={isExpiredPaidPlan}
          currentView={currentView}
          onGoSubscription={() => setCurrentView('subscription')}
        />

        <MessagingEligibilityBanner
          showOnboarding={showOnboarding}
          pageConnected={pageConnected}
          messagingAllowed={messagingAllowed}
          eligibilityLoading={eligibilityLoading}
          messagingDetailText={messagingDetailText}
        />

        <DashboardViewContent
          showOnboarding={showOnboarding}
          currentView={currentView}
          renderOnboarding={renderOnboarding}
          renderDashboard={renderDashboard}
          renderInsights={renderInsights}
          renderComments={renderComments}
          renderAiGuard={renderAiGuard}
          renderInbox={renderInbox}
          renderAutomationCenter={renderAutomationCenter}
          renderContacts={renderContacts}
          renderTemplates={renderTemplates}
          renderKeywordSettings={renderKeywordSettings}
          renderAiSettings={renderAiSettings}
          renderAiViralPostMaker={renderAiViralPostMaker}
          renderSubscription={renderSubscription}
        />
      </div>
    </main>
  );
};

export default MainContentArea;

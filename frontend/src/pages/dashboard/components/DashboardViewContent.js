import React from 'react';

const DashboardViewContent = ({
  showOnboarding,
  currentView,
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
  return (showOnboarding && currentView !== 'subscription') ? (
    renderOnboarding()
  ) : (
    <>
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'insights' && renderInsights()}
      {currentView === 'comments' && renderComments()}
      {currentView === 'aiguard' && renderAiGuard()}
      {currentView === 'inbox' && renderInbox()}
      {currentView === 'automation' && renderAutomationCenter()}
      {currentView === 'contacts' && renderContacts()}
      {currentView === 'templates' && renderTemplates()}
      {currentView === 'keywordsettings' && renderKeywordSettings()}
      {currentView === 'aisettings' && renderAiSettings()}
      {currentView === 'stylelab' && renderAiViralPostMaker()}
      {currentView === 'subscription' && renderSubscription()}
    </>
  );
};

export default DashboardViewContent;

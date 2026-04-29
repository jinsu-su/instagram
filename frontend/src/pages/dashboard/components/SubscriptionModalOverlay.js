import React from 'react';
import Subscription from '../../Subscription';

const SubscriptionModalOverlay = ({
  showSubscriptionModal,
  setShowSubscriptionModal,
  customerId,
  subscriptionStatus,
  showNotify,
  setCurrentView,
}) => {
  if (!showSubscriptionModal) return null;

  return (
    <div
      className="fixed inset-0 z-[1110] bg-black/60 backdrop-blur-md overflow-y-auto overflow-x-hidden custom-scrollbar animate-in fade-in duration-300"
      onClick={(e) => e.target === e.currentTarget && setShowSubscriptionModal(false)}
    >
      <div
        className="min-h-full px-4 md:px-8 py-12 pb-24 md:pb-32 flex justify-center items-center"
        onClick={(e) => e.target === e.currentTarget && setShowSubscriptionModal(false)}
      >
        <div className="relative w-full max-w-5xl pointer-events-auto h-fit">
          <div className="shadow-2xl rounded-[3rem]">
            <Subscription
              customerId={customerId}
              subscriptionStatus={subscriptionStatus}
              showNotify={showNotify}
              onClose={() => setShowSubscriptionModal(false)}
              onSwitchView={setCurrentView}
              variant="modal"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModalOverlay;

import React from 'react';
import Subscription from '../../Subscription';

const SubscriptionView = ({ customerId, subscriptionStatus, showNotify }) => {
  return (
    <div className="w-full">
      <Subscription
        customerId={customerId}
        subscriptionStatus={subscriptionStatus}
        showNotify={showNotify}
      />
    </div>
  );
};

export default SubscriptionView;

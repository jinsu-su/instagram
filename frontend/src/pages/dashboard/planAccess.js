export const PLAN_LEVELS = {
  'free': 0,
  'basic-free': 0, 'basic-starter': 1, 'basic-pro': 2, 'basic-custom': 3,
  'ai-free': 0, 'ai-starter': 1, 'ai-pro': 2, 'ai-business': 3, 'ai-custom': 4
};

export const getPlanAccessState = (subscriptionStatus) => {
  const planId = subscriptionStatus?.plan_name || 'free';
  const planWeight = PLAN_LEVELS[planId] || 0;
  const userTrack = planId.startsWith('ai-') ? 'ai' : (planId.startsWith('basic-') ? 'basic' : 'free');

  // Logic: Truly free means weight 0 or explicitly 'free'
  // Basic Starter/Pro/AI Plans have weight > 0
  const isFreePlan = (planWeight === 0 && planId === 'free') || planId === 'basic-free' || planId === 'ai-free' || !subscriptionStatus?.plan_name;

  // Is the user's subscription expired / past_due (was a paid user but didn't renew)
  const isExpiredPaidPlan = ['past_due', 'canceled', 'expired'].includes(subscriptionStatus?.status) && planId !== 'free';

  // General Premium Features (Automation, Sync, etc.) are locked ONLY for truly free users OR expired ones
  const isPremiumFeatureLocked = isFreePlan || isExpiredPaidPlan;

  // AI Premium Features (Missed Opportunities, Strategy Report)
  // Restricted to: AI Track + Pro Tier (Weight 2) and above
  const isAiPremiumLocked = (userTrack !== 'ai') || (planWeight < 2) || isExpiredPaidPlan;

  // usageLocked means they hit their limit (e.g. 50/50 replies) — only for free plan
  const usageLocked = isFreePlan && subscriptionStatus?.usage_count >= (subscriptionStatus?.usage_limit || 50);

  return {
    planId,
    planWeight,
    userTrack,
    isFreePlan,
    isExpiredPaidPlan,
    isPremiumFeatureLocked,
    isAiPremiumLocked,
    usageLocked,
  };
};

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';

const MessagingEligibilityBanner = ({
  showOnboarding,
  pageConnected,
  messagingAllowed,
  eligibilityLoading,
  messagingDetailText,
}) => {
  if (showOnboarding || !pageConnected || messagingAllowed) return null;

  return (
    <Card className="border border-amber-200 bg-amber-50/50 mb-8 rounded-2xl">
      <CardContent className="p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <p className="font-bold text-amber-900">
            관리자 승인 대기 중
          </p>
          <p className="text-sm text-amber-700 font-medium tracking-tight">
            {eligibilityLoading ? '승인 상태 확인 중...' : messagingDetailText}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MessagingEligibilityBanner;

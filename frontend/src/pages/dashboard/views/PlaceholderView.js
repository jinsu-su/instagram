import React from 'react';
import { Settings } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';

const PlaceholderView = ({ title, description }) => (
  <>
    <div className="mb-8">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
        {title}
      </h1>
      <p className="text-gray-600">{description}</p>
    </div>
    <Card>
      <CardContent className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 mb-4">
          <Settings className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">곧 출시될 기능입니다</h3>
        <p className="text-sm text-gray-600">
          현재 이 기능을 한창 개발 중입니다. 곧 만나보실 수 있어요!
        </p>
      </CardContent>
    </Card>
  </>
);

export default PlaceholderView;

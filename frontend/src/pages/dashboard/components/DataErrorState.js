import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';

const DataErrorState = ({ retryFn }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200 animate-in fade-in duration-500">
    <AlertCircle className="w-8 h-8 text-gray-300 mb-3" />
    <p className="text-sm font-bold text-gray-500 mb-4">데이터를 불러오지 못했습니다.</p>
    <Button
      variant="outline"
      size="sm"
      onClick={retryFn}
      className="rounded-xl bg-white border border-gray-200 text-gray-600 font-bold h-9 px-4 hover:bg-gray-900 hover:text-white transition-all shadow-sm flex items-center gap-2 group"
    >
      <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
      다시 불러오기
    </Button>
  </div>
);

export default DataErrorState;

import React, { useEffect, useState } from 'react';
import { Check, Shuffle, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';

const PresetSelectorModal = ({
  isOpen,
  onClose,
  onSelect,
  initialSelected = [],
  presetData = [],
  title = '추천 답글 선택',
  description = '원하는 문구들을 체크하여 선택해주세요.',
  safeString = (value) => value,
}) => {
  const [selectedPresets, setSelectedPresets] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedPresets(initialSelected);
    }
  }, [isOpen, initialSelected]);

  if (!isOpen) return null;

  const togglePreset = (preset) => {
    setSelectedPresets(prev =>
      prev.includes(preset)
        ? prev.filter(p => p !== preset)
        : [...prev, preset]
    );
  };

  const handleRandomPick = () => {
    const shuffled = [...presetData].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, Math.min(10, presetData.length));
    setSelectedPresets(picked);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 relative flex justify-center items-center bg-gray-50/50 rounded-t-3xl text-center">
          <div>
            <h3 className="text-xl font-black text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 font-medium">{description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full absolute right-6 top-6">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 border-b border-gray-100 flex justify-end bg-white">
          <Button
            variant="outline"
            onClick={handleRandomPick}
            className="w-auto bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-none hover:opacity-90 font-bold px-6 rounded-xl h-10 shadow-sm"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            랜덤 뽑기
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-gray-50/30">
          <div className="grid grid-cols-1 gap-3">
            {selectedPresets.filter(p => !presetData.includes(p)).map((customMsg, idx) => (
              <div
                key={`custom-${idx}`}
                onClick={() => togglePreset(customMsg)}
                className="p-4 rounded-xl border-2 border-indigo-600 bg-indigo-50/50 cursor-pointer flex items-start gap-3"
              >
                <div className="w-5 h-5 rounded-md border-2 bg-indigo-600 border-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-indigo-900 break-all">{safeString(customMsg)}</span>
                  <span className="ml-2 text-[10px] bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-bold">기존 입력</span>
                </div>
              </div>
            ))}

            {presetData.map((preset, idx) => (
              <div
                key={idx}
                onClick={() => togglePreset(preset)}
                className={`
                  p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3
                  ${selectedPresets.includes(preset)
                    ? 'border-indigo-600 bg-indigo-50/50'
                    : 'border-gray-100 hover:border-indigo-200 hover:bg-white'}
                `}
              >
                <div className={`
                  w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
                  ${selectedPresets.includes(preset) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}
                `}>
                  {selectedPresets.includes(preset) && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                </div>
                <span className={`text-sm font-medium ${selectedPresets.includes(preset) ? 'text-indigo-900' : 'text-gray-600'}`}>
                  {preset}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-white rounded-b-3xl flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <span className="text-sm font-bold text-gray-500">
            {selectedPresets.length}개 선택됨
          </span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-xl font-bold bg-white hover:bg-gray-50 border-gray-200">
              취소
            </Button>
            <Button
              onClick={() => {
                onSelect(selectedPresets);
                onClose();
              }}
              disabled={selectedPresets.length === 0}
              className="bg-gray-900 hover:bg-black text-white rounded-xl font-bold px-6 shadow-lg shadow-gray-200 transition-all active:scale-95"
            >
              선택 완료 ({selectedPresets.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresetSelectorModal;

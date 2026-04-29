import React from 'react';
import { ArrowRight, Camera, Workflow, X, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

const ScenarioModalView = ({
  showScenarioModal,
  setShowScenarioModal,
  isPremiumFeatureLocked,
  showPremiumLockToast,
  setFlowForm,
  setShowFlowModal,
}) => {
  if (!showScenarioModal) return null;

  const scenarios = [
    {
      id: 'custom',
      title: '커스텀 시나리오 빌더',
      description: '원하는 트리거와 응답 흐름을 백지 상태에서 자유롭게 직접 설계합니다.',
      icon: <Zap className="w-8 h-8 text-indigo-600" />,
      color: 'indigo'
    },
    {
      id: 'story_mention',
      title: '스토리 멘션 감사',
      description: "회원님이 스토리에 소환(Mention)되는 즉시 감사의 메시지와 혜택을 전송합니다.",
      icon: <Camera className="w-8 h-8 text-pink-500" />,
      color: 'pink'
    }
  ];

  const selectScenario = (id) => {
    if (isPremiumFeatureLocked) {
      showPremiumLockToast('프리미엄 요금제로 연장해야 새로운 시나리오를 시작할 수 있습니다.');
      return;
    }

    let initialForm = {
      name: '',
      trigger_source: 'all',
      keyword: '',
      match_type: 'contains',
      nodes: [{ id: 'start', type: 'message', content: '', buttons: [] }],
      is_active: true
    };

    if (id === 'story_mention') {
      initialForm.name = '스토리 멘션 자동 답장';
      initialForm.trigger_source = 'story_mention';
      initialForm.mention_sources = ['story', 'post', 'comment'];
      initialForm.nodes = [
        {
          id: 'start',
          type: 'message',
          content: '저희를 스토리에 언급해주셔서 감사합니다! 😊\n\n감사의 마음을 담아 작은 선물을 준비했어요.'
        }
      ];
    }

    setFlowForm(initialForm);
    setShowScenarioModal(false);
    setShowFlowModal(true);
  };

  return (
    <div
      className="fixed inset-0 z-[1110] overflow-y-auto custom-scrollbar bg-black/60 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && setShowScenarioModal(false)}
    >
      <div className="relative min-h-full w-full flex justify-center p-4 py-12 pointer-events-none">
        <div className="relative w-full max-w-2xl animate-in zoom-in-95 duration-200 pointer-events-auto">
          <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden rounded-[32px] bg-white w-full relative flex flex-col h-fit max-h-[92vh] my-auto">
            {/* Close Button */}
            <button
              onClick={() => setShowScenarioModal(false)}
              className="absolute right-6 top-6 p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all z-20 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>

            <CardHeader className="p-8 pb-2 text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Workflow className="w-10 h-10 text-indigo-600" />
              </div>
              <CardTitle className="text-3xl font-black text-gray-900 mb-2 tracking-tight">어떤 자동화 시나리오로 시작할까요?</CardTitle>
              <CardDescription className="text-gray-500 font-medium text-lg">브랜드에 가장 필요한 핵심 시나리오를 선택해 보세요.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scenarios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectScenario(s.id)}
                    className="group relative flex flex-col items-center p-8 rounded-[32px] border-2 border-gray-100 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-center bg-white active:scale-95 h-full"
                  >
                    <div className={`w-16 h-16 rounded-2xl bg-${s.id === 'custom' ? 'indigo' : s.id === 'story_mention' ? 'pink' : 'blue'}-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                      {s.icon}
                    </div>
                    <h4 className="text-xl font-black text-gray-900 mb-2 tracking-tight">{s.title}</h4>
                    <p className="text-gray-500 text-sm font-medium leading-relaxed mb-4">{s.description}</p>
                    <div className="mt-auto flex items-center justify-center gap-2 text-indigo-600 font-black text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>지금 시작하기</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ScenarioModalView;

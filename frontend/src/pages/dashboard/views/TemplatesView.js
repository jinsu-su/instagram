import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';

const TemplatesView = ({
  GROWTH_TEMPLATES,
  safeString,
  setFlowForm,
  setShowFlowModal,
  setCurrentView,
  setShowScenarioModal,
}) => {
  return (
    <div className="space-y-8">
      <div className="mb-12 w-full flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight mb-2">성장 템플릿</h2>
        <p className="text-sm text-gray-500 font-medium text-center px-4">전문 마케터들이 사용하는 검증된 자동화 시나리오를 즉시 적용하세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {GROWTH_TEMPLATES.map((tmpl) => (
          <Card key={tmpl.id} className="group relative overflow-hidden rounded-[2.5rem] p-8 border-2 border-gray-100 bg-white transition-all duration-500 hover:border-indigo-600 hover:shadow-[0_15px_40px_rgba(99,102,241,0.12)] hover:-translate-y-1">
            <CardContent className="p-0 flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div className="px-3 py-1.5 bg-gray-900 text-white rounded-full font-black text-[9px] tracking-widest uppercase">
                  {tmpl.category}
                </div>
              </div>

              <div className="mb-2">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{safeString(tmpl.name)}</h3>
              </div>

              <div className="text-gray-500 text-[14px] mb-8 font-medium">
                <span
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    wordBreak: 'break-word',
                  }}
                >
                  {safeString(tmpl.description)}
                </span>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">포함된 액션</p>
                <div className="flex flex-wrap gap-2">
                  {tmpl.nodes.map((node, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="text-[10px] font-black text-gray-600">
                        {node.type === 'message' ? '메시지 발송' : node.type === 'tag' ? '태그 지정' : '시간 지연'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-auto">
                <Button
                  onClick={() => {
                    setFlowForm({
                      name: tmpl.name,
                      keyword: tmpl.keyword,
                      nodes: tmpl.nodes,
                      is_active: true
                    });
                    setShowFlowModal(true);
                    setCurrentView('automation');
                  }}
                  className="w-full bg-gray-50 text-gray-900 bg-white border border-gray-200 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white h-14 rounded-2xl font-black transition-all"
                >
                  이 템플릿 사용하기
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-white transition-all duration-300 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center group cursor-pointer"
          onClick={() => {
            setFlowForm({
              name: '',
              keyword: '',
              nodes: [{ id: 'start', type: 'message', content: '', buttons: [] }],
              is_active: true
            });
            setShowScenarioModal(true);
            setCurrentView('automation');
          }}>
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
            <Plus className="w-8 h-8 text-gray-300 group-hover:text-gray-900" />
          </div>
          <p className="font-black text-gray-900 text-lg">나만의 템플릿 만들기</p>
          <p className="text-sm text-gray-400 font-bold mt-2">완전 새로운 자동화 플로우를<br />처음부터 설계하세요.</p>
        </Card>
      </div>
    </div>
  );
};

export default TemplatesView;

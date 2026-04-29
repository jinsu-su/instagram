import React from 'react';
import { Activity, BarChart3, BookOpen, Bot, BrainCircuit, Camera, Check, ChevronLeft, ChevronRight, Copy, Layout, Loader2, MessageSquareText, Plus, RefreshCw, Search, Sparkles, UploadCloud, X, Zap } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

const AiViralPostMakerView = ({
  safeFetch,
  INSTAGRAM_API_BASE_URL,
  viralPostMedia,
  setViralPostMedia,
  setViralPostError,
  setIsUploading,
  fileInputRef,
  setViralPostLoading,
  setViralPostResult,
  viralPostIntent,
  customerId,
  apiFetch,
  showNotify,
  viralPostScrollRef,
  viralPostResult,
  isPremiumFeatureLocked,
  showPremiumLockToast,
  viralPostLoading,
  isUploading,
  setViralPostIntent,
  activeCaptionTab,
  setActiveCaptionTab,
  viralPostError,
  safeString,
}) => {
  const fetchIgMedia = async (id) => {
    const res = await safeFetch(`${INSTAGRAM_API_BASE_URL}/instagram/accounts/${id}/ig-media?limit=10`);
    if (!res.ok) throw new Error('Failed to load IG feed.');
    const data = await res.json();
    return data.images || [];
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (viralPostMedia.length + files.length > 10) {
      setViralPostError("최대 10개까지만 업로드 가능합니다.");
      return;
    }

    setIsUploading(true);
    setViralPostError(null);

    try {
      const newMedia = await Promise.all(
        files.map(file => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({
            url: e.target.result,
            file: file,
            name: file.name,
            type: file.type.startsWith('video/') ? 'video' : 'image'
          });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }))
      );

      setViralPostMedia(prev => [...prev, ...newMedia]);
    } catch (err) {
      setViralPostError("파일 읽기 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeViralMedia = (index) => {
    setViralPostMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalysis = async () => {
    if (viralPostMedia.length === 0) return;

    setViralPostLoading(true);
    setViralPostError(null);
    setViralPostResult(null);

    try {
      const images = viralPostMedia.filter(m => m.type === 'image').map(img => img.url);
      const videos = viralPostMedia.filter(m => m.type === 'video').map(v => v.url);

      const res = await apiFetch(`/ai/generate-viral-post`, {
        method: 'POST',
        body: JSON.stringify({
          images: images,
          videos: videos,
          user_intent: viralPostIntent,
          customer_id: customerId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || '분석 요청에 실패했습니다.');
      }

      const data = await res.json();
      setViralPostResult(data);
    } catch (err) {

      setViralPostError(err.message || '분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setViralPostLoading(false);
    }
  };


  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showNotify('클립보드에 복사되었습니다.');
    }).catch(() => { });
  };

  const scrollImages = (direction) => {
    const node = viralPostScrollRef.current;
    if (!node) return;
    const delta = 240;
    const amount = direction === 'left' ? -delta : delta;
    node.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const hasMedia = viralPostMedia && viralPostMedia.length > 0;

  // Derived: recommended sequence images
  const recommendedImages = (viralPostResult?.recommended_sequence?.map(idx => viralPostMedia[idx]) || viralPostMedia).filter(Boolean);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Header Section - Text Only Hero */}
      <div className="mb-12 w-full flex flex-col items-center justify-center text-center space-y-4">
        <div className="flex flex-col items-center">
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-2 text-center uppercase">
            AI Viral Post Maker
          </h2>
          <p className="text-gray-500 font-medium text-center">
            최신 알고리즘 데이터로 게시물의 바이럴 성과를 극대화하는 <span className="text-indigo-600 font-bold">프리미엄 포스팅 비서</span>
          </p>
        </div>
      </div>

      {/* 2. Setup Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2.5 bg-indigo-50 rounded-xl">
                <Camera className="w-5 h-5 text-indigo-600" />
              </div>
              업로드 미디어 구성 (이미지/릴스 최대 10개)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            <div className="relative group">
              {viralPostMedia.length > 0 ? (
                <div className="relative">
                  <div className="overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide" ref={viralPostScrollRef}>
                    <div className="flex gap-4 min-w-max">
                      {viralPostMedia.map((media, idx) => (
                        <div key={idx} className="relative group/img">
                          <div className="w-44 h-44 rounded-2xl overflow-hidden shadow-lg border-2 border-transparent group-hover/img:border-indigo-400 transition-all flex items-center justify-center bg-gray-100">
                            {media.type === 'video' ? (
                              <video src={media.url} className="w-full h-full object-cover" controls={false} autoPlay muted loop playsInline />
                            ) : (
                              <img src={media.url} className="w-full h-full object-cover" alt="" />
                            )}
                          </div>
                          <button
                            onClick={() => removeViralMedia(idx)}
                            className="absolute top-2 right-2 w-8 h-8 bg-rose-500/90 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-xl opacity-100 group-hover/img:bg-rose-600 transition-all z-20 hover:scale-110 active:scale-95"
                            title="삭제하기"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                            #{idx + 1} {media.type === 'video' ? '(영상)' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => scrollImages('left')} className="absolute -left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center hover:scale-110 transition-transform border border-gray-100"><ChevronLeft className="w-5 h-5" /></button>
                  <button onClick={() => scrollImages('right')} className="absolute -right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center hover:scale-110 transition-transform border border-gray-100"><ChevronRight className="w-5 h-5" /></button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[21/9] w-full flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-white hover:border-indigo-300 transition-all group-hover:shadow-inner cursor-pointer"
                >
                  <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                    <UploadCloud className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="font-bold text-gray-600">내 컴퓨터에서 이미지/영상 업로드</p>
                  <p className="text-sm text-gray-400 mt-2">분석할 이미지 또는 릴스를 최대 10개까지 선택하세요</p>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*,video/*"
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (isPremiumFeatureLocked) {
                    showNotify('프리미엄 요금제로 연장해야 미디어를 추가할 수 있습니다.', 'error');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                disabled={viralPostLoading || isUploading}
                className="flex-1 h-14 rounded-2xl border-gray-200 font-bold hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                미디어 추가하기
              </Button>
              <Button onClick={() => {
                if (isPremiumFeatureLocked) {
                  showPremiumLockToast('프리미엄 요금제로 연장해야 분석을 시작할 수 있습니다.');
                  return;
                }
                handleAnalysis();
              }} disabled={viralPostLoading || viralPostMedia.length === 0} className="flex-[1.5] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-lg shadow-indigo-100">
                {viralPostLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                AI 바이럴 분석 시작
              </Button>
            </div>
            {viralPostError && <div className="text-sm text-rose-500 font-medium bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center gap-2"><Zap className="w-4 h-4" /> {viralPostError}</div>}
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-xl bg-white rounded-[2.5rem] overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mb-10 -mr-10 opacity-50"></div>
          <CardHeader className="p-8">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-3 text-gray-900">
                <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                분석 의도 설정
              </CardTitle>
              <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[10px] font-black tracking-widest px-2.5 py-1">HYBRID AI GUIDE</Badge>
            </div>
            <p className="text-sm text-gray-400 mt-2 font-medium">업종별 전문가 패키지를 선택하거나 직접 요구사항을 입력하세요.</p>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            {/* Row 1: Professional Analysis Packages (Chips) */}
            <div className="flex flex-wrap justify-center items-center gap-3">
              {[
                { label: '📸 시네마틱 스튜디오', value: '시네마틱한 조명과 인물의 감정선이 강조된 고관여 스튜디오 컨셉으로 분석해 주세요.' },
                { label: '🍱 비비드 F&B 바이럴', value: '음식의 질감이 살아있는 비비드한 색감과 생동감 넘치는 연출 중심의 컨셉으로 분석해 주세요.' },
                { label: '💡 깔끔한 정보성 카드뷰', value: '텍스트 가독성을 극대화한 여백의 미와 정돈된 레이아웃 중심의 지식 전달 컨셉으로 분석해 주세요.' },
                { label: '🛒 프리미엄 제품 화보', value: '제품의 디테일과 고급스러운 재질감이 강조된 세련된 커머스 화보 컨셉으로 분석해 주세요.' },
                { label: '🎞️ 필름 무드 브랜딩', value: '아날로그 필름 사진 같은 빈티지한 감성과 브랜드만의 독보적인 톤앤매너 컨셉으로 분석해 주세요.' },
                { label: '🤝 자연스러운 리얼 라이프', value: '인위적이지 않은 스냅 작업물처럼 자연스러운 구도와 편안한 일상 컨셉으로 분석해 주세요.' }
              ].map((preset, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (viralPostIntent === preset.value) {
                      setViralPostIntent(''); // Toggle off
                    } else {
                      setViralPostIntent(preset.value); // Select this one exclusively
                    }
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-[13px] font-bold border transition-all duration-300 ${viralPostIntent === preset.value
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30'
                    }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="relative group/text">
              <div className="absolute top-4 left-4 z-10">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-gray-100 shadow-sm">
                  <MessageSquareText className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[10px] font-black text-gray-400 tracking-tighter uppercase">IMAGE CONCEPT REQUEST</span>
                </div>
              </div>
              <textarea
                value={viralPostIntent}
                onChange={(e) => setViralPostIntent(e.target.value)}
                placeholder="이미지의 시각적 컨셉이나 원하는 분위기를 입력하세요. (예: 따뜻한 햇살이 비치는 아침의 여유로운 무드로 분석해 주세요.)"
                className="w-full h-40 bg-gray-50/50 border border-gray-100 rounded-[2rem] p-6 pt-12 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-200 resize-none transition-all pr-12 font-medium leading-relaxed"
              />
              {viralPostIntent && (
                <button
                  onClick={() => setViralPostIntent('')}
                  className="absolute top-4 right-4 p-2 text-gray-300 hover:text-rose-500 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                의도를 입력하시면 AI가 인스타그램 알고리즘에 딱 맞는 톤으로 캡션을 최적화합니다.
              </p>
              <Button
                onClick={() => showNotify('작성 의도가 적용되었습니다.')}
                disabled={!viralPostIntent}
                variant="outline"
                className="h-9 px-4 rounded-xl text-xs font-bold border-gray-200 hover:bg-gray-50 hover:text-indigo-600 transition-all"
              >
                <Check className="w-3 h-3 mr-1.5" />
                적용 완료
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Result Section */}
      {viralPostResult && (
        <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
          {/* Top: AI Viral Score & Prediction Card */}
          <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden relative group border border-gray-100">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50 rounded-full blur-[100px] -mr-40 -mt-40 opacity-60"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-50 rounded-full blur-[80px] -ml-20 -mb-20 opacity-60"></div>

            <CardContent className="p-10 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                {/* Score Gauge */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-100 pb-8 lg:pb-0 lg:pr-8">
                  {/* Multi-dimensional Score Display */}
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="96" cy="96" r="88"
                        fill="none" stroke="currentColor" strokeWidth="12"
                        className="text-gray-50"
                      />
                      <circle
                        cx="96" cy="96" r="88"
                        fill="none" stroke="currentColor" strokeWidth="12"
                        strokeDasharray={2 * Math.PI * 88}
                        strokeDashoffset={2 * Math.PI * 88 * (1 - (typeof viralPostResult.viral_score === 'object' ? viralPostResult.viral_score.total : viralPostResult.viral_score || 0) / 100)}
                        strokeLinecap="round"
                        className="text-indigo-600 drop-shadow-[0_0_15px_rgba(79,70,229,0.2)] transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-6xl font-black text-gray-900 tracking-tighter">
                        {typeof viralPostResult.viral_score === 'object' ? viralPostResult.viral_score.total : viralPostResult.viral_score}
                      </span>
                      <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">TOTAL SCORE</span>
                    </div>
                  </div>
                  {/* Score Breakout (If object) */}
                  {typeof viralPostResult.viral_score === 'object' && (
                    <div className="mt-8 w-full space-y-3 px-4">
                      {[
                        { label: '후킹 파워', value: viralPostResult.viral_score.hook_power, color: 'bg-rose-500' },
                        { label: '시각적 미감', value: viralPostResult.viral_score.visual_aesthetic, color: 'bg-emerald-500' },
                        { label: '전략 이행도', value: viralPostResult.viral_score.strategic_intent, color: 'bg-indigo-500' }
                      ].map((s, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{s.label}</span>
                            <span className="text-xs font-black text-gray-700">{safeString(s.value)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${s.color} rounded-full transition-all duration-1000`} style={{ width: `${s.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prediction & Benchmarks */}
                <div className="lg:col-span-8 space-y-8">
                  {/* Video Critique Section (New) */}
                  {viralPostResult.video_critique && viralPostResult.video_critique.length > 0 && (
                    <div className="p-6 bg-amber-50/50 rounded-3xl border border-amber-100">
                      <h5 className="text-amber-700 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> 릴스 구간별 1:1 밀착 코칭 (Timestamp Critique)
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {viralPostResult.video_critique.map((c, idx) => (
                          <div key={idx} className="bg-white/80 p-4 rounded-2xl border border-white shadow-sm space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg">{c.timestamp}</span>
                              <span className="text-[11px] font-bold text-amber-900/60 uppercase">Dianogsis</span>
                            </div>
                            <p className="text-[13px] text-gray-700 font-bold leading-relaxed">{c.critique}</p>
                            <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50 uppercase text-[9px] font-black text-indigo-600">
                              <Zap className="w-3 h-3" /> ACTION: <span className="text-gray-500">{c.action}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-indigo-600/60 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4" /> AI 바이럴 예측 보고서
                    </h4>
                    <p className="text-2xl font-bold text-gray-900 leading-tight">
                      {safeString(viralPostResult.predicted_performance)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Benchmarks */}
                    <div className="space-y-3">
                      <h5 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">과거 성공 사례 비교 (Benchmark)</h5>
                      <p className="text-sm text-gray-600 leading-relaxed font-medium bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        {safeString(viralPostResult.benchmark_analysis)}
                      </p>
                    </div>

                    {/* Improvement Tips */}
                    <div className="space-y-3">
                      <h5 className="text-rose-500/60 text-[10px] font-black uppercase tracking-widest">바이럴 점수 심폐소생술 (Tips)</h5>
                      <div className="space-y-2">
                        {(viralPostResult.improvement_tips || []).map((tip, i) => (
                          <div key={i} className="flex items-start gap-3 bg-rose-50/30 p-3 rounded-xl border border-rose-100/30 min-h-[50px] items-center">
                            <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm border border-rose-600">
                              {i + 1}
                            </div>
                            <p className="text-[13px] text-gray-700 font-bold leading-tight">{safeString(tip)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left: Sequencing */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  추천 업로드 순서
                </h3>
                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100">AI Optimized</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {recommendedImages.map((img, idx) => (
                  <div key={idx} className={`relative rounded-3xl overflow-hidden shadow-md border-2 ${idx === 0 ? 'border-amber-400 scale-105 z-10' : 'border-transparent'}`}>
                    {img.type === 'video' ? (
                      <video src={img.url} className="w-full aspect-square object-cover" autoPlay muted loop playsInline />
                    ) : (
                      <img src={img.url} className="w-full aspect-square object-cover" alt="" />
                    )}
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-xl">
                      {idx === 0 ? '👑 THUMBNAIL' : `${idx + 1}nd`}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                <p className="text-sm text-indigo-900 font-bold mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI의 추천 사유</p>
                <p className="text-sm text-indigo-800/80 leading-relaxed font-medium">{safeString(viralPostResult.reasoning)}</p>
              </div>
            </div>

            {/* Right: Content Card */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquareText className="w-5 h-5 text-indigo-600" />
                  마케팅 캡션 기획
                </h3>
              </div>
              <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border border-white/50">
                <div className="flex p-2 bg-gray-50/80 m-6 mb-0 rounded-2xl gap-1">
                  {[
                    { id: 'engagement', label: '기본 포스팅', icon: Layout },
                    { id: 'informative', label: '정보성 슬라이드', icon: BookOpen },
                    { id: 'emotional', label: '참여/홍보', icon: Zap }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCaptionTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${activeCaptionTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>
                <CardContent className="p-6 pt-6 space-y-6">
                  <div className="p-6 bg-indigo-50/50 rounded-[2rem] relative group border border-indigo-100/50 min-h-[350px]">
                    <p className="text-[14px] text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">
                      {safeString(viralPostResult.captions[activeCaptionTab])}
                    </p>
                    <Button
                      onClick={() => copyToClipboard(viralPostResult.captions[activeCaptionTab])}
                      className="absolute top-4 right-4 p-2.5 bg-white hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded-xl shadow-lg border border-white transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom: Viral Strategy Package (Horizontal Grid for Balance) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {/* 1. Automation Trigger */}
            <Card className="border border-indigo-100 shadow-xl bg-white rounded-[2.5rem] relative overflow-hidden group">
              <CardContent className="p-7 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-bold text-base text-gray-900 leading-tight">자동화 트리거 (Conversion)</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">추천 키워드</span>
                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-black border border-indigo-100">{safeString(viralPostResult.automation_strategy.keyword)}</span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 font-medium text-[13px] leading-relaxed text-gray-700 relative group/phrase">
                    {safeString(viralPostResult.automation_strategy.phrase)}
                    <button
                      onClick={() => copyToClipboard(viralPostResult.automation_strategy.phrase)}
                      className="absolute bottom-2 right-2 p-1.5 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-gray-100 transition-colors opacity-0 group-hover/phrase:opacity-100"
                    >
                      <Copy className="w-3.5 h-3.5 text-indigo-400" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. SEO & Alt Text */}
            <Card className="border border-blue-100 shadow-lg bg-white rounded-[2.5rem] overflow-hidden group">
              <CardContent className="p-7 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-100">
                    <Search className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-bold text-base text-gray-900">검색 최적화 (SEO)</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 mb-2 tracking-widest uppercase">ALT TEXT - 시각 분석</p>
                    <p className="text-[12px] text-gray-600 font-medium leading-relaxed bg-blue-50/30 p-4 rounded-2xl border border-blue-50 overflow-hidden text-ellipsis line-clamp-3">
                      {safeString(viralPostResult.seo_optimization.alt_text)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {viralPostResult.seo_optimization.keywords.slice(0, 5).map((kw, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-lg border border-blue-100">
                        {safeString(kw)}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Story Teasers */}
            <Card className="border border-amber-100 shadow-lg bg-white rounded-[2.5rem] overflow-hidden group">
              <CardContent className="p-7 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-100">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-bold text-base text-gray-900">스토리 티저 (Traffic Loop)</h4>
                </div>
                <div className="space-y-2">
                  {viralPostResult.story_teasers.slice(0, 2).map((teaser, i) => (
                    <div key={i} className="p-4 bg-amber-50/30 rounded-2xl border border-amber-100/50 flex items-start gap-3 group/teaser hover:bg-amber-50 transition-colors">
                      <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-[9px] font-black text-amber-700 shadow-sm shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="flex-1 text-[12px] font-bold text-amber-900/80 leading-snug line-clamp-2">
                        {safeString(teaser)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiViralPostMakerView;

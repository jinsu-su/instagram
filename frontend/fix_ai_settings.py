import re, sys

fp = "/Users/su/Downloads/instagram 복사본 4/instagram-auth-service/frontend/src/pages/Dashboard.js"
with open(fp, 'r') as f:
    c = f.read()

lines = c.split('\n')

# Find start line (line with "// Render AI Settings")
start_idx = None
for i, line in enumerate(lines):
    if '// Render AI Settings' in line and 'const renderAiSettings' in lines[i+1]:
        start_idx = i
        break

if start_idx is None:
    print("ERROR: Could not find renderAiSettings start")
    sys.exit(1)

# Find end: look for "const renderMobileSimulator" after start
end_idx = None
for i in range(start_idx + 1, len(lines)):
    if 'const renderMobileSimulator' in lines[i]:
        end_idx = i
        break

if end_idx is None:
    print("ERROR: Could not find renderMobileSimulator")
    sys.exit(1)

# We want to replace from start_idx to end_idx-1 (the blank line before renderMobileSimulator)
# Go back to include the blank line
while end_idx > start_idx and lines[end_idx-1].strip() == '':
    end_idx -= 1

print(f"Replacing lines {start_idx+1} to {end_idx} (0-indexed)")

new_block = r'''  // Render AI Settings
  const renderAiSettings = () => (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header: AI 센터 타이틀 + 마스터 스위치 (End) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left space-y-1.5">
          <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-none">AI 센터</h1>
          <p className="text-gray-400 font-bold text-sm">AI 어시스턴트의 페르소나와 동작 규칙을 실시간으로 설정합니다</p>
        </div>
        {/* AI 마스터 스위치 - End 영역 */}
        <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all shrink-0">
          <div className={`p-2.5 rounded-xl transition-colors ${isAiActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
            <Zap className="w-5 h-5" />
          </div>
          <div className="mr-4">
            <h3 className="text-[13px] font-black text-gray-900 leading-none">AI 응답 마스터</h3>
            <p className={`text-[10px] font-bold mt-1 ${isAiActive ? 'text-emerald-500' : 'text-gray-400'}`}>{isAiActive ? '\u25cf \ud65c\uc131\ud654\ub428' : '\u25cb \ube44\ud65c\uc131'}</p>
          </div>
          <button
            onClick={() => { const newState = !isAiActive; setIsAiActive(newState); setTimeout(() => saveAiSettings(newState), 0); }}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none shadow-inner shrink-0 ${isAiActive ? 'bg-indigo-600' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${isAiActive ? 'translate-x-[1.4rem]' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Section 1: 운영시간 카드 - 가로로 길고 슬림 */}
      <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{borderLeft: '4px solid rgba(147,51,234,0.25)'}}>
        <div className="px-5 py-3.5 flex flex-col lg:flex-row items-center gap-5">
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 rounded-lg bg-purple-50"><Clock className="w-4 h-4 text-purple-600" /></div>
            <h3 className="text-sm font-black text-gray-900 whitespace-nowrap">운영 시간</h3>
          </div>
          <div className="h-6 w-px bg-gray-100 hidden lg:block shrink-0"></div>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {[
              { label: '\ud83d\udd52 24\uc2dc\uac04', start: '00:00', end: '23:59' },
              { label: '\ud83c\udfe2 \uc5c5\ubb34\uc2dc\uac04', start: '09:00', end: '18:00' },
              { label: '\ud83c\udf19 \uc57c\uac04 \uc751\ub300', start: '18:00', end: '09:00' },
            ].map((preset) => (
              <button key={preset.label} type="button"
                onClick={() => { setAiOperateStart(preset.start); setAiOperateEnd(preset.end); }}
                className="px-3 py-1.5 bg-gray-50 hover:bg-purple-50 text-gray-600 hover:text-purple-700 rounded-lg text-[10px] font-black border border-gray-100 hover:border-purple-200 transition-all active:scale-95 whitespace-nowrap"
              >{preset.label}</button>
            ))}
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center bg-gray-50 rounded-xl px-2 border border-gray-100">
                <select value={aiOperateStart} onChange={(e) => setAiOperateStart(e.target.value)} className="bg-transparent border-0 px-2 py-1.5 text-[11px] font-bold text-gray-700 cursor-pointer focus:ring-0">
                  {Array.from({ length: 48 }).map((_, i) => { const h = Math.floor(i / 2).toString().padStart(2, '0'); const m = (i % 2 === 0 ? '00' : '30'); const time = `${h}:${m}`; return <option key={time} value={time}>{time}</option>; })}
                </select>
                <span className="text-gray-300 font-bold text-xs mx-1">~</span>
                <select value={aiOperateEnd} onChange={(e) => setAiOperateEnd(e.target.value)} className="bg-transparent border-0 px-2 py-1.5 text-[11px] font-bold text-gray-700 cursor-pointer focus:ring-0">
                  {Array.from({ length: 48 }).map((_, i) => { const h = Math.floor(i / 2).toString().padStart(2, '0'); const m = (i % 2 === 0 ? '00' : '30'); const time = `${h}:${m}`; return <option key={time} value={time}>{time}</option>; })}
                  <option value="23:59">23:59</option>
                </select>
              </div>
              <Button size="sm" onClick={() => saveAiSettings()} disabled={aiPromptSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black h-8 px-4 rounded-lg text-[11px] transition-all active:scale-95 whitespace-nowrap">
                {aiPromptSaving ? '...' : '\uc800\uc7a5'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        {/* Left: AI 페르소나 카드 */}
        <Card className="border border-gray-100 shadow-sm rounded-[2rem] bg-white flex flex-col h-[520px] hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
          <CardHeader className="bg-gradient-to-r from-indigo-50/60 to-white p-5 border-b border-gray-50 flex flex-row items-center justify-between rounded-t-[2rem]">
            <div>
              <CardTitle className="text-base font-black text-gray-900 flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-600" />
                AI 페르소나 (프롬프트)
              </CardTitle>
              <p className="text-[11px] text-gray-500 font-medium mt-1">AI가 어떤 성격으로 대화할지 상세하게 알려주세요.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAiKbModal(true)} className="bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl h-8 text-xs">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              참고 지식 {aiKnowledgeBaseUrl ? 'ON' : 'OFF'}
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="예: 당신은 스테이무드 스테이의 공식 매니저입니다. 항상 다정하고 친절하게 대답하며, 예약 방법과 주변 맛집을 추천해주세요."
              className="w-full flex-1 p-6 border-0 focus:ring-0 resize-none text-gray-800 text-[14px] leading-relaxed bg-transparent"
              disabled={aiPromptLoading || aiPromptSaving}
            />
          </CardContent>
          {/* 설정 적용하기 - 페르소나 카드 하단 */}
          <div className="px-5 pb-5 pt-3 border-t border-gray-50">
            <Button className="w-full bg-gray-900 text-white hover:bg-black font-black h-11 rounded-xl text-sm shadow-lg shadow-gray-900/20 transition-all active:scale-95 flex items-center justify-center gap-2.5 group relative overflow-hidden"
              onClick={async () => { await saveAiSettings(); showNotify('AI 설정 및 페르소나가 완벽하게 적용되었습니다.', 'success'); }}
              disabled={aiPromptLoading || aiPromptSaving}
            >
              {aiPromptSaving ? (<><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /><span>저장 중...</span></>) : (<><ShieldCheck className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" /><span>설정 적용하기</span></>)}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none"></div>
            </Button>
          </div>
        </Card>

        {/* Right: AI 응답 시뮬레이터 카드 */}
        <Card className="border-2 border-gray-100 shadow-sm bg-gray-50/50 rounded-[2rem] flex flex-col h-[520px] overflow-hidden">
          <div className="bg-white px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 leading-tight">AI 응답 시뮬레이터</h3>
              <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>테스트 모드
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 flex flex-col">
            <div className="text-center">
              <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-full">{new Date().toLocaleDateString('ko-KR')}</span>
            </div>
            <div className="flex justify-end">
              <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-[13px] font-medium shadow-md shadow-indigo-100">
                안녕하세요! 금주 주말 예약 가능할까요? 예약 방법 좀 알려주세요.
              </div>
            </div>
            <div className="flex justify-start items-end gap-2">
              <div className="w-6 h-6 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-[13px] shadow-sm space-y-2 font-medium leading-relaxed">
                <p>안녕하세요! 🌟 문의주셔서 감사합니다. 현재 설정하신 프롬프트가 여기에 적용되어 응답이 생성됩니다.</p>
                <div className="bg-indigo-50 p-2.5 rounded-xl text-[11px] text-indigo-700 font-bold border border-indigo-100/50">
                  실제 고객 응대 전, 설정을 저장하고 DM으로 테스트해보세요.
                </div>
              </div>
            </div>
          </div>
          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full pr-1.5 pl-5 py-1">
              <input type="text" placeholder="고객을 가장하여 메시지를 보내보세요..." className="flex-1 bg-transparent border-0 focus:ring-0 text-[13px] h-8 font-medium" disabled />
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-md shadow-indigo-200">
                <Send className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>
          {/* 설정 적용하기 - 시뮬레이터 카드 하단 */}
          <div className="px-5 pb-5 pt-3 bg-white border-t border-gray-50 shrink-0">
            <Button className="w-full bg-gray-900 text-white hover:bg-black font-black h-11 rounded-xl text-sm shadow-lg shadow-gray-900/20 transition-all active:scale-95 flex items-center justify-center gap-2.5 group relative overflow-hidden"
              onClick={async () => { await saveAiSettings(); showNotify('AI 설정 및 페르소나가 완벽하게 적용되었습니다.', 'success'); }}
              disabled={aiPromptLoading || aiPromptSaving}
            >
              {aiPromptSaving ? (<><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /><span>저장 중...</span></>) : (<><ShieldCheck className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" /><span>설정 적용하기</span></>)}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none"></div>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );'''

new_lines = lines[:start_idx] + new_block.split('\n') + [''] + lines[end_idx:]
result = '\n'.join(new_lines)

with open(fp, 'w') as f:
    f.write(result)

print(f"SUCCESS: Wrote {len(result)} bytes. Replaced lines {start_idx+1}-{end_idx}")

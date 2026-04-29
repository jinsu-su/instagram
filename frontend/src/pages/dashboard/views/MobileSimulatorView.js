import React from 'react';

const MobileSimulatorView = ({ customerStatus, messages = [] }) => {
  // backward compatibility for single message calls
  const messageList = Array.isArray(messages) ? messages : [messages];

  return (
    <div className="relative w-[310px] h-[620px] bg-black rounded-[3rem] p-3 shadow-2xl border-[10px] border-gray-950 overflow-hidden shrink-0">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-950 rounded-b-2xl z-20"></div>
      {/* Screen Content */}
      <div className="w-full h-full bg-white rounded-[2.5rem] relative overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-20 bg-white border-b border-gray-100 flex items-center px-8 pt-6 shrink-0 shadow-sm z-10">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-gray-900 truncate">{customerStatus?.instagram_account?.instagram_username || '우리 브랜드'}</p>
            <p className="text-[10px] font-bold text-gray-400">Instagram</p>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 bg-gray-50 p-6 space-y-6 overflow-y-auto custom-scrollbar pt-12">
          {messageList.map((msg, idx) => (
            <div key={idx} className="flex flex-col items-end gap-1 w-full animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
              <div className={`p-3.5 rounded-2xl rounded-br-sm max-w-[85%] text-[12px] font-bold leading-relaxed shadow-lg relative border ${
                idx === 0 && messageList.length > 1 
                  ? "bg-white text-indigo-600 border-indigo-100 shadow-indigo-100/50" // First bubble (Follow Gate)
                  : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-white/10 shadow-indigo-100" // Actual DM
              }`}>
                {msg.imageUrl && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-white/20 shadow-inner">
                    <img src={msg.imageUrl} className="w-full h-auto object-cover max-h-40" alt="post" />
                  </div>
                )}
                {msg.content ? msg.content.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i !== msg.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                )) : '내용 없음'}

                {/* Buttons Preview */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {msg.buttons.map((btn, bIdx) => (
                      <div key={bIdx} className={`w-full py-2 rounded-xl text-center border font-black text-[11px] transition-colors cursor-default ${
                        idx === 0 && messageList.length > 1
                          ? "bg-indigo-600 text-white border-indigo-700"
                          : "bg-white/20 text-white border-white/10"
                      }`}>
                        {btn.text || btn.label || `버튼 ${bIdx + 1}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pr-1">
                {idx === 0 && messageList.length > 1 ? "1단계: 팔로우 확인" : "발송 메시지"}
              </span>
            </div>
          ))}
        </div>
        {/* Bottom Input Area */}
        <div className="h-16 bg-white border-t border-gray-100 shrink-0 flex items-center px-4 gap-3">
          <div className="w-full h-10 bg-gray-100 rounded-full flex items-center px-4">
            <span className="text-xs text-gray-400 font-bold">메시지 보내기...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSimulatorView;

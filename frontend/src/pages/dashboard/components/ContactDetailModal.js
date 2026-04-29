import React from 'react';
import { MessageSquare, Sparkles, Tag, User, X } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

const ContactDetailModal = ({ contact, isOpen, onClose, onStartDirectMessage }) => {
  if (!isOpen || !contact) return null;

  return (
    <div
      className="fixed inset-0 z-[1110] bg-black/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto custom-scrollbar"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative min-h-full flex items-start justify-center p-4 pt-6 md:pt-8 pointer-events-none pb-10">
        <div className="bg-white rounded-[2.5rem] w-full max-w-lg relative shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-300 border border-white/20 pointer-events-auto flex flex-col h-fit max-h-[92vh] my-auto overflow-hidden">
          <div className="h-32 bg-gray-900 relative rounded-t-[2.5rem] overflow-hidden shrink-0">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>

            <div className="absolute right-6 top-6 z-20">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full bg-white/10 hover:bg-white/20 text-white border-none"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="px-8 pb-10 -mt-16 relative z-10 flex-1 overflow-y-auto custom-scrollbar">
            <div className="text-center">
              <div className="inline-block p-1.5 bg-white rounded-[2.2rem] shadow-2xl border border-gray-50">
                <div className="w-28 h-28 rounded-[1.8rem] overflow-hidden border-4 border-white bg-gray-50 shadow-inner">
                  {contact.profile_pic ? (
                    <img src={contact.profile_pic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                      <User className="w-14 h-14" />
                    </div>
                  )}
                </div>
              </div>
              <h3 className="mt-5 font-black text-2xl text-gray-900 tracking-tighter truncate max-w-full px-2" title={`@${contact.username || contact.instagram_id}`}>
                @{contact.username || contact.instagram_id || 'PRIVATE'}
              </h3>
              {contact.full_name && <p className="text-gray-400 font-bold text-sm tracking-widest uppercase mt-1">{contact.full_name}</p>}

              <div className="mt-8 grid grid-cols-2 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-100 shadow-inner">
                <div className="bg-white p-5 text-center">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1.5">소통 지수</p>
                  <p className="text-3xl font-black text-gray-900 tracking-tighter">{Math.round(contact.engagement_score || 0)}<span className="text-xs font-bold text-gray-400 ml-1">%</span></p>
                </div>
                <div className="bg-white p-5 text-center">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1.5">활동 횟수</p>
                  <p className="text-3xl font-black text-gray-900 tracking-tighter">{contact.interaction_count || 0}<span className="text-xs font-bold text-gray-400 ml-1">번</span></p>
                </div>
              </div>
            </div>

            <div className="mt-10 text-left space-y-8">
              <div className="relative">
                <div className="absolute -left-4 -top-4 w-12 h-12 bg-amber-50 rounded-full -z-10 blur-xl opacity-50"></div>
                <h4 className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  AI 행동 분석
                </h4>
                <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-gray-700 leading-relaxed shadow-sm">
                  <div className="flex gap-2">
                    <span className="text-2xl text-gray-300 font-black leading-none mt-1">“</span>
                    <p className="font-bold tracking-tight italic opacity-90">{contact.ai_summary || "데이터를 수집하여 성향을 파악 중입니다."}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4">
                  <Tag className="w-4 h-4 text-gray-300" />
                  AI 분석 키워드
                </h4>
                <div className="flex flex-wrap gap-2">
                  {contact.tags?.length > 0 ? (
                    contact.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 px-4 py-1.5 rounded-xl font-black text-[10px] transition-all hover:scale-105 active:scale-95 cursor-default">
                        {tag.toUpperCase()}
                      </Badge>
                    ))
                  ) : (
                    <div className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed text-center">
                      <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">No Tags Detected</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 pt-4 bg-white border-t border-gray-50 shrink-0">
            <Button
              className="w-full bg-gray-900 text-white hover:bg-black h-14 rounded-2xl text-sm font-black shadow-xl shadow-gray-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
              onClick={onStartDirectMessage}
            >
              <MessageSquare className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              START DIRECT MESSAGE
            </Button>
            <p className="mt-3 text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">Last Activity: {contact.last_interaction_at ? new Date(contact.last_interaction_at).toLocaleDateString() : 'NO ACTIVITY'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactDetailModal;

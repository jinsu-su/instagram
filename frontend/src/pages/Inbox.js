import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, MessageSquare, Send, ShieldAlert, Loader2, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { INSTAGRAM_API_BASE_URL } from '../lib/config';
import { apiFetch, safeString } from '../lib/api';

export default function Inbox() {
  

  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [detail, setDetail] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [ourAccountIds, setOurAccountIds] = useState([]);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedConversation]);

  useEffect(() => {
    const stored = localStorage.getItem('customer_id');
    if (!stored) {
      navigate('/');
      return;
    }
    setCustomerId(stored);
    void loadEligibility(stored);
  }, [navigate]);

  useEffect(() => {
    if (customerId) {
      // allowed 상태와 관계없이 대화 목록 로드 시도 (에러는 내부에서 처리)
      void loadConversations();
    }
  }, [customerId]);

  useEffect(() => {
    if (selectedConversation && customerId) {
      void loadMessages(selectedConversation.id);
    }
  }, [selectedConversation, customerId]);

  // conversations를 항상 최신순으로 정렬된 상태로 유지
  const sortedConversations = useMemo(() => {
    

    if (!conversations || conversations.length === 0) {
      
      return [];
    }

    
    

    // 시간 추출 함수 - 더 강력한 파싱
    const getTime = (conv) => {
      // 1순위: latest_message.created_time
      if (conv.latest_message?.created_time) {
        try {
          const timeStr = conv.latest_message.created_time;
          const time = new Date(timeStr).getTime();
          if (!isNaN(time) && time > 0) {
            return time;
          }
        } catch (e) {
          
        }
      }
      // 2순위: updated_time
      if (conv.updated_time) {
        try {
          const timeStr = conv.updated_time;
          const time = new Date(timeStr).getTime();
          if (!isNaN(time) && time > 0) {
            return time;
          }
        } catch (e) {
          
        }
      }
      // 기본값: 0 (가장 오래된 것으로 처리)
      
      return 0;
    };

    // 정렬 전 상태 로깅 (전체)
    
    conversations.forEach((conv, idx) => {
      const time = getTime(conv);
      const timeStr = conv.latest_message?.created_time || conv.updated_time || 'N/A';
      const username = conv.other_participant?.username || conv.latest_message?.from?.username || 'N/A';
      
    });

    // 정렬 실행 - 내림차순 (최신이 위로)
    const sorted = [...conversations].sort((a, b) => {
      const aTime = getTime(a);
      const bTime = getTime(b);
      const result = bTime - aTime; // 내림차순

      // 처음 5개 비교만 로그
      if (conversations.indexOf(a) < 5 || conversations.indexOf(b) < 5) {
        const aTimeStr = a.latest_message?.created_time || a.updated_time || 'N/A';
        const bTimeStr = b.latest_message?.created_time || b.updated_time || 'N/A';
        const aUsername = a.other_participant?.username || a.latest_message?.from?.username || 'N/A';
        const bUsername = b.other_participant?.username || b.latest_message?.from?.username || 'N/A';
        
      }

      return result;
    });

    // 정렬 후 상태 로깅 (전체)
    
    sorted.forEach((conv, idx) => {
      const time = getTime(conv);
      const timeStr = conv.latest_message?.created_time || conv.updated_time || 'N/A';
      const username = conv.other_participant?.username || conv.latest_message?.from?.username || 'N/A';
      
    });

    // 정렬 검증
    if (sorted.length > 0) {
      const firstTime = getTime(sorted[0]);
      const lastTime = getTime(sorted[sorted.length - 1]);
      const firstUsername = sorted[0].other_participant?.username || sorted[0].latest_message?.from?.username || 'N/A';
      const lastUsername = sorted[sorted.length - 1].other_participant?.username || sorted[sorted.length - 1].latest_message?.from?.username || 'N/A';
      
    }

    
    return sorted;
  }, [conversations]);

  const loadEligibility = async (id) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/admin/customers/${id}/messaging-eligibility`);
      if (!res.ok) throw new Error('승인 상태 확인 실패');
      const data = await res.json();
      setAllowed(Boolean(data.allowed));
      setDetail(data.detail || '');
    } catch (err) {
      setAllowed(false);
      setDetail('관리자 승인 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      setConversationsLoading(true);
      
      // customer_id는 apiFetch에서 자동으로 처리되므로 URL에서 제거
      const res = await apiFetch(`/instagram/accounts/conversations?include_latest_message=true&limit=25`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        
        throw new Error(errorData.detail || '대화 목록 조회 실패');
      }
      const data = await res.json();
      
      if (data.success && data.conversations) {
        // 우리 계정 ID 저장 (대화 참여자 필터링에 사용)
        if (data.our_account_ids) {
          setOurAccountIds(data.our_account_ids);
          
        } else {
          
        }

        // 디버깅: 대화별 참여자 정보 확인
        
        

        data.conversations.forEach((conv, idx) => {
          const participants = conv.participants?.data || [];
          const ourAccountIdsStr = data.our_account_ids?.map(id => String(id)) || [];
          
          
          

          participants.forEach((p, pIdx) => {
            const pId = String(p.id || '');
            const isOurAccount = ourAccountIdsStr.includes(pId);
            
          });

          // other_participant 검증
          if (conv.other_participant) {
            const otherParticipantId = String(conv.other_participant.id || '');
            const isOurAccount = ourAccountIdsStr.includes(otherParticipantId);
            if (isOurAccount) {
              
            } else {
              
            }
          } else {
            
          }

          // latest_message 확인
          if (conv.latest_message) {
            
            
          } else {
            
          }
        });

        // 정렬은 useMemo에서 처리하므로 여기서는 그대로 설정
        
        setConversations(data.conversations);

        // 중요: 현재 선택된 대화가 있으면, 새로운 데이터에서 같은 ID를 찾아 교체 (헤더 등 메타데이터 동기화)
        if (selectedConversation) {
          const freshConv = data.conversations.find(c => String(c.id) === String(selectedConversation.id));
          if (freshConv) {
            
            setSelectedConversation(freshConv);
          }
        }
        // 선택된 게 없으면 목록의 가장 최신 대화를 자동 선택
        else if (data.conversations.length > 0) {
          const sorted = [...data.conversations].sort((a, b) => {
            const getT = (c) => new Date(c.latest_message?.created_time || c.updated_time || 0).getTime();
            return getT(b) - getT(a);
          });
          setSelectedConversation(sorted[0]);
        }
      }
    } catch (err) {
      
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;
    try {
      setMessagesLoading(true);
      
      // customer_id는 apiFetch에서 자동으로 처리되므로 URL에서 제거
      const res = await apiFetch(`/instagram/accounts/conversations/${conversationId}/messages?limit=50`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || '메시지 조회 실패');
      }
      const data = await res.json();
      if (data.success && data.messages) {
        // 메시지를 시간순으로 정렬 (오래된 것부터)
        const sortedMessages = [...data.messages].sort((a, b) => {
          const timeA = new Date(a.created_time || 0).getTime();
          const timeB = new Date(b.created_time || 0).getTime();
          return timeA - timeB;
        });
        setMessages(sortedMessages);
      }
    } catch (err) {
      
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !messageText.trim() || !allowed) {
      return;
    }

    try {
      setSendingMessage(true);
      // 대화의 참여자 중에서 우리 계정이 아닌 사람 찾기 (받는 사람)
      const participants = selectedConversation.participants?.data || [];
      const recipient = participants.find((p) => !ourAccountIds.includes(p.id));

      if (!recipient || !recipient.id) {
        alert('전송 대상을 찾을 수 없습니다.');
        return;
      }

      // API는 Query 파라미터를 사용합니다
      // const params = new URLSearchParams({
      //   customer_id: customerId, // apiFetch에서 자동으로 처리
      //   recipient_instagram_id: recipient.id,
      //   message: messageText.trim(),
      // });

      // const res = await fetch(
      //   `${INSTAGRAM_API_BASE_URL}/instagram/accounts/send-message?${params.toString()}`,
      //   {
      //     method: 'POST',
      //   }
      // );

      // apiFetch를 사용하여 POST 요청
      const res = await apiFetch(`/instagram/accounts/messages/send`, {
        method: 'POST',
        body: JSON.stringify({
          recipient_instagram_id: recipient.id, // recipient.id를 사용
          message_text: messageText.trim()
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || '메시지 전송 실패';
        alert(`메시지 전송 실패: ${errorMessage}`);
        return;
      }

      const data = await res.json();
      if (data.success) {
        // 메시지 전송 성공 - 입력 필드 초기화 및 메시지 목록 새로고침
        setMessageText('');
        // 메시지 목록 새로고침
        await loadMessages(selectedConversation.id);
        // 대화 목록도 새로고침 (최신 메시지 업데이트)
        await loadConversations();
      }
    } catch (err) {
      
      alert(`메시지 전송 중 오류가 발생했습니다: ${err.message}`);
    }
  };


  // 렌더링 시점 로그
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              인박스
            </h1>
            <p className="text-gray-600">인스타그램 DM을 확인하고 답장합니다.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            대시보드로 돌아가기
          </Button>
        </div>

        {!allowed && (
          <Card className="border border-amber-200 bg-amber-50 mb-6">
            <CardContent className="p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 mt-1" />
              <div>
                <p className="font-semibold text-amber-700">
                  관리자 승인 후 메시지 기능을 사용할 수 있습니다.
                </p>
                <p className="text-sm text-amber-700">
                  {loading ? '승인 상태 확인 중...' : (safeString(detail) || '관리자에게 승인을 요청해주세요.')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 대화 목록 */}
          <Card className="lg:col-span-1 shadow-md rounded-xl overflow-hidden border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                대화 목록
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-purple-600"
                onClick={() => loadConversations()}
                disabled={conversationsLoading}
              >
                <RefreshCcw className={`w-4 h-4 ${conversationsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] overflow-y-auto custom-scrollbar px-3 py-3 space-y-1">
                {conversationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : sortedConversations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">대화 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-1">
                    {sortedConversations.map((conv, convIndex) => {
                      const ourAccountIdsStr = ourAccountIds.map(id => String(id));
                      const displayName = conv.other_participant?.username || '사용자';
                      const avatarInitial = (displayName && displayName !== '사용자')
                        ? displayName.charAt(0).toUpperCase()
                        : '?';
                      const latestMsg = conv.latest_message;

                      const isSelected = selectedConversation?.id === conv.id;

                      return (
                        <div
                          key={conv.id}
                          onClick={() => setSelectedConversation(conv)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 bg-white hover:border-purple-300'
                            }`}
                        >
                          <div className="flex items-center gap-3 mb-1">
                            {/* 아바타 (메시지 상세와 동일한 스타일) */}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {avatarInitial}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-800 truncate">
                                  {displayName}
                                </span>
                                {conv.message_count > 0 && (
                                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white ml-2">
                                    {conv.message_count}
                                  </Badge>
                                )}
                              </div>
                              {latestMsg && (
                                <p className="text-xs text-gray-500 truncate mt-1">
                                  {safeString(latestMsg.message?.text || latestMsg.message) || '메시지 없음'}
                                </p>
                              )}
                              {conv.updated_time && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(conv.updated_time).toLocaleString('ko-KR')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 우측: 메시지 타임라인 & 입력 */}
          <Card className="lg:col-span-2 shadow-md rounded-xl overflow-hidden border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                {selectedConversation
                  ? (selectedConversation.other_participant?.username || '대화 상세')
                  : '대화를 선택해주세요'}
              </CardTitle>
              {selectedConversation && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-purple-600"
                  onClick={() => loadMessages(selectedConversation.id)}
                  disabled={messagesLoading}
                >
                  <RefreshCcw className={`w-4 h-4 ${messagesLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] flex flex-col relative">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : selectedConversation ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 custom-scrollbar min-h-0">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                          <MessageSquare className="w-10 h-10 opacity-20" />
                          <p>메시지가 없습니다.</p>
                        </div>
                      ) : (
                        <>
                          {messages.map((msg) => {
                            const fromId = msg.from?.id;
                            const isFromMe = ourAccountIds.includes(fromId);
                            const messageText = msg.message?.text || msg.message || '';
                            const createdTime = msg.created_time
                              ? new Date(msg.created_time).toLocaleString('ko-KR')
                              : '';

                            const getMessageAvatarInitial = (fromObj) => {
                              if (!fromObj) return '?';
                              const name = fromObj.username || fromObj.full_name || fromObj.name || '';
                              if (name) {
                                return name.trim().charAt(0).toUpperCase();
                              }
                              return '?';
                            };

                            const avatarInitial = getMessageAvatarInitial(msg.from);

                            return (
                              <div
                                key={msg.id}
                                className={`flex ${isFromMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 px-1`}
                              >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ring-2 ring-white shadow-sm">
                                  {avatarInitial}
                                </div>

                                <div className={`flex ${isFromMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[85%] gap-2`}>
                                  <div
                                    className={`rounded-2xl px-3 py-1.5 shadow-sm ${isFromMe
                                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-sm'
                                      : 'bg-gray-100 text-gray-800 rounded-bl-sm border border-gray-200'
                                      }`}
                                  >
                                    <p className="text-[13px] leading-tight whitespace-pre-wrap break-words">
                                      {safeString(messageText?.trim())}
                                    </p>
                                  </div>

                                  {createdTime && (
                                    <span className="text-[10px] text-gray-400 mb-0.5 whitespace-nowrap">
                                      {createdTime}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} className="pb-2" />
                        </>
                      )}
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0 z-10">
                      <textarea
                        className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
                        rows={3}
                        placeholder={allowed ? '메시지를 입력하세요...' : '관리자 승인 후 메시지를 보낼 수 있습니다.'}
                        disabled={!allowed}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && allowed && messageText.trim()) {
                            e.preventDefault();
                            void sendMessage();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {allowed ? 'Enter로 전송, Shift+Enter로 줄바꿈' : '승인 필요'}
                        </p>
                        <Button
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-60"
                          disabled={!allowed || !messageText.trim()}
                          onClick={() => void sendMessage()}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          전송
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                    <MessageSquare className="w-16 h-16 opacity-20" />
                    <p className="text-lg font-medium">대화를 선택하여 시작하세요</p>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  );
}


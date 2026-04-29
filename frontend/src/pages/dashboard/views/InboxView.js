import React from 'react';
import { Bot, Image as ImageIcon, Loader2, MessageSquare, Send, Trash2 } from 'lucide-react';

const InboxView = ({
  customerStatus,
  webhookStatus,
  igInsights,
  loadConversations,
  conversationsLoading,
  conversations,
  selectedConversation,
  setSelectedConversation,
  loadConversationMessages,
  messagesLoading,
  conversationMessages,
  ourAccountIds,
  displayName,
  messagesEndRef,
  newMessage,
  setNewMessage,
  handleSendMessage,
  sendingMessage,
  handleDeleteConversation,
}) => {
  const instagramAccount = customerStatus?.instagram_account;
  const pageId = instagramAccount?.page_id || webhookStatus?.page_id || 'N/A';
  const instagramUsername = instagramAccount?.instagram_username || igInsights?.username || 'N/A';
  const instagramUserId = instagramAccount?.instagram_user_id || igInsights?.instagram_user_id || 'N/A';
  const pageName = webhookStatus?.page_name || (pageId !== 'N/A' ? `Page (${pageId})` : 'Connected Page');

  // Check if Instagram account is connected: considered connected if pageId exists and is not 'N/A'
  const isInstagramConnected = pageId !== 'N/A' && (instagramAccount?.page_id || webhookStatus?.page_id);

  // Debugging: Check Instagram connection status
  if (process.env.NODE_ENV === 'development') {

  }

  return (
    <>
      <div className="mb-12 w-full flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-3 text-center">통합 인박스</h1>
        <p className="text-gray-500 font-medium text-center">웹훅을 통해 수신된 메시지와 응답 현황을 확인합니다</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Instagram style conversation list (left) */}
        <div className={`md:col-span-4 lg:col-span-3 border-r border-gray-200 bg-white flex flex-col h-full min-h-0 ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">메시지 목록</h2>
            <button
              onClick={loadConversations}
              disabled={conversationsLoading}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              title="새로고침"
            >
              <Loader2 className={`w-4 h-4 text-gray-600 ${conversationsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {conversationsLoading ? (
              <div>
                {/* Skeleton Loading */}
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="p-3 border-b border-gray-100 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">대화 내역이 없습니다</p>
              </div>
            ) : (
              <div>
                {conversations.filter(c => {
                  // Safety Filter: Ensure the conversation has at least one participant that IS NOT ME
                  const participants = c.participants?.data || [];
                  const hasOther = participants.some(p =>
                    (p.id !== instagramUserId && instagramUserId !== 'N/A') ||
                    (p.username !== instagramUsername && instagramUsername !== 'N/A')
                  );
                  return hasOther;
                }).map((conv) => {
                  const latestMessage = conv.latest_message;
                  const participants = conv.participants?.data || [];

                  // Robust finding of 'other' participant
                  const otherParticipant = participants.find(p =>
                    (p.id !== instagramUserId && instagramUserId !== 'N/A') ||
                    (p.username !== instagramUsername && instagramUsername !== 'N/A')
                  ) || participants[0];

                  const isSelected = selectedConversation?.id === conv.id;

                  // Calculate relative time
                  const getRelativeTime = (dateString) => {
                    if (!dateString) return '';
                    const date = new Date(dateString);
                    const now = new Date();
                    const diffMs = now - date;
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    if (diffMins < 1) return '방금';
                    if (diffMins < 60) return `${diffMins}분 전`;
                    if (diffHours < 24) return `${diffHours}시간 전`;
                    if (diffDays < 7) return `${diffDays}일 전`;
                    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                  };

                  const otherUsername = (otherParticipant?.username && !['사용자', 'Instagram User'].includes(otherParticipant.username) ? otherParticipant.username : null) || (otherParticipant?.name && !['사용자', 'Instagram User'].includes(otherParticipant.name) ? otherParticipant.name : null) || (otherParticipant?.id ? `Instagram User (${otherParticipant.id.slice(-4)})` : 'Instagram User');
                  const otherName = (otherParticipant?.name && !['사용자', 'Instagram User'].includes(otherParticipant.name) ? otherParticipant.name : null) || otherUsername;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`group w-full p-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${isSelected ? 'bg-gray-50' : ''
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Profile Image */}
                        {otherParticipant?.profile_picture_url ? (
                          <img
                            src={otherParticipant.profile_picture_url}
                            alt={otherUsername}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0 ring-2 ring-white" style={{ display: otherParticipant?.profile_picture_url ? 'none' : 'flex' }}>
                          {otherParticipant?.username ? (
                            <span className="text-white font-semibold text-sm">
                              {otherUsername.charAt(0).toUpperCase()}
                            </span>
                          ) : (
                            <MessageSquare className="w-6 h-6 text-white" />
                          )}
                        </div>

                        {/* Message Information */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {otherName}
                            </p>
                            {conv.updated_time && (
                              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                {getRelativeTime(conv.updated_time)}
                              </span>
                            )}
                          </div>
                          {conv.updated_time && (
                            <p className="text-xs text-gray-500 truncate">
                              {(() => {
                                const date = new Date(conv.updated_time);
                                const now = new Date();
                                const diffMs = now - date;
                                const diffMins = Math.floor(diffMs / 60000);
                                const diffHours = Math.floor(diffMs / 3600000);
                                const diffDays = Math.floor(diffMs / 86400000);

                                if (diffMins < 1) return '방금';
                                if (diffMins < 60) return `${diffMins}분 전`;
                                if (diffHours < 24) return `${diffHours}시간 전`;
                                if (diffDays < 7) return `${diffDays}일 전`;
                                return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                              })()}
                            </p>
                          )}
                        </div>

                        {/* Delete Button */}
                        <div className="flex-shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleDeleteConversation(e, conv.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="채팅방 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Instagram style message view (right) */}
        <div className={`md:col-span-8 lg:col-span-9 flex flex-col bg-white h-full min-h-0 ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Message Header */}
              <div className="px-6 py-6 border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
                {(() => {
                  // Get latest participant data from conversations list (which has fresh data)
                  // Get latest participant data from conversations list
                  const latestConvo = conversations.find(c => c.id === selectedConversation.id);
                  const participants = latestConvo?.participants?.data || selectedConversation.participants?.data || [];
                  const otherParticipant = participants.find(p =>
                    (p.id !== instagramUserId && instagramUserId !== 'N/A') ||
                    (p.username !== instagramUsername && instagramUsername !== 'N/A')
                  ) || participants[0];
                  const otherUsername = (otherParticipant?.username && !['사용자', 'Instagram User'].includes(otherParticipant.username) ? otherParticipant.username : null) || (otherParticipant?.name && !['사용자', 'Instagram User'].includes(otherParticipant.name) ? otherParticipant.name : null) || (otherParticipant?.id ? `Instagram User (${otherParticipant.id.slice(-4)})` : 'Instagram User');
                  const otherName = (otherParticipant?.name && !['사용자', 'Instagram User'].includes(otherParticipant.name) ? otherParticipant.name : null) || otherUsername;

                  return (
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Profile Image */}
                        {otherParticipant?.profile_picture_url ? (
                          <img
                            src={otherParticipant.profile_picture_url}
                            alt={otherUsername}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0" style={{ display: otherParticipant?.profile_picture_url ? 'none' : 'flex' }}>
                          {otherParticipant?.username ? (
                            <span className="text-white font-semibold text-sm">
                              {otherUsername.charAt(0).toUpperCase()}
                            </span>
                          ) : (
                            <MessageSquare className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="flex flex-col justify-center">
                          <p className="text-sm font-bold text-gray-900 leading-tight">{otherName}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => loadConversationMessages(selectedConversation.id)}
                        disabled={messagesLoading}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        title="메시지 새로고침"
                      >
                        <Loader2 className={`w-4 h-4 text-gray-600 ${messagesLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Message area - Latest messages at the bottom */}
              <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6 flex flex-col gap-4 min-h-0">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : conversationMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm text-gray-500">메시지가 없습니다</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {conversationMessages
                      .filter((msg) => {
                        const messageText = typeof msg.message === 'string'
                          ? msg.message
                          : msg.message?.text;
                        return messageText && messageText.trim();
                      })
                      .map((msg, idx) => {
                        const isFromMe = ourAccountIds.includes(msg.from?.id);
                        const filteredMessages = conversationMessages
                          .filter((m) => {
                            const mText = typeof m.message === 'string' ? m.message : m.message?.text;
                            return mText && mText.trim();
                          });
                        const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
                        const showTime = !prevMsg ||
                          new Date(msg.created_time) - new Date(prevMsg.created_time) > 300000;

                        return (
                          <div key={msg.id} className={`flex ${isFromMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 px-1`}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm">
                              <span className="text-white text-xs font-semibold">
                                {isFromMe
                                  ? (displayName?.charAt(0).toUpperCase() || 'M')
                                  : (msg.from?.username?.charAt(0).toUpperCase() || 'U')}
                              </span>
                            </div>

                            <div className={`flex ${isFromMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[85%] gap-2`}>
                              <div
                                className={`rounded-2xl px-3 py-1.5 shadow-sm ${isFromMe
                                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-br-sm'
                                  : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100'
                                  }`}
                              >
                                {(() => {
                                  const messageText = typeof msg.message === 'string'
                                    ? msg.message
                                    : msg.message?.text;
                                  if (!messageText || !messageText.trim()) return null;
                                  return (
                                    <p className="text-[13px] leading-tight whitespace-pre-wrap break-words">
                                      {messageText?.trim()}
                                    </p>
                                  );
                                })()}
                              </div>

                              {showTime && msg.created_time && (
                                <span className="text-[10px] text-gray-400 mb-0.5 whitespace-nowrap">
                                  {new Date(msg.created_time).toLocaleTimeString('ko-KR', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input Bottom Area */}
              <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
                <div className="relative flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-100 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all duration-300">
                  <button className="text-gray-400 hover:text-purple-500 transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 placeholder:text-gray-400 text-gray-900"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className={`p-2 rounded-xl transition-all duration-300 ${newMessage.trim() && !sendingMessage
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 ml-4 flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  관리용 답장 메시지입니다. Instagram 정책에 따라 24시간 이내의 대화에만 답장할 수 있습니다.
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">대화를 선택해주세요</h3>
                <p className="text-sm text-gray-500">메시지를 확인하거나 답장할 대화를 선택하세요</p>
              </div>
            </div>
          )}
        </div>
      </div >
    </>
  );
};

export default InboxView;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations} from '../../hooks/useTranslations';
import type { import MessageComposer from './MessageComposer';

import type { 
  Message, 
  Conversation, 
  User, 
  MessageReaction,
  TypingIndicator 
 } from '@/types/135135;
  getMessages, 
  sendMessage, 
  editMessage, 
  deleteMessage, 
  addReaction, 
  removeReaction,
  markMessageAsRead,
  sendTypingIndicator,
  onMessagesUpdate,
  onTypingUpdate
} from '../../lib/messaging';

interface ConversationProps {
  conversation: Conversation;
  currentUser: User;
  onConversationUpdate: (conversation: Conversation) => void;
}

const ConversationComponent: React.FC<ConversationProps> = ({
  conversation,
  currentUser,
  onConversationUpdate
}) => {
  const { t } = useTranslations();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingRef = useRef<Date>(new Date(0));

  useEffect(() => {
    loadMessages();
    
    // Set up real-time listeners
    const unsubscribeMessages = onMessagesUpdate(conversation.id, (updatedMessages) => {
      setMessages(updatedMessages);
      markVisibleMessagesAsRead();
    });

    const unsubscribeTyping = onTypingUpdate(conversation.id, (typingIndicators) => {
      setTypingUsers(typingIndicators.filter(indicator => indicator.userId !== currentUser.id));
    });

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  const loadMessages = async (loadMore = false) => {
    try {
      if(loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const offset = loadMore ? messages.length : 0;
      const newMessages = await getMessages(conversation.id, { limit: 50, offset });
      
      if(loadMore) {
        setMessages(prev => [...newMessages.reverse(), ...prev]);
        setHasMore(newMessages.length === 50);
      } else {
        setMessages(newMessages.reverse());
        setHasMore(newMessages.length === 50);
      }

      markVisibleMessagesAsRead();
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const markVisibleMessagesAsRead = useCallback(async () => {
    const unreadMessages = messages.filter(
      msg => msg.senderId !== currentUser.id && !msg.metadata.readAt
    );

    for (const message of unreadMessages) {
      try {
        await markMessageAsRead(message.id, currentUser.id);
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
  }, [messages, currentUser.id]);

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current || loadingMore || !hasMore) return;

    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop === 0) {
      loadMessages(true);
    }
  };

  const handleSendMessage = async (content: string, attachments: File[], replyTo?: string) => {
    try {
      const messageData = {
        conversationId: conversation.id,
        senderId: currentUser.id,
        recipientId: conversation.participants.find(id => id !== currentUser.id) || '',
        content,
        type: 'text' as const,
        replyTo
      };

      await sendMessage(messageData, attachments);
      setReplyToMessage(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await editMessage(messageId, newContent);
      setEditingMessageId(null);
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm(t('messaging.deleteMessageConfirm'))) return;

    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const existingReaction = message.metadata.reactions.find(
        r => r.emoji === emoji && r['userId'] === currentUser.id
      );

      if(existingReaction) {
        await removeReaction(messageId, emoji, currentUser.id);
      } else {
        await addReaction(messageId, emoji, currentUser.id);
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleTyping = useCallback(async () => {
    const now = new Date();
    const timeSinceLastTyping = now.getTime() - lastTypingRef.current.getTime();

    // Only send typing indicator if it's been more than 3 seconds since last one
    if (timeSinceLastTyping > 3000) {
      try {
        await sendTypingIndicator(conversation.id, currentUser.id);
        lastTypingRef.current = now;
      } catch (error) {
        console.error('Error sending typing indicator:', error);
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing indicator after 5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await sendTypingIndicator(conversation.id, currentUser.id, false);
      } catch (error) {
        console.error('Error stopping typing indicator:', error);
      }
    }, 5000);
  }, [conversation.id, currentUser.id]);

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('messaging.justNow');
    if (diffMins < 60) return t('messaging.minutesAgo', { count: diffMins });
    if (diffHours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: Message, index: number) => {
    const isOwn = message.senderId === currentUser.id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    const isFirstInGroup = !prevMessage || 
      prevMessage.senderId !== message.senderId ||
      (message.createdAt.getTime() - prevMessage['createdAt'].getTime()) > 5 * 60 * 1000; // 5 minutes
    
    const isLastInGroup = !nextMessage || 
      nextMessage.senderId !== message.senderId ||
      (nextMessage.createdAt.getTime() - message['createdAt'].getTime()) > 5 * 60 * 1000;

    const replyToMsg = message.metadata.replyTo ? 
      messages.find(m => m.id === message['metadata'].replyTo) : null;

    return (
      <div 
        key={message.id}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
          isFirstInGroup ? 'mt-4' : 'mt-1'
        }`}
      >
        <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
          {/* Reply indicator */}
          {replyToMsg && (
            <div className={`text-xs text-gray-500 mb-1 ${isOwn ? 'text-right' : 'text-left'}`}>
              <div className="bg-gray-100 rounded px-2 py-1 border-l-2 border-gray-300">
                {t('messaging.replyingTo')}: {replyToMsg.content.substring(0, 50)}
                {replyToMsg.content.length > 50 && '...'}
              </div>
            </div>
          )}

          <div 
            className={`relative group ${
              isOwn 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-900'
            } rounded-lg px-4 py-2 ${
              isFirstInGroup && !isOwn ? 'rounded-tl-sm' : ''
            } ${
              isFirstInGroup && isOwn ? 'rounded-tr-sm' : ''
            } ${
              isLastInGroup && !isOwn ? 'rounded-bl-sm' : ''
            } ${
              isLastInGroup && isOwn ? 'rounded-br-sm' : ''
            }`}
          >
            {editingMessageId === message.id ? (
              <div className="space-y-2">
                <textarea
                  defaultValue={message.content}
                  className="w-full bg-transparent border-none resize-none focus:outline-none"
                  rows={Math.max(1, Math.ceil(message.content.length / 50))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEditMessage(message.id, e.currentTarget.value);
                    } else if (e.key === 'Escape') {
                      setEditingMessageId(null);
                    }
                  }}
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const textarea = document['querySelector']('textarea');
                      if(textarea) {
                        handleEditMessage(message.id, textarea.value);
                      }
                    }}
                    className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                  >
                    {t('common.save')}
                  </button>
                  <button
                    onClick={() => setEditingMessageId(null)}
                    className="text-xs bg-gray-600 text-white px-2 py-1 rounded"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="break-words">{message.content}</div>
                
                {/* Attachments */}
                {message.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center space-x-2">
                        {attachment.fileType.startsWith('image/') ? (
                          <img 
                            src={attachment.fileUrl} 
                            alt={attachment.fileName}
                            className="max-w-xs rounded"
                          />
                        ) : (
                          <a 
                            href={attachment.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 bg-white bg-opacity-20 rounded px-2 py-1"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V6H8L6 4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm">{attachment.fileName}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Message actions */}
                <div className="absolute top-0 right-0 transform translate-x-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center space-x-1 bg-white rounded shadow-lg p-1">
                    {/* Reply */}
                    <button
                      onClick={() => setReplyToMessage(message)}
                      className="p-1 text-gray-600 hover:text-blue-600 rounded"
                      title={t('messaging.reply')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                    
                    {/* Reactions */}
                    <div className="relative">
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                        className="p-1 text-gray-600 hover:text-yellow-600 rounded"
                        title={t('messaging.addReaction')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      
                      {showEmojiPicker === message.id && (
                        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border p-2 z-10">
                          <div className="grid grid-cols-6 gap-1">
                            {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  handleReaction(message.id, emoji);
                                  setShowEmojiPicker(null);
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Edit (own messages only) */}
                    {isOwn && (
                      <button
                        onClick={() => setEditingMessageId(message.id)}
                        className="p-1 text-gray-600 hover:text-green-600 rounded"
                        title={t('messaging.edit')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}

                    {/* Delete */}
                    {isOwn && (
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="p-1 text-gray-600 hover:text-red-600 rounded"
                        title={t('messaging.delete')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Reactions */}
            {message['metadata'].reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(
                  message['metadata'].reactions.reduce((acc, reaction) => {
                    if (!acc[reaction.emoji]) acc[reaction.emoji] = [];
                    acc[reaction.emoji].push(reaction.userId);
                    return acc;
                  }, {} as Record<string, string[]>)
                ).map(([emoji, userIds]) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(message.id, emoji)}
                    className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                      userIds.includes(currentUser.id)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{userIds.length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timestamp and status */}
          {isLastInGroup && (
            <div className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
              {formatMessageTime(message['createdAt'])}
              {message['metadata'].edited && (
                <span className="ml-1">({t('messaging.edited')})</span>
              )}
              {isOwn && message['metadata'].readAt && (
                <span className="ml-1 text-blue-600">✓</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    return (
      <div className="flex justify-start mt-4">
        <div className="max-w-xs lg:max-w-md">
          <div className="bg-gray-200 text-gray-900 rounded-lg px-4 py-2">
            <div className="flex items-center space-x-1">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-sm text-gray-500 ml-2">
                {typingUsers.length === 1
                  ? t('messaging.typingOne')
                  : t('messaging.typingMultiple', { count: typingUsers.length })
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if(loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {conversation['type'] === 'group' 
              ? conversation.title || t('messaging.groupConversation')
              : t('messaging.directMessage')
            }
          </h3>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-600 hover:text-gray-900 rounded-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900 rounded-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
        onScroll={handleScroll}
      >
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {messages.map((message, index) => renderMessage(message, index))}
        
        {renderTypingIndicator()}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyToMessage && (
        <div className="border-t border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="text-sm text-gray-600">
                {t('messaging.replyingTo')}: {replyToMessage.content.substring(0, 50)}
                {replyToMessage.content.length > 50 && '...'}
              </span>
            </div>
            <button
              onClick={() => setReplyToMessage(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Message composer */}
      <div className="border-t border-gray-200">
        <MessageComposer
          onSendMessage={(content, attachments) => 
            handleSendMessage(content, attachments, replyToMessage?.id)
          }
          onTyping={handleTyping}
          placeholder={t('messaging.typeMessage')}
        />
      </div>

      {/* Typing indicator styles */}
      <style jsx>{`
        .typing-indicator {
          display: flex;
          align-items: center;
        }
        .typing-indicator span {
          height: 6px;
          width: 6px;
          border-radius: 50%;
          background-color: #9CA3AF;
          animation: typing 1.4s infinite ease-in-out;
          margin-right: 2px;
        }
        .typing-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }
        .typing-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }
        .typing-indicator span:nth-child(3) {
          animation-delay: 0s;
        }
        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ConversationComponent;
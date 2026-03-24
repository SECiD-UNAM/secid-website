import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import ConversationComponent from './Conversation';
import MessageComposer from './MessageComposer';
import type {
  Message,
  Conversation,
  User,
  MessageSearchFilters,
} from '@/types';
import {
  getConversations,
  searchMessages,
  markConversationAsRead,
  createConversation,
  deleteConversation,
  archiveConversation,
} from '../../lib/messaging';

interface DirectMessagesProps {
  currentUser: User;
  selectedUserId?: string;
  onUserSelect?: (userId: string) => void;
}

const DirectMessages: React.FC<DirectMessagesProps> = ({
  currentUser,
  selectedUserId,
  onUserSelect,
}) => {
  const { t } = useTranslations();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<'conversations' | 'search'>(
    'conversations'
  );
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadConversations();
  }, [currentUser.id, showArchived]);

  useEffect(() => {
    if (selectedUserId && conversations.length > 0) {
      const conversation = conversations.find(
        (conv) =>
          conv.participants.includes(selectedUserId) &&
          conv.participants.includes(currentUser.id)
      );
      if (conversation) {
        setSelectedConversation(conversation);
      } else {
        // Create new conversation
        handleCreateConversation(selectedUserId);
      }
    }
  }, [selectedUserId, conversations]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await getConversations(currentUser.id, showArchived);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setViewMode('conversations');
    onUserSelect?.(
      conversation.participants.find((id) => id !== currentUser.id) || ''
    );

    // Mark as read if there are unread messages
    const unreadCount =
      conversation['metadata'].unreadCount[currentUser.id] || 0;
    if (unreadCount > 0) {
      try {
        await markConversationAsRead(conversation.id, currentUser.id);
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversation.id
              ? {
                  ...conv,
                  metadata: {
                    ...conv['metadata'],
                    unreadCount: {
                      ...conv.metadata.unreadCount,
                      [currentUser.id]: 0,
                    },
                  },
                }
              : conv
          )
        );
      } catch (error) {
        console.error('Error marking conversation as read:', error);
      }
    }
  };

  const handleCreateConversation = async (recipientId: string) => {
    try {
      const conversation = await createConversation([
        currentUser.id,
        recipientId,
      ]);
      setConversations((prev) => [conversation, ...prev]);
      setSelectedConversation(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setViewMode('conversations');
      return;
    }

    setIsSearching(true);
    setViewMode('search');

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const filters: MessageSearchFilters = {
          query: query.trim(),
        };
        const results = await searchMessages(currentUser.id, filters);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching messages:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!window.confirm(t('messaging.deleteConversationConfirm'))) return;

    try {
      await deleteConversation(conversationId, currentUser.id);
      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId)
      );
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleArchiveConversation = async (conversationId: string) => {
    try {
      await archiveConversation(conversationId, currentUser.id, !showArchived);
      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId)
      );
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('Error archiving conversation:', error);
    }
  };

  const getConversationTitle = (conversation: Conversation) => {
    if (conversation['type'] === 'group') {
      return conversation.title || t('messaging.groupConversation');
    }

    const otherParticipantId = conversation.participants.find(
      (id) => id !== currentUser.id
    );
    // In a real app, you'd fetch user data for the participant
    return otherParticipantId || t('messaging.unknownUser');
  };

  const getUnreadCount = (conversation: Conversation) => {
    return conversation['metadata'].unreadCount[currentUser.id] || 0;
  };

  const formatLastMessageTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('messaging.justNow');
    if (diffMins < 60) return t('messaging.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('messaging.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('messaging.daysAgo', { count: diffDays });

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full rounded-lg bg-white shadow-lg">
      {/* Conversation List */}
      <div className="flex w-1/3 flex-col border-r border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('messaging.messages')}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`rounded-md p-2 transition-colors ${
                  showArchived
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={
                  showArchived
                    ? t('messaging.showActive')
                    : t('messaging.showArchived')
                }
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8l6 6 6-6"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder={t('messaging.searchMessages')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Conversation List or Search Results */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'search' ? (
            /* Search Results */
            <div className="p-4">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="mb-3 text-sm font-medium text-gray-700">
                    {t('messaging.searchResults', {
                      count: searchResults.length,
                    })}
                  </h3>
                  {searchResults.map((message) => (
                    <div
                      key={message.id}
                      className="cursor-pointer rounded-md bg-gray-50 p-3 hover:bg-gray-100"
                      onClick={() => {
                        const conversation = conversations.find(
                          (conv) => conv.id === message.conversationId
                        );
                        if (conversation) {
                          handleConversationSelect(conversation);
                        }
                      }}
                    >
                      <div className="mb-1 text-sm text-gray-600">
                        {formatLastMessageTime(message['createdAt'])}
                      </div>
                      <div className="line-clamp-2 text-sm text-gray-900">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery && !isSearching ? (
                <div className="py-8 text-center text-gray-500">
                  {t('messaging.noSearchResults')}
                </div>
              ) : null}
            </div>
          ) : (
            /* Conversations */
            <div className="divide-y divide-gray-200">
              {conversations.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  {showArchived
                    ? t('messaging.noArchivedConversations')
                    : t('messaging.noConversations')}
                </div>
              ) : (
                conversations.map((conversation) => {
                  const unreadCount = getUnreadCount(conversation);
                  const isSelected =
                    selectedConversation?.id === conversation.id;

                  return (
                    <div
                      key={conversation.id}
                      className={`cursor-pointer p-4 transition-colors hover:bg-gray-50 ${
                        isSelected
                          ? 'border-r-2 border-blue-500 bg-blue-50'
                          : ''
                      }`}
                      onClick={() => handleConversationSelect(conversation)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between">
                            <h3
                              className={`truncate text-sm font-medium ${
                                unreadCount > 0
                                  ? 'text-gray-900'
                                  : 'text-gray-700'
                              }`}
                            >
                              {getConversationTitle(conversation)}
                            </h3>
                            {unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-1 text-xs font-bold leading-none text-white">
                                {unreadCount}
                              </span>
                            )}
                          </div>

                          {conversation.lastMessage && (
                            <p
                              className={`truncate text-xs ${
                                unreadCount > 0
                                  ? 'font-medium text-gray-900'
                                  : 'text-gray-500'
                              }`}
                            >
                              {conversation.lastMessage.content}
                            </p>
                          )}

                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {formatLastMessageTime(conversation.lastActivity)}
                            </span>

                            <div className="flex items-center space-x-1">
                              {conversation['metadata'].pinned && (
                                <svg
                                  className="h-3 w-3 text-yellow-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4z" />
                                </svg>
                              )}
                              {conversation['metadata'].isMuted && (
                                <svg
                                  className="h-3 w-3 text-gray-400"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.8L6.618 15H4a1 1 0 01-1-1V6a1 1 0 011-1h2.618l1.765-1.4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Context Menu */}
                        <div className="group relative ml-2">
                          <button className="rounded-full p-1 opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100">
                            <svg
                              className="h-4 w-4 text-gray-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                            </svg>
                          </button>

                          <div className="pointer-events-none absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveConversation(conversation.id);
                              }}
                              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {showArchived
                                ? t('messaging.unarchive')
                                : t('messaging.archive')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conversation.id);
                              }}
                              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              {t('messaging.delete')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Conversation View */}
      <div className="flex flex-1 flex-col">
        {selectedConversation ? (
          <ConversationComponent
            conversation={selectedConversation}
            currentUser={currentUser}
            onConversationUpdate={(updatedConversation) => {
              setSelectedConversation(updatedConversation);
              setConversations((prev) =>
                prev.map((conv) =>
                  conv.id === updatedConversation.id
                    ? updatedConversation
                    : conv
                )
              );
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center">
              <svg
                className="mx-auto mb-4 h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                {t('messaging.selectConversation')}
              </h3>
              <p className="text-gray-500">
                {t('messaging.selectConversationDescription')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectMessages;

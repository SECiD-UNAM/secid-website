import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  MemberProfile,
  ConnectionRequest,
  DirectMessage,
  Conversation,
  MemberRecommendation,
} from '@/types/member';
import {
  UserPlusIcon,
  ChatBubbleLeftEllipsisIcon,
  BellIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  EllipsisVerticalIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
  HeartIcon,
  StarIcon,
  SparklesIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

interface NetworkingHubProps {
  lang?: 'es' | 'en';
}

export const NetworkingHub: React.FC<NetworkingHubProps> = ({
  lang = 'es',
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'connections' | 'requests' | 'messages' | 'recommendations'
  >('connections');
  const [connections, setConnections] = useState<MemberProfile[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<
    ConnectionRequest[]
  >([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [recommendations, setRecommendations] = useState<
    MemberRecommendation[]
  >([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNetworkingData();
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadNetworkingData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // In production, these would be Firebase queries
      // For now, using mock data
      await Promise.all([
        loadConnections(),
        loadConnectionRequests(),
        loadConversations(),
        loadRecommendations(),
      ]);
    } catch (error) {
      console.error('Error loading networking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    // Mock data - in production, fetch from Firestore
    const mockConnections: MemberProfile[] = [];
    setConnections(mockConnections);
  };

  const loadConnectionRequests = async () => {
    // Mock data - in production, fetch from Firestore
    const mockRequests: ConnectionRequest[] = [];
    setConnectionRequests(mockRequests);
  };

  const loadConversations = async () => {
    // Mock data - in production, fetch from Firestore
    const mockConversations: Conversation[] = [];
    setConversations(mockConversations);
  };

  const loadRecommendations = async () => {
    // Mock data - in production, fetch from Firestore based on user's profile
    const mockRecommendations: MemberRecommendation[] = [];
    setRecommendations(mockRecommendations);
  };

  const loadMessages = async (conversationId: string) => {
    try {
      // Mock data - in production, fetch from Firestore
      const mockMessages: DirectMessage[] = [];
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAcceptConnection = async (requestId: string) => {
    try {
      // In production, update Firestore
      setConnectionRequests((prev) =>
        prev.filter((req) => req.id !== requestId)
      );
      // Also add to connections
      await loadConnections();
    } catch (error) {
      console.error('Error accepting connection:', error);
    }
  };

  const handleRejectConnection = async (requestId: string) => {
    try {
      // In production, update Firestore
      setConnectionRequests((prev) =>
        prev.filter((req) => req.id !== requestId)
      );
    } catch (error) {
      console.error('Error rejecting connection:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const message: DirectMessage = {
        id: Date.now().toString(),
        conversationId: selectedConversation,
        from: user!.uid,
        to: '', // Would be determined from conversation
        content: newMessage.trim(),
        type: 'text',
        timestamp: new Date(),
        read: false,
      };

      // In production, save to Firestore
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleConnectToRecommendation = async (memberId: string) => {
    try {
      // In production, create connection request in Firestore
      console.log('Connecting to member:', memberId);
    } catch (error) {
      console.error('Error connecting to recommendation:', error);
    }
  };

  const filteredConnections = connections.filter(
    (member) =>
      member.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.profile.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    {
      id: 'connections',
      label: lang === 'es' ? 'Conexiones' : 'Connections',
      icon: UserGroupIcon,
      count: connections.length,
    },
    {
      id: 'requests',
      label: lang === 'es' ? 'Solicitudes' : 'Requests',
      icon: UserPlusIcon,
      count: connectionRequests.length,
    },
    {
      id: 'messages',
      label: lang === 'es' ? 'Mensajes' : 'Messages',
      icon: ChatBubbleLeftEllipsisIcon,
      count: conversations.reduce(
        (total, conv) => total + (conv.unreadCount?.[user?.uid || ''] || 0),
        0
      ),
    },
    {
      id: 'recommendations',
      label: lang === 'es' ? 'Recomendaciones' : 'Recommendations',
      icon: SparklesIcon,
      count: recommendations.length,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {lang === 'es' ? 'Cargando red...' : 'Loading network...'}
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {lang === 'es' ? 'Hub de Networking' : 'Networking Hub'}
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {lang === 'es'
                ? 'Conecta con otros profesionales de datos'
                : 'Connect with other data professionals'}
            </p>
          </div>
          <button
            onClick={loadNetworkingData}
            className="rounded-lg bg-primary-100 p-2 text-primary-700 transition-colors hover:bg-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/40"
            title={lang === 'es' ? 'Actualizar' : 'Refresh'}
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex space-x-1 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center rounded-lg px-4 py-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="mr-2 h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                      activeTab === tab.id
                        ? 'bg-primary-200 text-primary-800 dark:bg-primary-800 dark:text-primary-200'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'es'
                      ? 'Buscar conexiones...'
                      : 'Search connections...'
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Connections List */}
            {filteredConnections.length === 0 ? (
              <div className="py-8 text-center">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Sin conexiones' : 'No connections'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'es'
                    ? 'Comienza conectando con otros miembros'
                    : 'Start by connecting with other members'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredConnections.map((member) => (
                  <div
                    key={member.uid}
                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <div className="mb-3 flex items-center space-x-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 font-semibold text-white">
                        {member.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-semibold text-gray-900 dark:text-white">
                          {member.displayName}
                        </h4>
                        <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                          {member.profile.position}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          (window.location.href = `/${lang}/members/${member.uid}`)
                        }
                        className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      >
                        {lang === 'es' ? 'Ver perfil' : 'View profile'}
                      </button>
                      <button
                        onClick={() => {
                          // Start a conversation
                          const existingConv = conversations.find((conv) =>
                            conv.participants.includes(member.uid)
                          );
                          if (existingConv) {
                            setSelectedConversation(existingConv.id);
                            setActiveTab('messages');
                          }
                        }}
                        className="rounded-lg bg-primary-600 px-3 py-2 text-sm text-white transition-colors hover:bg-primary-700"
                      >
                        {lang === 'es' ? 'Mensaje' : 'Message'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Connection Requests Tab */}
        {activeTab === 'requests' && (
          <div className="p-6">
            {connectionRequests.length === 0 ? (
              <div className="py-8 text-center">
                <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Sin solicitudes' : 'No requests'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'es'
                    ? 'No tienes solicitudes de conexión pendientes'
                    : 'You have no pending connection requests'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {connectionRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 font-semibold text-white">
                          {/* Would show sender's initials */}?
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {/* Would show sender's name */}
                            {lang === 'es' ? 'Usuario' : 'User'}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <ClockIcon className="mr-1 inline h-3 w-3" />
                            {request['createdAt'].toLocaleDateString(
                              lang === 'es' ? 'es-MX' : 'en-US'
                            )}
                          </p>
                          {request['message'] && (
                            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                              "{request['message']}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAcceptConnection(request.id)}
                          className="rounded-lg bg-green-100 p-2 text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                          title={lang === 'es' ? 'Aceptar' : 'Accept'}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRejectConnection(request.id)}
                          className="rounded-lg bg-red-100 p-2 text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                          title={lang === 'es' ? 'Rechazar' : 'Reject'}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="flex h-96">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Conversaciones' : 'Conversations'}
                </h3>
              </div>
              <div className="overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center">
                    <ChatBubbleLeftEllipsisIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {lang === 'es'
                        ? 'Sin conversaciones'
                        : 'No conversations'}
                    </p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`w-full p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedConversation === conversation.id
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-sm font-semibold text-white">
                          ?
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900 dark:text-white">
                            {/* Would show other participant's name */}
                            {lang === 'es' ? 'Usuario' : 'User'}
                          </p>
                          {conversation.lastMessage && (
                            <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                        {(conversation.unreadCount?.[user?.uid || ''] ?? 0) >
                          0 && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">
                            {conversation.unreadCount?.[user?.uid || '']}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Message View */}
            <div className="flex flex-1 flex-col">
              {selectedConversation ? (
                <>
                  {/* Message Header */}
                  <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-sm font-semibold text-white">
                          ?
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {/* Would show other participant's name */}
                          {lang === 'es' ? 'Usuario' : 'User'}
                        </h4>
                      </div>
                      <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {messages.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {lang === 'es'
                            ? 'Sin mensajes aún'
                            : 'No messages yet'}
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.from === user?.uid ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs rounded-lg px-4 py-2 lg:max-w-md ${
                              message.from === user?.uid
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`mt-1 text-xs ${
                                message.from === user?.uid
                                  ? 'text-primary-100'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {message['timestamp'].toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === 'Enter' && handleSendMessage()
                        }
                        placeholder={
                          lang === 'es'
                            ? 'Escribe un mensaje...'
                            : 'Type a message...'
                        }
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <PaperAirplaneIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center">
                    <ChatBubbleLeftEllipsisIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      {lang === 'es'
                        ? 'Selecciona una conversación para comenzar'
                        : 'Select a conversation to start messaging'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="p-6">
            {recommendations.length === 0 ? (
              <div className="py-8 text-center">
                <SparklesIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Sin recomendaciones' : 'No recommendations'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'es'
                    ? 'Completa tu perfil para obtener mejores recomendaciones'
                    : 'Complete your profile to get better recommendations'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recommendations.map((recommendation) => (
                  <div
                    key={recommendation.member.uid}
                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <div className="mb-3 flex items-center space-x-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 font-semibold text-white">
                        {recommendation.member.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-semibold text-gray-900 dark:text-white">
                          {recommendation.member.displayName}
                        </h4>
                        <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                          {recommendation.member.profile.position}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                          {Math.round(recommendation.score)}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {lang === 'es' ? 'compatible' : 'match'}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="mb-1 text-xs text-gray-600 dark:text-gray-400">
                        {lang === 'es' ? 'Razón:' : 'Reason:'}
                      </p>
                      <div className="flex items-center text-xs text-primary-700 dark:text-primary-400">
                        {recommendation.reason === 'similar_skills' && (
                          <>
                            <StarIcon className="mr-1 h-3 w-3" />
                            {lang === 'es'
                              ? 'Habilidades similares'
                              : 'Similar skills'}
                          </>
                        )}
                        {recommendation.reason === 'same_company' && (
                          <>
                            <BuildingOfficeIcon className="mr-1 h-3 w-3" />
                            {lang === 'es' ? 'Misma empresa' : 'Same company'}
                          </>
                        )}
                        {recommendation.reason === 'mutual_connections' && (
                          <>
                            <UserGroupIcon className="mr-1 h-3 w-3" />
                            {lang === 'es'
                              ? 'Conexiones mutuas'
                              : 'Mutual connections'}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          (window.location.href = `/${lang}/members/${recommendation.member.uid}`)
                        }
                        className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      >
                        {lang === 'es' ? 'Ver perfil' : 'View profile'}
                      </button>
                      <button
                        onClick={() =>
                          handleConnectToRecommendation(
                            recommendation.member.uid
                          )
                        }
                        className="rounded-lg bg-primary-600 px-3 py-2 text-sm text-white transition-colors hover:bg-primary-700"
                      >
                        {lang === 'es' ? 'Conectar' : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkingHub;

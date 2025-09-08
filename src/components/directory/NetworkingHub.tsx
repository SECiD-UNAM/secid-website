import React, { useState, useEffect, useRef } from 'react';
import { useAuth} from '@/contexts/AuthContext';
import type { 
  MemberProfile, 
  ConnectionRequest, 
  DirectMessage, 
  Conversation, 
  MemberRecommendation 
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
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface NetworkingHubProps {
  lang?: 'es' | 'en';
}

export const NetworkingHub: React.FC<NetworkingHubProps> = ({ lang = 'es' }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'connections' | 'requests' | 'messages' | 'recommendations'>('connections');
  const [connections, setConnections] = useState<MemberProfile[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [recommendations, setRecommendations] = useState<MemberRecommendation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNetworkingData();
  }, [user]);

  useEffect(() => {
    if(selectedConversation) {
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
        loadRecommendations()
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
      setConnectionRequests(prev => prev.filter(req => req.id !== requestId));
      // Also add to connections
      await loadConnections();
    } catch (error) {
      console.error('Error accepting connection:', error);
    }
  };

  const handleRejectConnection = async (requestId: string) => {
    try {
      // In production, update Firestore
      setConnectionRequests(prev => prev.filter(req => req.id !== requestId));
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
        read: false
      };

      // In production, save to Firestore
      setMessages(prev => [...prev, message]);
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

  const filteredConnections = connections.filter(member =>
    member.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.profile.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    {
      id: 'connections',
      label: lang === 'es' ? 'Conexiones' : 'Connections',
      icon: UserGroupIcon,
      count: connections.length
    },
    {
      id: 'requests',
      label: lang === 'es' ? 'Solicitudes' : 'Requests',
      icon: UserPlusIcon,
      count: connectionRequests.length
    },
    {
      id: 'messages',
      label: lang === 'es' ? 'Mensajes' : 'Messages',
      icon: ChatBubbleLeftEllipsisIcon,
      count: conversations.reduce((total, conv) => total + (conv.unreadCount[user?.uid || ''] || 0), 0)
    },
    {
      id: 'recommendations',
      label: lang === 'es' ? 'Recomendaciones' : 'Recommendations',
      icon: SparklesIcon,
      count: recommendations.length
    }
  ];

  if(loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {lang === 'es' ? 'Cargando red...' : 'Loading network...'}
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {lang === 'es' ? 'Hub de Networking' : 'Networking Hub'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {lang === 'es' 
                ? 'Conecta con otros profesionales de datos' 
                : 'Connect with other data professionals'
              }
            </p>
          </div>
          <button
            onClick={loadNetworkingData}
            className="p-2 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/40 transition-colors"
            title={lang === 'es' ? 'Actualizar' : 'Refresh'}
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'es' ? 'Buscar conexiones...' : 'Search connections...'}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Connections List */}
            {filteredConnections.length === 0 ? (
              <div className="text-center py-8">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Sin conexiones' : 'No connections'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'es' 
                    ? 'Comienza conectando con otros miembros'
                    : 'Start by connecting with other members'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredConnections.map(member => (
                  <div key={member.uid} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold">
                        {member.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {member.displayName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {member.profile.position}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.location.href = `/${lang}/members/${member.uid}`}
                        className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {lang === 'es' ? 'Ver perfil' : 'View profile'}
                      </button>
                      <button
                        onClick={() => {
                          // Start a conversation
                          const existingConv = conversations.find(conv => 
                            conv.participants.includes(member.uid)
                          );
                          if(existingConv) {
                            setSelectedConversation(existingConv.id);
                            setActiveTab('messages');
                          }
                        }}
                        className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
              <div className="text-center py-8">
                <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Sin solicitudes' : 'No requests'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'es' 
                    ? 'No tienes solicitudes de conexión pendientes'
                    : 'You have no pending connection requests'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {connectionRequests.map(request => (
                  <div key={request.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold">
                          {/* Would show sender's initials */}
                          ?
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {/* Would show sender's name */}
                            {lang === 'es' ? 'Usuario' : 'User'}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <ClockIcon className="h-3 w-3 inline mr-1" />
                            {request['createdAt'].toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}
                          </p>
                          {request['message'] && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                              "{request['message']}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAcceptConnection(request.id)}
                          className="p-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors"
                          title={lang === 'es' ? 'Aceptar' : 'Accept'}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRejectConnection(request.id)}
                          className="p-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
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
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Conversaciones' : 'Conversations'}
                </h3>
              </div>
              <div className="overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center">
                    <ChatBubbleLeftEllipsisIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {lang === 'es' ? 'Sin conversaciones' : 'No conversations'}
                    </p>
                  </div>
                ) : (
                  conversations.map(conversation => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedConversation === conversation.id
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold text-sm">
                          ?
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {/* Would show other participant's name */}
                            {lang === 'es' ? 'Usuario' : 'User'}
                          </p>
                          {conversation.lastMessage && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                        {conversation.unreadCount[user?.uid || ''] > 0 && (
                          <div className="h-5 w-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                            {conversation.unreadCount[user?.uid || '']}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Message View */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Message Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold text-sm">
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
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {lang === 'es' ? 'Sin mensajes aún' : 'No messages yet'}
                        </p>
                      </div>
                    ) : (
                      messages.map(message => (
                        <div
                          key={message.id}
                          className={`flex ${message.from === user?.uid ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.from === user?.uid
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.from === user?.uid
                                ? 'text-primary-100'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {message['timestamp'].toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={lang === 'es' ? 'Escribe un mensaje...' : 'Type a message...'}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <PaperAirplaneIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <ChatBubbleLeftEllipsisIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                      {lang === 'es' 
                        ? 'Selecciona una conversación para comenzar'
                        : 'Select a conversation to start messaging'
                      }
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
              <div className="text-center py-8">
                <SparklesIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Sin recomendaciones' : 'No recommendations'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'es' 
                    ? 'Completa tu perfil para obtener mejores recomendaciones'
                    : 'Complete your profile to get better recommendations'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map(recommendation => (
                  <div key={recommendation.member.uid} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold">
                        {recommendation.member.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {recommendation.member.displayName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
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
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {lang === 'es' ? 'Razón:' : 'Reason:'}
                      </p>
                      <div className="flex items-center text-xs text-primary-700 dark:text-primary-400">
                        {recommendation.reason === 'similar_skills' && (
                          <>
                            <StarIcon className="h-3 w-3 mr-1" />
                            {lang === 'es' ? 'Habilidades similares' : 'Similar skills'}
                          </>
                        )}
                        {recommendation.reason === 'same_company' && (
                          <>
                            <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                            {lang === 'es' ? 'Misma empresa' : 'Same company'}
                          </>
                        )}
                        {recommendation.reason === 'mutual_connections' && (
                          <>
                            <UserGroupIcon className="h-3 w-3 mr-1" />
                            {lang === 'es' ? 'Conexiones mutuas' : 'Mutual connections'}
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.location.href = `/${lang}/members/${recommendation.member.uid}`}
                        className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {lang === 'es' ? 'Ver perfil' : 'View profile'}
                      </button>
                      <button
                        onClick={() => handleConnectToRecommendation(recommendation.member.uid)}
                        className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
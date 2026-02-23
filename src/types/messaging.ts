// Messaging types for SECiD direct messaging

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  contentType: 'text' | 'image' | 'file' | 'link';
  attachments?: MessageAttachment[];
  isRead: boolean;
  isEdited: boolean;
  editedAt?: Date;
  replyTo?: string;
  reactions?: MessageReaction[];
  createdAt: Date;
  deletedAt?: Date;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  type: string;
  size: number;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  type: 'direct' | 'group';
  name?: string;
  lastMessage?: Message;
  lastMessageAt?: Date;
  unreadCount: number;
  isArchived: boolean;
  isMuted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  userId: string;
  name: string;
  avatar?: string;
  role: 'member' | 'admin';
  joinedAt: Date;
  lastReadAt?: Date;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: Date;
}

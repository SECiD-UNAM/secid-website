import { 
import { 
import { db, storage} from './firebase';

  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import type { 
  Message, 
  Conversation, 
  MessageAttachment, 
  MessageSearchFilters,
  TypingIndicator 
} from '../types';

// Collection references
const conversationsRef = collection(db, 'conversations');
const messagesRef = collection(db, 'messages');
const typingRef = collection(db, 'typing');

// Message Functions
export const sendMessage = async (
  messageData: {
    conversationId: string;
    senderId: string;
    recipientId: string;
    content: string;
    type: 'text' | 'image' | 'file' | 'video' | 'audio';
    replyTo?: string;
  },
  attachments: File[] = []
): Promise<Message> => {
  try {
    // Upload attachments first
    const uploadedAttachments: MessageAttachment[] = [];
    
    for (const file of attachments) {
      const attachmentId = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const fileRef = ref(storage, `messages/${messageData.conversationId}/${attachmentId}_${file['name']}`);
      
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot['ref']);
      
      let thumbnailUrl: string | undefined;
      
      // Generate thumbnail for images
      if (file['type'].startsWith('image/')) {
        try {
          const thumbnailFile = await generateThumbnail(file);
          const thumbnailRef = ref(storage, `messages/${messageData.conversationId}/thumbnails/${attachmentId}_thumb`);
          const thumbnailSnapshot = await uploadBytes(thumbnailRef, thumbnailFile);
          thumbnailUrl = await getDownloadURL(thumbnailSnapshot.ref);
        } catch (error) {
          console.warn('Error generating thumbnail:', error);
        }
      }
      
      uploadedAttachments.push({
        id: attachmentId,
        fileName: file['name'],
        fileUrl: downloadURL,
        fileType: file['type'],
        fileSize: file.size,
        thumbnailUrl,
        uploadedAt: new Date()
      });
    }

    // Create message document
    const messageDoc = {
      conversationId: messageData.conversationId,
      senderId: messageData.senderId,
      recipientId: messageData.recipientId,
      content: messageData.content,
      type: messageData['type'],
      attachments: uploadedAttachments,
      metadata: {
        edited: false,
        editedAt: null,
        readAt: null,
        deliveredAt: serverTimestamp(),
        reactions: [],
        mentions: extractMentions(messageData.content),
        replyTo: messageData.replyTo || null
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(messagesRef, messageDoc);

    // Update conversation with last message
    const conversationDocRef = doc(conversationsRef, messageData.conversationId);
    await updateDoc(conversationDocRef, {
      lastMessage: {
        id: docRef['id'],
        content: messageData.content,
        senderId: messageData.senderId,
        createdAt: serverTimestamp()
      },
      lastActivity: serverTimestamp(),
      [`metadata.unreadCount.${messageData.recipientId}`]: increment(1),
      updatedAt: serverTimestamp()
    });

    // Convert Timestamp to Date for return
    const createdMessage: Message = {
      id: docRef['id'],
      ...messageData,
      attachments: uploadedAttachments,
      metadata: {
        edited: false,
        editedAt: undefined,
        readAt: undefined,
        deliveredAt: new Date(),
        reactions: [],
        mentions: extractMentions(messageData.content),
        replyTo: messageData.replyTo || undefined
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return createdMessage;
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }
};

export const getMessages = async (
  conversationId: string, 
  options: { limit?: number; offset?: number; before?: Date } = {}
): Promise<Message[]> => {
  try {
    const { limit: msgLimit = 50, offset = 0, before } = options;
    
    let messagesQuery = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'desc'),
      limit(msgLimit + offset)
    );

    if(before) {
      messagesQuery = query(
        messagesRef,
        where('conversationId', '==', conversationId),
        where('createdAt', '<', Timestamp.fromDate(before)),
        orderBy('createdAt', 'desc'),
        limit(msgLimit)
      );
    }

    const snapshot = await getDocs(messagesQuery);
    const messages = snapshot['docs'].slice(offset).map(doc => ({
      id: doc['id'],
      ...doc.data(),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      metadata: {
        ...doc['data']().metadata,
        editedAt: doc.data().metadata?.editedAt?.toDate(),
        readAt: doc['data']().metadata?.readAt?.toDate(),
        deliveredAt: doc.data().metadata?.deliveredAt?.toDate()
      }
    })) as Message[];

    return messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw new Error('Failed to get messages');
  }
};

export const editMessage = async (messageId: string, newContent: string): Promise<void> => {
  try {
    const messageDocRef = doc(messagesRef, messageId);
    await updateDoc(messageDocRef, {
      content: newContent,
      'metadata.edited': true,
      'metadata.editedAt': serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error editing message:', error);
    throw new Error('Failed to edit message');
  }
};

export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    const messageDocRef = doc(messagesRef, messageId);
    const messageDoc = await getDoc(messageDocRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const messageData = messageDoc['data']();
    
    // Delete attachments from storage
    if (messageData.attachments && messageData.attachments.length > 0) {
      for (const attachment of messageData.attachments) {
        try {
          const fileRef = ref(storage, attachment.fileUrl);
          await deleteObject(fileRef);
          
          if (attachment.thumbnailUrl) {
            const thumbnailRef = ref(storage, attachment.thumbnailUrl);
            await deleteObject(thumbnailRef);
          }
        } catch (error) {
          console.warn('Error deleting attachment:', error);
        }
      }
    }

    await deleteDoc(messageDocRef);
  } catch (error) {
    console.error('Error deleting message:', error);
    throw new Error('Failed to delete message');
  }
};

export const markMessageAsRead = async (messageId: string, userId: string): Promise<void> => {
  try {
    const messageDocRef = doc(messagesRef, messageId);
    await updateDoc(messageDocRef, {
      'metadata.readAt': serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw new Error('Failed to mark message as read');
  }
};

// Reaction Functions
export const addReaction = async (
  messageId: string, 
  emoji: string, 
  userId: string
): Promise<void> => {
  try {
    const messageDocRef = doc(messagesRef, messageId);
    await updateDoc(messageDocRef, {
      'metadata.reactions': arrayUnion({
        emoji,
        userId,
        createdAt: serverTimestamp()
      }),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    throw new Error('Failed to add reaction');
  }
};

export const removeReaction = async (
  messageId: string, 
  emoji: string, 
  userId: string
): Promise<void> => {
  try {
    const messageDocRef = doc(messagesRef, messageId);
    const messageDoc = await getDoc(messageDocRef);
    
    if (!messageDoc.exists()) return;

    const reactions = messageDoc.data().metadata?.reactions || [];
    const updatedReactions = reactions.filter(
      (reaction: any) => !(reaction.emoji === emoji && reaction['userId'] === userId)
    );

    await updateDoc(messageDocRef, {
      'metadata.reactions': updatedReactions,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    throw new Error('Failed to remove reaction');
  }
};

// Conversation Functions
export const getConversations = async (
  userId: string, 
  includeArchived = false
): Promise<Conversation[]> => {
  try {
    let conversationsQuery = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      orderBy('lastActivity', 'desc')
    );

    const snapshot = await getDocs(conversationsQuery);
    let conversations = snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data(),
      lastActivity: doc['data']().lastActivity?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc['data']().updatedAt?.toDate() || new Date(),
      lastMessage: doc.data().lastMessage ? {
        ...doc['data']().lastMessage,
        createdAt: doc.data().lastMessage['createdAt']?.toDate() || new Date()
      } : undefined
    })) as Conversation[];

    // Filter by archived status
    conversations = conversations.filter(conv => {
      const userMetadata = conv.metadata || {};
      const isArchived = userMetadata.isArchived || false;
      return includeArchived ? isArchived : !isArchived;
    });

    return conversations;
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw new Error('Failed to get conversations');
  }
};

export const createConversation = async (participantIds: string[]): Promise<Conversation> => {
  try {
    // Check if conversation already exists for these participants
    const existingQuery = query(
      conversationsRef,
      where('participants', '==', participantIds),
      where('type', '==', 'direct')
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      const existingDoc = existingSnapshot.docs?.[0];
      return {
        id: existingDoc['id'],
        ...existingDoc.data(),
        lastActivity: existingDoc['data']().lastActivity?.toDate() || new Date(),
        createdAt: existingDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: existingDoc['data']().updatedAt?.toDate() || new Date()
      } as Conversation;
    }

    // Create new conversation
    const conversationData = {
      participants: participantIds,
      type: participantIds.length > 2 ? 'group' : 'direct',
      title: null,
      avatar: null,
      lastMessage: null,
      lastActivity: serverTimestamp(),
      metadata: {
        createdBy: participantIds?.[0],
        isArchived: false,
        isMuted: false,
        pinned: false,
        unreadCount: participantIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
        typingUsers: []
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(conversationsRef, conversationData);

    return {
      id: docRef['id'],
      ...conversationData,
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as Conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw new Error('Failed to create conversation');
  }
};

export const markConversationAsRead = async (
  conversationId: string, 
  userId: string
): Promise<void> => {
  try {
    const conversationDocRef = doc(conversationsRef, conversationId);
    await updateDoc(conversationDocRef, {
      [`metadata['unreadCount'].${userId}`]: 0,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    throw new Error('Failed to mark conversation as read');
  }
};

export const archiveConversation = async (
  conversationId: string, 
  userId: string, 
  archive = true
): Promise<void> => {
  try {
    const conversationDocRef = doc(conversationsRef, conversationId);
    await updateDoc(conversationDocRef, {
      'metadata.isArchived': archive,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    throw new Error('Failed to archive conversation');
  }
};

export const deleteConversation = async (
  conversationId: string, 
  userId: string
): Promise<void> => {
  try {
    // Get all messages in the conversation
    const messagesQuery = query(
      messagesRef,
      where('conversationId', '==', conversationId)
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    
    // Delete all messages and their attachments
    for (const messageDoc of messagesSnapshot.docs) {
      await deleteMessage(messageDoc['id']);
    }

    // Delete the conversation
    const conversationDocRef = doc(conversationsRef, conversationId);
    await deleteDoc(conversationDocRef);
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw new Error('Failed to delete conversation');
  }
};

// Typing Indicators
export const sendTypingIndicator = async (
  conversationId: string, 
  userId: string, 
  isTyping = true
): Promise<void> => {
  try {
    const typingDocRef = doc(typingRef, `${conversationId}_${userId}`);
    
    if(isTyping) {
      await updateDoc(typingDocRef, {
        conversationId,
        userId,
        timestamp: serverTimestamp()
      }).catch(async () => {
        // Document doesn't exist, create it
        await addDoc(typingRef, {
          conversationId,
          userId,
          timestamp: serverTimestamp()
        });
      });
    } else {
      await deleteDoc(typingDocRef).catch(() => {
        // Document doesn't exist, ignore
      });
    }
  } catch (error) {
    console.error('Error sending typing indicator:', error);
  }
};

// Search Functions
export const searchMessages = async (
  userId: string, 
  filters: MessageSearchFilters
): Promise<Message[]> => {
  try {
    // Get user's conversations first
    const userConversations = await getConversations(userId);
    const conversationIds = userConversations.map(conv => conv['id']);

    if (conversationIds.length === 0) return [];

    let messagesQuery = query(
      messagesRef,
      where('conversationId', 'in', conversationIds.slice(0, 10)), // Firestore 'in' limit
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    // Apply additional filters
    if (filters.conversationId) {
      messagesQuery = query(
        messagesRef,
        where('conversationId', '==', filters.conversationId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    }

    if (filters.senderId) {
      messagesQuery = query(
        messagesQuery,
        where('senderId', '==', filters.senderId)
      );
    }

    if (filters.messageType) {
      messagesQuery = query(
        messagesQuery,
        where('type', '==', filters.messageType)
      );
    }

    const snapshot = await getDocs(messagesQuery);
    let messages = snapshot.docs.map(doc => ({
      id: doc['id'],
      ...doc.data(),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      metadata: {
        ...doc['data']().metadata,
        editedAt: doc.data().metadata?.editedAt?.toDate(),
        readAt: doc['data']().metadata?.readAt?.toDate(),
        deliveredAt: doc.data().metadata?.deliveredAt?.toDate()
      }
    })) as Message[];

    // Client-side filtering for text search
    if (filters.query) {
      const searchTerm = filters.query.toLowerCase();
      messages = messages.filter(message => 
        message.content.toLowerCase().includes(searchTerm)
      );
    }

    // Date range filtering
    if (filters.dateRange) {
      messages = messages.filter(message => 
        message['createdAt'] >= filters.dateRange!.start && 
        message['createdAt'] <= filters.dateRange!.end
      );
    }

    // Attachment filtering
    if (filters.hasAttachments !== undefined) {
      messages = messages.filter(message => 
        filters.hasAttachments ? message.attachments.length > 0 : message.attachments.length === 0
      );
    }

    return messages;
  } catch (error) {
    console.error('Error searching messages:', error);
    throw new Error('Failed to search messages');
  }
};

// Real-time Listeners
export const onMessagesUpdate = (
  conversationId: string, 
  callback: (messages: Message[]) => void
): (() => void) => {
  const messagesQuery = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data(),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      metadata: {
        ...doc['data']().metadata,
        editedAt: doc.data().metadata?.editedAt?.toDate(),
        readAt: doc['data']().metadata?.readAt?.toDate(),
        deliveredAt: doc.data().metadata?.deliveredAt?.toDate()
      }
    })) as Message[];

    callback(messages.reverse());
  });
};

export const onTypingUpdate = (
  conversationId: string, 
  callback: (typingUsers: TypingIndicator[]) => void
): (() => void) => {
  const typingQuery = query(
    typingRef,
    where('conversationId', '==', conversationId)
  );

  return onSnapshot(typingQuery, (snapshot) => {
    const typingUsers = snapshot['docs'].map(doc => ({
      userId: doc['data']().userId,
      timestamp: doc.data().timestamp?.toDate() || new Date()
    })) as TypingIndicator[];

    // Filter out old typing indicators (older than 10 seconds)
    const now = new Date();
    const activeTypingUsers = typingUsers.filter(
      indicator => (now.getTime() - indicator['timestamp'].getTime()) < 10000
    );

    callback(activeTypingUsers);
  });
};

// Utility Functions
const extractMentions = (content: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match?.[1]);
  }

  return mentions;
};

const generateThumbnail = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Set thumbnail dimensions
      const maxSize = 200;
      const { width, height } = img;
      const scale = Math.min(maxSize / width, maxSize / height);
      
      canvas.width = width * scale;
      canvas.height = height * scale;

      // Draw image on canvas
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob((blob) => {
        if(blob) {
          const thumbnailFile = new File([blob], `thumb_${file['name']}`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(thumbnailFile);
        } else {
          reject(new Error('Failed to generate thumbnail'));
        }
      }, 'image/jpeg', 0.8);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};
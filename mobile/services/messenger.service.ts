import apiClient, { API_BASE_URL } from './api';

export interface MessengerParticipant {
  id: string;
  user_id?: string;
  full_name: string;
  email?: string;
  mobile?: string;
  role?: string;
  profile_photo?: string;
  avatar_url?: string;
  partner_code?: string;
  employee_code?: string;
  last_active_at?: string;
  last_logout_at?: string;
  last_login?: string;
}

export interface MessengerConversation {
  id: string;
  conversation_type: 'DIRECT' | 'GROUP' | 'APPLICATION' | 'DEPARTMENT';
  name?: string;
  title?: string;
  description?: string;
  avatar_url?: string;
  application_id?: string;
  application_number?: string;
  application_status?: string;
  is_pinned?: boolean;
  is_muted?: boolean;
  is_starred?: boolean;
  is_archived?: boolean;
  participant_role?: string;
  unread_count?: number;
  last_message_at?: string;
  last_message_text?: string;
  last_message?: {
    id: string;
    message_text?: string;
    message_type?: string;
    created_at: string;
    sender_name?: string;
  };
  other_user?: MessengerParticipant;
  other_participants?: MessengerParticipant[];
  participants?: MessengerParticipant[];
  created_at: string;
  updated_at: string;
}

export interface MessengerContact {
  id: string;
  full_name: string;
  email: string;
  mobile?: string;
  role: string;
  partner_code?: string;
  employee_id?: string;
  designation?: string;
}

export interface MessengerMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  message_text?: string;
  message_type?: string;
  attachments?: Array<{
    id?: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size?: string;
  }>;
  is_edited?: boolean;
  edited_at?: string;
  deleted_at?: string | null;
  reply_to?: {
    id: string;
    sender_id: string;
    sender_name?: string;
    message_text?: string;
  } | null;
  reads?: Array<{ user_id: string; read_at: string }>;
  is_read?: boolean;
  sender_role?: string;
  created_at: string;
}

/**
 * Sensitive Data Masker (Masks PAN cards & 10-12 digit Indian mobile numbers)
 */
export function maskSensitiveData(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return text || '';

  // 1. Mask PAN Card (5 letters + 4 digits + 1 letter -> ABCD******)
  let masked = text.replace(/\b([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})\b/gi, (match) => {
    return match.slice(0, 4) + '******';
  });

  // 2. Mask +91 / 91 12-digit Indian mobile numbers (e.g. +919876543210 -> +919876******)
  masked = masked.replace(/(\+?91[\s-]?)?([6-9]\d{3})(\d{6})\b/g, (match, countryCode, prefix, lastSix) => {
    const code = countryCode || '';
    return `${code}${prefix}******`;
  });

  // 3. Mask standalone 10 to 12 digit phone number sequences
  masked = masked.replace(/\b([0-9]{4,6})([0-9]{6})\b/g, (match, prefix, lastSix) => {
    return `${prefix}******`;
  });

  return masked;
}

export const getConversations = async (filter = 'ALL', search = ''): Promise<MessengerConversation[]> => {
  const res = await apiClient.get('/messenger/conversations', { params: { filter, search } });
  const rows: any[] = res.data?.data || [];
  return rows.map((c) => {
    const others: MessengerParticipant[] = c.other_participants || c.participants || [];
    const otherUser = others[0];
    const normalized: MessengerConversation = {
      ...c,
      other_user: otherUser,
      other_participants: others,
      last_message_at: c.last_message_at || c.updated_at || c.created_at,
    };
    // Resolve display name the same way the website does
    if (c.conversation_type === 'APPLICATION') {
      normalized.name = c.name || `Application #${c.application_number || ''}`.trim();
      normalized.title = normalized.name;
    } else if (c.conversation_type === 'DIRECT') {
      normalized.name = otherUser?.full_name || c.name || 'Direct Chat';
      normalized.title = normalized.name;
    } else {
      normalized.name = c.name || (c.conversation_type === 'DEPARTMENT' ? 'Department Channel' : 'Group Chat');
      normalized.title = normalized.name;
    }
    // Backend returns flattened last_message_* fields; synthesize last_message object
    if (!normalized.last_message && c.last_message_text !== undefined) {
      normalized.last_message = {
        id: c.last_message_id || '',
        message_text: c.last_message_text,
        created_at: c.last_message_at || c.updated_at || c.created_at,
      };
    }
    return normalized;
  });
};

export const getContacts = async (query = ''): Promise<MessengerContact[]> => {
  const res = await apiClient.get('/messenger/contacts', { params: { query } });
  return res.data?.data || [];
};

export const startDirectChat = async (targetUserId: string): Promise<MessengerConversation> => {
  const res = await apiClient.post('/messenger/conversations/direct', { target_user_id: targetUserId });
  return res.data?.data;
};

export const createGroupChat = async (data: { name: string; description?: string; member_user_ids: string[] }): Promise<MessengerConversation> => {
  const res = await apiClient.post('/messenger/conversations/group', data);
  return res.data?.data;
};

export const togglePinConversation = async (conversationId: string): Promise<{ conversation_id: string; is_pinned: boolean }> => {
  const res = await apiClient.post(`/messenger/conversations/${conversationId}/pin`);
  return res.data?.data;
};

export const getMessages = async (conversationId: string, limit = 100): Promise<MessengerMessage[]> => {
  const res = await apiClient.get(`/messenger/conversations/${conversationId}/messages`, { params: { limit } });
  return res.data?.data || [];
};

export const sendMessage = async (data: {
  conversation_id: string;
  message_text?: string;
  message_type?: string;
  reply_to_message_id?: string;
  attachments?: any[];
}): Promise<MessengerMessage> => {
  const res = await apiClient.post('/messenger/messages', data);
  return res.data?.data;
};

export const uploadAttachment = async (
  fileUri: string,
  fileName?: string,
  fileMimeType?: string
): Promise<any> => {
  const name = fileName || fileUri.split('/').pop() || `file_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(name);
  const type = fileMimeType || (match ? `image/${match[1]}` : 'image/jpeg');

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: name,
    type: type,
  } as any);

  const res = await apiClient.post('/messenger/attachments/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data?.data;
};

export const sendMessageWithAttachment = async (
  conversationId: string,
  imageUri: string,
  messageText?: string
): Promise<MessengerMessage> => {
  const formData = new FormData();
  formData.append('conversation_id', conversationId);
  if (messageText) {
    formData.append('message_text', messageText);
  }
  formData.append('message_type', 'IMAGE');
  
  const filename = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  
  formData.append('file', {
    uri: imageUri,
    name: filename,
    type: type,
  } as any);
  
  const res = await apiClient.post('/messenger/messages', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data?.data;
};

export const markRead = async (conversationId: string): Promise<boolean> => {
  const res = await apiClient.post(`/messenger/conversations/${conversationId}/read`);
  return res.data?.success || false;
};

export const clearChat = async (conversationId: string): Promise<boolean> => {
  const res = await apiClient.post(`/messenger/conversations/${conversationId}/clear`);
  return res.data?.success || false;
};

export const leaveGroup = async (conversationId: string): Promise<boolean> => {
  const res = await apiClient.post(`/messenger/conversations/${conversationId}/leave`);
  return res.data?.success || false;
};

export const deleteConversation = async (conversationId: string): Promise<boolean> => {
  const res = await apiClient.delete(`/messenger/conversations/${conversationId}`);
  return res.data?.success || false;
};

export const editMessage = async (messageId: string, messageText: string): Promise<MessengerMessage> => {
  const res = await apiClient.put(`/messenger/messages/${messageId}`, { message_text: messageText });
  return res.data?.data;
};

export const deleteMessage = async (messageId: string): Promise<boolean> => {
  const res = await apiClient.delete(`/messenger/messages/${messageId}`);
  return res.data?.success !== false;
};

export const getGroupMembers = async (conversationId: string): Promise<any[]> => {
  const res = await apiClient.get(`/messenger/conversations/${conversationId}/members`);
  return res.data?.data || [];
};

export const addGroupMembers = async (conversationId: string, userIds: string[]): Promise<boolean> => {
  const res = await apiClient.post(`/messenger/conversations/${conversationId}/members`, { user_ids: userIds });
  return res.data?.success !== false;
};

export const removeGroupMember = async (conversationId: string, userId: string): Promise<boolean> => {
  const res = await apiClient.delete(`/messenger/conversations/${conversationId}/members/${userId}`);
  return res.data?.success !== false;
};

/** Resolve a possibly-relative messenger media URL to an absolute URL */
export const resolveMediaUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url.startsWith('data:')) {
    return url;
  }
  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const getUnreadCount = async (): Promise<number> => {
  try {
    const res = await apiClient.get('/messenger/unread-count');
    return res.data?.data?.unread_count || 0;
  } catch (err) {
    return 0;
  }
};

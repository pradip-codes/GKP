import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, Image, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/Icon';
import { Card } from '../../components/Card';
import {
  getConversations,
  getContacts,
  startDirectChat,
  createGroupChat,
  getMessages,
  sendMessage,
  sendMessageWithAttachment,
  uploadAttachment,
  markRead,
  togglePinConversation,
  maskSensitiveData,
  resolveMediaUrl,
  editMessage,
  deleteMessage,
  getGroupMembers,
  addGroupMembers,
  removeGroupMember,
  MessengerConversation,
  MessengerContact,
  MessengerMessage,
  MessengerParticipant,
} from '../../services/messenger.service';

import { AppState } from 'react-native';
import { getMessengerSocket } from '../../services/messengerSocket';

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'UNREAD', label: 'Unread' },
  { key: 'DIRECT', label: 'Direct' },
  { key: 'GROUPS', label: 'Groups' },
  { key: 'APPLICATIONS', label: 'Applications' },
];

type ConvTab = 'ALL' | 'UNREAD' | 'DIRECT' | 'GROUPS' | 'APPLICATIONS';

const CONV_TYPE_META: Record<string, { color: string; icon: string }> = {
  DIRECT: { color: '#0EA5E9', icon: 'person' },
  GROUP: { color: '#3B82F6', icon: 'people' },
  APPLICATION: { color: '#F59E0B', icon: 'document-text' },
  DEPARTMENT: { color: '#8B5CF6', icon: 'people' },
};

/** Port of the website's getUserStatusText — online if active within 3 minutes and not logged out */
function getUserStatus(userObj?: MessengerParticipant | null): { text: string; isOnline: boolean } {
  if (!userObj) return { text: 'Offline', isOnline: false };
  const lastActive = userObj.last_active_at ? new Date(userObj.last_active_at).getTime() : null;
  const lastLogout = userObj.last_logout_at ? new Date(userObj.last_logout_at).getTime() : null;
  const lastLogin = userObj.last_login ? new Date(userObj.last_login).getTime() : null;
  const now = Date.now();
  const isRecentlyActive = Boolean(lastActive && now - lastActive <= 180000);
  const isLoggedOut = Boolean(lastLogout && lastActive && lastLogout >= lastActive);
  if (isRecentlyActive && !isLoggedOut) return { text: 'Online', isOnline: true };

  const lastSeenTs = (lastLogout && (!lastActive || lastLogout >= lastActive)) ? lastLogout : (lastActive || lastLogin);
  if (!lastSeenTs) return { text: 'Offline', isOnline: false };
  const seenDate = new Date(lastSeenTs);
  if (isNaN(seenDate.getTime())) return { text: 'Offline', isOnline: false };

  const diffMs = Math.max(0, now - seenDate.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let timeStr = '';
  if (diffMins < 1) timeStr = 'just now';
  else if (diffMins < 60) timeStr = `${diffMins}m ago`;
  else if (diffHours < 24) timeStr = `${diffHours}h ago`;
  else if (diffDays === 1) {
    const hours = seenDate.getHours();
    const minutes = String(seenDate.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    timeStr = `yesterday at ${hours % 12 || 12}:${minutes} ${ampm}`;
  } else {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hours = seenDate.getHours();
    const minutes = String(seenDate.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    timeStr = `${seenDate.getDate()} ${months[seenDate.getMonth()]} at ${hours % 12 || 12}:${minutes} ${ampm}`;
  }
  return { text: `Last seen ${timeStr}`, isOnline: false };
}

/** Website-style conversation subtitle */
function getConvStatus(conv: MessengerConversation): { text: string; isOnline: boolean } {
  if (conv.conversation_type === 'GROUP') {
    const count = conv.other_participants?.length || conv.participants?.length;
    return { text: count ? `${count + 1} members` : 'Group', isOnline: true };
  }
  if (conv.conversation_type === 'DEPARTMENT') {
    return { text: 'Department Channel', isOnline: true };
  }
  if (conv.conversation_type === 'APPLICATION') {
    return { text: `Application Channel${conv.application_number ? ` #${conv.application_number}` : ''}`, isOnline: true };
  }
  const target = conv.other_participants?.[0] || conv.other_user || conv.participants?.[0];
  return getUserStatus(target);
}

/** Website-style relative timestamp for the conversation list */
function formatConvTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function isSameDay(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MessengerScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ConvTab>('ALL');
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [activeConv, setActiveConv] = useState<MessengerConversation | null>(null);
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<MessengerMessage | null>(null);
  const [emojiBarVisible, setEmojiBarVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState<MessengerMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);

  // Group members modal state
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberContacts, setMemberContacts] = useState<MessengerContact[]>([]);
  const [selectedAddIds, setSelectedAddIds] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);

  // New chat modal state
  const [newChatMode, setNewChatMode] = useState<'direct' | 'group'>('direct');
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // New Chat Modal State
  const [newChatModalVisible, setNewChatModalVisible] = useState(false);
  const [contacts, setContacts] = useState<MessengerContact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const activeConvRef = useRef<MessengerConversation | null>(null);

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  const fetchConvs = useCallback(async () => {
    try {
      const data = await getConversations(activeTab, searchQuery);
      // Website parity: pinned first, then latest activity
      const sorted = [...data].sort((a, b) => {
        if (!!a.is_pinned !== !!b.is_pinned) return a.is_pinned ? -1 : 1;
        const ta = new Date(a.last_message_at || a.last_message?.created_at || a.updated_at || 0).getTime();
        const tb = new Date(b.last_message_at || b.last_message?.created_at || b.updated_at || 0).getTime();
        return tb - ta;
      });
      setConversations(sorted);
    } catch (e) {
      console.error('Error fetching conversations:', e);
    } finally {
      setLoadingConvs(false);
      setRefreshing(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchConvs();
  }, [fetchConvs]);

  // Socket event subscription
  useEffect(() => {
    let isMounted = true;

    const setupSocketListeners = async () => {
      const socket = await getMessengerSocket();
      if (!socket || !isMounted) return;

      const handleNewMessage = (data: { conversation_id: string; message: MessengerMessage }) => {
        if (!data || !data.conversation_id || !data.message) return;
        const { conversation_id, message } = data;

        // 1. If message belongs to active thread
        if (activeConvRef.current && activeConvRef.current.id === conversation_id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

          if (String(message.sender_id).toLowerCase() !== String(user?.id).toLowerCase()) {
            markRead(conversation_id).catch(() => {});
          }
        }

        // 2. Incrementally update conversation list
        setConversations((prevConvs) => {
          const targetIndex = prevConvs.findIndex((c) => c.id === conversation_id);
          const isCurrentActive = activeConvRef.current?.id === conversation_id;
          const isOtherSender = String(message.sender_id).toLowerCase() !== String(user?.id).toLowerCase();

          if (targetIndex !== -1) {
            const targetConv = { ...prevConvs[targetIndex] };
            targetConv.last_message = {
              id: message.id,
              message_text: message.message_text,
              message_type: message.message_type,
              created_at: message.created_at,
              sender_name: message.sender_name,
            };
            targetConv.updated_at = message.created_at;
            targetConv.last_message_at = message.created_at;

            if (!isCurrentActive && isOtherSender) {
              targetConv.unread_count = (targetConv.unread_count || 0) + 1;
            }

            const updatedList = [...prevConvs];
            updatedList.splice(targetIndex, 1);
            const resorted = [targetConv, ...updatedList].sort((a, b) => {
              if (!!a.is_pinned !== !!b.is_pinned) return a.is_pinned ? -1 : 1;
              const ta = new Date(a.last_message_at || a.last_message?.created_at || a.updated_at || 0).getTime();
              const tb = new Date(b.last_message_at || b.last_message?.created_at || b.updated_at || 0).getTime();
              return tb - ta;
            });
            return resorted;
          } else {
            fetchConvs();
            return prevConvs;
          }
        });
      };

      const handleMessageRead = (data: { conversation_id: string; user_id: string }) => {
        if (!data || !data.conversation_id) return;
        if (String(data.user_id).toLowerCase() === String(user?.id).toLowerCase()) {
          setConversations((prevConvs) =>
            prevConvs.map((c) => (c.id === data.conversation_id ? { ...c, unread_count: 0 } : c))
          );
        }
      };

      const handleMessageEdited = (data: { conversation_id: string; message: MessengerMessage }) => {
        if (!data || !data.message) return;
        if (activeConvRef.current?.id === data.conversation_id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === data.message.id ? { ...m, ...data.message } : m))
          );
        }
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === data.conversation_id && c.last_message?.id === data.message.id) {
              return {
                ...c,
                last_message: {
                  ...c.last_message,
                  message_text: data.message.message_text,
                },
              };
            }
            return c;
          })
        );
      };

      const handleMessageDeleted = (data: { conversation_id: string; message_id: string }) => {
        if (!data || !data.message_id) return;
        if (activeConvRef.current?.id === data.conversation_id) {
          setMessages((prev) => prev.filter((m) => m.id !== data.message_id));
        }
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === data.conversation_id && c.last_message?.id === data.message_id) {
              return {
                ...c,
                last_message: {
                  ...c.last_message,
                  message_text: 'Message deleted',
                },
              };
            }
            return c;
          })
        );
      };

      const handleTypingUpdate = (data: {
        conversation_id: string;
        user_id: string;
        user_name: string;
        is_typing: boolean;
      }) => {
        if (!data) return;
        if (
          activeConvRef.current?.id === data.conversation_id &&
          String(data.user_id).toLowerCase() !== String(user?.id).toLowerCase()
        ) {
          setTypingUser(data.is_typing ? data.user_name || 'Someone' : null);
        }
      };

      const handleReconnect = () => {
        fetchConvs();
        if (activeConvRef.current) {
          getMessages(activeConvRef.current.id)
            .then((msgs) => setMessages(msgs))
            .catch(() => {});
        }
      };

      socket.on('message:new', handleNewMessage);
      socket.on('message:read', handleMessageRead);
      socket.on('message:edited', handleMessageEdited);
      socket.on('message:deleted', handleMessageDeleted);
      socket.on('typing:update', handleTypingUpdate);
      socket.on('connect', handleReconnect);

      const appStateSub = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
          fetchConvs();
          if (!socket.connected) {
            socket.connect();
          }
        }
      });

      return () => {
        appStateSub.remove();
        socket.off('message:new', handleNewMessage);
        socket.off('message:read', handleMessageRead);
        socket.off('message:edited', handleMessageEdited);
        socket.off('message:deleted', handleMessageDeleted);
        socket.off('typing:update', handleTypingUpdate);
        socket.off('connect', handleReconnect);
      };
    };

    let cleanupFn: (() => void) | undefined;
    setupSocketListeners().then((cleanup) => {
      cleanupFn = cleanup;
    });

    return () => {
      isMounted = false;
      if (cleanupFn) cleanupFn();
    };
  }, [user?.id, fetchConvs]);

  const openConversation = async (conv: MessengerConversation) => {
    setActiveConv(conv);
    setLoadingMsgs(true);
    try {
      const msgs = await getMessages(conv.id);
      setMessages(msgs);
      await markRead(conv.id);
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
      );
    } catch (e) {
      console.error('Failed to load messages:', e);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedImage && !selectedDocument) || !activeConv || sending) return;
    const textToSend = inputText.trim();
    const replyId = replyTo?.id;
    const imageUri = selectedImage;
    const doc = selectedDocument;
    setInputText('');
    setSelectedImage(null);
    setSelectedDocument(null);
    setReplyTo(null);
    setEmojiBarVisible(false);
    setSending(true);

    try {
      let sent;
      if (imageUri) {
        sent = await sendMessageWithAttachment(activeConv.id, imageUri, textToSend || undefined);
      } else if (doc) {
        const uploaded = await uploadAttachment(doc.uri, doc.name, doc.mimeType);
        sent = await sendMessage({
          conversation_id: activeConv.id,
          message_text: textToSend || undefined,
          message_type: doc.mimeType?.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
          reply_to_message_id: replyId,
          attachments: uploaded ? [uploaded] : [],
        });
      } else {
        sent = await sendMessage({
          conversation_id: activeConv.id,
          message_text: textToSend,
          message_type: 'TEXT',
          reply_to_message_id: replyId,
        });
      }
      if (sent) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) return prev;
          return [...prev, sent];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e) {
      console.error('Failed to send message:', e);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTogglePin = async (convId: string) => {
    try {
      const res = await togglePinConversation(convId);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, is_pinned: res.is_pinned } : c))
      );
      if (activeConv?.id === convId) {
        setActiveConv((prev) => (prev ? { ...prev, is_pinned: res.is_pinned } : prev));
      }
    } catch (err: any) {
      Alert.alert('Error', 'Could not update pin status');
    }
  };

  const openNewChatModal = async () => {
    setNewChatModalVisible(true);
    setLoadingContacts(true);
    try {
      const list = await getContacts(contactSearch);
      setContacts(list);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSearchContacts = async (query: string) => {
    setContactSearch(query);
    try {
      const list = await getContacts(query);
      setContacts(list);
    } catch (err) {
      console.error('Error searching contacts:', err);
    }
  };

  const handleSelectContact = async (contact: MessengerContact) => {
    try {
      setStartingChat(true);
      const conv = await startDirectChat(contact.id);
      setNewChatModalVisible(false);
      setContactSearch('');
      setNewChatMode('direct');
      setGroupName('');
      setSelectedMemberIds([]);
      await fetchConvs();
      if (conv) {
        openConversation(conv);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start chat with contact');
    } finally {
      setStartingChat(false);
    }
  };

  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMemberIds.length === 0 || startingChat) return;
    try {
      setStartingChat(true);
      const conv = await createGroupChat({
        name: groupName.trim(),
        member_user_ids: selectedMemberIds,
      });
      setNewChatModalVisible(false);
      setContactSearch('');
      setNewChatMode('direct');
      setGroupName('');
      setSelectedMemberIds([]);
      await fetchConvs();
      if (conv) openConversation(conv);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create group');
    } finally {
      setStartingChat(false);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedDocument({
          uri: asset.uri,
          name: asset.name || `doc_${Date.now()}`,
          mimeType: asset.mimeType || undefined,
        });
        setSelectedImage(null);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  // ---- Message actions (long-press): reply / edit / delete ----
  const handleMessageLongPress = (item: MessengerMessage) => {
    const isMe = String(item.sender_id).toLowerCase() === String(user?.id).toLowerCase();
    const canEdit = isMe && item.message_type !== 'IMAGE' && !item.deleted_at;

    const buttons: any[] = [
      { text: 'Reply', onPress: () => setReplyTo(item) },
    ];
    if (canEdit) {
      buttons.push({
        text: 'Edit',
        onPress: () => {
          setEditingMessage(item);
          setEditText(item.message_text || '');
        },
      });
    }
    if (isMe && !item.deleted_at) {
      buttons.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Message', 'Delete this message for everyone?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteMessage(item.id);
                  setMessages((prev) => prev.map((m) => (m.id === item.id ? { ...m, deleted_at: new Date().toISOString(), message_text: '' } : m)));
                } catch (e) {
                  Alert.alert('Error', 'Failed to delete message');
                }
              },
            },
          ]);
        },
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(item.sender_name || 'Message', undefined, buttons);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;
    try {
      const updated = await editMessage(editingMessage.id, editText.trim());
      setMessages((prev) => prev.map((m) => (m.id === editingMessage.id ? { ...m, ...updated, is_edited: true } : m)));
      setEditingMessage(null);
      setEditText('');
    } catch (e) {
      Alert.alert('Error', 'Failed to edit message');
    }
  };

  // ---- Group members ----
  const openMembersModal = async () => {
    if (!activeConv || (activeConv.conversation_type !== 'GROUP' && activeConv.conversation_type !== 'DEPARTMENT')) return;
    setMembersModalVisible(true);
    setLoadingMembers(true);
    setSelectedAddIds([]);
    setMemberSearch('');
    try {
      const members = await getGroupMembers(activeConv.id);
      setGroupMembers(members);
    } catch (e) {
      console.error('Failed to load group members:', e);
    } finally {
      setLoadingMembers(false);
    }
  };

  const searchMemberContacts = async (q: string) => {
    setMemberSearch(q);
    try {
      const list = await getContacts(q);
      setMemberContacts(list);
    } catch (e) {
      console.error('Error searching contacts:', e);
    }
  };

  const handleAddMembers = async () => {
    if (!activeConv || selectedAddIds.length === 0) return;
    try {
      setAddingMembers(true);
      await addGroupMembers(activeConv.id, selectedAddIds);
      setSelectedAddIds([]);
      setMemberSearch('');
      setMemberContacts([]);
      const members = await getGroupMembers(activeConv.id);
      setGroupMembers(members);
      fetchConvs();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add members');
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRemoveMember = (userId: string) => {
    if (!activeConv) return;
    Alert.alert('Remove Member', 'Remove this member from the group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeGroupMember(activeConv.id, userId);
            setGroupMembers((prev) => prev.filter((m) => String(m.user_id || m.id) !== String(userId)));
            fetchConvs();
          } catch (e) {
            Alert.alert('Error', 'Failed to remove member');
          }
        },
      },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConvs();
  };

  // Conversation Thread View
  if (activeConv) {
    const convName = activeConv.name || activeConv.other_user?.full_name || 'Conversation';

    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Thread Header */}
          <View style={styles.threadHeader}>
            <TouchableOpacity onPress={() => { setActiveConv(null); setReplyTo(null); setEmojiBarVisible(false); }} style={styles.backBtn}>
              <Icon name="chevron-left" size={22} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.threadAvatarWrap}
              onPress={() => {
                if (activeConv.conversation_type === 'GROUP' || activeConv.conversation_type === 'DEPARTMENT') {
                  openMembersModal();
                }
              }}
              disabled={activeConv.conversation_type !== 'GROUP' && activeConv.conversation_type !== 'DEPARTMENT'}
            >
              {activeConv.avatar_url || activeConv.other_user?.avatar_url || activeConv.other_user?.profile_photo ? (
                <Image
                  source={{ uri: resolveMediaUrl(activeConv.avatar_url || activeConv.other_user?.avatar_url || activeConv.other_user?.profile_photo) }}
                  style={styles.threadAvatarImg}
                />
              ) : (
                <View style={[styles.threadAvatar, { backgroundColor: (CONV_TYPE_META[activeConv.conversation_type] || CONV_TYPE_META.DIRECT).color }]}>
                  <Icon
                    name={(CONV_TYPE_META[activeConv.conversation_type] || CONV_TYPE_META.DIRECT).icon}
                    size={16}
                    color="#fff"
                  />
                </View>
              )}
              {activeConv.conversation_type === 'DIRECT' && (
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getConvStatus(activeConv).isOnline ? '#22C55E' : '#94A3B8' },
                  ]}
                />
              )}
            </TouchableOpacity>

            <View style={styles.threadTitleContainer}>
              <Text style={styles.threadTitle} numberOfLines={1}>
                {convName}
              </Text>
              <Text
                style={[
                  styles.threadSubtitle,
                  { color: getConvStatus(activeConv).isOnline ? '#16A34A' : colors.textMid },
                ]}
                numberOfLines={1}
              >
                {activeConv.is_pinned ? '📌 ' : ''}{getConvStatus(activeConv).text}
              </Text>
            </View>

            {(activeConv.conversation_type === 'GROUP' || activeConv.conversation_type === 'DEPARTMENT') && (
              <TouchableOpacity onPress={openMembersModal} style={styles.pinHeaderBtn}>
                <Icon name="people" size={18} color={colors.textMid} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleTogglePin(activeConv.id)} style={styles.pinHeaderBtn}>
              <Icon
                name="pin"
                size={16}
                color={activeConv.is_pinned ? '#2563EB' : colors.textLight}
              />
            </TouchableOpacity>
          </View>

          {/* Messages Stream */}
          {loadingMsgs ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingSubText}>Decrypting & loading chat history...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item, index }) => {
                const isMe = String(item.sender_id).toLowerCase() === String(user?.id).toLowerCase();
                const hasAttachment = item.attachments && item.attachments.length > 0;
                const attachment = hasAttachment ? item.attachments![0] : null;
                const isImage = attachment && (attachment.file_type?.startsWith('image/') || attachment.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                const showDayHeader = index === 0 || !isSameDay(messages[index - 1]?.created_at, item.created_at);
                const mediaUrl = attachment ? resolveMediaUrl(attachment.file_url) : undefined;

                return (
                  <View>
                    {showDayHeader && (
                      <View style={styles.dayHeader}>
                        <Text style={styles.dayHeaderText}>{dayLabel(item.created_at)}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onLongPress={() => handleMessageLongPress(item)}
                      delayLongPress={350}
                    >
                      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
                        <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}>
                          {!isMe && item.sender_name && activeConv.conversation_type !== 'DIRECT' && (
                            <Text style={styles.senderName}>{item.sender_name}</Text>
                          )}

                          {item.reply_to && (
                            <View style={[styles.replyQuote, isMe && styles.replyQuoteMe]}>
                              <Text style={[styles.replyQuoteName, isMe && styles.replyQuoteNameMe]} numberOfLines={1}>
                                {item.reply_to.sender_name || 'User'}
                              </Text>
                              <Text style={[styles.replyQuoteText, isMe && styles.replyQuoteTextMe]} numberOfLines={1}>
                                {maskSensitiveData(item.reply_to.message_text || 'Attachment')}
                              </Text>
                            </View>
                          )}

                          {isImage && mediaUrl && (
                            <Image
                              source={{ uri: mediaUrl }}
                              style={styles.attachmentImage}
                              resizeMode="cover"
                            />
                          )}

                          {!isImage && attachment && (
                            <View style={[styles.docCard, isMe && styles.docCardMe]}>
                              <Icon name="document-text" size={20} color={isMe ? '#BFDBFE' : '#3B82F6'} />
                              <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={[styles.docName, isMe && { color: '#fff' }]} numberOfLines={1}>
                                  {attachment.file_name || 'Attachment'}
                                </Text>
                                <Text style={[styles.docSize, isMe && { color: '#BFDBFE' }]}>
                                  {attachment.file_type || 'File'}
                                </Text>
                              </View>
                            </View>
                          )}

                          {item.message_text ? (
                            <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
                              {maskSensitiveData(item.message_text)}
                              {item.is_edited ? <Text style={{ fontStyle: 'italic', opacity: 0.7 }}> (edited)</Text> : null}
                            </Text>
                          ) : null}

                          <View style={styles.msgMetaRow}>
                            <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeOther]}>
                              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            {isMe && (
                              <Icon
                                name={item.is_read || (item.reads && item.reads.length > 0) ? 'check-double' : 'check'}
                                size={13}
                                color={item.is_read || (item.reads && item.reads.length > 0) ? '#93C5FD' : '#BFDBFE'}
                              />
                            )}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}

          {/* Typing Indicator */}
          {typingUser && (
            <View style={styles.typingBox}>
              <Text style={styles.typingText}>{typingUser} is typing...</Text>
            </View>
          )}

          {/* Reply Preview */}
          {replyTo && (
            <View style={styles.replyBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.replyBarName}>{replyTo.sender_name || 'Message'}</Text>
                <Text style={styles.replyBarText} numberOfLines={1}>
                  {maskSensitiveData(replyTo.message_text || 'Attachment')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Icon name="x" size={16} color={colors.textMid} />
              </TouchableOpacity>
            </View>
          )}

          {/* Emoji Quick Bar */}
          {emojiBarVisible && (
            <View style={styles.emojiBar}>
              {['😀', '😂', '😍', '👍', '🙏', '🔥', '❤️', '🎉', '😎', '🤝', '✅', '⚡'].map((e) => (
                <TouchableOpacity key={e} onPress={() => setInputText((t) => t + e)} style={styles.emojiItem}>
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Attachment Previews */}
          {(selectedImage || selectedDocument) && (
            <View style={styles.imagePreviewContainer}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              ) : (
                <View style={[styles.imagePreview, styles.docPreview]}>
                  <Icon name="document-text" size={22} color={colors.primary} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                  {selectedImage ? 'Photo attached' : selectedDocument?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setSelectedImage(null); setSelectedDocument(null); }}
                style={styles.removeImageBtn}
              >
                <Icon name="x" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Message Composer */}
          <View style={styles.composerBar}>
            <TouchableOpacity onPress={() => setEmojiBarVisible((v) => !v)} style={styles.attachBtn}>
              <Icon name="happy" size={20} color={emojiBarVisible ? colors.primary : colors.textMid} />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
              <Icon name="camera" size={20} color={colors.textMid} />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickDocument} style={styles.attachBtn}>
              <Icon name="attach" size={20} color={colors.textMid} />
            </TouchableOpacity>

            <TextInput
              style={styles.composerInput}
              placeholder="Type your message..."
              placeholderTextColor={colors.textLight}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />

            <TouchableOpacity
              onPress={handleSend}
              disabled={sending || (!inputText.trim() && !selectedImage && !selectedDocument)}
              style={[
                styles.sendBtn,
                (!inputText.trim() && !selectedImage && !selectedDocument || sending) && styles.sendBtnDisabled,
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Group Members Modal */}
          <Modal visible={membersModalVisible} transparent animationType="slide">
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Group Members ({groupMembers.length})</Text>
                  <TouchableOpacity onPress={() => setMembersModalVisible(false)}>
                    <Icon name="x" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                </View>

                {loadingMembers ? (
                  <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
                ) : (
                  <>
                    <FlatList
                      data={groupMembers}
                      keyExtractor={(m, i) => String(m.user_id || m.id || i)}
                      style={{ maxHeight: 260 }}
                      ListEmptyComponent={
                        <Text style={{ color: colors.textMid, fontSize: 13, textAlign: 'center', paddingVertical: 20 }}>
                          No members found
                        </Text>
                      }
                      renderItem={({ item }) => {
                        const uid = String(item.user_id || item.id);
                        const isSelf = String(uid) === String(user?.id);
                        return (
                          <View style={styles.contactItem}>
                            <View style={styles.contactAvatar}>
                              <Text style={styles.contactAvatarText}>
                                {(item.full_name || 'U')[0].toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: spacing.sm }}>
                              <Text style={styles.contactName}>
                                {item.full_name || 'User'} {isSelf ? '(You)' : ''}
                              </Text>
                              <Text style={styles.contactSub}>
                                {item.role || ''} {item.partner_code || item.employee_code ? `• ${item.partner_code || item.employee_code}` : ''}
                              </Text>
                            </View>
                            {!isSelf && (
                              <TouchableOpacity onPress={() => handleRemoveMember(uid)}>
                                <Icon name="trash" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      }}
                    />

                    {/* Add members */}
                    <View style={styles.contactSearchBox}>
                      <Icon name="search" size={16} color={colors.textLight} />
                      <TextInput
                        style={styles.contactSearchInput}
                        placeholder="Search people to add..."
                        placeholderTextColor={colors.textLight}
                        value={memberSearch}
                        onChangeText={searchMemberContacts}
                      />
                    </View>
                    <FlatList
                      data={memberContacts.filter((c) => !groupMembers.some((m) => String(m.user_id || m.id) === String(c.id)))}
                      keyExtractor={(c) => c.id}
                      style={{ maxHeight: 160 }}
                      renderItem={({ item }) => {
                        const isSelected = selectedAddIds.includes(item.id);
                        return (
                          <TouchableOpacity
                            style={styles.contactItem}
                            onPress={() =>
                              setSelectedAddIds((prev) =>
                                prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]
                              )
                            }
                          >
                            <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                              {isSelected && <Icon name="check" size={12} color="#fff" />}
                            </View>
                            <View style={{ flex: 1, marginLeft: spacing.sm }}>
                              <Text style={styles.contactName}>{item.full_name}</Text>
                              <Text style={styles.contactSub}>{item.role}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      }}
                    />
                    <TouchableOpacity
                      style={[styles.createGroupBtn, (selectedAddIds.length === 0 || addingMembers) && { opacity: 0.5 }]}
                      onPress={handleAddMembers}
                      disabled={selectedAddIds.length === 0 || addingMembers}
                    >
                      {addingMembers ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.createGroupBtnText}>Add {selectedAddIds.length} Member(s)</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </Modal>

          {/* Edit Message Modal */}
          <Modal visible={!!editingMessage} transparent animationType="fade">
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Message</Text>
                  <TouchableOpacity onPress={() => { setEditingMessage(null); setEditText(''); }}>
                    <Icon name="x" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  autoFocus
                  placeholder="Edit your message..."
                  placeholderTextColor={colors.textLight}
                />
                <TouchableOpacity
                  style={[styles.createGroupBtn, !editText.trim() && { opacity: 0.5 }]}
                  onPress={handleSaveEdit}
                  disabled={!editText.trim()}
                >
                  <Text style={styles.createGroupBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Conversations List View
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.screenSubtitle}>INTERNAL CHAT & SUPPORT</Text>
            <Text style={styles.screenTitle}>Messenger</Text>
          </View>
          <TouchableOpacity style={styles.newChatBtn} onPress={openNewChatModal}>
            <Icon name="plus" size={16} color="#fff" />
            <Text style={styles.newChatBtnText}>New Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, isSelected && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.key as any)}
              >
                <Text style={[styles.tabItemText, isSelected && styles.tabItemTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search Box */}
        <View style={styles.searchBox}>
          <Icon name="search" size={16} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="x" size={14} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Conversations List */}
        {loadingConvs ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingSubText}>Loading conversations...</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.convList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="message-square" size={48} color={colors.textLight} />
                <Text style={styles.emptyTitle}>No Conversations Found</Text>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Try another search query' : 'Tap "+ New Chat" to start messaging team members'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const displayName = item.name || item.other_user?.full_name || 'Chat';
              const lastText = item.last_message?.message_text || item.last_message_text || 'No messages yet';
              const hasUnread = (item.unread_count || 0) > 0;
              const isPinned = item.is_pinned;
              const typeMeta = CONV_TYPE_META[item.conversation_type] || CONV_TYPE_META.DIRECT;
              const convAvatar = item.avatar_url || (item.conversation_type === 'DIRECT' ? item.other_user?.avatar_url || item.other_user?.profile_photo : null);
              const status = getConvStatus(item);

              return (
                <TouchableOpacity
                  style={[styles.convCard, isPinned && styles.pinnedConvCard]}
                  onPress={() => openConversation(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarWrap}>
                    {convAvatar ? (
                      <Image source={{ uri: resolveMediaUrl(convAvatar) }} style={styles.avatarImg} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: typeMeta.color }]}>
                        <Icon name={typeMeta.icon} size={18} color="#fff" />
                      </View>
                    )}
                    {item.conversation_type === 'DIRECT' && (
                      <View
                        style={[
                          styles.avatarStatusDot,
                          { backgroundColor: status.isOnline ? '#22C55E' : '#94A3B8' },
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.convInfo}>
                    <View style={styles.convRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                        {isPinned && <Icon name="pin" size={11} color="#2563EB" />}
                        <Text style={[styles.convTitle, hasUnread && styles.unreadTitle]} numberOfLines={1}>
                          {displayName}
                        </Text>
                      </View>
                      {(item.last_message_at || item.last_message?.created_at || item.updated_at) && (
                        <Text style={[styles.convTime, hasUnread && styles.convTimeUnread]}>
                          {formatConvTime(item.last_message_at || item.last_message?.created_at || item.updated_at)}
                        </Text>
                      )}
                    </View>

                    <View style={styles.convRow}>
                      <Text style={[styles.lastMsgText, hasUnread && styles.unreadText]} numberOfLines={1}>
                        {item.conversation_type !== 'DIRECT' && item.last_message?.sender_name
                          ? `${item.last_message.sender_name}: `
                          : ''}
                        {maskSensitiveData(lastText)}
                      </Text>
                      {hasUnread && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Start New Chat Modal */}
        <Modal visible={newChatModalVisible} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Conversation</Text>
                <TouchableOpacity onPress={() => { setNewChatModalVisible(false); setNewChatMode('direct'); setGroupName(''); setSelectedMemberIds([]); }}>
                  <Icon name="x" size={20} color={colors.textLight} />
                </TouchableOpacity>
              </View>

              {/* Direct / Group mode toggle */}
              <View style={styles.modeToggle}>
                {(['direct', 'group'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.modeTab, newChatMode === mode && styles.modeTabActive]}
                    onPress={() => setNewChatMode(mode)}
                  >
                    <Text style={[styles.modeTabText, newChatMode === mode && styles.modeTabTextActive]}>
                      {mode === 'direct' ? 'Direct Chat' : 'Create Group'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newChatMode === 'group' && (
                <TextInput
                  style={styles.groupNameInput}
                  placeholder="Group name (e.g. Sales Team)"
                  placeholderTextColor={colors.textLight}
                  value={groupName}
                  onChangeText={setGroupName}
                />
              )}

              <View style={styles.contactSearchBox}>
                <Icon name="search" size={16} color={colors.textLight} />
                <TextInput
                  style={styles.contactSearchInput}
                  placeholder="Search staff, partners, or supervisors..."
                  placeholderTextColor={colors.textLight}
                  value={contactSearch}
                  onChangeText={handleSearchContacts}
                />
              </View>

              {loadingContacts || startingChat ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={{ marginTop: 8, fontSize: 12, color: colors.textMid }}>
                    {startingChat ? 'Connecting channel...' : 'Searching contacts...'}
                  </Text>
                </View>
              ) : (
                <>
                  <FlatList
                    data={contacts}
                    keyExtractor={(item) => item.id}
                    style={{ maxHeight: 300 }}
                    ListEmptyComponent={
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: colors.textMid, fontSize: 13 }}>No contacts matching "{contactSearch}"</Text>
                      </View>
                    }
                    renderItem={({ item }) => {
                      const isSelected = selectedMemberIds.includes(item.id);
                      return (
                        <TouchableOpacity
                          style={styles.contactItem}
                          onPress={() => {
                            if (newChatMode === 'group') {
                              toggleMemberSelection(item.id);
                            } else {
                              handleSelectContact(item);
                            }
                          }}
                          disabled={startingChat}
                        >
                          {newChatMode === 'group' && (
                            <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                              {isSelected && <Icon name="check" size={12} color="#fff" />}
                            </View>
                          )}
                          <View style={styles.contactAvatar}>
                            <Text style={styles.contactAvatarText}>{(item.full_name || 'U')[0].toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: spacing.sm }}>
                            <Text style={styles.contactName}>{item.full_name}</Text>
                            <Text style={styles.contactSub}>
                              {item.role} {item.partner_code ? `• ${item.partner_code}` : ''} {item.employee_id ? `• ${item.employee_id}` : ''}
                            </Text>
                          </View>
                          {newChatMode === 'direct' && (
                            <Icon name="chevron-right" size={16} color={colors.textLight} />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />
                  {newChatMode === 'group' && (
                    <TouchableOpacity
                      style={[styles.createGroupBtn, (!groupName.trim() || selectedMemberIds.length === 0) && { opacity: 0.5 }]}
                      onPress={handleCreateGroup}
                      disabled={!groupName.trim() || selectedMemberIds.length === 0 || startingChat}
                    >
                      <Text style={styles.createGroupBtnText}>
                        Create Group ({selectedMemberIds.length} selected)
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    // Clear the floating bottom dock so the composer/list aren't hidden behind it
    paddingBottom: 100,
  },
  listHeader: {
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + 4,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  newChatBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 6,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabItemActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMid,
  },
  tabItemTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    padding: 0,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingSubText: {
    fontSize: 12,
    color: colors.textMid,
    marginTop: 8,
  },
  convList: {
    padding: spacing.md,
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  pinnedConvCard: {
    backgroundColor: '#FFFDF5',
    borderColor: '#FEF3C7',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarStatusDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  convInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  convRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  unreadTitle: {
    fontWeight: '800',
    color: '#0F172A',
  },
  convTime: {
    fontSize: 10,
    color: colors.textLight,
  },
  convTimeUnread: {
    color: '#EF4444',
    fontWeight: '700',
  },
  lastMsgText: {
    fontSize: 12,
    color: colors.textMid,
    marginTop: 2,
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
    color: colors.text,
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 4,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMid,
    marginTop: 4,
    textAlign: 'center',
  },
  threadHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    marginRight: spacing.sm,
    padding: 4,
  },
  threadAvatarWrap: {
    position: 'relative',
  },
  threadAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  threadAvatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  threadTitleContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  threadTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  threadSubtitle: {
    fontSize: 11,
    color: colors.textMid,
  },
  pinHeaderBtn: {
    padding: 6,
  },
  messagesList: {
    padding: spacing.md,
  },
  msgRow: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  msgBubble: {
    maxWidth: '82%',
    padding: 10,
    borderRadius: 18,
  },
  msgBubbleMe: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  msgBubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  senderName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 2,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 6,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  msgTextMe: {
    color: '#fff',
  },
  msgTextOther: {
    color: colors.text,
  },
  msgMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  msgTime: {
    fontSize: 9,
  },
  msgTimeMe: {
    color: '#E0E7FF',
  },
  msgTimeOther: {
    color: colors.textLight,
  },
  typingBox: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  typingText: {
    fontSize: 11,
    color: colors.textMid,
    fontStyle: 'italic',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  imagePreview: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    left: 48,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: spacing.xs,
  },
  attachBtn: {
    padding: 8,
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxHeight: 80,
    fontSize: 13,
    color: colors.text,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.md,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  contactSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: spacing.sm,
    gap: 6,
  },
  contactSearchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    padding: 0,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  contactSub: {
    fontSize: 10,
    color: colors.textMid,
    marginTop: 1,
  },
  // ---- Website-parity additions ----
  dayHeader: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  replyQuote: {
    borderLeftWidth: 3,
    borderLeftColor: '#93C5FD',
    backgroundColor: 'rgba(219,234,254,0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  replyQuoteMe: {
    borderLeftColor: '#BFDBFE',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  replyQuoteName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
  replyQuoteNameMe: {
    color: '#DBEAFE',
  },
  replyQuoteText: {
    fontSize: 11,
    color: colors.textMid,
  },
  replyQuoteTextMe: {
    color: '#E0E7FF',
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 180,
  },
  docCardMe: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  docName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  docSize: {
    fontSize: 10,
    color: colors.textMid,
    marginTop: 1,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: spacing.sm,
  },
  replyBarName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  replyBarText: {
    fontSize: 11,
    color: colors.textMid,
    marginTop: 1,
  },
  emojiBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    gap: 4,
  },
  emojiItem: {
    padding: 6,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: spacing.sm,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMid,
  },
  modeTabTextActive: {
    color: '#2563EB',
  },
  groupNameInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.sm,
    backgroundColor: '#F8FAFC',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkCircleActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  createGroupBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  createGroupBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 90,
    textAlignVertical: 'top',
    backgroundColor: '#F8FAFC',
    marginBottom: spacing.sm,
  },
  docPreview: {
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

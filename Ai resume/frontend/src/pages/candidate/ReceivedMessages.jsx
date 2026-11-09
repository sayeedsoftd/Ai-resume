import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Send,
  User,
  Building2,
  Clock,
  CheckCheck,
  Check,
  Sparkles,
  Smile,
  ShieldCheck,
  RotateCcw,
  Circle,
  Briefcase,
  AlertCircle,
  ChevronLeft,
  Inbox,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';

export default function ReceivedMessages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedUserId = searchParams.get('user');

  const [conversations, setConversations] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const messagesEndRef = useRef(null);
  const wsManagerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom of active conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, partnerTyping]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Connect WebSocket when user is authenticated
  useEffect(() => {
    if (!user?.id) return;

    const ws = chatService.createChatWebSocket(
      user.id,
      (data) => {
        handleIncomingWebSocketMessage(data);
      },
      (status) => {
        setWsConnected(status === 'CONNECTED');
      }
    );

    wsManagerRef.current = ws;

    return () => {
      if (wsManagerRef.current) {
        wsManagerRef.current.close();
      }
    };
  }, [user?.id, selectedPartner?.partner_id]);

  // Handle incoming real-time packets
  const handleIncomingWebSocketMessage = (packet) => {
    if (!packet) return;

    if (packet.type === 'NEW_MESSAGE') {
      const msg = packet.message;
      if (!msg) return;

      // If incoming message belongs to currently open conversation
      if (selectedPartner && selectedPartner.partner_id === msg.sender_id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // Acknowledge read
        if (wsManagerRef.current) {
          wsManagerRef.current.send({
            type: 'MARK_READ',
            partner_id: msg.sender_id,
          });
        }
      }

      // Update conversations list snippet and unread counter
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.partner_id === msg.sender_id);
        if (index !== -1) {
          const updated = [...prev];
          const curr = updated[index];
          const isCurrentChat = selectedPartner && selectedPartner.partner_id === msg.sender_id;
          updated[index] = {
            ...curr,
            last_message: msg.message_text,
            last_message_at: msg.created_at,
            unread_count: isCurrentChat ? 0 : (curr.unread_count || 0) + 1,
          };
          // Move to top
          const [moved] = updated.splice(index, 1);
          return [moved, ...updated];
        } else {
          // New conversation partner
          loadConversations();
          return prev;
        }
      });
    } else if (packet.type === 'MESSAGE_SENT') {
      const msg = packet.message;
      if (!msg) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Update conversations preview
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.partner_id === msg.recipient_id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            last_message: msg.message_text,
            last_message_at: msg.created_at,
          };
          const [moved] = updated.splice(index, 1);
          return [moved, ...updated];
        }
        return prev;
      });
    } else if (packet.type === 'USER_TYPING') {
      if (selectedPartner && selectedPartner.partner_id === packet.user_id) {
        setPartnerTyping(Boolean(packet.is_typing));
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (packet.is_typing) {
          typingTimeoutRef.current = setTimeout(() => {
            setPartnerTyping(false);
          }, 3000);
        }
      }
    } else if (packet.type === 'MESSAGES_READ') {
      // Mark my outgoing messages as read
      if (selectedPartner && selectedPartner.partner_id === packet.read_by_user_id) {
        setMessages((prev) =>
          prev.map((m) => (m.sender_id === user?.id ? { ...m, is_read: true } : m))
        );
      }
    }
  };

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const data = await chatService.getConversations();
      const list = Array.isArray(data) ? data : [];
      setConversations(list);

      // Handle preselected user from query params or default to first conversation
      if (preselectedUserId) {
        const found = list.find((c) => String(c.partner_id) === String(preselectedUserId));
        if (found) {
          handleSelectPartner(found);
        } else {
          // If partner has no prior conversation yet, load their direct thread
          const partnerIdNum = parseInt(preselectedUserId, 10);
          handleSelectPartner({
            partner_id: partnerIdNum,
            partner_name: 'Selected User',
            partner_email: '',
            partner_role: 'RECRUITER',
            is_online: false,
          });
        }
      } else if (!selectedPartner && list.length > 0) {
        handleSelectPartner(list[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleSelectPartner = async (partner) => {
    setSelectedPartner(partner);
    setLoadingMessages(true);
    setPartnerTyping(false);

    try {
      const history = await chatService.getMessages(partner.partner_id);
      setMessages(Array.isArray(history) ? history : []);

      // Clear unread count locally in list
      setConversations((prev) =>
        prev.map((c) =>
          c.partner_id === partner.partner_id ? { ...c, unread_count: 0 } : c
        )
      );

      // Notify WebSocket of read status
      if (wsManagerRef.current) {
        wsManagerRef.current.send({
          type: 'MARK_READ',
          partner_id: partner.partner_id,
        });
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !selectedPartner || sending) return;

    setSending(true);
    setInputText('');

    const partnerId = selectedPartner.partner_id;

    // 1. Try real-time WebSocket first
    let dispatched = false;
    if (wsManagerRef.current) {
      dispatched = wsManagerRef.current.send({
        type: 'SEND_MESSAGE',
        recipient_id: partnerId,
        message_text: text,
      });
    }

    // 2. REST Fallback if WebSocket is offline
    if (!dispatched) {
      try {
        const savedMsg = await chatService.sendMessage(partnerId, text);
        setMessages((prev) => [...prev, savedMsg]);
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.partner_id === partnerId);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              last_message: text,
              last_message_at: new Date().toISOString(),
            };
            const [moved] = updated.splice(index, 1);
            return [moved, ...updated];
          }
          return prev;
        });
      } catch (err) {
        console.error('Failed to send message via REST fallback:', err);
      }
    }

    setSending(false);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    // Broadcast typing indicator if partner is selected
    if (selectedPartner && wsManagerRef.current && e.target.value.length > 0) {
      wsManagerRef.current.send({
        type: 'TYPING',
        recipient_id: selectedPartner.partner_id,
        is_typing: true,
      });
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.partner_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.job_title?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.last_message?.toLowerCase().includes(searchFilter.toLowerCase());

    if (filterMode === 'UNREAD') {
      return matchesSearch && c.unread_count > 0;
    }
    return matchesSearch;
  });

  const formatMessageTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatConversationDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] max-w-7xl mx-auto flex flex-col space-y-3 pb-3">
      {/* Top Banner / Channel Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Recruiter-Candidate Direct Live Chat
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Instant bidirectional communication for availability, salary clarifications, and interview coordination.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 shadow-2xs ${
              wsConnected
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {wsConnected ? 'Live Real-Time Active' : 'Connecting WebSocket...'}
          </span>

          <Button
            size="sm"
            variant="secondary"
            onClick={loadConversations}
            className="text-xs border-slate-300 dark:border-slate-700"
            title="Refresh conversations list"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Split-Pane Card */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* =========================================================
            LEFT PANEL: CONVERSATIONS THREAD LIST
            ========================================================= */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 ${
            selectedPartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/70 dark:bg-slate-850/60">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search candidates or messages..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterMode === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                All Chats
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('UNREAD')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  filterMode === 'UNREAD'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>Unread Only</span>
                {conversations.filter((c) => c.unread_count > 0).length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {loadingConversations ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Loading active chat channels...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-xs text-slate-400">
                <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="font-semibold text-slate-600 dark:text-slate-400">No conversations found</p>
                <p className="text-[11px] text-slate-400">
                  {filterMode === 'UNREAD'
                    ? 'You have zero unread chat messages.'
                    : 'Shortlisted candidates and recruiters will appear here.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = selectedPartner && selectedPartner.partner_id === c.partner_id;
                return (
                  <button
                    key={c.partner_id}
                    type="button"
                    onClick={() => handleSelectPartner(c)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-850/50'
                    }`}
                  >
                    {/* Partner Avatar + Online Badge */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden">
                        {c.partner_avatar ? (
                          <img
                            src={
                              c.partner_avatar.startsWith('http')
                                ? c.partner_avatar
                                : `http://localhost:8000${c.partner_avatar}`
                            }
                            alt={c.partner_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          c.partner_name?.[0]?.toUpperCase() || 'U'
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                          c.is_online ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                        title={c.is_online ? 'Online now' : 'Offline'}
                      />
                    </div>

                    {/* Partner Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {c.partner_name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {formatConversationDate(c.last_message_at)}
                        </span>
                      </div>

                      {(c.company_name || c.job_title) && (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate mb-1">
                          {c.company_name || ''} {c.job_title ? `• ${c.job_title}` : ''}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {c.last_message || 'Start chatting...'}
                        </p>
                        {c.unread_count > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white shrink-0 animate-pulse">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================================
            RIGHT PANEL: ACTIVE LIVE CHAT WINDOW
            ========================================================= */}
        <div
          className={`flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-950/20 ${
            !selectedPartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedPartner ? (
            <>
              {/* Chat Header Bar */}
              <div className="p-3.5 px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedPartner(null)}
                    className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden">
                      {selectedPartner.partner_avatar ? (
                        <img
                          src={
                            selectedPartner.partner_avatar.startsWith('http')
                              ? selectedPartner.partner_avatar
                              : `http://localhost:8000${selectedPartner.partner_avatar}`
                          }
                          alt={selectedPartner.partner_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        selectedPartner.partner_name?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                        selectedPartner.is_online ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedPartner.partner_name}
                      </h3>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {selectedPartner.partner_role?.replace('_', ' ') || 'Candidate'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            selectedPartner.is_online ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span className="text-[11px] font-semibold">
                          {selectedPartner.is_online ? 'Active Now' : 'Offline'}
                        </span>
                      </span>

                      {(selectedPartner.company_name || selectedPartner.job_title) && (
                        <span>
                          • {selectedPartner.company_name || ''} {selectedPartner.job_title || ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    🔒 Direct In-Platform Thread
                  </span>
                </div>
              </div>

              {/* Message Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {loadingMessages ? (
                  <div className="py-20 text-center text-xs text-slate-400 space-y-2">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p>Loading real-time chat history...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center space-y-2 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Start of conversation with {selectedPartner.partner_name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Send a message below to clarify candidate availability, technical requirements, or schedule follow-up interviews.
                    </p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isMine = m.sender_id === user?.id;
                    return (
                      <div
                        key={m.id || idx}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-md p-3.5 rounded-2xl shadow-xs text-xs leading-relaxed ${
                            isMine
                              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-br-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200 dark:border-slate-700/80'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.message_text}</p>
                        </div>

                        {/* Timestamp & Read Receipt */}
                        <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-slate-400">
                          <span>{formatMessageTime(m.created_at)}</span>
                          {isMine && (
                            <span>
                              {m.is_read ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-500" title="Read" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-400" title="Delivered" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Partner Typing Indicator */}
                {partnerTyping && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 animate-in fade-in">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-100" />
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-200" />
                    <span className="text-[11px] font-semibold text-indigo-500 ml-1">
                      {selectedPartner.partner_name} is typing...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Message Input Bar */}
              <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder={`Message ${selectedPartner.partner_name}... (Press Enter to Send)`}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!inputText.trim() || sending}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State when no partner selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Select a Conversation to Start Live Chat
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Choose a candidate or recruiter from the left pane to exchange real-time updates and clarification messages.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

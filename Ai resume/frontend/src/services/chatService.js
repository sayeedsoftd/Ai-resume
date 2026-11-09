import api from './api';

export const chatService = {
  async getConversations() {
    const response = await api.get('/chat/conversations');
    return response.data;
  },

  async getMessages(partnerId) {
    const response = await api.get(`/chat/messages/${partnerId}`);
    return response.data;
  },

  async sendMessage(partnerId, messageText, applicationId = null) {
    const response = await api.post(`/chat/messages/${partnerId}`, {
      message_text: messageText,
      application_id: applicationId,
    });
    return response.data;
  },

  async markAsRead(partnerId) {
    const response = await api.post(`/chat/messages/${partnerId}/read`);
    return response.data;
  },

  async getUnreadCount() {
    const response = await api.get('/chat/unread-count');
    return response.data;
  },

  getWebSocketUrl(userId) {
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    // Backend API typically runs on localhost:8000
    const host =
      import.meta.env.VITE_WS_URL ||
      (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1'
        ? `${loc.hostname}:8000`
        : loc.host);
    return `${protocol}//${host}/api/v1/chat/ws/${userId}`;
  },

  createChatWebSocket(userId, onMessage, onStatusChange = null) {
    if (!userId) return null;

    const wsUrl = this.getWebSocketUrl(userId);
    let ws = null;
    let pingInterval = null;
    let isExplicitlyClosed = false;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (onStatusChange) onStatusChange('CONNECTED');
          // Start heartbeat ping every 25s
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'PING' }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'PONG') return;
            if (onMessage) onMessage(data);
          } catch (e) {
            console.error('Error parsing chat websocket message:', e);
          }
        };

        ws.onerror = (err) => {
          console.warn('Chat WebSocket connection warning:', err);
          if (onStatusChange) onStatusChange('ERROR');
        };

        ws.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          if (onStatusChange) onStatusChange('DISCONNECTED');
          // Auto-reconnect after 3s if not deliberately closed
          if (!isExplicitlyClosed) {
            setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        console.warn('Failed to initialize WebSocket, using REST fallback:', err);
      }
    };

    connect();

    return {
      send(payload) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(payload));
          return true;
        }
        return false;
      },
      close() {
        isExplicitlyClosed = true;
        if (pingInterval) clearInterval(pingInterval);
        if (ws) ws.close();
      },
      getRawSocket() {
        return ws;
      },
    };
  },
};

export default chatService;

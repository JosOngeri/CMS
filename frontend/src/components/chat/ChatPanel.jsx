import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, MoreVertical } from 'lucide-react';
import { io } from 'socket.io-client';

/**
 * ChatPanel Component (Phase 10)
 * Real-time chat interface with Socket.io integration
 * Supports multiple chat rooms and slash commands
 */
const ChatPanel = ({ roomId, userId, userName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!roomId || !userId) return;

    // Connect to Socket.io server
    socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:5005', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    // Connection handlers
    socketRef.current.on('connect', () => {
      console.log('[Chat] Connected to server');
      setIsConnected(true);
      
      // Join the chat room
      socketRef.current.emit('join_room', { roomId, userId, userName });
    });

    socketRef.current.on('disconnect', () => {
      console.log('[Chat] Disconnected from server');
      setIsConnected(false);
    });

    // Message handlers
    socketRef.current.on('chat_message', (message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    socketRef.current.on('message_history', (history) => {
      setMessages(history);
      scrollToBottom();
    });

    // Typing indicators
    socketRef.current.on('user_typing', ({ userId: typingUserId, userName: typingUserName }) => {
      if (typingUserId !== userId) {
        setTypingUsers(prev => {
          const exists = prev.find(u => u.userId === typingUserId);
          if (exists) return prev;
          return [...prev, { userId: typingUserId, userName: typingUserName }];
        });
        
        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== typingUserId));
        }, 3000);
      }
    });

    // Load message history on join
    socketRef.current.emit('get_message_history', { roomId });

    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        socketRef.current.emit('leave_room', { roomId, userId });
        socketRef.current.disconnect();
      }
    };
  }, [roomId, userId, userName]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing', { roomId, userId, userName });
    }
  };

  // Send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isConnected) return;

    // Check for slash commands
    if (newMessage.startsWith('/')) {
      handleSlashCommand(newMessage);
      setNewMessage('');
      return;
    }

    const message = {
      roomId,
      userId,
      userName,
      content: newMessage.trim(),
      type: 'text',
      timestamp: new Date().toISOString()
    };

    socketRef.current.emit('send_message', message);
    setNewMessage('');
  };

  // Handle slash commands
  const handleSlashCommand = (command) => {
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd) {
      case '/clear':
        setMessages([]);
        break;
      case '/help':
        const helpMessage = {
          roomId,
          userId: 'system',
          userName: 'System',
          content: 'Available commands: /clear, /help, /announce [message]',
          type: 'system',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, helpMessage]);
        break;
      case '/announce':
        if (args.length > 0) {
          const announceMessage = {
            roomId,
            userId,
            userName,
            content: args.join(' '),
            type: 'announcement',
            timestamp: new Date().toISOString()
          };
          socketRef.current.emit('send_message', announceMessage);
        }
        break;
      default:
        const errorMessage = {
          roomId,
          userId: 'system',
          userName: 'System',
          content: `Unknown command: ${cmd}. Type /help for available commands.`,
          type: 'system',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get message style based on type
  const getMessageStyle = (message) => {
    if (message.type === 'system') {
      return 'bg-[var(--color-surface)] text-[var(--color-textSecondary)] text-center text-sm';
    }
    if (message.type === 'announcement') {
      return 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)] text-[var(--color-primary)]';
    }
    if (message.userId === userId) {
      return 'bg-[var(--color-primary)] text-white ml-auto';
    }
    return 'bg-[var(--color-surface)] text-[var(--color-text)]';
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-background)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <h3 className="font-semibold text-[var(--color-text)]">Chat Room</h3>
        </div>
        <button className="p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors">
          <MoreVertical className="w-5 h-5 text-[var(--color-textSecondary)]" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-[var(--color-textSecondary)] py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[80%] rounded-2xl px-4 py-2 ${getMessageStyle(message)}`}
          >
            {message.type !== 'system' && (
              <div className="text-xs opacity-70 mb-1">
                {message.userName}
              </div>
            )}
            <div className="break-words">{message.content}</div>
            <div className="text-xs opacity-50 mt-1 text-right">
              {formatTime(message.timestamp)}
            </div>
          </div>
        ))}

        {typingUsers.length > 0 && (
          <div className="text-sm text-[var(--color-textSecondary)] italic">
            {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5 text-[var(--color-textSecondary)]" />
          </button>
          
          <button
            type="button"
            className="p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
            title="Add emoji"
          >
            <Smile className="w-5 h-5 text-[var(--color-textSecondary)]" />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message... (Type / for commands)"
            className="flex-1 px-4 py-2 rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            disabled={!isConnected}
          />

          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className="p-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {!isConnected && (
          <div className="text-xs text-red-500 mt-2 text-center">
            Disconnected. Reconnecting...
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatPanel;
import React, { useState, useEffect, useRef, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import Mic from './Mic';

interface Message {
  sender: string;
  content: string;
  type?: 'text' | 'audio';
}

interface ChatProps {
  token: string;
  selectedChatId: string | null;
  onUnauthorized: () => void;
}

const Chat: React.FC<ChatProps> = ({ token, selectedChatId, onUnauthorized }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, lastMessage, readyState } = useWebSocket(
    selectedChatId ? `ws://localhost:8080/api/chat/${selectedChatId}/ws?token=${encodeURIComponent(token)}` : null,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 3000,
    }
  );

  useEffect(() => {
    if (lastMessage !== null) {
      const newMessage = JSON.parse(lastMessage.data);
      if (newMessage.type !== 'audio') {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    }
  }, [lastMessage]);

  const fetchChatHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat/${selectedChatId}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.status === 401 || response.status === 403) {
        onUnauthorized();
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      const history = await response.json();
      // Filter out audio messages from history
      setMessages(history.filter((msg: Message) => msg.type !== 'audio'));
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  }, [selectedChatId, token, onUnauthorized]);

  useEffect(() => {
    if (selectedChatId) {
      setMessages([]);
      fetchChatHistory();
      inputRef.current?.focus();
    }
  }, [selectedChatId, fetchChatHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (inputMessage.trim() && readyState === ReadyState.OPEN) {
      const message = {
        sender: 'user',
        content: inputMessage.trim(),
        type: 'text' as const
      };
      sendMessage(JSON.stringify(message));
      setInputMessage('');
    }
  };
  const handleAudioChunk = useCallback((chunk: Blob, isRecordingFinished: boolean) => {
    if (readyState === ReadyState.OPEN) {
      if (isRecordingFinished) {
        const message = {
          sender: 'user',
          content: 'commit',
          type: 'audio' as const
        };
        sendMessage(JSON.stringify(message));
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          // Convert ArrayBuffer to base64
          const arrayBuffer = reader.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          bytes.forEach(byte => binary += String.fromCharCode(byte));
          const base64Audio = btoa(binary);
          
          const message = {
            sender: 'user',
            content: base64Audio,
            type: 'audio' as const
          };
          sendMessage(JSON.stringify(message));
        };
        reader.readAsArrayBuffer(chunk);
      }
    }
  }, [readyState, sendMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!selectedChatId) {
    return (
      <div className="chat-window" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        backgroundColor: '#282c34',
        color: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '1.2em'
      }}>
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <div className="chat-window" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: '#282c34',
      color: 'white'
    }}>
      <div className="messages" style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {messages.filter(message => message.type !== 'audio').map((message, index) => (
          <div
            key={index}
            style={{
              alignSelf: message.sender === 'user' ? 'flex-start' : 'flex-end',
              marginBottom: '10px',
              maxWidth: '70%'
            }}
          >
            <div
              style={{
                backgroundColor: message.sender === 'user' ? '#61dafb' : '#3a3f4b',
                color: message.sender === 'user' ? 'black' : 'white',
                borderRadius: '10px',
                padding: '10px',
                wordWrap: 'break-word'
              }}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-area" style={{ 
        display: 'flex', 
        flexDirection: 'column',
        padding: '20px',
        backgroundColor: '#21252b'
      }}>
        <div style={{
          display: 'flex'
        }}>
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            style={{ 
              flex: 1, 
              marginRight: '10px', 
              padding: '10px',
              backgroundColor: '#3a3f4b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              resize: 'none'
            }}
            placeholder="Type a message or hold Shift+V to record audio..."
          />
          <div style={{
            display: 'flex',
            gap: '10px'
          }}>
            <Mic onAudioChunk={handleAudioChunk} />
            <button 
              onClick={handleSendMessage} 
              style={{ 
                padding: '10px 20px',
                backgroundColor: '#61dafb',
                color: 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

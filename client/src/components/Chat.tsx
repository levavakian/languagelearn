import React, { useState, useEffect, useRef } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

interface Message {
  sender: string;
  content: string;
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

  const { sendMessage, lastMessage, readyState } = useWebSocket(
    selectedChatId ? `ws://localhost:8080/api/chat/${selectedChatId}/ws` : null,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 3000,
      protocols: ['Bearer', token],
    }
  );

  useEffect(() => {
    if (lastMessage !== null) {
      const newMessage = JSON.parse(lastMessage.data);
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    }
  }, [lastMessage]);

  useEffect(() => {
    if (selectedChatId) {
      setMessages([]);
      fetchChatHistory();
    }
  }, [selectedChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatHistory = async () => {
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
      setMessages(history);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() && readyState === ReadyState.OPEN) {
      const message = {
        sender: 'user', // Replace with actual user identifier
        content: inputMessage.trim()
      };
      sendMessage(JSON.stringify(message));
      setInputMessage('');
    }
  };

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
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
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
        padding: '20px',
        backgroundColor: '#21252b'
      }}>
        <textarea
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
          placeholder="Type a message..."
        />
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
  );
};

export default Chat;


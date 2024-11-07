import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import Mic from './Mic';
import { audioPlayer } from '../services/AudioPlayer';
import ChatSettings, { ConversationSettings, fetchChatSettings } from './ChatSettings';
import Dropdown from './Dropdown';
import './Chat.css';

interface Message {
  sender: string;
  content: string;
  type?: 'text' | 'audio';
  preferredResponseType?: 'text' | 'audio';
}

interface ChatProps {
  token: string;
  selectedChatId: string | null;
  onUnauthorized: () => void;
  isSidebarExpanded: boolean;
}

const Chat: React.FC<ChatProps> = ({ token, selectedChatId, onUnauthorized, isSidebarExpanded }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ConversationSettings>({
    chatId: selectedChatId || undefined,
    notes: [],
    preferAudioResponse: false
  });
  const [dropdownPosition, setDropdownPosition] = useState<{x: number, y: number} | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [messagesBlurred, setMessagesBlurred] = useState(false);

  const { sendMessage, lastMessage, readyState } = useWebSocket(
    selectedChatId ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/chat/${selectedChatId}/ws?token=${encodeURIComponent(token)}` : null,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 3000,
      onOpen: () => {
          setMessages([]);
      },
    }
  );

  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() && readyState === ReadyState.OPEN) {
      const message = {
        sender: 'user',
        content: inputMessage.trim(),
        type: 'text' as const,
        preferredResponseType: settings.preferAudioResponse ? 'audio' : 'text'
      };
      sendMessage(JSON.stringify(message));
      setInputMessage('');
    }
  }, [inputMessage, readyState, sendMessage, settings.preferAudioResponse]);

  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      if (showSettings || !selectedChatId) return;
      
      const isSidebarInputFocused = document.activeElement?.classList.contains('sidebar-chat-input');
      if (isSidebarInputFocused) return;
      
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyPress);
    return () => document.removeEventListener('keydown', handleGlobalKeyPress);
  }, [showSettings, selectedChatId, handleSendMessage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown') && !target.closest('.message-content')) {
        setDropdownPosition(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (lastMessage !== null) {
      const newMessage = JSON.parse(lastMessage.data);
      if (newMessage.type === 'audio' && newMessage.sender !== 'user') {
        const binaryStr = atob(newMessage.content);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes.buffer], { type: 'audio/pcm' });
        audioPlayer.playChunk(audioBlob);
      } else if (newMessage.type !== 'audio') {
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
  }, [selectedChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadSettings = async () => {
      if (!selectedChatId) return;
      
      const data = await fetchChatSettings(selectedChatId, token, onUnauthorized);
      if (data) {
        setSettings(data);
      }
    };

    loadSettings();
  }, [selectedChatId, token, onUnauthorized]);

  const handleWordClick = (e: React.MouseEvent, message: string) => {
    e.stopPropagation();
    const word = (e.target as HTMLElement).textContent || '';
    setSelectedWord(word);
    setSelectedMessage(message);
    setDropdownPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMessageClick = (e: React.MouseEvent, message: string) => {
    if (!(e.target as HTMLElement).classList.contains('message-word')) {
      setSelectedWord(null);
      setSelectedMessage(message);
      setDropdownPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleNoteSelect = (noteContent: string) => {
    let newMessage = noteContent;
    if (selectedWord) {
      newMessage = newMessage.replace(/@word/g, selectedWord.trim());
    }
    if (selectedMessage) {
      newMessage = newMessage.replace(/@sentence/g, selectedMessage.trim());
    }
    setInputMessage(newMessage);
    setDropdownPosition(null);
    inputRef.current?.focus();
  };

  const handleAudioChunk = useCallback((chunk: Blob, isRecordingFinished: boolean) => {
    if (readyState === ReadyState.OPEN) {
      if (isRecordingFinished) {
        const message = {
          sender: 'user',
          content: 'commit',
          type: 'audio' as const,
          preferredResponseType: 'audio'
        };
        sendMessage(JSON.stringify(message));
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          bytes.forEach(byte => binary += String.fromCharCode(byte));
          const base64Audio = btoa(binary);
          
          const message = {
            sender: 'user',
            content: base64Audio,
            type: 'audio' as const,
            preferredResponseType: 'audio'
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

  const chatStyles = useMemo(() => ({
    chatWindow: { 
      display: 'flex', 
      flexDirection: 'column' as const, 
      height: '100%',
      backgroundColor: '#282c34',
      color: 'white',
      position: 'relative' as const,
      transition: 'all 0.3s ease',
    }
  }), []);

  const toggleAudioPreference = async () => {
    const newSettings = {
      ...settings,
      preferAudioResponse: !settings.preferAudioResponse
    };
    
    try {
      const response = await fetch(`/api/chat/${selectedChatId}/settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });

      if (response.status === 401 || response.status === 403) {
        onUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving audio preference:', error);
    }
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

  if (showSettings) {
    return <ChatSettings 
      token={token}
      chatId={selectedChatId!}
      onSettingsChange={setSettings} 
      onBack={() => setShowSettings(false)}
      onUnauthorized={onUnauthorized}
    />;
  }

  return (
    <div className="chat-window" style={chatStyles.chatWindow}>
      <div style={{ height: '50px', position: 'relative' }}>
        <button
          onClick={() => setMessagesBlurred(!messagesBlurred)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '60px',
            background: 'none',
            border: 'none',
            color: '#919191',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '5px',
            zIndex: 1
          }}
          title="Toggle message visibility to practice listening comprehension"
        >
          {messagesBlurred ? (
            <span className="rotated-strikethrough">
              👁
            </span>
          ) : '👁'}
        </button>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: '#919191',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '5px',
            zIndex: 1
          }}
          title="Settings"
        >
          ⚙️
        </button>
      </div>
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
              className="message-content"
              onClick={(e) => handleMessageClick(e, message.content)}
              style={{
                backgroundColor: message.sender === 'user' ? '#4a5d4c' : '#3a3f4b',
                color: message.sender === 'user' ? 'white' : 'white',
                borderRadius: '10px',
                padding: '10px',
                wordWrap: 'break-word',
                wordBreak: 'keep-all',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                filter: messagesBlurred ? 'blur(5px)' : 'none'
              }}
            >
              {message.content.split(' ').map((word, i) => (
                <span
                  key={i}
                  onClick={(e) => handleWordClick(e, message.content)}
                  style={{ 
                    cursor: 'pointer', 
                    margin: '0 2px',
                    padding: '2px',
                    borderRadius: '3px',
                    transition: 'box-shadow 0.2s ease'
                  }}
                  className="message-word"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {dropdownPosition && (
        <div 
          className="dropdown"
          style={{
            position: 'fixed',
            left: dropdownPosition.x,
            top: dropdownPosition.y,
            zIndex: 1000
          }}
        >
          <Dropdown 
            settings={settings} 
            onSelectNote={handleNoteSelect} 
            position={dropdownPosition}
            expandedFolders={expandedFolders}
            setExpandedFolders={setExpandedFolders}
          />
        </div>
      )}
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
            placeholder="Type a message or hold Alt or Option to record audio..."
          />
          <div style={{
            display: 'flex',
            gap: '10px'
          }}>
            <Mic 
              onAudioChunk={handleAudioChunk} 
              preferAudioResponse={settings.preferAudioResponse || false}
              onToggleAudioPreference={toggleAudioPreference}
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
      </div>
    </div>
  );
};

export default Chat;

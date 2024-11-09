import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import Mic from './Mic';
import { audioPlayer } from '../services/AudioPlayer';
import SettingsPage, { Settings } from './Settings/Settings';
import Dropdown from './Dropdown';
import './Chat.css';
import MicAlwaysOnModal from './MicAlwaysOnModal';

interface Message {
  sender: string;
  content: string;
  type?: 'text' | 'audio';
  preferredResponseType?: 'text' | 'audio';
  responseId?: string;
}

interface ChatProps {
  token: string;
  selectedChatId: string | null;
  onUnauthorized: () => void;
}

const Chat: React.FC<ChatProps> = ({ token, selectedChatId, onUnauthorized }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [preferAudioResponse, setPreferAudioResponse] = useState(
    localStorage.getItem('preferAudioResponse') === 'true'
  );
  const [settings, setSettings] = useState<Settings>({
    id: selectedChatId || '',
    notes: [],
    vocabItems: {}
  });
  const [dropdownPosition, setDropdownPosition] = useState<{x: number, y: number} | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [messagesBlurred, setMessagesBlurred] = useState(false);
  const [latchedResponseId, setLatchedResponseId] = useState<string | null>(null);
  const [micAlwaysOn, setMicAlwaysOn] = useState(false);
  const [showMicModal, setShowMicModal] = useState(false);
  const [micAlwaysOnTimer, setMicAlwaysOnTimer] = useState<NodeJS.Timeout | null>(null);
  const micRef = useRef<{ startAlwaysOnMode: () => void, stopAlwaysOnMode: () => void } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const latchedResponseIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    setMicAlwaysOn(false);
    return () => {
      if (micAlwaysOnTimer) {
        clearTimeout(micAlwaysOnTimer);
      }
      setMicAlwaysOn(false);
    };
  }, [selectedChatId]);

  const handleMicAlwaysOnToggle = () => {
    if (!micAlwaysOn) {
      setShowMicModal(true);
      setIsModalOpen(true);
    } else {
      disableMicAlwaysOn();
    }
  };

  const disableMicAlwaysOn = () => {
    setMicAlwaysOn(false);
    if (micAlwaysOnTimer) {
      clearTimeout(micAlwaysOnTimer);
      setMicAlwaysOnTimer(null);
    }
    micRef.current?.stopAlwaysOnMode?.();
    sendMessage(JSON.stringify({
      sender: 'user',
      content: 'server_vad:disable',
      type: 'audio' as const,
      preferredResponseType: 'audio'
    }));
  };

  const handleMicModalResponse = (response: 'ten_minutes' | 'permanent' | 'cancel') => {
    setShowMicModal(false);
    setIsModalOpen(false);
    
    if (response === 'cancel') return;
    
    setMicAlwaysOn(true);
    micRef.current?.startAlwaysOnMode?.();
    
    sendMessage(JSON.stringify({
      sender: 'user',
      content: 'server_vad:enable',
      type: 'audio' as const,
      preferredResponseType: 'audio'
    }));

    if (response === 'ten_minutes') {
      const timer = setTimeout(() => {
        disableMicAlwaysOn();
      }, 10 * 60 * 1000); // 10 minutes
      setMicAlwaysOnTimer(timer);
    }
  };

  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() && readyState === ReadyState.OPEN) {
      const message = {
        sender: 'user',
        content: inputMessage.trim(),
        type: 'text' as const,
        preferredResponseType: preferAudioResponse ? 'audio' : 'text'
      };
      sendMessage(JSON.stringify(message));
      setInputMessage('');
    }
  }, [inputMessage, readyState, sendMessage, preferAudioResponse]);

  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      if (showSettings || !selectedChatId || showMicModal || isModalOpen) return;
      
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
  }, [showSettings, selectedChatId, handleSendMessage, showMicModal, isModalOpen]);

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
        audioPlayer.playChunk(audioBlob, newMessage.responseId);
      } else if (newMessage.type !== 'audio') {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    if (lastMessage !== null) {
      const newMessage = JSON.parse(lastMessage.data);
      if (newMessage.responseId && newMessage.responseId !== latchedResponseId) {
        console.log('Updating latched response ID:', newMessage.responseId);
        setLatchedResponseId(newMessage.responseId);
        latchedResponseIdRef.current = newMessage.responseId;
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    if (selectedChatId) {
      setMessages([]);
      setLatchedResponseId(null);
      console.log('Reset latched response ID');
    }
  }, [selectedChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadSettings = async () => {
      if (!selectedChatId) return;
      
      try {
        const response = await fetch(`/api/chat/${selectedChatId}/settings`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401 && onUnauthorized) {
            onUnauthorized();
            return;
          }
          throw new Error(`Failed to load settings: ${response.statusText}`);
        }

        const data = await response.json();
        setSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, [selectedChatId, token, onUnauthorized]);

  useEffect(() => {
    localStorage.setItem('preferAudioResponse', String(preferAudioResponse));
  }, [preferAudioResponse]);

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

  const handleAudioChunk = useCallback((chunk: Blob, isRecordingFinished: boolean, stoppedAlwaysOn: boolean = false) => {
    if (readyState === ReadyState.OPEN) {
      if (isRecordingFinished && !stoppedAlwaysOn) {
        const message = {
          sender: 'user',
          content: 'commit',
          type: 'audio' as const,
          preferredResponseType: 'audio'
        };
        sendMessage(JSON.stringify(message));
      } else {
        if (!micAlwaysOn) {
          if (latchedResponseIdRef.current) {
            console.log('Stopping and ignoring response ID:', latchedResponseIdRef.current);
            audioPlayer.stopAndIgnoreResponse(latchedResponseIdRef.current);
          } else {
            console.log('No response ID to stop, calling regular stop');
            audioPlayer.stop();
          }
        }
        
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
  }, [readyState, sendMessage, micAlwaysOn]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const chatStyles = useMemo(() => ({
    chatWindow: { 
      display: 'flex', 
      flexDirection: 'column' as const, 
      height: '100%',
      backgroundColor: '#1e1e1e',
      color: 'white',
      position: 'relative' as const,
      transition: 'all 0.3s ease',
    }
  }), []);

  const toggleAudioPreference = async () => {
    setPreferAudioResponse(!preferAudioResponse);
  };

  const settingsEndpoint = selectedChatId ? `/api/chat/${selectedChatId}/settings` : null;

  if (showSettings && selectedChatId && settingsEndpoint) {
    return (
      <SettingsPage
        token={token}
        id={selectedChatId}
        endpoint={settingsEndpoint}
        onSettingsChange={setSettings}
        onBack={() => setShowSettings(false)}
        onUnauthorized={onUnauthorized}
      />
    );
  }

  if (!selectedChatId) {
    return (
      <div className="chat-window" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        backgroundColor: '#1e1e1e',
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
    <div className="chat-window" style={chatStyles.chatWindow}>
      <div style={{ height: '50px', position: 'relative' }}>
        <div 
          onClick={handleMicAlwaysOnToggle}
          title={micAlwaysOn ? "Microphone always on - click to disable" : "Click to enable always-on microphone mode"}
          style={{
            position: 'absolute',
            top: '17px',
            right: '130px',
            cursor: 'pointer',
            zIndex: 1,
            transition: 'all 0.3s ease',
            filter: micAlwaysOn 
              ? 'brightness(100%) sepia(100%) saturate(10000%) hue-rotate(0deg)'
              : 'grayscale(100%)'
          }}
        >
          <span style={{ fontSize: '12px' }}>🎤</span>
        </div>
        <div 
          onClick={toggleAudioPreference}
          title={preferAudioResponse ? "Model will prefer to respond with voice even when you text, toggle to disable" : "Model will respond to text with text, toggle to have model respond with voice even when you text"}
          style={{
            position: 'absolute',
            top: '17px',
            right: '100px',
            cursor: 'pointer',
            zIndex: 1,
            transition: 'filter 0.3s ease',
            filter: preferAudioResponse ? 'none' : 'grayscale(100%)',
          }}
        >
          <span style={{ fontSize: '12px' }}>🔊</span>
        </div>
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
              ref={micRef}
              onAudioChunk={handleAudioChunk} 
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
      {showMicModal && (
        <MicAlwaysOnModal onResponse={handleMicModalResponse} />
      )}
    </div>
  );
};

export default Chat;

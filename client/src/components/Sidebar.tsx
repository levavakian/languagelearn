import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Chat {
  id: string;
  creatorId: string;
  name: string;
  messages: Message[];
}

interface Message {
  sender: string;
  content: string;
}

interface SidebarProps {
  token: string;
  onSelectChat: (chatId: string) => void;
  onUnauthorized: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ token, onSelectChat, onUnauthorized }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newChatName, setNewChatName] = useState<string>('');
  const [isCreatingChat, setIsCreatingChat] = useState<boolean>(false);
  const newChatInputRef = useRef<HTMLInputElement>(null);

  const handleUnauthorizedResponse = (response: Response) => {
    if (response.status === 401 || response.status === 403) {
      onUnauthorized();
    }
  };

  const fetchChats = useCallback(async () => {
    try {
      const response = await fetch('/api/chats', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      handleUnauthorizedResponse(response);
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      const data = await response.json();
      setChats(data);
      return data;
    } catch (error) {
      console.error('Error fetching chats:', error);
      return null;
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    fetchChats().then(fetchedChats => {
      if (fetchedChats && fetchedChats.length > 0 && !selectedChat) {
        setSelectedChat(fetchedChats[0].id);
        onSelectChat(fetchedChats[0].id);
      }
    });
  }, [fetchChats, selectedChat, onSelectChat]);

  const createChat = async () => {
    if (!newChatName.trim()) return;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newChatName })
      });
      handleUnauthorizedResponse(response);
      if (!response.ok) {
        throw new Error('Failed to create chat');
      }
      const newChat = await response.json();
      setChats(prevChats => [...prevChats, newChat]);
      setSelectedChat(newChat.id);
      onSelectChat(newChat.id);
      setNewChatName('');
      setIsCreatingChat(false);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      handleUnauthorizedResponse(response);
      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      if (selectedChat === chatId) {
        const remainingChats = chats.filter(chat => chat.id !== chatId);
        if (remainingChats.length > 0) {
          setSelectedChat(remainingChats[0].id);
          onSelectChat(remainingChats[0].id);
        } else {
          setSelectedChat(null);
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChat(chatId);
    onSelectChat(chatId);
  };

  const truncateString = (str: string, num: number) => {
    if (str && str.length <= num) {
      return str;
    }
    return str ? str.slice(0, num) + '...' : '';
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      createChat();
    }
  };

  useEffect(() => {
    if (isCreatingChat && newChatInputRef.current) {
      newChatInputRef.current.focus();
    }
  }, [isCreatingChat]);

  return (
    <div className="sidebar" style={{
      backgroundColor: '#282c34',
      color: 'white',
      padding: '20px',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h2 style={{ marginBottom: '20px' }}>Chats</h2>
      {isCreatingChat ? (
        <div style={{ marginBottom: '20px' }}>
          <input
            ref={newChatInputRef}
            type="text"
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter chat name"
            style={{
              width: 'calc(100% - 20px)',
              padding: '10px',
              marginBottom: '10px',
              backgroundColor: '#3a3f4b',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          />
          <button
            onClick={createChat}
            style={{
              backgroundColor: '#61dafb',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 20px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Create
          </button>
          <button
            onClick={() => setIsCreatingChat(false)}
            style={{
              backgroundColor: '#808080',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 20px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsCreatingChat(true)}
          style={{
            backgroundColor: '#61dafb',
            color: 'black',
            border: 'none',
            borderRadius: '4px',
            padding: '10px 20px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          New Chat
        </button>
      )}
      <ul style={{ listStyle: 'none', padding: 0, overflowY: 'auto', flex: 1 }}>
        {chats.map(chat => (
          <li key={chat.id} style={{
            marginBottom: '10px',
            padding: '10px',
            backgroundColor: chat.id === selectedChat ? '#3a3f4b' : 'transparent',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span
              onClick={() => handleSelectChat(chat.id)}
              style={{ cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {truncateString(chat.name || chat.id, 20)}
            </span>
            <button
              onClick={() => deleteChat(chat.id)}
              style={{
                backgroundColor: '#ff4d4d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;

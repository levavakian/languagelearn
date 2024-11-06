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
  selectedChatId: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ token, onSelectChat, onUnauthorized, selectedChatId }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [newChatName, setNewChatName] = useState<string>('');
  const [isCreatingChat, setIsCreatingChat] = useState<boolean>(false);
  const newChatInputRef = useRef<HTMLInputElement>(null);

  const handleUnauthorizedResponse = useCallback((response: Response) => {
    if (response.status === 401 || response.status === 403) {
      onUnauthorized();
    }
  }, [onUnauthorized]);

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
      // Sort chats by creation time or ID to maintain consistent order
      const sortedChats = data.sort((a: Chat, b: Chat) => {
        if (!a?.id || !b?.id) return 0;
        return a.id.localeCompare(b.id);
      });
      setChats(sortedChats);
      return sortedChats;
    } catch (error) {
      console.error('Error fetching chats:', error);
      return null;
    }
  }, [token, handleUnauthorizedResponse]);

  useEffect(() => {
    fetchChats().then(fetchedChats => {
      if (fetchedChats && fetchedChats.length > 0 && !selectedChatId) {
        onSelectChat(fetchedChats[0].id);
      }
    });
  }, [fetchChats, onSelectChat, selectedChatId]);

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
      setChats(prevChats => {
        const updatedChats = [...prevChats, newChat].sort((a, b) => {
          if (!a?.id || !b?.id) return 0;
          return a.id.localeCompare(b.id);
        });
        return updatedChats;
      });
      setNewChatName('');
      setIsCreatingChat(false);
      // Only call onSelectChat
      onSelectChat(newChat.id);
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
      setChats(prevChats => {
        const updatedChats = prevChats.filter(chat => chat.id !== chatId);
        // If there are remaining chats, select the first one
        if (updatedChats.length > 0) {
          onSelectChat(updatedChats[0].id);
        }
        return updatedChats;
      });
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
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
      backgroundColor: 'inherit',
      color: 'white',
      padding: '20px',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      width: '100%',
      position: 'relative'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>Chats</h2>
      </div>
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
          <li 
            key={chat.id} 
            onClick={() => onSelectChat(chat.id)}
            style={{
              marginBottom: '10px',
              padding: '10px',
              backgroundColor: selectedChatId === chat.id ? '#3a3f4b' : 'transparent',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              if (selectedChatId !== chat.id) {
                e.currentTarget.style.backgroundColor = '#3a3f4b';
              }
            }}
            onMouseOut={(e) => {
              if (selectedChatId !== chat.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span
              style={{ 
                flex: 1, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap' 
              }}
            >
              {truncateString(chat.name || chat.id, 20)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent chat selection when clicking delete
                deleteChat(chat.id);
              }}
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

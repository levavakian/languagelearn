import React, { useState, useEffect } from 'react';
import './App.css';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import Sidepanel from './components/Sidepanel/Sidepanel';
import Chat from './components/Chat';
import Courses from './components/Courses/Courses';
import CreateChatModal from './components/ChatModals/CreateChatModal';
import PaymentModal from './components/PaymentModal/PaymentModal';

// Add tab type and colors
type Tab = 'chats' | 'courses' | 'lesson';

const darkModeColors = {
  background: '#1e1e1e',
  text: '#e0e0e0',
  primary: '#3f51b5',
  secondary: '#303030',
  accent: '#7986cb',
  sidebarBackground: '#282c34',
  tabActive: '#3f51b5',
  tabInactive: '#282c34',
};

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    backgroundColor: darkModeColors.background,
    color: darkModeColors.text,
    overflow: 'hidden',
  },
  header: {
    padding: '10px',
    backgroundColor: darkModeColors.secondary,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '60px',
  },
  button: {
    backgroundColor: darkModeColors.primary,
    color: darkModeColors.text,
    border: 'none',
    borderRadius: '4px',
    padding: '10px 20px',
    cursor: 'pointer',
    boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
  },
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    msOverflowStyle: 'none' as const,
    scrollbarWidth: 'none' as 'none',
  },
  chatContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  sidebarContainer: {
    position: 'relative' as const,
    display: 'flex',
  },
  toggleButton: {
    position: 'absolute' as const,
    right: '-15px',
    top: '0px',
    zIndex: 1000,
    backgroundColor: darkModeColors.primary,
    color: darkModeColors.text,
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'right 0.3s ease',
  },
  // Add new tab styles
  tabs: {
    display: 'flex',
    gap: '10px',
  },
  tab: {
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: 'none',
    color: darkModeColors.text,
  },
  tabsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  arrow: {
    color: darkModeColors.text,
    fontSize: '12px',
  },
};

// Add new interface for lesson state
interface LessonState {
  courseId: string;
  chatId: string;
}

function App() {
  const [jwt, setJwt] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(() => {
    const storedId = localStorage.getItem('selectedChatId');
    return storedId || null;
  });
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(window.innerWidth >= 768);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const storedTab = localStorage.getItem('activeTab');
    return (storedTab as Tab) || 'chats';
  });
  const [chats, setChats] = useState<Array<{ id: string; name: string }>>([]);
  const [isCreateChatModalOpen, setIsCreateChatModalOpen] = useState(false);
  const [lessonState, setLessonState] = useState<LessonState | null>(() => {
    const stored = localStorage.getItem('lessonState');
    return stored ? JSON.parse(stored) : null;
  });
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(() => {
    const stored = localStorage.getItem('selectedCourseId');
    return stored || null;
  });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const storedJwt = localStorage.getItem('jwt');
    if (storedJwt) {
      setJwt(storedJwt);
    }

    const handleResize = () => {
      setIsSidebarExpanded(window.innerWidth >= 768);
    };

    const handleToggleSidebar = () => {
      setIsSidebarExpanded(!isSidebarExpanded);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('toggleSidebar', handleToggleSidebar);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('toggleSidebar', handleToggleSidebar);
    };
  }, [isSidebarExpanded]);

  useEffect(() => {
    const fetchChats = async () => {
      if (!jwt) return;
      
      try {
        const response = await fetch('/api/standalone-chats', {
          headers: {
            'Authorization': `Bearer ${jwt}`
          }
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (response.ok) {
          const fetchedChats = await response.json();
          setChats(fetchedChats);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    };

    fetchChats();
  }, [jwt]);

  const handleLoginSuccess = (response: any) => {
    console.log('Login Success:', response);
    const newJwt = response.credential;
    setJwt(newJwt);
    localStorage.setItem('jwt', newJwt);
  };

  const handleLoginFailure = () => {
    console.log('Login Failed');
  };

  const handleLogout = () => {
    console.log('Logout');
    setJwt(null);
    setSelectedChatId(null);
    localStorage.removeItem('jwt');
    localStorage.removeItem('selectedChatId');
  };

  const handleUnauthorized = () => {
    console.log('Unauthorized: Logging out');
    setJwt(null);
    setSelectedChatId(null);
    localStorage.removeItem('jwt');
    localStorage.removeItem('selectedChatId');
  };

  const handleSelectChat = (chatId: string | null) => {
    console.log('Selected chat:', chatId);
    const newSelectedChatId = chatId || null;
    setSelectedChatId(newSelectedChatId);
    if (newSelectedChatId) {
      localStorage.setItem('selectedChatId', newSelectedChatId);
    } else {
      localStorage.removeItem('selectedChatId');
    }
    if (window.innerWidth < 768) {
      setIsSidebarExpanded(false);
    }
  };

  const renderAuthButton = () => {
    if (jwt) {
      return (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setIsPaymentModalOpen(true)} 
            style={{
              ...styles.tab,
              backgroundColor: darkModeColors.tabInactive,
            }}
          >
            Buy Credits
          </button>
          <button onClick={handleLogout} style={styles.button}>
            Logout
          </button>
        </div>
      );
    } else {
      return (
        <GoogleLogin
          onSuccess={handleLoginSuccess}
          onError={handleLoginFailure}
        />
      );
    }
  };

  // Update tab handling function
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
  };

  // Add new chat handler
  const handleCreateChat = async (name: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        console.error('Error creating chat:', response.statusText);
        return;
      }

      const newChat = await response.json();
      if (!newChat || typeof newChat.id !== 'string' || typeof newChat.name !== 'string') {
        console.error('Invalid chat data received:', newChat);
        return;
      }

      setChats(prevChats => Array.isArray(prevChats) ? [...prevChats, newChat] : [newChat]);
      setSelectedChatId(newChat.id);
      setIsCreateChatModalOpen(false);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  // Add delete chat handler
  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.ok) {
        setChats(prevChats => {
          const newChats = prevChats.filter(chat => chat.id !== chatId);
          
          // If we're deleting the selected chat, select the next available one
          if (selectedChatId === chatId) {
            const deletedIndex = prevChats.findIndex(chat => chat.id === chatId);
            const nextChat = newChats[deletedIndex] || newChats[deletedIndex - 1];
            
            if (nextChat) {
              setSelectedChatId(nextChat.id);
              localStorage.setItem('selectedChatId', nextChat.id);
            } else {
              setSelectedChatId(null);
              localStorage.removeItem('selectedChatId');
            }
          }
          
          return newChats;
        });
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleLessonSelect = (chatId: string, courseId: string) => {
    const newLessonState = { chatId, courseId };
    setLessonState(newLessonState);
    localStorage.setItem('lessonState', JSON.stringify(newLessonState));
    setActiveTab('lesson');
    localStorage.setItem('activeTab', 'lesson');
  };

  const handleCourseSelect = (courseId: string | null) => {
    // If clicking the already selected course, just switch to courses tab
    if (courseId === selectedCourseId) {
      setActiveTab('courses');
      localStorage.setItem('activeTab', 'courses');
      return;
    }

    setSelectedCourseId(courseId);
    if (courseId) {
      localStorage.setItem('selectedCourseId', courseId);
    } else {
      localStorage.removeItem('selectedCourseId');
    }
    
    // Clear lesson state if selecting null or a different course
    if (!courseId || (lessonState && courseId !== lessonState.courseId)) {
      setLessonState(null);
      localStorage.removeItem('lessonState');
      if (activeTab === 'lesson') {
        setActiveTab('courses');
        localStorage.setItem('activeTab', 'courses');
      }
    }
  };

  // Add this effect to watch for course changes and clear lesson state
  useEffect(() => {
    const handleCourseChange = () => {
      // If we have a lesson state but its course no longer exists in the courses list
      if (lessonState && selectedCourseId !== lessonState.courseId) {
        setLessonState(null);
        localStorage.removeItem('lessonState');
        if (activeTab === 'lesson') {
          setActiveTab('courses');
          localStorage.setItem('activeTab', 'courses');
        }
      }
    };

    handleCourseChange();
  }, [selectedCourseId, lessonState, activeTab]);

  // Add new effect to handle auto-selection
  useEffect(() => {
    if (chats?.length > 0 && (!selectedChatId || !chats.find(chat => chat.id === selectedChatId))) {
      handleSelectChat(chats[0].id);
    }
  }, [chats, selectedChatId]);

  return (
    <GoogleOAuthProvider clientId="1074499601910-rpc6qtu7lpv5e8pfc08sagqa5t3rihhh.apps.googleusercontent.com">
      <div style={styles.app}>
        <header style={styles.header}>
          {jwt && (
            <div style={styles.tabsContainer}>
              <button
                style={{
                  ...styles.tab,
                  backgroundColor: activeTab === 'chats' ? darkModeColors.tabActive : darkModeColors.tabInactive,
                }}
                onClick={() => handleTabChange('chats')}
              >
                Chats
              </button>
              <button
                style={{
                  ...styles.tab,
                  backgroundColor: activeTab === 'courses' ? darkModeColors.tabActive : darkModeColors.tabInactive,
                }}
                onClick={() => handleTabChange('courses')}
              >
                Courses
              </button>
              {lessonState && (
                <>
                  <span style={styles.arrow}>▶</span>
                  <button
                    style={{
                      ...styles.tab,
                      backgroundColor: activeTab === 'lesson' ? darkModeColors.tabActive : darkModeColors.tabInactive,
                    }}
                    onClick={() => handleTabChange('lesson')}
                  >
                    Lesson
                  </button>
                </>
              )}
            </div>
          )}
          {renderAuthButton()}
        </header>
        <div style={styles.content} className="hide-scrollbar">
          {jwt && activeTab === 'chats' && (
            <>
              <Sidepanel
                title="Chats"
                items={chats}
                selectedId={selectedChatId}
                onSelect={handleSelectChat}
                onDelete={handleDeleteChat}
                onCreate={() => setIsCreateChatModalOpen(true)}
                expanded={isSidebarExpanded}
                onExpandedChange={setIsSidebarExpanded}
              />
              <div style={styles.chatContainer}>
                <Chat 
                  key={selectedChatId || 'empty'} 
                  token={jwt} 
                  selectedChatId={selectedChatId} 
                  onUnauthorized={handleUnauthorized}
                />
              </div>
              <CreateChatModal
                isOpen={isCreateChatModalOpen}
                onClose={() => setIsCreateChatModalOpen(false)}
                onSubmit={handleCreateChat}
              />
              <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                token={jwt}
                onUnauthorized={handleUnauthorized}
              />
            </>
          )}
          {jwt && activeTab === 'courses' && (
            <Courses 
              token={jwt} 
              onUnauthorized={handleUnauthorized}
              onLessonSelect={handleLessonSelect}
              onCourseSelect={handleCourseSelect}
              selectedCourseId={selectedCourseId}
            />
          )}
          {jwt && activeTab === 'lesson' && lessonState && (
            <Courses 
              token={jwt} 
              onUnauthorized={handleUnauthorized}
              onLessonSelect={handleLessonSelect}
              onCourseSelect={handleCourseSelect}
              selectedCourseId={lessonState.courseId}
              forcedChatId={lessonState.chatId}
            />
          )}
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import './App.css';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';

const darkModeColors = {
  background: '#1e1e1e',
  text: '#e0e0e0',
  primary: '#3f51b5',
  secondary: '#303030',
  accent: '#7986cb',
};

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    backgroundColor: darkModeColors.background,
    color: darkModeColors.text,
  },
  header: {
    padding: '10px',
    backgroundColor: darkModeColors.secondary,
    display: 'flex',
    justifyContent: 'flex-end',
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
  },
  sidebar: {
    width: '250px',
    borderRight: `1px solid ${darkModeColors.accent}`,
    height: 'calc(100vh - 60px)',
  },
  chatContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
};

function App() {
  const [jwt, setJwt] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  useEffect(() => {
    const storedJwt = localStorage.getItem('jwt');
    if (storedJwt) {
      setJwt(storedJwt);
    }
  }, []);

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
    localStorage.removeItem('jwt');
    setSelectedChatId(null);
  };

  const handleUnauthorized = () => {
    console.log('Unauthorized: Logging out');
    setJwt(null);
    localStorage.removeItem('jwt');
    setSelectedChatId(null);
  };

  const handleSelectChat = (chatId: string) => {
    console.log('Selected chat:', chatId);
    setSelectedChatId(chatId);
  };

  const handleCreateChat = (chatId: string) => {
    console.log('Created new chat:', chatId);
    setSelectedChatId(chatId);
  };

  const renderAuthButton = () => {
    if (jwt) {
      return (
        <button onClick={handleLogout} style={styles.button}>
          Logout
        </button>
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

  return (
    <GoogleOAuthProvider clientId="1074499601910-rpc6qtu7lpv5e8pfc08sagqa5t3rihhh.apps.googleusercontent.com">
      <div style={styles.app}>
        <header style={styles.header}>
          {renderAuthButton()}
        </header>
        <div style={styles.content}>
          {jwt && (
            <div style={styles.sidebar}>
              <Sidebar 
                token={jwt} 
                onSelectChat={handleSelectChat} 
                onCreateChat={handleCreateChat}
                onUnauthorized={handleUnauthorized} 
              />
            </div>
          )}
          <div style={styles.chatContainer}>
            {jwt && (
              <Chat token={jwt} selectedChatId={selectedChatId} onUnauthorized={handleUnauthorized} />
            )}
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;

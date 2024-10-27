import React, { useState, useEffect } from 'react';
import './App.css';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import Sidebar from './components/Sidebar';

function App() {
  const [jwt, setJwt] = useState<string | null>(null);

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
  };

  const handleUnauthorized = () => {
    console.log('Unauthorized: Logging out');
    setJwt(null);
    localStorage.removeItem('jwt');
  };

  const handleSelectChat = (chatId: string) => {
    console.log('Selected chat:', chatId);
    // Implement chat selection logic here
  };

  return (
    <GoogleOAuthProvider clientId="1074499601910-rpc6qtu7lpv5e8pfc08sagqa5t3rihhh.apps.googleusercontent.com">
      <div className="App" style={{ display: 'flex', height: '100vh' }}>
        {jwt && (
          <div style={{ width: '250px', borderRight: '1px solid #ccc' }}>
            <Sidebar token={jwt} onSelectChat={handleSelectChat} onUnauthorized={handleUnauthorized} />
          </div>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <header className="App-header" style={{ flex: 1, position: 'relative' }}>
            <div className="login-logout" style={{ position: 'absolute', top: 10, right: 10 }}>
              {jwt ? (
                <div>
                  <button 
                    onClick={handleLogout} 
                    style={{
                      backgroundColor: '#808080',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '10px 20px',
                      cursor: 'pointer',
                      boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
                      marginRight: '10px'
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <GoogleLogin
                  onSuccess={handleLoginSuccess}
                  onError={handleLoginFailure}
                />
              )}
            </div>
          </header>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;

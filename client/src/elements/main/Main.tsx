import React from 'react';
import { State, getStateValue, useSetStateValue } from '../../state/state';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const Main: React.FC = () => {
  const jwt = getStateValue((state: State) => state.auth.token);
  const setState = useSetStateValue();

  const handleLoginSuccess = (response: any) => {
    console.log('Login Success:', response);
    const newJwt = response.credential;
    setState(draft => { draft.auth.token = newJwt });
  };

  const handleLoginFailure = () => {
    console.log('Login Failed');
  };

  return (
    <GoogleOAuthProvider clientId="1074499601910-rpc6qtu7lpv5e8pfc08sagqa5t3rihhh.apps.googleusercontent.com">
      <div style={{ 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <header style={{
          padding: '10px',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          {!jwt && (
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={handleLoginFailure}
            />
          )}
        </header>
        {jwt && (
          <div style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* Empty state when logged in */}
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
};

export default Main;


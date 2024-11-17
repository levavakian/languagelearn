import React from 'react';
import './Main.css';
import { State, getStateValue, useSetStateValue } from '../../state/state';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-hot-toast';
import { ToasterWithMax } from '../Toast/Toast';
import Workspace from '../Workspace/Workspace';

const Main: React.FC = () => {
  const jwt = getStateValue((state: State) => state.auth.token);
  const setState = useSetStateValue();

  const handleLoginSuccess = (response: any) => {
    console.log('Login Success:', response);
    const newJwt = response.credential;
    setState(draft => { draft.auth.token = newJwt });
  };

  const handleLoginFailure = () => {
    toast.error('There was an error logging in');
  };

  return (
    <GoogleOAuthProvider clientId="1074499601910-rpc6qtu7lpv5e8pfc08sagqa5t3rihhh.apps.googleusercontent.com">
      <div className="main-container">
        <div className="main-content">
          <ToasterWithMax 
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                cursor: 'pointer',
              },
            }}
            containerStyle={{
              top: 50,
            }}
            max={3}
          />
          {!jwt ? (
            <header style={{
              padding: '10px',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={handleLoginFailure}
              />
            </header>
          ) : (
            <Workspace />
          )}
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default Main;


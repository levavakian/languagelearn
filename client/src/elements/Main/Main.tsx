import React, { useEffect } from 'react';
import './Main.css';
import { State, useStateValue, useSetStateValue } from '../../state/state';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-hot-toast';
import { ToasterWithMax } from '../Toast/Toast';
import Workspace from '../Workspace/Workspace';

interface MainProps {
    onToggleRefactor?: () => void;
}

const Main: React.FC<MainProps> = ({ onToggleRefactor }) => {
    const jwt = useStateValue((state: State) => state.auth.token);
    const setState = useSetStateValue();

    useEffect(() => {
        setState(draft => {
            draft.auth.onRequestError = (response: any, msg?: string) => {
                console.log("Got response error",response);
                if (msg) {
                    toast.error(msg);
                }

                console.log("Checking status",response.status);
                if (response.status === 401) {
                    console.log("Expiring token");
                    toast.error('Your session has expired. Please login again.');
                    setState(draft => { draft.auth.token = "" });
                }
            };
        });
    }, [setState]);

    useEffect(() => {
        setState(draft => {
            draft.toggleRefactor = () => { onToggleRefactor?.(); };
        });
    }, [setState]);

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
                <div >
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
                            padding: '0px',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <GoogleLogin
                                onSuccess={handleLoginSuccess}
                                onError={handleLoginFailure}
                            />
                        </header>
                    ) : (
                        <div>
                            <Workspace />
                        </div>
                    )}
                </div>
            </div>
        </GoogleOAuthProvider>
    );
};
export default Main;


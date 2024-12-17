import React, { useEffect, useRef } from 'react';
import './Main.css';
import { State, useStateValue, useSetStateValue, ModalSelector, PageChoice, WorkPage } from '../../state/state';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { toast } from 'react-hot-toast';
import { ToasterWithMax } from '../Toast/Toast';
import Workspace from '../Workspace/Workspace';
import {
    QueryClient,
    QueryClientProvider,
  } from '@tanstack/react-query'
import { Landing } from '../Landing/Landing';
  
const queryClient = new QueryClient();

const Main = () => {
    const jwt = useStateValue((state: State) => state.auth.token);
    const setState = useSetStateValue();
    const key = useStateValue((state: State) => state.triggers.key);
    const pageChoice = useStateValue((state: State) => state.pageChoice);
    const modalSelector = useStateValue((state: State) => state.modalSelector);
    const deletedOrNotFoundIDs = useStateValue((state: State) => state.deletedOrNotFoundIDs);

    useEffect(() => {
        setState(draft => {
            console.log("Setting up response error handler");
            draft.auth.onRequestError = (response: any, msg?: string, id?: string) => {
                console.log("Checking status",response.status);
                if (response.status === 401) {
                    console.log("Expiring token");
                    toast.error('Your session has expired. Please log in again.', {id: "session-expired"});
                    setState(draft => { draft.auth.token = "" });
                    return;
                }

                if (response.status === 402) {
                    toast.error('Insufficient credits for request, please purchase more credits for generative content', {id: "insufficient-credits"});
                    return;
                }

                if (response.status === 520) {
                    toast.error('Global rate limits hit, please try again later', {id: "openai-quota-exceeded"});
                    return;
                }

                console.log("Got response error", response);
                if (msg) {
                    toast.error(msg, {id: id});
                }
            };
        });
    }, [setState]);

    useEffect(() => {
        const currentState = window.history.state;
        if (pageChoice === null) {
            return;
        }

        if (currentState &&
            currentState.selectedCourse === pageChoice.selectedCourse &&
            currentState.selectedLesson === pageChoice.selectedLesson &&
            currentState.workPage === pageChoice.workPage) {
            return;
        }

        window.history.pushState(pageChoice, '', window.location.pathname);
    }, [pageChoice]);

    useEffect(() => {
        const handleBackButton = (event: PopStateEvent) => {
            if (modalSelector !== ModalSelector.None) {
                setState(draft => { draft.modalSelector = ModalSelector.None });
                window.history.pushState(pageChoice, '', window.location.pathname);
                return;
            }

            if (event.state === null) {
                window.history.back();
                return;
            }

            if (event.state.pageChoice === WorkPage.Intro) {
                return;
            }

            setState(draft => { draft.pageChoice = event.state})
            return;
        };

        window.addEventListener('popstate', handleBackButton);
        return () => {
            window.removeEventListener('popstate', handleBackButton);
        };
    }, [jwt, setState, pageChoice, modalSelector, deletedOrNotFoundIDs]);

    return (
        <div key={key} className="main-container">
            <QueryClientProvider client={queryClient}>
                <GoogleOAuthProvider clientId="1056661477394-8rm7us9g7di3k4t51dpbegkp3ahuorrk.apps.googleusercontent.com">
                    <div>
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
                            <Landing />
                        ) : (
                            <div>
                                <Workspace />
                            </div>
                        )}
                    </div>
                </GoogleOAuthProvider>
            </QueryClientProvider>
        </div>
    );
};
export default Main;


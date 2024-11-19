import { useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { useStateValue, useSetStateValue } from '../../state/state';

export const Connection = () => {
    const setState = useSetStateValue();
    const jwt = useStateValue(state => state.auth.token);
    const selectedChatId = useStateValue(state => state.currentChat.chat?.id);

    const { sendMessage, lastMessage, readyState } = useWebSocket(
        selectedChatId ? 
            `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/chat/${selectedChatId}/ws?token=${encodeURIComponent(jwt)}` 
            : null,
        {
            shouldReconnect: () => true,
            reconnectAttempts: 10,
            reconnectInterval: 3000,
            onOpen: () => {
                setState(draft => { draft.currentChat.messages = [] });
            },
            onError: (error) => {
                console.error("WebSocket error:", error);
            }
        }
    );

    // Store WebSocket send function in state
    useEffect(() => {
        setState(draft => {
            draft.currentChat.ws.sendMessage = sendMessage;
        });
    }, [sendMessage, setState]);

    // Store WebSocket last message in state
    useEffect(() => {
        setState(draft => {
            draft.currentChat.ws.lastMessage = lastMessage ? { data: lastMessage.data } : null;
        });
    }, [lastMessage, setState]);

    // Store WebSocket ready state in state
    useEffect(() => {
        setState(draft => {
            draft.currentChat.ws.readyState = readyState;
        });
    }, [readyState, setState]);

    // Cleanup WebSocket state on unmount
    useEffect(() => {
        return () => {
            setState(draft => {
                draft.currentChat.ws = {
                    sendMessage: null,
                    lastMessage: null,
                    readyState: null
                };
            });
        };
    }, []);

    return null;
};

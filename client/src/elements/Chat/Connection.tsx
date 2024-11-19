import { useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { useStateValue, useSetStateValue } from '../../state/state';

export const Connection = () => {
    const setState = useSetStateValue();
    const jwt = useStateValue(state => state.auth.token);
    const selectedChatId = useStateValue(state => state.currentChat.chat?.id);
    const onMessageCallbacks = useStateValue(state => state.currentChat.ws.onMessageCallbacks);

    const { sendMessage, lastMessage } = useWebSocket(
        selectedChatId ? 
            `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/chat/${selectedChatId}/ws?token=${encodeURIComponent(jwt)}` 
            : null,
        {
            shouldReconnect: () => true,
            reconnectAttempts: 10,
            reconnectInterval: 3000,
            onOpen: () => {
                console.log("WebSocket opened");
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
        if (lastMessage) {
            const data = JSON.parse(lastMessage.data);
            for (const callback of Object.values(onMessageCallbacks)) {
                callback(data);
            }
        }
    }, [lastMessage, onMessageCallbacks]);

    // Cleanup WebSocket state on unmount
    useEffect(() => {
        console.log("mounting");
        return () => {
            console.log("unmounting");
            setState(draft => {
                draft.currentChat.ws = {
                    sendMessage: null,
                    onMessageCallbacks: {},
                };
            });
        };
    }, [setState]);

    return null;
};

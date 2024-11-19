import { useCallback, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useStateValue, useSetStateValue } from '../../state/state';
import toast from 'react-hot-toast';

// Do this just for the chat proxy to trigger
export const ForceProxy = (props: { selectedChatId?: string, jwt: string }) => {
    const { selectedChatId, jwt } = props;
    const proxyChat = useCallback(async () => {
        if (selectedChatId) {
            const response = await fetch(`/api/chat/${selectedChatId}`, {
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
            console.log("Proxy chat response", response);
        }
    }, [selectedChatId, jwt]);
    
    useEffect(() => {
        proxyChat();
    }, [proxyChat]);

    return null;
}

export const Connection = () => {
    const setState = useSetStateValue();
    const jwt = useStateValue(state => state.auth.token);
    const selectedChatId = useStateValue(state => state.currentChat.chat?.id);
    const onMessageCallbacks = useStateValue(state => state.currentChat.ws.onMessageCallbacks);

    const { sendMessage, lastMessage, readyState } = useWebSocket(
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
            onClose: () => {
                console.log("WebSocket closed");
            },
            onError: (error) => {
                console.log("WebSocket error");
                toast.error("There was an error with the WebSocket connection. Please refresh the page.", { id: "ws-error" });
            }
        }
    );

    const sendWebSocketMessage = useCallback((message: string | Blob | ArrayBufferView | ArrayBufferLike) => {
        if (readyState === ReadyState.OPEN) {
            sendMessage(message);
        }
    }, [sendMessage, readyState]);

    useEffect(() => {
        setState(draft => {
            draft.currentChat.ws.sendMessage = sendWebSocketMessage;
        });
    }, [sendWebSocketMessage, setState]);

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
        return () => {
            setState(draft => {
                draft.currentChat.ws = {
                    sendMessage: null,
                    onMessageCallbacks: {},
                };
            });
        };
    }, [setState]);

    return <div><ForceProxy selectedChatId={selectedChatId} jwt={jwt} /></div>;
};

import { useCallback, useEffect, useRef } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useStateValue, useSetStateValue } from '../../state/state';
import toast from 'react-hot-toast';

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
            onClose: (event) => {
                console.log("WebSocket closed", event.code, event.reason);
                setState(draft => {
                    draft.currentChat.ws.sendMessage = null;
                });
            },
            onError: (error) => {
                console.log("WebSocket error", error);
                setState(draft => {
                    draft.currentChat.ws.sendMessage = null;
                });
            },
        }
    );

    const sendWebSocketMessage = useCallback((message: string | Blob | ArrayBufferView | ArrayBufferLike) => {
        if (readyState === ReadyState.OPEN) {
            sendMessage(message);
        } else {
            console.error("WebSocket is not open");
            toast.error("There was an error with the WebSocket connection. Please refresh the page.", { id: "ws-error" });
        }
    }, [sendMessage, readyState]);

    useEffect(() => {
        setState(draft => {
            draft.currentChat.ws.sendMessage = sendWebSocketMessage;
        });
    }, [sendWebSocketMessage, setState]);

    const onMessageCallbacksRef = useRef(onMessageCallbacks);
    useEffect(() => {
        onMessageCallbacksRef.current = onMessageCallbacks;
    }, [onMessageCallbacks]);

    // Store WebSocket last message in state
    useEffect(() => {
        if (lastMessage) {
            const data = JSON.parse(lastMessage.data);
            for (const callback of Object.values(onMessageCallbacksRef.current)) {
                callback(data);
            }
        }
    }, [lastMessage]);

    return null;
};

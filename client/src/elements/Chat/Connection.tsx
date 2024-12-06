import { useCallback, useEffect, useRef, useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useStateValue, useSetStateValue } from '../../state/state';
import toast from 'react-hot-toast';

export const Connection = () => {
    const setState = useSetStateValue();
    const jwt = useStateValue(state => state.auth.token);
    const selectedChatId = useStateValue(state => state.currentChat.chat?.id);
    const onMessageCallbacks = useStateValue(state => state.currentChat.ws.onMessageCallbacks);
    const [lastSend, setLastSend] = useState(0);
    const [lastReceive, setLastReceive] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (lastSend > lastReceive) {
                toast.error("There was an error with the network connection. If issues persist, please refresh the page.", { id: "ws-error" });
                setLastReceive(Date.now());
            }
        }, 10000);

        return () => clearTimeout(timer);
    }, [lastSend, lastReceive]);

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
            setLastSend(Date.now());
        } else {
            console.error("WebSocket is not open");
            toast.error("There was an error with the WebSocket connection. If issues persist, please refresh the page.", { id: "ws-error" });
        }
    }, [sendMessage, readyState]);

    useEffect(() => {
        if (readyState !== ReadyState.OPEN) return;

        setState(draft => {
            draft.currentChat.ws.sendMessage = sendWebSocketMessage;
        });
    }, [sendWebSocketMessage, readyState, setState]);

    const onMessageCallbacksRef = useRef(onMessageCallbacks);
    useEffect(() => {
        onMessageCallbacksRef.current = onMessageCallbacks;
    }, [onMessageCallbacks]);

    // Store WebSocket last message in state
    useEffect(() => {
        if (lastMessage) {
            const data = JSON.parse(lastMessage.data);
            setLastReceive(Date.now());
            for (const callback of Object.values(onMessageCallbacksRef.current)) {
                callback(data);
            }
        }
    }, [lastMessage]);

    // Cleanup
    useEffect(() => {
        return () => {
            setState(draft => { draft.currentChat.ws.sendMessage = null; });
        };
    }, [setState]);

    return null;
};

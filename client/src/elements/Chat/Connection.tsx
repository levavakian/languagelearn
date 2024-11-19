import { useCallback, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useStateValue, useSetStateValue } from '../../state/state';
import toast from 'react-hot-toast';

// Do this just for the chat proxy to trigger
export const ForceProxy = (props: { selectedChatId?: string, jwt: string }) => {
    const { selectedChatId, jwt } = props;
    const proxyChat = useCallback(async () => {
        if (selectedChatId) {
            try {
                await fetch(`/api/chat/${selectedChatId}/ws`, {
                    headers: {
                        'Authorization': `Bearer ${jwt}`
                    }
                });
            } catch (error) {
                console.error("Error proxying chat", error);
            }
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

    const { sendMessage, lastMessage, readyState, getWebSocket } = useWebSocket(
        selectedChatId ? 
            `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/chat/${selectedChatId}/ws?token=${encodeURIComponent(jwt)}` 
            : null,
        {
            shouldReconnect: (closeEvent) => {
                // Don't reconnect if the closure was intentional
                return closeEvent.code !== 1000 && closeEvent.code !== 1001;
            },
            reconnectAttempts: 3,
            reconnectInterval: (attemptNumber) => Math.min(1000 * Math.pow(2, attemptNumber), 10000),
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
            share: true // Share WebSocket instances between hooks with the same url
        }
    );

    useEffect(() => {
        console.log("spamming");
    }, [onMessageCallbacks]);

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

    // Store WebSocket last message in state
    useEffect(() => {
        if (lastMessage) {
            const data = JSON.parse(lastMessage.data);
            for (const callback of Object.values(onMessageCallbacks)) {
                callback(data);
            }
        }
    }, [lastMessage, onMessageCallbacks]);

    // Clean up WebSocket connection when chat changes or component unmounts
    useEffect(() => {
        const ws = getWebSocket();
        return () => {
            if (ws && ws.readyState === ReadyState.OPEN) {
                ws.close(1000, 'Intentional disconnect');
            }
            setState(draft => {
                draft.currentChat.ws = {
                    sendMessage: null,
                    onMessageCallbacks: {},
                };
            });
        };
    }, [getWebSocket, setState, selectedChatId]);

    return <div><ForceProxy selectedChatId={selectedChatId} jwt={jwt} /></div>;
};

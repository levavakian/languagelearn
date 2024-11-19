import { useEffect } from 'react';
import { useCallback } from 'react';
import { audioPlayer } from '../../services/AudioPlayer';
import { useSetStateValue, Message, MessageType } from '../../state/state';

export const AudioOutput = () => {
    const setState = useSetStateValue();

    const onMessage = useCallback((data: any) => {
        const message = data as Message
        if (message.type === MessageType.Audio && message.sender !== 'user') {
            if (message.content === 'speech_stopped') {
                audioPlayer.flush();
            } else {
                const binaryStr = atob(message.content);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                const audioBlob = new Blob([bytes.buffer], { type: 'audio/pcm' });
                audioPlayer.playChunk(audioBlob, message.response_id);
            }
        }
    }, []);

    useEffect(() => {
        const uuid = crypto.randomUUID();
        setState(draft => { draft.currentChat.ws.onMessageCallbacks[uuid] = onMessage });
        const cleanup = () => {
            setState(draft => { delete draft.currentChat.ws.onMessageCallbacks[uuid]; });
        }
        return () => {
            cleanup();
        };
    }, [onMessage, setState]);
    
    return null;
};

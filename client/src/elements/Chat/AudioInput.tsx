import { useCallback, useEffect, useRef, useState } from 'react';
import { useStateValue, useSetStateValue, Message, MessageType, PreferredResponseType } from '../../state/state';
import { audioService } from '../../services/AudioService';
import { audioPlayer } from '../../services/AudioPlayer';

export const AudioInput = () => {
    const setState = useSetStateValue();
    const latchedResponseId = useStateValue(state => state.currentChat.latchedResponseId);
    const latchedResponseIdRef = useRef(latchedResponseId);
    const micAlwaysOn = useStateValue(state => state.currentChat.chatOpts.alwaysOn);
    const sendMessage = useStateValue(state => state.currentChat.ws.sendMessage);
    const [recording, setRecording] = useState(false);
    const recordingRef = useRef(recording);

    useEffect(() => {
        recordingRef.current = recording;
    }, [recording]);

    useEffect(() => {
        audioService.requestPermissions().then(b => setState(draft => { draft.currentChat.audioInput.hasPermission = b }));
    }, [setState]);

    const setLatchedResponseId = useCallback((data: any) => {
        const message = data as Message
        setState(draft => { draft.currentChat.latchedResponseId = message.response_id });
    }, [setState]);

    useEffect(() => {
        const uuid = crypto.randomUUID();
        setState(draft => { draft.currentChat.ws.onMessageCallbacks[uuid] = setLatchedResponseId });
        const cleanup = () => {
            setState(draft => { delete draft.currentChat.ws.onMessageCallbacks[uuid]; });
        }
        return () => {
            cleanup();
        };
    }, [setLatchedResponseId, setState]);

    useEffect(() => {
        latchedResponseIdRef.current = latchedResponseId;
    }, [latchedResponseId]);

    const onAudioChunk = useCallback((chunk: Blob, isRecordingFinished: boolean, stoppedAlwaysOn: boolean = false) => {
        if (!sendMessage) return;
        
        if (isRecordingFinished && !stoppedAlwaysOn) {
            const message: Message = {
                sender: 'user',
                content: 'commit',
                type: MessageType.Audio,
                preferred_response_type: PreferredResponseType.Audio,
                response_id: ""
            };
            sendMessage(JSON.stringify(message));
        } else {
            if (!micAlwaysOn) {
                if (latchedResponseIdRef.current) {
                    audioPlayer.stopAndIgnoreResponse(latchedResponseIdRef.current);
                } else {
                    audioPlayer.stop();
                }
            }
            
            const reader = new FileReader();
            reader.onload = () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                bytes.forEach(byte => binary += String.fromCharCode(byte));
                const base64Audio = btoa(binary);
                
                const message: Message = {
                    sender: 'user',
                    content: base64Audio,
                    type: MessageType.Audio,
                    preferred_response_type: PreferredResponseType.Audio,
                    response_id: ""
                };
                sendMessage(JSON.stringify(message));
            };
            reader.readAsArrayBuffer(chunk);
        }
    }, [sendMessage, micAlwaysOn]);

    const startRecording = useCallback(async () => {
        if (!recordingRef.current) {
            try {
                await audioService.startRecording((chunk: Blob) => {
                    onAudioChunk(chunk, false);
                });
                setRecording(true);
            } catch (err) {
                setState(draft => { draft.currentChat.audioInput.hasPermission = false });
            }
        }
    }, [onAudioChunk, setRecording, setState]);

    const stopRecording = useCallback(async () => {
        if (recordingRef.current) {
            audioService.stopRecording();
            onAudioChunk(new Blob(), true, false); // Pass stoppedAlwaysOn to callback
            setRecording(false);
        }
    }, [onAudioChunk, setRecording]);
  
    
    useEffect(() => {
        setState(draft => { 
            draft.currentChat.audioInput.triggerRecording = () => { startRecording() }
            draft.currentChat.audioInput.triggerStopRecording = () => { stopRecording() } 
        });
        
        return () => {
            setState(draft => { 
                draft.currentChat.audioInput.triggerRecording = () => { console.log("Trigger recording handler unset") }
                draft.currentChat.audioInput.triggerStopRecording = () => { console.log("Trigger stoprecording handler unset") } 
            });
        };
    }, [setState, startRecording, stopRecording]);

    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if (micAlwaysOn) return; // Ignore key events in always-on mode
            
            if (e.key === 'Alt' && !recordingRef.current) {
                e.preventDefault();
                await startRecording();
            }
        };
        
        const handleKeyUp = (e: KeyboardEvent) => {
            if (micAlwaysOn) return; // Ignore key events in always-on mode
            
            if (e.key === 'Alt' && recordingRef.current) {
                stopRecording();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            audioService.stopRecording();
        };
    }, [micAlwaysOn, onAudioChunk, startRecording, stopRecording]);


    return null;
};

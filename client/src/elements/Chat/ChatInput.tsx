import './Chat.css';
import './ChatInput.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStateValue, useSetStateValue, Message, MessageType, PreferredResponseType } from '../../state/state';
import { Icon } from '../Icon/Icon';

const ChatInput = () => {
    const setState = useSetStateValue();
    const chatOpts = useStateValue(state => state.currentChat.chatOpts);
    const lastAudioInTime = useStateValue(state => state.currentChat.lastAudioInTime);
    const audioInput = useStateValue(state => state.currentChat.audioInput);

    const sendMessage = useStateValue(state => state.currentChat.ws.sendMessage);
    const [inputMessage, setInputMessage] = useState('');

    const sendText = useCallback((text: string) => {
        if (sendMessage) {
            let msg: Message = {
                type: MessageType.Text,
                content: text.trim(),
                sender: 'user',
                preferred_response_type: chatOpts.preferAudio ? PreferredResponseType.Audio : PreferredResponseType.Text,
                response_id: ""
            };
            sendMessage(JSON.stringify(msg));
        }
    }, [sendMessage, chatOpts.preferAudio]);

    const submitText = useCallback(() => {
        if (inputMessage.trim() === '') {
            return;
        }
        sendText(inputMessage);
        setInputMessage('');
    }, [inputMessage, setInputMessage, sendText]);

    const setChatInput = useCallback((msg: string) => {
        setInputMessage(msg);
    }, []);

    useEffect(() => {
        setState(draft => { draft.currentChat.setChatInput = setChatInput });

        return () => {
            setState(draft => { draft.currentChat.setChatInput = (msg: string) => { console.log("Set chat input handler unset", msg) } });
        };
    }, [setChatInput, setState]);

    const isRecentAudio = useMemo(() => {
        if (!lastAudioInTime) return false;
        return Date.now() - lastAudioInTime < 500; // 500ms = 0.5 seconds
    }, [lastAudioInTime]);

    return (
        <div className="chat-input-container">
            <div className="chat-input-top">
                <textarea 
                    placeholder="Type your message, or hold Alt or Option to speak"
                    className="chat-input-field"
                    rows={1}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submitText();
                        }
                    }}
                />
            </div>
            <div className="chat-input-bottom">
                <div className="left-icons">
                    <div 
                        className={`icon ${chatOpts.alwaysOn ? '' : 'inactive'}`}
                        title={`${chatOpts.alwaysOn ? 'Click to disable always listening mode' : 'Click to enable always listening mode'}`}
                    >
                        <Icon scale={24} name="ear" />
                    </div>
                    <div 
                        className={`icon ${chatOpts.preferAudio ? '' : 'inactive'}`}
                        title={`${chatOpts.preferAudio ? 'Click to disable prefer audio mode' : 'Click to enable prefer audio mode, which will respond with audio even to text messages'}`}
                    >  
                        <Icon scale={24} name="speaker" />
                    </div>
                    <div 
                        className={`icon ${chatOpts.hiddenText ? '' : 'inactive'}`}
                        title={`${chatOpts.hiddenText ? 'Click to disable hidden text mode' : 'Click to enable hidden text mode, which will blur the chat text to help with listening practice'}`}
                        onClick={() => setState(draft => { draft.currentChat.chatOpts.hiddenText = !draft.currentChat.chatOpts.hiddenText })}
                    >
                        <Icon scale={24} name="eyebrow" />
                    </div>
                    <div className="icon" title="Settings">
                        <Icon scale={24} name="settings" />
                    </div>
                    <div className="icon" title="Generate a summary and save your progress">
                        <Icon scale={24} name="save" />
                    </div>
                </div>
                <div className="right-icons">
                    <div className="icon-with-background" onClick={submitText}>
                        <Icon scale={12} rotation={90} name="arrow" />
                    </div>
                    <div className={`icon-with-background ${isRecentAudio ? 'glowing' : ''} ${!audioInput.hasPermission ? 'disabled' : ''}`}
                        onMouseDown={() => audioInput.triggerRecording()}
                        onMouseUp={() => audioInput.triggerStopRecording()}
                        onMouseLeave={() => audioInput.triggerStopRecording()}
                        onTouchStart={() => audioInput.triggerRecording()}
                        onTouchEnd={() => audioInput.triggerStopRecording()}
                    >
                        <Icon scale={12} name="micFilled" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export { ChatInput };
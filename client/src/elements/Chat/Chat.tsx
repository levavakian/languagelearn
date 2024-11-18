import './Chat.css';
import './ChatInput.css';
import { useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useStateValue, useSetStateValue, WorkPage } from '../../state/state';
import { Icon } from '../Icon/Icon';

const Avatar = ({ size }: { size: number }) => {
    return (
        <div 
            className="avatar"
            style={{
                width: `${size}px`,
                height: `${size}px`,
                fontSize: `${size * 0.625}px`,
            }}
        >
            A
        </div>
    );
};

const ChatInput = () => {
    return (
        <div className="chat-input-container">
            <div className="chat-input-top">
                <input 
                    type="text"
                    placeholder="Type your message, or hold Alt or Option to speak"
                    className="chat-input-field"
                />
            </div>
            <div className="chat-input-bottom">
                <div className="left-icons">
                    <Icon scale={12} name="next" />
                    <Icon scale={12} name="next" />
                    <Icon scale={12} name="next" />
                    <Icon scale={12} name="next" />
                </div>
                <div className="right-icons">
                    <div className="icon-with-background">
                        <Icon scale={12} name="next" />
                    </div>
                    <div className="icon-with-background">
                        <Icon scale={12} name="mic" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const Chat = () => {
    const setState = useSetStateValue();
    
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const selectedLesson = useStateValue(state => state.pageChoice.selectedLesson);
    const currentChat = useStateValue(state => state.currentChat.chat);
    const messages = useStateValue(state => state.currentChat.messages);

    const fetchChat = useCallback(async () => {
        if (!selectedLesson) {
            return;
        }

        try {
            const response = await fetch(`/api/lesson/${selectedLesson}/chat`, {
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
            
            if (!response.ok) {
                setState(draft => {
                    draft.currentChat.chat = null;
                    draft.pageChoice.workPage = WorkPage.Course;
                });
                if (response.status === 404) {
                    setState(draft => { 
                        draft.pageChoice.selectedLesson = null 
                        draft.pageChoice.workPage = WorkPage.Course;
                    });
                }
                onRequestError(response, "Error fetching chat");
                return;
            }
            const data = await response.json();
            setState(draft => { draft.currentChat.chat = data });
        } catch (error) {
            toast.error(`Error fetching course`);
            console.error('Error fetching course:', error);
        }
    }, [jwt, selectedLesson, onRequestError, setState]);
    
    useEffect(() => {
        fetchChat();
    }, [fetchChat]);

    return (
        <div className="chat-container">
            <Avatar size={32} />
            <ChatInput />
        </div>
    );
};

export default Chat;

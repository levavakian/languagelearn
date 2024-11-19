import './Chat.css';
import './ChatInput.css';
import { useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useStateValue, useSetStateValue, WorkPage } from '../../state/state';
import { Connection } from './Connection';
import { MessageWindow } from './MessageWindow';
import { ChatInput } from './ChatInput';
import { AudioInput } from './AudioInput';
import { AudioOutput } from './AudioOutput';

const Chat = () => {
    const setState = useSetStateValue();
    
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const selectedLesson = useStateValue(state => state.pageChoice.selectedLesson);

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
            <Connection />
            <AudioInput />
            <AudioOutput />
            <MessageWindow />
            <ChatInput />
        </div>
    );
};

export default Chat;

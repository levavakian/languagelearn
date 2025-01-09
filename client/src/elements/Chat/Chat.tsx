import './ChatInput.css';
import { useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useStateValue, useSetStateValue, WorkPage } from '../../state/state';
import { MessageWindow } from './MessageWindow';
import { ChatInput } from './ChatInput';
import { AudioInput } from './AudioInput';
import { AudioOutput } from './AudioOutput';
import { Icon } from '../Icon/Icon';

const Chat = () => {
    const setState = useSetStateValue();
    
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const selectedLesson = useStateValue(state => state.pageChoice.selectedLesson);
    const chat = useStateValue(state => state.currentChat.chat);

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
            setState(draft => {
                draft.currentChat.chat = data
                draft.triggers.timeLastLessonMod = Date.now();
            });
        } catch (error) {
            toast.error(`Error fetching course`);
            console.error('Error fetching course:', error);
        }
    }, [jwt, selectedLesson, onRequestError, setState]);
    
    useEffect(() => {
        fetchChat();
    }, [fetchChat]);

    return (
        <div className="overflow-hidden relative h-[100%] flex flex-col">
            <div className="flex items-center">
                <Icon className="ml-10 mt-2 cursor-pointer" name="learning" scale={24} onClick={() => setState(draft => { draft.pageChoice.workPage = WorkPage.Course })} />
                <div className="font-nobel truncate max-w-[800px] text-[32px] ml-3 font-semibold">
                    {chat?.name}
                </div>
            </div>
            <AudioInput />
            <AudioOutput />
            <div className="flex-1 overflow-y-auto">
                <MessageWindow />
            </div>
            <div className="flex-0">
                <ChatInput />
            </div>
        </div>
    );
};

export default Chat;

import './ChatInput.css';
import { useCallback, useEffect, useState } from 'react';
import { useStateValue, useSetStateValue, Message, MessageType, PreferredResponseType, ModalSelector, AlwaysOnMode, VocabItem, Lesson } from '../../state/state';
import { Icon } from '../Icon/Icon';
import { AlwaysOnModal } from './AlwaysOnModal';
import { LessonEditModal } from '../LessonEditModal/LessonEditModal';

const ChatInput = () => {
    const setState = useSetStateValue();
    const chatOpts = useStateValue(state => state.currentChat.chatOpts);
    const lastAudioInTime = useStateValue(state => state.currentChat.lastAudioInTime);
    const audioInput = useStateValue(state => state.currentChat.audioInput);
    const [isRecentAudio, setIsRecentAudio] = useState(false);
    const sendMessage = useStateValue(state => state.currentChat.ws.sendMessage);
    const [inputMessage, setInputMessage] = useState('');
    const modalSelector = useStateValue(state => state.modalSelector);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const selectedLesson = useStateValue(state => state.pageChoice.selectedLesson);
    const [isSaving, setIsSaving] = useState(false);

    const [genVocab, setGenVocab] = useState<Record<string, VocabItem>>({});
    const [genSummary, setGenSummary] = useState<string>("");
    const [genLesson, setGenLesson] = useState<Lesson | null>(null);

    useEffect(() => {
        document.body.style.cursor = isSaving ? 'wait' : 'default';
        return () => {
            document.body.style.cursor = 'default';
        };
    }, [isSaving]);

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

    useEffect(() => {
        if (!lastAudioInTime) return;

        setIsRecentAudio(true);
        const timer = setTimeout(() => {
            setIsRecentAudio(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [lastAudioInTime]);

    const doSave = useCallback(async () => {
        setIsSaving(true);
        const vresponse = await fetch(`/api/lesson/${selectedLesson}/generate-vocab`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${jwt}`,
                "Content-Type": "application/json",
            },
        });

        if (!vresponse.ok) {
            setIsSaving(false);
            onRequestError(vresponse, "Failed to generate lesson vocab", "save-lesson-modal");
            return;
        }

        const vdata = await vresponse.json();
        const newVocabItems: Record<string, VocabItem> = {};
        vdata.vocab_updates.forEach((item: {
            word: string;
            type: string;
            definition: string;
            notes: string;
        }) => {
            newVocabItems[item.word] = {
                word: item.word,
                type: item.type,
                definition: item.definition,
                notes: item.notes || "",
                last_used: new Date().toISOString(),
                usageCount: 1
            };
        });
        setGenVocab(newVocabItems);

        const sresponse = await fetch(`/api/lesson/${selectedLesson}/generate-summary`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${jwt}`,
                "Content-Type": "application/json",
            },
        });

        if (!sresponse.ok) {
            setIsSaving(false);
            onRequestError(sresponse, "Failed to generate lesson plan", "save-lesson-modal");
            return;
        }

        const sdata = await sresponse.json();
        setGenSummary(sdata.summary);

        const response = await fetch(`/api/lesson/${selectedLesson}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${jwt}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            setIsSaving(false);
            onRequestError(response, "Failed to get lesson", "save-lesson-modal");
            return;
        }

        const ldata = await response.json();
        setGenLesson(ldata);

        setIsSaving(false);
        setState(draft => { draft.modalSelector = ModalSelector.LessonEdit });
    }, [setState, jwt, onRequestError, selectedLesson]);

    return (
        <div className="rounded-t-xl h-[7.25rem] bg-white">
            {modalSelector === ModalSelector.LessonEdit && genLesson && <LessonEditModal lesson={genLesson} summaryInput={genSummary} vocabEdit={genVocab} />}
            {modalSelector === ModalSelector.AlwaysOn && <AlwaysOnModal />}
            <div className="h-[50%] p-[0.5rem]">
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
                        className={`icon ${chatOpts.alwaysOn !== AlwaysOnMode.Off ? '' : 'inactive'}`}
                        title={`${chatOpts.alwaysOn !== AlwaysOnMode.Off ? 'Click to disable always listening mode' : 'Click to enable always listening mode'}`}
                        onClick={() => setState(draft => {
                            draft.modalSelector = ModalSelector.AlwaysOn;
                        })}
                    >
                        <Icon scale={24} name="ear" />
                    </div>
                    <div 
                        className={`icon ${chatOpts.preferAudio ? '' : 'inactive'}`}
                        title={`${chatOpts.preferAudio ? 'Click to disable prefer audio mode' : 'Click to enable prefer audio mode, which will respond with audio even to text messages'}`}
                        onClick={() => setState(draft => { draft.currentChat.chatOpts.preferAudio = !draft.currentChat.chatOpts.preferAudio })}
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
                    <div 
                        className={`icon ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        title="Generate a summary and save your progress"
                        onClick={() => !isSaving && doSave()}
                    >
                        <Icon scale={24} name="save" />
                    </div>
                </div>
                <div className="right-icons">
                    <div className="icon-with-background" onClick={submitText}>
                        <Icon scale={12} rotation={90} name="arrow" />
                    </div>
                    <div className={`icon-with-background select-none ${isRecentAudio ? 'glowing' : ''} ${!audioInput.hasPermission ? 'disabled' : ''}`}
                        onMouseDown={() => audioInput.triggerRecording()}
                        onMouseUp={() => audioInput.triggerStopRecording()}
                        onMouseLeave={() => audioInput.triggerStopRecording()}
                        onTouchStart={() => audioInput.triggerRecording()}
                        onTouchEnd={() => audioInput.triggerStopRecording()}
                    >
                        <Icon scale={12} name="micFilled" className="pointer-events-none" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export { ChatInput };
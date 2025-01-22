import React, { useCallback, useEffect, useMemo } from 'react';
import './MessageWindow.css';
import { Message, ModalSelector, NoteNode, useSetStateValue, useStateValue } from '../../state/state';
import { Connection } from './Connection';
import { Tooltip } from '../Tooltip/Tooltip';
import toast from 'react-hot-toast';
import { smallScreen, useWindowSize } from '../../utils/globals';
import { TooltipMobile } from '../Tooltip/TooltipMobile';

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

const MessageBubble = ({ text, isAssistant, onWordClick }: { 
    text: string, 
    isAssistant: boolean, 
    onWordClick: (word: string, sentence: string, e: React.MouseEvent) => void 
}) => {
    return (
        <div className="message-bubble">
            {text.split(' ').map((word, index) => (
                <span
                    key={index}
                    onClick={(e) => {
                        e.stopPropagation();
                        onWordClick(word, text, e);
                    }}
                    className={`cursor-pointer px-[2px] rounded 
                        ${isAssistant 
                            ? 'hover:text-coral' 
                            : 'hover:text-lavender'
                        }`}
                >
                    {word}{' '}
                </span>
            ))}
        </div>
    );
};

const UserMessage = ({ messages, messageWindowRef }: { 
    messages: string[], 
    messageWindowRef: React.RefObject<HTMLDivElement> 
}) => {
    const setState = useSetStateValue();
    const onChatInputChange = useStateValue(state => state.currentChat.setChatInput);
    const size = useWindowSize();
    const handleWordClick = useCallback((word: string, sentence: string, e: React.MouseEvent) => {
        const rect = messageWindowRef.current?.getBoundingClientRect();
        if (rect) {
            setState(draft => {
                if (smallScreen()) {
                    draft.modalSelector = ModalSelector.Tooltip;
                }
                draft.currentChat.tooltipInfo = {
                    x: e.clientX,
                    y: e.clientY,
                    toRight: false,
                    toDown: e.clientY > (window.visualViewport?.height ?? 0) / 2,
                    onSelect: (note: NoteNode) => {
                        const template = note.name.replace('@word', word).replace('@sentence', sentence);
                        onChatInputChange(template);
                        setState(draft => { 
                            draft.currentChat.tooltipInfo = null; 
                            draft.modalSelector = ModalSelector.None;
                        });
                    }
                };
            });
        }
    }, [setState, onChatInputChange, size, messageWindowRef]);

    return (
        <div className="message-container user-message">
            <div className="messages-group">
                {messages.map((text, index) => (
                    <MessageBubble 
                        key={index} 
                        text={text} 
                        isAssistant={false}
                        onWordClick={handleWordClick}
                    />
                ))}
            </div>
        </div>
    );
};

const AssistantMessage = ({ messages, messageWindowRef }: { 
    messages: string[], 
    messageWindowRef: React.RefObject<HTMLDivElement> 
}) => {
    const setState = useSetStateValue();
    const onChatInputChange = useStateValue(state => state.currentChat.setChatInput);
    const size = useWindowSize();
    const handleWordClick = useCallback((word: string, sentence: string, e: React.MouseEvent) => {
        setState(draft => {
            if (smallScreen()) {
                draft.modalSelector = ModalSelector.Tooltip;
            }
            draft.currentChat.tooltipInfo = {
                x: e.clientX,
                y: e.clientY,
                toRight: true,
                toDown: e.clientY > (window.visualViewport?.height ?? 0) / 2,
                onSelect: (note: NoteNode) => {
                    const template = note.name.replace('@word', word).replace('@sentence', sentence);
                    onChatInputChange(template);
                    setState(draft => { 
                        draft.currentChat.tooltipInfo = null; 
                        draft.modalSelector = ModalSelector.None;
                    });
                }
            };
        });
    }, [setState, onChatInputChange, size, messageWindowRef]);

    return (
        <div className="message-container assistant-message">
            <div className="avatar-container">
                <Avatar size={32} />
            </div>
            <div className="messages-group">
                {messages.map((text, index) => (
                    <MessageBubble 
                        key={index} 
                        text={text} 
                        isAssistant={true}
                        onWordClick={handleWordClick}
                    />
                ))}
            </div>
        </div>
    );
};

export const MessageWindow: React.FC = () => {
    const setState = useSetStateValue();

    const messages = useStateValue(state => state.currentChat.messages);
    const tooltipInfo = useStateValue(state => state.currentChat.tooltipInfo);
    const modalSelector = useStateValue(state => state.modalSelector);
    const hiddenText = useStateValue(state => state.currentChat.chatOpts.hiddenText);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);

    // Add ref for the message window container
    const messageWindowRef = React.useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = React.useState(true);
    const onMessageCallbacks = useStateValue(state => state.currentChat.ws.onMessageCallbacks);

    const uuid = useMemo(() => crypto.randomUUID(), []);

    const fetchSettings = useCallback(async () => {
        const response = await fetch(`/api/course/${selectedCourseId}/settings`, {
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        });
        if (!response.ok) {
            onRequestError(response, "Error fetching course settings");
            return;
        }
        const data = await response.json();
        setState(draft => { draft.currentCourse.settings = data; });
    }, [jwt, selectedCourseId, onRequestError, setState]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Handle scroll events to track if we're at bottom
    const handleScroll = useCallback(() => {
        if (messageWindowRef.current) {
            const { scrollHeight, scrollTop, clientHeight } = messageWindowRef.current;
            const atBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
            setIsAtBottom(atBottom);
        }
    }, []);

    // Scroll to bottom effect when messages change
    useEffect(() => {
        if (messageWindowRef.current && isAtBottom) {
            messageWindowRef.current.scrollTop = messageWindowRef.current.scrollHeight;
        }
    }, [messages, isAtBottom]);

    // Add scroll event listener
    useEffect(() => {
        const messageWindow = messageWindowRef.current;
        if (messageWindow) {
            messageWindow.addEventListener('scroll', handleScroll);
            return () => messageWindow.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    const onMessage = useCallback((data: any) => {
        const message = data as Message
        if (message.type === 'error') {
            toast.error(message.content, { id: "ws-error" });
            return;
        }
        if (message.type !== 'audio') {
            setState(draft => {
                draft.currentChat.messages = [...draft.currentChat.messages, message];
            });
        }
    }, [setState]);

    useEffect(() => {
        setState(draft => { draft.currentChat.ws.onMessageCallbacks[uuid] = onMessage });
        const cleanup = () => {
            setState(draft => { delete draft.currentChat.ws.onMessageCallbacks[uuid]; });
        }
        return () => {
            cleanup();
        };
    }, [onMessage, setState, uuid]);

    useWindowSize();

    // Group messages by sender
    const groupedMessages = messages.reduce((acc: { sender: string; messages: string[] }[], message) => {
        const lastGroup = acc[acc.length - 1];
        
        if (lastGroup && lastGroup.sender === message.sender) {
            lastGroup.messages.push(message.content);
        } else {
            acc.push({
                sender: message.sender,
                messages: [message.content]
            });
        }
        
        return acc;
    }, []);

    return (
        <div 
            className={`pt-6 overflow-auto message-window ${hiddenText ? 'hidden-text' : ''} relative`} 
            ref={messageWindowRef}
        >
            {uuid in onMessageCallbacks && <Connection />}
            {groupedMessages.map((group, index) => (
                group.sender === 'user' ? (
                    <UserMessage 
                        key={index} 
                        messages={group.messages} 
                        messageWindowRef={messageWindowRef}
                    />
                ) : (
                    <AssistantMessage 
                        key={index} 
                        messages={group.messages} 
                        messageWindowRef={messageWindowRef}
                    />
                )
            ))}
            {tooltipInfo && !smallScreen() && <Tooltip />}
            {tooltipInfo && smallScreen() && modalSelector === ModalSelector.Tooltip && <TooltipMobile />}
        </div>
    );
};

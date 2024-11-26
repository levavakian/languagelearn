import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './MessageWindow.css';
import { Message, useSetStateValue, useStateValue } from '../../state/state';
import { Connection } from './Connection';
import { Tooltip } from '../Tooltip/Tooltip';

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

const UserMessage = ({ messages }: { messages: string[] }) => {
    return (
        <div className="message-container user-message">
            <div className="messages-group">
                {messages.map((text, index) => (
                    <div key={index} className="message-bubble">
                        {text}
                    </div>
                ))}
            </div>
        </div>
    );
};

const AssistantMessage = ({ messages }: { messages: string[] }) => {
    return (
        <div className="message-container assistant-message">
            <div className="avatar-container">
                <Avatar size={32} />
            </div>
            <div className="messages-group">
                {messages.map((text, index) => (
                    <div key={index} className="message-bubble">
                        {text}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MessageWindow: React.FC = () => {
    const setState = useSetStateValue();

    const messages = useStateValue(state => state.currentChat.messages);
    const hiddenText = useStateValue(state => state.currentChat.chatOpts.hiddenText);

    // Add ref for the message window container
    const messageWindowRef = React.useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = React.useState(true);
    const onMessageCallbacks = useStateValue(state => state.currentChat.ws.onMessageCallbacks);

    const uuid = useMemo(() => crypto.randomUUID(), []);

    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

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

    const handleClick = useCallback((e: React.MouseEvent) => {
        // Only set tooltip position if we're clicking directly on the message-window
        if (e.target === e.currentTarget) {
            setTooltipPosition({
                x: e.clientX,
                y: e.clientY
            });
        }
    }, []);

    const handleCloseTooltip = useCallback(() => {
        setTooltipPosition(null);
    }, []);

    return (
        <div 
            className={`message-window ${hiddenText ? 'hidden-text' : ''} relative`} 
            onClick={handleClick}
            ref={messageWindowRef}
        >
            {uuid in onMessageCallbacks && <Connection />}
            {groupedMessages.map((group, index) => (
                group.sender === 'user' ? (
                    <UserMessage key={index} messages={group.messages} />
                ) : (
                    <AssistantMessage key={index} messages={group.messages} />
                )
            ))}
            {tooltipPosition && (
                <Tooltip 
                    triggerPosition={tooltipPosition}
                    onClose={handleCloseTooltip}
                />
            )}
        </div>
    );
};

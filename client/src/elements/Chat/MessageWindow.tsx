import React, { useCallback, useEffect } from 'react';
import './MessageWindow.css';
import { Message, MessageType, useSetStateValue, useStateValue } from '../../state/state';

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

const AssistantMessage = ({ messages }: { messages: string[] }) => {
    return (
        <div className="message-container assistant-message">
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

    const onMessage = useCallback((data: any) => {
        const message = data as Message
        if (message.type !== 'audio') {
            setState(draft => {
                draft.currentChat.messages = [...draft.currentChat.messages, message];
            });
        }
    }, [setState]);

    useEffect(() => {
        const uuid = crypto.randomUUID();
        setState(draft => { draft.currentChat.ws.onMessageCallbacks[uuid] = onMessage });

        return () => {
            setState(draft => { delete draft.currentChat.ws.onMessageCallbacks[uuid]; });
        };
    }, [onMessage, setState]);

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
        <div className="message-window">
            {groupedMessages.map((group, index) => (
                group.sender === 'user' ? (
                    <UserMessage key={index} messages={group.messages} />
                ) : (
                    <AssistantMessage key={index} messages={group.messages} />
                )
            ))}
        </div>
    );
};

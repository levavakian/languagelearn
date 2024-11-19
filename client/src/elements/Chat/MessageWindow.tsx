import React from 'react';
import './MessageWindow.css';
import { MessageType, PreferredResponseType, useStateValue } from '../../state/state';

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
    //   const messages = useStateValue(state => state.currentChat.messages);
    const messages = [
        {
            sender: 'user',
            content: 'Hello! Can you help me practice my Spanish?',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '1'
        },
        {
            sender: 'assistant',
            content: '¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '2'
        },
        {
            sender: 'user',
            content: '¿Cómo se dice "I love learning languages"?',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '3'
        },
        {
            sender: 'user',
            content: 'Hello! Can you help me practice my Spanish?',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '6'
        },
        {
            sender: 'user',
            content: 'Hello! Can you help me practice my Spanish?',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '7'
        },
        {
            sender: 'assistant',
            content: '¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '4'
        },
        {
            sender: 'assistant',
            content: '¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '5'
        },
        {
            sender: 'user',
            content: 'Hello! Can you help me practice my Spanish?',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '1'
        },
        {
            sender: 'assistant',
            content: '¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '2'
        },
        {
            sender: 'user',
            content: '¿Cómo se dice "I love learning languages"?',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '3'
        },
        {
            sender: 'user',
            content: 'Hello! Can you help me practice my Spanish?',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '6'
        },
        {
            sender: 'user',
            content: 'Hello! Can you help me practice my Spanish?',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '7'
        },
        {
            sender: 'assistant',
            content: '¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '4'
        },
        {
            sender: 'assistant',
            content: '¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '5'
        },
        {
            sender: 'user',
            content: 'Hello! Can you help me practice my Spanish?',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '1'
        },
        {
            sender: 'assistant',
            content: '¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '2'
        },
        {
            sender: 'user',
            content: '¿Cómo se dice "I love learning languages"?',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '3'
        },
        {
            sender: 'user',
            content: 'Hello! Can you help me practice my Spanish?',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '6'
        },
        {
            sender: 'user',
            content: 'Hello! Can you help me practice my Spanish?Hello! Can you help me practice my Spanish?Hello! Can you help me practice my Spanish?Hello! Can you help me practice my Spanish?Hello! Can you help me practice my Spanish?Hello! Can you help me practice my Spanish?Hello! Can you help me practice my Spanish?Hello! Can you help me practice my Spanish?Hello! Can you help me practice my Spanish?Hello! Can you help me practice my Spanish?',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '7'
        },
        {
            sender: 'assistant',
            content: '¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '4'
        },
        {
            sender: 'assistant',
            content: '¡Hola! Por supuesto, estaré encantado de ayudarte a practicar español.',
            type: MessageType.Text,
            preferred_response_type: PreferredResponseType.Text,
            response_id: '5'
        },
    ];

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

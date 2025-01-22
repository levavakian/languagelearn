import React from 'react';

export const highlight = (text: string) => {
    const normalizedText = text.trim().replace(/\s+/g, ' ');
    const parts = normalizedText.split(/(@(?:word|sentence)\b)/g);
    
    const elements = parts.map((part, i) => {
        if (part === '@word' || part === '@sentence') {
            return (
                <span key={i} className="text-coral">
                    {part}
                </span>
            );
        }
        return <span key={i}>{part}</span>;
    });
    
    return (
        <div className="text-left inline-block">
            {elements}
        </div>
    );
}; 
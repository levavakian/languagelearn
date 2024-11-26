import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStateValue } from '../../state/state';
import type { CourseSettings, NoteNode } from '../../state/state';

type Position = {
    x: number;
    y: number;
    width?: number;
    height?: number;
};

type DropdownProps = {
    notes: NoteNode[];
    position: Position;
    onSelect: (note: NoteNode) => void;
    onClose: () => void;
    parentRef?: React.RefObject<HTMLDivElement>;
};

const Dropdown: React.FC<DropdownProps> = ({ notes, position, onSelect, onClose, parentRef }) => {
    const [activeFolder, setActiveFolder] = useState<string | null>(null);
    const [subPosition, setSubPosition] = useState<Position | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const calculatePosition = () => {
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        let left = position.x;
        let top = position.y;

        // If dropdown would go off right edge, position it to the left
        if (dropdownRef.current && left + dropdownRef.current.offsetWidth > viewport.width) {
            left = position.x - dropdownRef.current.offsetWidth;
        }

        // If dropdown would go off bottom edge, position it above
        if (dropdownRef.current && top + dropdownRef.current.offsetHeight > viewport.height) {
            top = position.y - dropdownRef.current.offsetHeight;
        }

        return {
            left: `${left}px`,
            top: `${top}px`,
        };
    };

    const handleMouseEnter = (note: NoteNode, event: React.MouseEvent<HTMLDivElement>) => {
        if (note.type === 'folder') {
            const rect = event.currentTarget.getBoundingClientRect();
            setActiveFolder(note.id);
            setSubPosition({
                x: rect.right,
                y: rect.top,
                width: rect.width,
                height: rect.height
            });
        }
    };

    const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
        const rect = dropdownRef.current?.getBoundingClientRect();
        if (!rect) return;

        const { clientX, clientY } = event;
        
        // Check if mouse moved to parent dropdown
        if (parentRef?.current) {
            const parentRect = parentRef.current.getBoundingClientRect();
            if (
                clientX >= parentRect.left &&
                clientX <= parentRect.right &&
                clientY >= parentRect.top &&
                clientY <= parentRect.bottom
            ) {
                setActiveFolder(null);
                return;
            }
        }

        // If mouse is outside current dropdown
        if (
            clientX < rect.left ||
            clientX > rect.right ||
            clientY < rect.top ||
            clientY > rect.bottom
        ) {
            setActiveFolder(null);
        }
    };

    return (
        <div 
            ref={dropdownRef}
            className="fixed bg-white border border-gray-200 rounded-md shadow-lg min-w-[200px] z-[1000]"
            style={calculatePosition()}
            onMouseLeave={handleMouseLeave}
        >
            {notes.map(note => (
                <div
                    key={note.id}
                    className={`px-3 py-2 flex justify-between items-center border-b border-gray-200 
                        ${note.type === 'note' ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
                    onClick={() => note.type === 'note' && onSelect(note)}
                    onMouseEnter={(e) => handleMouseEnter(note, e)}
                >
                    <span className="text-gray-800">{note.name}</span>
                    {note.type === 'folder' && (
                        <span className="ml-2 text-gray-600">▶</span>
                    )}
                </div>
            ))}

            {activeFolder && subPosition && (
                <Dropdown
                    notes={notes.find(n => n.id === activeFolder)?.children || []}
                    position={subPosition}
                    onSelect={onSelect}
                    onClose={() => setActiveFolder(null)}
                    parentRef={dropdownRef}
                />
            )}
        </div>
    );
};

type TooltipProps = {
    triggerPosition?: Position;
    onClose?: () => void;
};

export const Tooltip: React.FC<TooltipProps> = ({ triggerPosition, onClose }) => {
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const [settings, setSettings] = useState<CourseSettings | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const [activeFolder, setActiveFolder] = useState<string | null>(null);
    const [subPosition, setSubPosition] = useState<Position | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

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
        setSettings(data);
    }, [jwt, selectedCourseId, onRequestError]);

    useEffect(() => {
        fetchSettings();

        return () => {
            setSettings(null);
        }
    }, [fetchSettings]);

    useEffect(() => {
        if (triggerPosition) {
            setPosition(triggerPosition);
            setIsVisible(true);
            console.log('Setting position:', triggerPosition);
        }
    }, [triggerPosition]);

    useEffect(() => {
        const handleSelection = () => {
            if (triggerPosition) return;

            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
                setIsVisible(false);
                return;
            }

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const newPosition = {
                x: rect.left + window.scrollX,
                y: rect.bottom + window.scrollY
            };
            
            console.log('Selection position:', newPosition);
            setPosition(newPosition);
            setIsVisible(true);
        };

        document.addEventListener('mouseup', handleSelection);
        return () => document.removeEventListener('mouseup', handleSelection);
    }, [triggerPosition]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                setIsVisible(false);
                onClose?.();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' || event.key === 'Backspace') {
                setIsVisible(false);
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    console.log('settings are',settings?.notes)
    if (!isVisible || !settings?.notes) return null;

    const handleMouseEnter = (note: NoteNode, event: React.MouseEvent<HTMLDivElement>) => {
        if (note.type === 'folder') {
            const rect = event.currentTarget.getBoundingClientRect();
            setActiveFolder(note.id);
            setSubPosition({
                x: rect.right,
                y: rect.top,
                width: rect.width,
                height: rect.height
            });
        }
    };

    const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
        const rect = tooltipRef.current?.getBoundingClientRect();
        if (!rect) return;

        const { clientX, clientY } = event;

        // If mouse is outside current tooltip
        if (
            clientX < rect.left ||
            clientX > rect.right ||
            clientY < rect.top ||
            clientY > rect.bottom
        ) {
            setActiveFolder(null);
        }
    };

    return (
        <div 
            ref={tooltipRef}
            className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-[1000] min-w-[200px]"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
            onMouseLeave={handleMouseLeave}
        >
            {settings.notes.map(note => (
                <div
                    key={note.id}
                    className={`
                        px-4 py-2 
                        border-b border-gray-200 
                        flex justify-between items-center
                        ${note.type === 'note' ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}
                    `}
                    onClick={() => {
                        if (note.type === 'note') {
                            console.log('Selected note:', note);
                            setIsVisible(false);
                            onClose?.();
                        }
                    }}
                    onMouseEnter={(e) => handleMouseEnter(note, e)}
                >
                    <span className="text-gray-800">{note.name}</span>
                    {note.type === 'folder' && (
                        <span className="text-gray-600">▶</span>
                    )}
                </div>
            ))}

            {activeFolder && subPosition && (
                <Dropdown
                    notes={settings.notes.find(n => n.id === activeFolder)?.children || []}
                    position={subPosition}
                    onSelect={(note) => {
                        console.log('Selected note:', note);
                        setIsVisible(false);
                        onClose?.();
                    }}
                    onClose={() => setActiveFolder(null)}
                    parentRef={tooltipRef}
                />
            )}
        </div>
    );
};
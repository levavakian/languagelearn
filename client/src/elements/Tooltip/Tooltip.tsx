import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useSetStateValue, useStateValue } from '../../state/state';
import type { CourseSettings, NoteNode } from '../../state/state';

interface DropdownMenuProps {
    nodes: NoteNode[];
    onSelect: (note: NoteNode) => void;
    depth?: number;
    hoveredFolders: string[];
    setHoveredFolders: React.Dispatch<React.SetStateAction<string[]>>;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ 
    nodes, 
    onSelect, 
    depth = 0,
    hoveredFolders,
    setHoveredFolders
}) => {
    const handleMouseEnter = (node: NoteNode, ancestorIds: string[]) => {
        console.log('handleMouseEnter called', {
            nodeId: node.id,
            nodeName: node.name,
            depth,
            ancestorIds,
            hoveredFolders,
            hasChildren: !!node.children
        });

        // If we're hovering the currently open folder, do nothing
        if (node.id === hoveredFolders[depth]) {
            console.log('Same folder, returning');
            return;
        }

        // Check if we're in the current path
        const isInCurrentPath = ancestorIds.every((id, index) => 
            hoveredFolders[index] === id
        );

        // If we're not in the current path and not at root level
        if (!isInCurrentPath && depth > 0) {
            console.log('Not in current path, clearing state');
            setHoveredFolders([]);
            return;
        }

        // If hovering a folder, set its path
        if (node.children) {
            console.log('Setting new folder path');
            setHoveredFolders([...ancestorIds, node.id]);
            return;
        }

        // If we're hovering a non-folder item in the current path, do nothing
        if (isInCurrentPath) {
            return;
        }

        // Clear hover state for anything else
        console.log('Clearing hover state');
        setHoveredFolders([]);
    };

    console.log('DropdownMenu render', { depth, hoveredFolders });

    return (
        <div 
            className={`
                shadow-lg rounded-md min-w-[200px] bg-indigo-dye mb-5 text-indigo-dye text-xl 
                ${depth > 0 ? 'mr-5' : ''} border-[1px] border-solid border-[--indigo-dye]
                [&>*:first-child>div]:mt-0 [&>*:first-child>div]:rounded-t-md [&>*:last-child>div]:rounded-b-md
            `}
            onMouseEnter={() => console.log('div mouseenter')}
        >
            {nodes.map((node) => {
                const ancestorIds = hoveredFolders.slice(0, depth);
                
                return (
                    <div
                        key={node.id}
                        className="relative group"
                        onMouseEnter={(e) => {
                            e.stopPropagation();
                            console.log('node mouseenter', node.name);
                            handleMouseEnter(node, ancestorIds);
                        }}
                    >
                        <div 
                            onClick={() => !node.children && onSelect(node)}
                            className={`
                                px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between text-indigo-dye text-xl
                                border-[2px] border-solid border-[--indigo-dye] -mt-[1px] relative rounded-md
                                ${node.children 
                                    ? hoveredFolders.includes(node.id)
                                        ? 'bg-coral text-white'
                                        : 'bg-alice-blue font-medium' 
                                    : 'bg-baby-powder'}
                            `}
                        >
                            {node.name}
                            {node.children && (
                                <span className="ml-2">→</span>
                            )}
                        </div>
                        
                        {node.children && hoveredFolders.includes(node.id) && (
                            <div className="absolute left-full top-0 -mt-[1px]">
                                <DropdownMenu 
                                    nodes={node.children} 
                                    onSelect={onSelect}
                                    depth={depth + 1}
                                    hoveredFolders={hoveredFolders}
                                    setHoveredFolders={setHoveredFolders}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export const Tooltip = () => {
    const setState = useSetStateValue();
    const settings = useStateValue(state => state.currentCourse.settings);
    const tooltipInfo = useStateValue(state => state.currentChat.tooltipInfo);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [hoveredFolders, setHoveredFolders] = useState<string[]>([]);

    const onClose = useCallback(() => {
        setState(draft => { draft.currentChat.tooltipInfo = null; });
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [tooltipInfo]);

    if (!tooltipInfo || !settings) return null;

    return (
        <div 
            ref={tooltipRef}
            className="absolute z-50" 
            style={{
                left: `${tooltipInfo.x}px`,
                top: `${tooltipInfo.y}px`,
            }}
        >
            <DropdownMenu 
                nodes={settings.notes} 
                onSelect={tooltipInfo.onSelect}
                hoveredFolders={hoveredFolders}
                setHoveredFolders={setHoveredFolders}
            />
        </div>
    );
};
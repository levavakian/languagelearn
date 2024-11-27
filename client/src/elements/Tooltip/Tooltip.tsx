import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSetStateValue, useStateValue } from '../../state/state';
import type { NoteNode } from '../../state/state';
import { Icon } from '../Icon/Icon';

interface DropdownMenuProps {
    nodes: NoteNode[];
    onSelect: (note: NoteNode) => void;
    lastHoveredNode: string;
    setLastHoveredNode: React.Dispatch<React.SetStateAction<string>>;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ 
    nodes, 
    onSelect, 
    lastHoveredNode,
    setLastHoveredNode,
}) => {

    const descendents = useMemo(() => {
        const getDescendents = (node: NoteNode): Set<string> => {
            const descendentsSet = new Set<string>();
            const stack = [node];

            while (stack.length > 0) {
                const currentNode = stack.pop();
                if (currentNode) {
                    descendentsSet.add(currentNode.id);
                    if (currentNode.children) {
                        stack.push(...currentNode.children);
                    }
                }
            }

        return descendentsSet;
    };

    const descendentsMap = new Map<string, Set<string>>();

    nodes.forEach(node => {
        descendentsMap.set(node.id, getDescendents(node));
    });

    return descendentsMap;
    }, [nodes]);

    const shouldFolderBeOpen = (node: NoteNode) => {
        return descendents.get(node.id)?.has(lastHoveredNode) || false;
    };

    const highlight = (text: string) => {
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

    return (
        <div className={`
            shadow-lg rounded-md min-w-[200px] bg-indigo-dye mb-5 text-indigo-dye text-xl 
            mr-5 border-[1px] border-solid border-[--indigo-dye]
            mt-0 rounded-t-md rounded-b-md w-max max-w-[400px]
        `}>
            {nodes.map((node) => {
                return (
                    <div
                        key={node.id}
                        data-node-id={node.id}
                        className="relative isolate"
                        onMouseEnter={(e) => {
                            e.stopPropagation();
                            setLastHoveredNode(node.id);
                        }}
                    >
                        <div 
                            onClick={() => !node.children && onSelect(node)}
                            className={`
                                px-4 py-2 cursor-pointer flex items-left text-indigo-dye text-xl
                                border-[2px] border-solid border-[--indigo-dye] relative text-left rounded-md
                                ${node.children 
                                    ? shouldFolderBeOpen(node)
                                        ? 'bg-coral text-white'
                                        : 'bg-alice-blue font-medium' 
                                    : 'bg-baby-powder hover:bg-gray-200'}
                            `}
                            title={node.name}
                        >
                            <div className="mr-3">
                                <Icon scale={16} name={node.children ? "dictionary" : "writing"} />
                            </div>
                            {node.children ? node.name : highlight(node.name)}
                        </div>
                        
                        {node.children && shouldFolderBeOpen(node) && (
                            <div className="absolute left-full top-0 -mt-[1px] z-[1]">
                                <DropdownMenu 
                                    nodes={node.children} 
                                    onSelect={onSelect}
                                    lastHoveredNode={lastHoveredNode}
                                    setLastHoveredNode={setLastHoveredNode}
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
    const [lastHoveredNode, setLastHoveredNode] = useState<string>('');

    const onClose = useCallback(() => {
        setState(draft => { draft.currentChat.tooltipInfo = null; });
    }, [setState]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [tooltipInfo, onClose]);

    const handleSelect = (node: NoteNode) => {
        tooltipInfo?.onSelect(node);
        onClose();
    };

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
                onSelect={handleSelect}
                lastHoveredNode={lastHoveredNode}
                setLastHoveredNode={setLastHoveredNode}
            />
        </div>
    );
};
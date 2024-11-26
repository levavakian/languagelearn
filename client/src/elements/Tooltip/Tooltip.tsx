import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { useSetStateValue, useStateValue } from '../../state/state';
import type { CourseSettings, NoteNode } from '../../state/state';

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

    const handleMouseEnter = (node: NoteNode) => {
        setLastHoveredNode(node.id);
    };

    const shouldFolderBeOpen = (node: NoteNode) => {
        return descendents.get(node.id)?.has(lastHoveredNode) || false;
    };

    return (
        <div className={`
            shadow-lg rounded-md min-w-[200px] bg-indigo-dye mb-5 text-indigo-dye text-xl 
            mr-5 border-[1px] border-solid border-[--indigo-dye]
            mt-0 rounded-t-md rounded-b-md
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
                        onMouseLeave={(e) => {
                            const relatedTarget = e.relatedTarget as HTMLElement;
                            // Walk up the DOM tree to find the closest parent with data-node-id
                            const targetNode = relatedTarget?.closest('[data-node-id]');
                            const targetNodeId = targetNode?.getAttribute('data-node-id');
                            
                            if (targetNodeId) {
                                setLastHoveredNode(targetNodeId);
                            }
                        }}
                    >
                        <div 
                            onClick={() => !node.children && onSelect(node)}
                            className={`
                                px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between text-indigo-dye text-xl
                                border-[2px] border-solid border-[--indigo-dye] relative rounded-md
                                hover:bg-gray-100
                                ${node.children 
                                    ? shouldFolderBeOpen(node)
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

    console.log('lastHoveredNode', lastHoveredNode);

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
                lastHoveredNode={lastHoveredNode}
                setLastHoveredNode={setLastHoveredNode}
            />
        </div>
    );
};
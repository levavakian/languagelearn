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

const calculateTooltipDimensions = (element: HTMLElement | null): { width: number; height: number } => {
    if (!element) return { width: 0, height: 0 };
    
    // Get all nested dropdown menus
    const dropdowns = element.querySelectorAll('[data-node-id]');
    
    // Initialize with the main container's bounds
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    // Include the main container
    const mainRect = element.getBoundingClientRect();
    minX = Math.min(minX, mainRect.left);
    maxX = Math.max(maxX, mainRect.right);
    minY = Math.min(minY, mainRect.top);
    maxY = Math.max(maxY, mainRect.bottom);
    
    // Include all dropdowns
    dropdowns.forEach(dropdown => {
        const rect = dropdown.getBoundingClientRect();
        minX = Math.min(minX, rect.left);
        maxX = Math.max(maxX, rect.right);
        minY = Math.min(minY, rect.top);
        maxY = Math.max(maxY, rect.bottom);
    });
    
    return {
        width: maxX - minX,
        height: maxY - minY
    };
};

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ 
    nodes, 
    onSelect, 
    lastHoveredNode,
    setLastHoveredNode,
}) => {

    const tooltipInfo = useStateValue(state => state.currentChat.tooltipInfo);

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
            shadow-lg rounded-md min-w-[200px] bg-indigo-dye text-indigo-dye text-xl 
            mr-5 border-[1px] border-solid border-[--indigo-dye]
            mb-0 rounded-t-md rounded-b-md w-max max-w-[400px]
            flex flex-col-reverse
            ${!tooltipInfo?.toRight ? 'ml-5 mr-0' : 'mr-5 ml-0'}
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
                            <div className={`absolute bottom-0 mb-[-1px] z-[1] ${
                                tooltipInfo?.toRight ? 'left-full' : 'right-full'
                            }`}>
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
    const [ghostBoxDimensions, setGhostBoxDimensions] = useState<{ width: number; height: number, x: number, y: number } | null>(null);
    const observerRef = useRef<MutationObserver | null>(null);

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

    useEffect(() => {
        if (tooltipRef.current && tooltipInfo) {
            // Create mutation observer
            const observer = new MutationObserver(() => {
                const newDimensions = calculateTooltipDimensions(tooltipRef.current);
                const newX = tooltipInfo.x - (!tooltipInfo.toRight ? newDimensions.width : 0);
                const newY = tooltipInfo.y - newDimensions.height;
                console.log('Tooltip dimensions changed:', newDimensions, newX, newY);
                setGhostBoxDimensions({
                    x: newX, 
                    y: newY, 
                    width: newDimensions.width, 
                    height: newDimensions.height
                });
            });

            // Start observing
            observer.observe(tooltipRef.current, {
                attributes: true,
                childList: true,
                subtree: true,
                characterData: true
            });

            // Store observer reference
            observerRef.current = observer;

            // Initial calculation
            const newDimensions = calculateTooltipDimensions(tooltipRef.current);
            const newX = tooltipInfo.x - (!tooltipInfo.toRight ? newDimensions.width : 0);
            const newY = tooltipInfo.y - newDimensions.height;
            console.log('Tooltip dimensions changed:', newDimensions, newX, newY);
            setGhostBoxDimensions({
                x: newX, 
                y: newY, 
                width: newDimensions.width, 
                height: newDimensions.height
            });

            // Cleanup
            return () => {
                observer.disconnect();
                observerRef.current = null;
            };
        }
    }, [tooltipInfo]);

    if (!tooltipInfo || !settings) return null;

    return (
        <div>
            <div 
                ref={tooltipRef}
                className="absolute z-50" 
                style={{
                    left: `${tooltipInfo.x}px`,
                    top: `${tooltipInfo.y}px`,
                    transform: tooltipInfo.toRight 
                        ? 'translateY(-100%)' 
                        : 'translate(-100%, -100%)'
                }}
            >
                <DropdownMenu 
                    nodes={settings.notes} 
                    onSelect={handleSelect}
                    lastHoveredNode={lastHoveredNode}
                    setLastHoveredNode={setLastHoveredNode}
                />
            </div>
            <div 
                className="absolute z-40 border-2 border-solid border-red-500" 
                style={ghostBoxDimensions ? {
                    left: `${ghostBoxDimensions.x}px`,
                    top: `${ghostBoxDimensions.y}px`,
                    width: `${ghostBoxDimensions.width}px`,
                    height: `${ghostBoxDimensions.height}px`,
                } : {}} 
            />
        </div>
    );
};
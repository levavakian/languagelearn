import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ConversationSettings, NoteNode } from './ChatSettings';
import './Dropdown.css';

interface DropdownProps {
  settings: ConversationSettings;
  onSelectNote: (noteContent: string) => void;
  position: { x: number; y: number };
  expandedFolders: Set<string>;
  setExpandedFolders: (folders: Set<string>) => void;
}

const Dropdown: React.FC<DropdownProps> = ({ 
  settings, 
  onSelectNote, 
  position,
  expandedFolders,
  setExpandedFolders
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Calculate initial position
  const calculatePosition = useCallback(() => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Use a reasonable default size for initial positioning
    const estimatedWidth = 200;
    const estimatedHeight = 300;
    
    // Calculate available space in each direction
    const spaceRight = windowWidth - position.x;
    const spaceBottom = windowHeight - position.y;
    
    let left = position.x;
    let top = position.y;

    // Adjust horizontal position if needed
    if (spaceRight < estimatedWidth && position.x > estimatedWidth) {
      left = position.x - estimatedWidth;
    }

    // Adjust vertical position if needed
    if (spaceBottom < estimatedHeight && position.y > estimatedHeight) {
      top = position.y - estimatedHeight;
    }

    // Ensure the dropdown stays within viewport bounds
    left = Math.max(10, Math.min(left, windowWidth - estimatedWidth - 10));
    top = Math.max(10, Math.min(top, windowHeight - estimatedHeight - 10));

    return {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      backgroundColor: '#282c34',
      color: 'white',
      border: '1px solid #61dafb',
      borderRadius: '4px',
      maxHeight: '400px',
      maxWidth: '500px',
      overflowY: 'auto',
      zIndex: 1000,
      msOverflowStyle: 'none',
      scrollbarWidth: 'none',
    } as React.CSSProperties;
  }, [position]);

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>(calculatePosition());

  // Fine-tune position after mount if needed
  useEffect(() => {
    if (dropdownRef.current) {
      const dropdown = dropdownRef.current;
      const rect = dropdown.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      let left = position.x;
      let top = position.y;

      if (windowWidth - position.x < rect.width) {
        left = position.x - rect.width;
      }

      if (windowHeight - position.y < rect.height) {
        top = position.y - rect.height;
      }

      left = Math.max(10, Math.min(left, windowWidth - rect.width - 10));
      top = Math.max(10, Math.min(top, windowHeight - rect.height - 10));

      const currentLeft = parseInt(dropdownStyle.left as string);
      const currentTop = parseInt(dropdownStyle.top as string);

      if (left !== currentLeft || top !== currentTop) {
        setDropdownStyle(prev => ({
          ...prev,
          left: `${left}px`,
          top: `${top}px`,
        }));
      }
    }
  }, [position, dropdownStyle.left, dropdownStyle.top]);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderNode = (node: NoteNode, level: number = 0) => {
    const indent = level * 20;

    return (
      <div key={node.id}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
            paddingLeft: `${indent + 8}px`,
            cursor: node.type === 'note' ? 'pointer' : 'default',
            backgroundColor: 'transparent',
            transition: 'background-color 0.2s'
          }}
          className="dropdown-item"
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.id);
            } else {
              onSelectNote(node.name);
            }
          }}
        >
          {node.type === 'folder' && (
            <span style={{ marginRight: '8px' }}>
              {expandedFolders.has(node.id) ? '▼' : '▶'}
            </span>
          )}
          {node.type === 'folder' ? '📁' : '📝'}
          <span style={{ marginLeft: '8px' }}>{node.name}</span>
        </div>

        {node.type === 'folder' && 
         node.children && 
         expandedFolders.has(node.id) && 
         node.children.map(child => renderNode(child, level + 1))}
      </div>
    );
  };

  return (
    <div ref={dropdownRef} style={dropdownStyle}>
      {settings.notes.map(node => renderNode(node))}
    </div>
  );
};

export default Dropdown;

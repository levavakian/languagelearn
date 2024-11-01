import React, { useState } from 'react';
import { ConversationSettings, NoteNode } from './ChatSettings';
import './Dropdown.css';

interface DropdownProps {
  settings: ConversationSettings;
  onSelectNote: (noteContent: string) => void;
}

const Dropdown: React.FC<DropdownProps> = ({ settings, onSelectNote }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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
    <div
      style={{
        backgroundColor: '#282c34',
        color: 'white',
        border: '1px solid #61dafb',
        borderRadius: '4px',
        maxHeight: '300px',
        overflowY: 'auto'
      }}
    >
      {settings.notes.map(node => renderNode(node))}
    </div>
  );
};

export default Dropdown;

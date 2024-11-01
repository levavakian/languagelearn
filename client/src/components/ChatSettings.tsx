import React, { useState } from 'react';

export interface ConversationSettings {
  notes: NoteNode[];
}

export interface NoteNode {
  id: string;
  name: string;
  type: 'folder' | 'note';
  children?: NoteNode[];
  isExpanded?: boolean;
}

interface ChatSettingsProps {
  settings: ConversationSettings;
  onSettingsChange: (settings: ConversationSettings) => void;
}

const ChatSettings: React.FC<ChatSettingsProps> = ({ settings, onSettingsChange }) => {
  const [addingNodeAt, setAddingNodeAt] = useState<{parentId: string | null, type: 'folder' | 'note'} | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addNode = (parentId: string | null, type: 'folder' | 'note', name: string) => {
    const newNode: NoteNode = {
      id: generateId(),
      name,
      type,
      children: type === 'folder' ? [] : undefined,
      isExpanded: true
    };

    if (!parentId) {
      onSettingsChange({
        ...settings,
        notes: [...settings.notes, newNode]
      });
    } else {
      const updateNodes = (nodes: NoteNode[]): NoteNode[] => {
        return nodes.map(node => {
          if (node.id === parentId) {
            return {
              ...node,
              children: [...(node.children || []), newNode]
            };
          }
          if (node.children) {
            return {
              ...node,
              children: updateNodes(node.children)
            };
          }
          return node;
        });
      };

      onSettingsChange({
        ...settings,
        notes: updateNodes(settings.notes)
      });
    }
    setAddingNodeAt(null);
    setNewItemName('');
  };

  const toggleExpand = (nodeId: string) => {
    const updateNodes = (nodes: NoteNode[]): NoteNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };

    onSettingsChange({
      ...settings,
      notes: updateNodes(settings.notes)
    });
  };

  const deleteNode = (nodeId: string) => {
    const deleteFromNodes = (nodes: NoteNode[]): NoteNode[] => {
      return nodes.filter(node => {
        if (node.id === nodeId) return false;
        if (node.children) {
          node.children = deleteFromNodes(node.children);
        }
        return true;
      });
    };

    onSettingsChange({
      ...settings,
      notes: deleteFromNodes(settings.notes)
    });
  };

  const updateNodeName = (nodeId: string, name: string) => {
    const updateNodes = (nodes: NoteNode[]): NoteNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, name };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };

    onSettingsChange({
      ...settings,
      notes: updateNodes(settings.notes)
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, parentId: string | null, type: 'folder' | 'note') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newItemName.trim()) {
        addNode(parentId, type, newItemName.trim());
      }
    }
  };

  const renderNode = (node: NoteNode, level: number = 0) => {
    const indent = level * 20;

    return (
      <div key={node.id} style={{ marginLeft: `${indent}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          {node.type === 'folder' && (
            <button 
              onClick={() => toggleExpand(node.id)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
            >
              {node.isExpanded ? '▼' : '▶'}
            </button>
          )}
          {node.type === 'folder' ? '📁' : '📝'}
          {editingNodeId === node.id ? (
            <textarea
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  updateNodeName(node.id, newItemName);
                  setEditingNodeId(null);
                  setNewItemName('');
                }
              }}
              onBlur={() => {
                setEditingNodeId(null);
                setNewItemName('');
              }}
              autoFocus
              style={{
                backgroundColor: '#3a3f4b',
                color: 'white',
                border: '1px solid #61dafb',
                borderRadius: '4px',
                padding: '4px',
                minHeight: node.type === 'note' ? '60px' : '20px',
                width: node.type === 'note' ? '100%' : 'auto',
                resize: 'vertical'
              }}
            />
          ) : (
            <>
              <span style={{ whiteSpace: 'pre-wrap' }}>{node.name}</span>
              <button 
                onClick={() => {
                  setEditingNodeId(node.id);
                  setNewItemName(node.name);
                }}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
              >
                🔤
              </button>
            </>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            {node.type === 'folder' && (
              <>
                <button 
                  onClick={() => setAddingNodeAt({ parentId: node.id, type: 'folder' })}
                  style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
                >
                  📁
                </button>
                <button 
                  onClick={() => setAddingNodeAt({ parentId: node.id, type: 'note' })}
                  style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
                >
                  ➕
                </button>
              </>
            )}
            <button 
              onClick={() => deleteNode(node.id)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
            >
              🗑️
            </button>
          </div>
        </div>
        
        {addingNodeAt?.parentId === node.id && (
          <div style={{ marginLeft: '20px', marginBottom: '8px' }}>
            <textarea
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, node.id, addingNodeAt.type)}
              placeholder={addingNodeAt.type === 'folder' ? "New folder" : "Enter note content..."}
              autoFocus
              style={{
                width: '100%',
                minHeight: addingNodeAt.type === 'note' ? '100px' : '20px',
                backgroundColor: '#3a3f4b',
                color: 'white',
                border: '1px solid #61dafb',
                borderRadius: '4px',
                padding: '8px',
                resize: 'vertical'
              }}
            />
          </div>
        )}
        
        {node.children && node.isExpanded && node.children.map(child => renderNode(child, level + 1))}
      </div>
    );
  };

  return (
    <div style={{ 
      padding: '20px',
      backgroundColor: '#282c34',
      color: 'white',
      height: '100%',
      overflowY: 'auto'
    }}>
      <h2>Chat Settings</h2>
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setAddingNodeAt({ parentId: null, type: 'folder' })}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}
        >
          📁
        </button>
        <button 
          onClick={() => setAddingNodeAt({ parentId: null, type: 'note' })}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}
        >
          ➕
        </button>
      </div>
      
      {addingNodeAt?.parentId === null && (
        <div style={{ marginBottom: '20px' }}>
          <textarea
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, null, addingNodeAt.type)}
            placeholder={addingNodeAt.type === 'folder' ? "New folder" : "Enter note content..."}
            autoFocus
            style={{
              width: '100%',
              minHeight: addingNodeAt.type === 'note' ? '100px' : '20px',
              backgroundColor: '#3a3f4b',
              color: 'white',
              border: '1px solid #61dafb',
              borderRadius: '4px',
              padding: '8px',
              resize: 'vertical'
            }}
          />
        </div>
      )}
      
      <div className="notes-tree">
        {settings.notes.map(node => renderNode(node))}
      </div>
    </div>
  );
};

export default ChatSettings;

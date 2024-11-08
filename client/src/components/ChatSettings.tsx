import React, { useState, useEffect } from 'react';

export interface VocabItem {
  type: string;
  word: string;
  definition: string;
  notes?: string;
  lastUsed: Date;
  usageCount: number;
}

export interface ConversationSettings {
  chatId?: string;
  notes: NoteNode[];
  preferAudioResponse?: boolean;
  customInstructions?: string;
  vocabItems?: { [key: string]: VocabItem };
}

export interface NoteNode {
  id: string;
  name: string;
  type: 'folder' | 'note';
  children?: NoteNode[];
  isExpanded?: boolean;
}

interface ChatSettingsProps {
  token: string;
  chatId: string;
  onSettingsChange: (settings: ConversationSettings) => void;
  onBack?: () => void;
  onUnauthorized: () => void;
}

export const fetchChatSettings = async (chatId: string, token: string, onUnauthorized: () => void) => {
  try {
    const response = await fetch(`/api/chat/${chatId}/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401 || response.status === 403) {
      onUnauthorized();
      return null;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch settings');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
};

const ChatSettings: React.FC<ChatSettingsProps> = ({ token, chatId, onSettingsChange, onBack, onUnauthorized }) => {
  const [settings, setSettings] = useState<ConversationSettings>({
    chatId: chatId,
    notes: [],
    preferAudioResponse: localStorage.getItem('preferAudioResponse') === 'true',
    vocabItems: {}
  });
  const [addingNodeAt, setAddingNodeAt] = useState<{parentId: string | null, type: 'folder' | 'note'} | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [editingVocabWord, setEditingVocabWord] = useState<string | null>(null);
  const [newVocabItem, setNewVocabItem] = useState<VocabItem>({
    type: 'word',
    word: '',
    definition: '',
    notes: '',
    lastUsed: new Date(),
    usageCount: 0
  });
  const [editingVocabItem, setEditingVocabItem] = useState<VocabItem | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const data = await fetchChatSettings(chatId, token, onUnauthorized);
      if (data) {
        setSettings(data);
        setCustomInstructions(data.customInstructions || '');
        onSettingsChange(data);
      }
    };
    loadSettings();
  }, [chatId, token, onUnauthorized, onSettingsChange]);

  const saveSettings = async (newSettings: ConversationSettings) => {
    try {
      const response = await fetch(`/api/chat/${chatId}/settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });

      if (response.status === 401 || response.status === 403) {
        onUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSettings(newSettings);
      onSettingsChange(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addNode = (parentId: string | null, type: 'folder' | 'note', name: string) => {
    const newNode: NoteNode = {
      id: generateId(),
      name,
      type,
      children: type === 'folder' ? [] : undefined,
      isExpanded: true
    };

    const newSettings = { ...settings };
    if (!parentId) {
      newSettings.notes = [...settings.notes, newNode];
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
      newSettings.notes = updateNodes(settings.notes);
    }

    saveSettings(newSettings);
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

    const newSettings = {
      ...settings,
      notes: updateNodes(settings.notes)
    };
    saveSettings(newSettings);
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

    const newSettings = {
      ...settings,
      notes: deleteFromNodes(settings.notes)
    };
    saveSettings(newSettings);
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

    const newSettings = {
      ...settings,
      notes: updateNodes(settings.notes)
    };
    saveSettings(newSettings);
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

  const handleInstructionsUpdate = async () => {
    const newSettings = {
      ...settings,
      customInstructions
    };
    
    await saveSettings(newSettings);
    setEditingInstructions(false);
  };

  const addVocabItem = async () => {
    if (!newVocabItem.word.trim() || !newVocabItem.definition.trim()) return;

    const newSettings = {
      ...settings,
      vocabItems: {
        ...settings.vocabItems,
        [newVocabItem.word]: newVocabItem
      }
    };

    await saveSettings(newSettings);
    setNewVocabItem({
      type: 'word',
      word: '',
      definition: '',
      notes: '',
      lastUsed: new Date(),
      usageCount: 0
    });
  };

  const deleteVocabItem = async (word: string) => {
    const newVocabItems = { ...settings.vocabItems };
    delete newVocabItems[word];
    
    const newSettings = {
      ...settings,
      vocabItems: newVocabItems
    };

    await saveSettings(newSettings);
  };

  const updateVocabItem = async (word: string, updatedItem: VocabItem) => {
    const newSettings = {
      ...settings,
      vocabItems: {
        ...settings.vocabItems,
        [word]: updatedItem
      }
    };

    await saveSettings(newSettings);
    setEditingVocabWord(null);
  };

  // Helper function to format the date display
  const formatLastUsed = (date: Date | string | undefined) => {
    if (!date) return "Never";
    const dateObj = new Date(date);
    return isNaN(dateObj.getTime()) ? "Never" : dateObj.toLocaleDateString();
  };

  return (
    <div style={{ 
      padding: '20px',
      backgroundColor: '#282c34',
      color: 'white',
      height: '100%',
      overflowY: 'auto',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Chat Settings</h2>
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '10px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: '#61dafb',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '5px',
            zIndex: 1
          }}
          title="Close Settings"
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#3a3f4b', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>Custom Instructions</h3>
          <button
            onClick={() => setEditingInstructions(!editingInstructions)}
            style={{
              background: 'none',
              border: 'none',
              color: '#61dafb',
              cursor: 'pointer',
              padding: '5px'
            }}
          >
            {editingInstructions ? '💾' : '✏️'}
          </button>
        </div>
        
        {editingInstructions ? (
          <div>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              style={{
                width: '100%',
                minHeight: '100px',
                backgroundColor: '#282c34',
                color: 'white',
                border: '1px solid #61dafb',
                borderRadius: '4px',
                padding: '8px',
                marginBottom: '10px',
                resize: 'vertical'
              }}
              placeholder="Enter custom instructions for the AI..."
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setCustomInstructions(settings.customInstructions || '');
                  setEditingInstructions(false);
                }}
                style={{
                  background: '#4a4f5a',
                  border: 'none',
                  color: 'white',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInstructionsUpdate}
                style={{
                  background: '#61dafb',
                  border: 'none',
                  color: '#282c34',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div style={{ 
            whiteSpace: 'pre-wrap',
            backgroundColor: '#282c34',
            padding: '10px',
            borderRadius: '4px',
            minHeight: '50px'
          }}>
            {settings.customInstructions || 'No custom instructions set'}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#3a3f4b', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Quick Notes</h3>
        
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

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#3a3f4b', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Vocabulary List</h3>
        
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <input
            value={newVocabItem.word}
            onChange={(e) => setNewVocabItem({ ...newVocabItem, word: e.target.value })}
            placeholder="Word"
            style={{
              backgroundColor: '#282c34',
              color: 'white',
              border: '1px solid #61dafb',
              borderRadius: '4px',
              padding: '8px',
              flex: '1'
            }}
          />
          <input
            value={newVocabItem.definition}
            onChange={(e) => setNewVocabItem({ ...newVocabItem, definition: e.target.value })}
            placeholder="Definition"
            style={{
              backgroundColor: '#282c34',
              color: 'white',
              border: '1px solid #61dafb',
              borderRadius: '4px',
              padding: '8px',
              flex: '2'
            }}
          />
          <button
            onClick={addVocabItem}
            style={{
              background: '#61dafb',
              border: 'none',
              color: '#282c34',
              padding: '5px 15px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Add
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(settings.vocabItems || {}).map(([word, item]) => (
            <div key={word} style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: '#282c34',
              padding: '10px',
              borderRadius: '4px',
              minWidth: 0
            }}>
              {editingVocabWord === word ? (
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  alignItems: 'center',
                  flexWrap: 'nowrap',
                  minWidth: 0
                }}>
                  <input
                    value={editingVocabItem?.word || item.word}
                    onChange={(e) => {
                      setEditingVocabItem({
                        ...(editingVocabItem || item),
                        word: e.target.value
                      });
                    }}
                    style={{
                      backgroundColor: '#3a3f4b',
                      color: 'white',
                      border: '1px solid #61dafb',
                      borderRadius: '4px',
                      padding: '4px',
                      flex: '1',
                      minWidth: '100px',
                      maxWidth: '200px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  />
                  <input
                    value={editingVocabItem?.definition || item.definition}
                    onChange={(e) => {
                      setEditingVocabItem({
                        ...(editingVocabItem || item),
                        definition: e.target.value
                      });
                    }}
                    style={{
                      backgroundColor: '#3a3f4b',
                      color: 'white',
                      border: '1px solid #61dafb',
                      borderRadius: '4px',
                      padding: '4px',
                      flex: '2',
                      minWidth: '150px',
                      maxWidth: '400px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  />
                  <input
                    value={editingVocabItem?.notes || item.notes || ''}
                    onChange={(e) => {
                      setEditingVocabItem({
                        ...(editingVocabItem || item),
                        notes: e.target.value
                      });
                    }}
                    placeholder="Notes"
                    style={{
                      backgroundColor: '#3a3f4b',
                      color: 'white',
                      border: '1px solid #61dafb',
                      borderRadius: '4px',
                      padding: '4px',
                      flex: '2',
                      minWidth: '150px',
                      maxWidth: '400px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button onClick={() => {
                      if (editingVocabItem) {
                        updateVocabItem(word, editingVocabItem);
                      }
                      setEditingVocabWord(null);
                      setEditingVocabItem(null);
                    }}>💾</button>
                    <button onClick={() => {
                      setEditingVocabWord(null);
                      setEditingVocabItem(null);
                    }}>❌</button>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  alignItems: 'center',
                  flexWrap: 'nowrap',
                  minWidth: 0
                }}>
                  <div style={{ 
                    flex: '1',
                    minWidth: '100px',
                    maxWidth: '200px',
                    backgroundColor: '#3a3f4b',
                    padding: '8px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    <strong>{item.word}</strong>
                  </div>
                  <div style={{ 
                    flex: '2',
                    minWidth: '150px',
                    maxWidth: '400px',
                    backgroundColor: '#3a3f4b',
                    padding: '8px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.definition}
                  </div>
                  <div style={{ 
                    flex: '2',
                    minWidth: '150px',
                    maxWidth: '400px',
                    backgroundColor: '#3a3f4b',
                    padding: '8px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: item.notes ? 'white' : '#666'
                  }}>
                    {item.notes || 'No notes'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button 
                      onClick={() => {
                        setEditingVocabWord(word);
                        setEditingVocabItem(item);
                      }}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => deleteVocabItem(word)}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
              <div style={{ fontSize: '0.8em', color: '#888' }}>
                Usage count: {item.usageCount || 0} | Last used: {formatLastUsed(item.lastUsed)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatSettings;

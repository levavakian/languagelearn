import React, { useState, useEffect } from 'react';
import './Settings.css';

export interface VocabItem {
  type: string;
  word: string;
  definition: string;
  notes?: string;
  lastUsed: Date;
  usageCount: number;
}

export interface Settings {
  id: string;
  notes: NoteNode[];
  customInstructions?: string;
  vocabItems: { [key: string]: VocabItem };
}

export interface NoteNode {
  id: string;
  name: string;
  type: 'folder' | 'note';
  children?: NoteNode[];
  is_expanded?: boolean;
}

interface SettingsProps {
  token: string;
  id: string;
  endpoint: string; // e.g., '/api/chat/{id}/settings' or '/api/course/{id}/settings'
  onSettingsChange: (settings: Settings) => void;
  onBack?: () => void;
  onUnauthorized: () => void;
  embedded?: boolean; // Whether the settings are embedded in another component
}

export const fetchSettings = async (endpoint: string, token: string, onUnauthorized: () => void) => {
  try {
    const response = await fetch(endpoint, {
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

    return await response.json();
  } catch (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
};

const formatLastUsed = (date: string | Date) => {
  const d = new Date(date);
  return isNaN(d.getTime()) ? 'Never' : d.toLocaleDateString();
};

const fieldStyles = {
  base: {
    flex: '1 1 0',
    backgroundColor: '#3a3f4b',
    padding: '8px',
    borderRadius: '4px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '14px',
    lineHeight: 1.2,
    height: '32px',
    boxSizing: 'border-box' as const,
    minWidth: 0
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
    width: '60px',
    justifyContent: 'flex-end'
  }
};

const SettingsPage: React.FC<SettingsProps> = ({ 
  token, 
  id, 
  endpoint, 
  onSettingsChange, 
  onBack, 
  onUnauthorized,
  embedded = false 
}) => {
  const [settings, setSettings] = useState<Settings>({
    id,
    notes: [],
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
      const data = await fetchSettings(endpoint, token, onUnauthorized);
      if (data) {
        setSettings(data);
        setCustomInstructions(data.customInstructions || '');
        onSettingsChange(data);
      }
    };
    loadSettings();
  }, [endpoint, token, onUnauthorized, onSettingsChange]);

  const saveSettings = async (newSettings: Settings) => {
    try {
      const response = await fetch(endpoint, {
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
      is_expanded: true
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
          return { ...node, is_expanded: !node.is_expanded };
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
    setEditingNodeId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      callback();
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
              {node.is_expanded ? '▼' : '▶'}
            </button>
          )}
          {node.type === 'folder' ? '📁' : ''}
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
                ✎
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
              onKeyDown={(e) => handleKeyDown(e, () => addNode(node.id, addingNodeAt.type, newItemName))}
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
        
        {node.children && node.is_expanded && node.children.map(child => renderNode(child, level + 1))}
      </div>
    );
  };

  const containerStyle = embedded ? 'settings-container settings-container-embedded' : 'settings-container settings-container-full';

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
    await saveSettings({ ...settings, vocabItems: newVocabItems });
  };

  const updateVocabItem = async (word: string, updatedItem: VocabItem) => {
    await saveSettings({
      ...settings,
      vocabItems: { ...settings.vocabItems, [word]: updatedItem }
    });
    setEditingVocabWord(null);
  };

  const copySettings = async () => {
    const settingsToExport = {
      notes: settings.notes,
      customInstructions: settings.customInstructions,
      vocabItems: settings.vocabItems
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(settingsToExport, null, 2));
    } catch (error) {
      console.error('Failed to copy settings:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const imported = JSON.parse(text);
      const newSettings = {
        ...settings,
        notes: imported.notes || [],
        customInstructions: imported.customInstructions,
        vocabItems: imported.vocabItems || {}
      };
      await saveSettings(newSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  return (
    <div className={containerStyle}>
      <div style={{ height: '50px', position: 'relative', display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '10px' }}>
        <button
          onClick={copySettings}
          style={{
            background: 'none',
            border: 'none',
            color: '#919191',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '0px'
          }}
          title="Copy settings to clipboard"
        >
          📋
        </button>
        <button
          onClick={loadSettings}
          style={{
            background: 'none',
            border: 'none',
            color: '#919191',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '0px'
          }}
          title="Load settings from clipboard"
        >
          📥
        </button>
        {!embedded && onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#919191',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '0px',
              marginLeft: '10px'
            }}
            title="Close Settings"
          >
            ✕
          </button>
        )}
      </div>
      
      <div className="section">
        <h2>Notes</h2>
        <div>
          {addingNodeAt === null ? (
            <div style={{ marginBottom: '10px' }}>
              <button
                onClick={() => {
                  setAddingNodeAt({ parentId: null, type: 'folder' });
                  setNewItemName('');
                }}
                className="button"
              >
                New Folder
              </button>
              <button
                onClick={() => {
                  setAddingNodeAt({ parentId: null, type: 'note' });
                  setNewItemName('');
                }}
                className="button"
              >
                New Note
              </button>
            </div>
          ) : addingNodeAt.parentId === null && (
            <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
              <input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, () => addNode(addingNodeAt.parentId, addingNodeAt.type, newItemName))}
                placeholder={`New ${addingNodeAt.type} name...`}
                autoFocus
                style={{
                  backgroundColor: '#3a3f4b',
                  color: 'white',
                  border: '1px solid #61dafb',
                  borderRadius: '4px',
                  padding: '5px 10px',
                  flex: 1
                }}
              />
              <button
                onClick={() => addNode(addingNodeAt.parentId, addingNodeAt.type, newItemName)}
                className="button"
              >
                Add
              </button>
              <button
                onClick={() => setAddingNodeAt(null)}
                className="button button-delete"
              >
                Cancel
              </button>
            </div>
          )}
          {settings.notes.map(node => renderNode(node))}
        </div>
      </div>

      <div className="section">
        <h2>Custom Instructions</h2>
        {editingInstructions ? (
          <div>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              style={{
                width: '100%',
                minHeight: '100px',
                backgroundColor: '#3a3f4b',
                color: 'white',
                border: '1px solid #61dafb',
                borderRadius: '4px',
                padding: '10px',
                marginBottom: '10px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleInstructionsUpdate}
                className="button"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingInstructions(false);
                  setCustomInstructions(settings.customInstructions || '');
                }}
                className="button button-delete"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
              {settings.customInstructions || 'No custom instructions set'}
            </p>
            <button
              onClick={() => setEditingInstructions(true)}
              className="button"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      <div className="section">
        <h2>Vocabulary</h2>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <input
              value={newVocabItem.word}
              onChange={(e) => setNewVocabItem({ ...newVocabItem, word: e.target.value })}
              placeholder="Word"
              style={{
                ...fieldStyles.base,
                backgroundColor: '#3a3f4b',
                border: '1px solid #61dafb',
                borderRadius: '4px',
                color: 'white',
              }}
            />
            <input
              value={newVocabItem.definition}
              onChange={(e) => setNewVocabItem({ ...newVocabItem, definition: e.target.value })}
              placeholder="Definition"
              style={{
                ...fieldStyles.base,
                backgroundColor: '#3a3f4b',
                border: '1px solid #61dafb',
                borderRadius: '4px',
                color: 'white',
              }}
            />
            <input
              value={newVocabItem.notes || ''}
              onChange={(e) => setNewVocabItem({ ...newVocabItem, notes: e.target.value })}
              placeholder="Notes (optional)"
              style={{
                ...fieldStyles.base,
                backgroundColor: '#3a3f4b',
                border: '1px solid #61dafb',
                borderRadius: '4px',
                color: 'white',
              }}
            />
            <button
              onClick={addVocabItem}
              style={{
                background: 'none',
                border: '1px solid #61dafb',
                color: '#61dafb',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add
            </button>
          </div>
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
                  width: '100%',
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
                      ...fieldStyles.base,
                      border: '1px solid #61dafb',
                      color: 'white',
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
                      ...fieldStyles.base,
                      border: '1px solid #61dafb',
                      color: 'white',
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
                      ...fieldStyles.base,
                      border: '1px solid #61dafb',
                      color: 'white',
                    }}
                  />
                  <div style={fieldStyles.actions}>
                    <button 
                      onClick={() => {
                        if (editingVocabItem) {
                          updateVocabItem(word, editingVocabItem);
                        }
                        setEditingVocabWord(null);
                        setEditingVocabItem(null);
                      }}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                    >
                      ✓
                    </button>
                    <button 
                      onClick={() => {
                        setEditingVocabWord(null);
                        setEditingVocabItem(null);
                      }}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  alignItems: 'center',
                  flexWrap: 'nowrap',
                  minWidth: 0,
                  height: '32px'
                }}>
                  <div style={fieldStyles.base}>
                    <strong>{item.word}</strong>
                  </div>
                  <div style={fieldStyles.base}>
                    {item.definition}
                  </div>
                  <div style={{
                    ...fieldStyles.base,
                    color: item.notes ? 'white' : '#666'
                  }}>
                    {item.notes || 'No notes'}
                  </div>
                  <div style={fieldStyles.actions}>
                    <button 
                      onClick={() => {
                        setEditingVocabWord(word);
                        setEditingVocabItem(item);
                      }}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                    >
                      ✎
                    </button>
                    <button 
                      onClick={() => deleteVocabItem(word)}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                    >
                      ⌫
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

export default SettingsPage;  // Default export

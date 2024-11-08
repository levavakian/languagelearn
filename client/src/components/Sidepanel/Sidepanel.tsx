import React, { useState, useEffect, useRef } from 'react';
import './Sidepanel.css';

interface PanelItem {
  id: string;
  name: string;
}

interface SidepanelProps {
  title: string;
  items: PanelItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onCreate: (name: string) => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

const Sidepanel: React.FC<SidepanelProps> = ({
  title,
  items,
  selectedId,
  onSelect,
  onDelete,
  onCreate,
  expanded = true,
  onExpandedChange
}) => {
  const [newItemName, setNewItemName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const newItemInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (!newItemName.trim()) return;
    onCreate(newItemName);
    setNewItemName('');
    setIsCreating(false);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleCreate();
    }
  };

  const truncateString = (str: string, num: number) => {
    if (str && str.length <= num) {
      return str;
    }
    return str ? str.slice(0, num) + '...' : '';
  };

  useEffect(() => {
    if (isCreating && newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [isCreating]);

  return (
    <div style={{ position: 'relative' }}>
      <div className={`sidepanel ${expanded ? 'expanded' : 'collapsed'}`}>
        <div className="sidepanel-header">
          <h2 className="sidepanel-title">{title}</h2>
        </div>

        {isCreating ? (
          <div style={{ marginBottom: '20px' }}>
            <input
              ref={newItemInputRef}
              className="sidepanel-input"
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter name"
            />
            <button
              className="sidepanel-button-primary"
              onClick={handleCreate}
            >
              Create
            </button>
            <button
              className="sidepanel-button-secondary"
              onClick={() => setIsCreating(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="sidepanel-button-primary"
            onClick={() => setIsCreating(true)}
            style={{ marginBottom: '20px' }}
          >
            New {title.slice(0, -1)}
          </button>
        )}

        <ul className="sidepanel-list">
          {items.map(item => (
            <li 
              key={item.id}
              className="sidepanel-list-item"
              style={{
                backgroundColor: selectedId === item.id ? '#3a3f4b' : 'transparent'
              }}
              onClick={() => onSelect(item.id)}
              onMouseOver={(e) => {
                if (selectedId !== item.id) {
                  e.currentTarget.style.backgroundColor = '#3a3f4b';
                }
              }}
              onMouseOut={(e) => {
                if (selectedId !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="sidepanel-item-text">
                {truncateString(item.name || item.id, 20)}
              </span>
              <button
                className="sidepanel-button-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
      <button 
        className="sidepanel-toggle"
        onClick={() => onExpandedChange?.(!expanded)}
      >
        {expanded ? '←' : '→'}
      </button>
    </div>
  );
};

export default Sidepanel;

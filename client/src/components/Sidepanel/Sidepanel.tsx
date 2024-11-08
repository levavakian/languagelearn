import React from 'react';
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
  onDelete?: (id: string) => void;
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
  const truncateString = (str: string, num: number) => {
    if (str && str.length <= num) {
      return str;
    }
    return str ? str.slice(0, num) + '...' : '';
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className={`sidepanel ${expanded ? 'expanded' : 'collapsed'}`}>
        <div className="sidepanel-header">
          <h2 className="sidepanel-title">{title}</h2>
        </div>

        <button
          className="sidepanel-button-primary"
          onClick={() => onCreate("")}
          style={{ marginBottom: '20px' }}
        >
          New {title.slice(0, -1)}
        </button>

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
              {onDelete && (
                <button
                  className="sidepanel-button-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                >
                  Delete
                </button>
              )}
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

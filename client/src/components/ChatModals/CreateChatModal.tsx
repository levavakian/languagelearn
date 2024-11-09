import React, { useState } from 'react';

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

const CreateChatModal: React.FC<CreateChatModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('New Chat');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name);
    setName('New Chat');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (name.trim()) {
        onSubmit(name);
        setName('New Chat');
      }
    }
  };

  return (
    <div className="modal-overlay" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="modal-content">
        <h2>Create New Chat</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Chat Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="modal-buttons">
            <button type="submit">Create</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChatModal; 
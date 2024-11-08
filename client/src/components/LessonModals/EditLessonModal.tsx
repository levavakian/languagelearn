import React, { useState, useEffect } from 'react';
import './LessonModals.css';

interface EditLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (summary: string) => void;
  onDelete: () => void;
  initialSummary: string;
}

const EditLessonModal: React.FC<EditLessonModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialSummary,
}) => {
  const [summary, setSummary] = useState(initialSummary);

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;
    onSave(summary);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Lesson</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Summary:</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
            />
          </div>
          <div className="modal-buttons">
            <button 
              type="button" 
              onClick={onDelete}
              className="delete-button"
            >
              Delete
            </button>
            <button type="submit">Save</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLessonModal; 
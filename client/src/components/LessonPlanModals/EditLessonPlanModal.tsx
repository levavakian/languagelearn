import React, { useState, useEffect } from 'react';
import './LessonPlanModals.css';

interface EditLessonPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, content: string) => void;
  onDelete: () => void;
  initialTitle: string;
  initialContent: string;
}

const EditLessonPlanModal: React.FC<EditLessonPlanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialTitle,
  initialContent,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
  }, [initialTitle, initialContent]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSave(title, content);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Lesson Plan</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Content:</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
          <div className="modal-buttons">
            <button type="button" onClick={onDelete} className="delete-button">
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

export default EditLessonPlanModal; 
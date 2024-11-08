import React, { useState } from 'react';
import './LessonPlanModals.css';

interface CreateLessonPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => void;
}

const CreateLessonPlanModal: React.FC<CreateLessonPlanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSubmit(title, content);
    setTitle('');
    setContent('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create New Lesson Plan</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter lesson plan title"
            />
          </div>
          <div className="form-group">
            <label>Content:</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              placeholder="Enter lesson plan content"
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

export default CreateLessonPlanModal; 
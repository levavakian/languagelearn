import React, { useState, useEffect } from 'react';
import './LessonModals.css';

interface EditLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (summary: string) => void;
  onDelete: () => void;
  initialSummary: string;
  lessonId: string;
  token: string;
  onUnauthorized: () => void;
}

const EditLessonModal: React.FC<EditLessonModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialSummary,
  lessonId,
  token,
  onUnauthorized,
}) => {
  const [summary, setSummary] = useState(initialSummary);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVocab, setIsGeneratingVocab] = useState(false);

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(summary);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/lesson/${lessonId}/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Error generating summary:', error);
      // Optionally add error handling UI here
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVocab = async () => {
    setIsGeneratingVocab(true);
    try {
      const response = await fetch(`/api/lesson/${lessonId}/generate-vocab`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to generate vocab');
      }

      onClose();
    } catch (error) {
      console.error('Error generating vocab:', error);
      // Optionally add error handling UI here
    } finally {
      setIsGeneratingVocab(false);
    }
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
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="generate-button"
            >
              {isGenerating ? 'Generating Summary...' : 'Generate Summary'}
            </button>
            <button
              type="button"
              onClick={handleGenerateVocab}
              disabled={isGeneratingVocab}
              className="generate-button"
            >
              {isGeneratingVocab ? 'Updating Vocab...' : 'Update Vocab'}
            </button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLessonModal; 
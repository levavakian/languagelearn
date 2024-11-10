import React, { useState, useEffect, useCallback } from 'react';
import './LessonPlanModals.css';

interface Lesson {
  id: string;
  title: string;
}

interface CreateLessonPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => void;
  courseId: string;
  token: string;
  onUnauthorized: () => void;
}

const truncateText = (text: string | undefined | null, maxLength: number = 30) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

const CreateLessonPlanModal: React.FC<CreateLessonPlanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  courseId,
  token,
  onUnauthorized,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLessons = useCallback(async () => {
    try {
      const response = await fetch(`/api/course/${courseId}/lesson-names`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await response.json();
      console.log('Fetched lessons:', data);
      setLessons(data);
      setSelectedLessons(new Set(data.map((lesson: Lesson) => lesson.id)));
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  }, [courseId, token, onUnauthorized]);

  useEffect(() => {
    if (isOpen && courseId) {
      fetchLessons();
    }
  }, [isOpen, courseId, fetchLessons]);

  const handleGenerateClick = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/lesson/generate-next-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          lesson_ids: Array.from(selectedLessons),
          prompt: prompt,
          course_id: courseId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTitle(data.title);
        setContent(data.plan);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error generating lesson plan:', error);
    }
    setIsSubmitting(false);
  };

  const handleCancelGenerate = () => {
    setIsGenerating(false);
    setPrompt('');
  };

  const toggleAllLessons = (checked: boolean) => {
    setSelectedLessons(checked ? new Set(lessons.map(l => l.id)) : new Set());
  };

  const toggleLesson = (lessonId: string) => {
    const newSelected = new Set(selectedLessons);
    if (newSelected.has(lessonId)) {
      newSelected.delete(lessonId);
    } else {
      newSelected.add(lessonId);
    }
    setSelectedLessons(newSelected);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSubmit(title, content);
    setTitle('');
    setContent('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create New Lesson Plan</h2>
        <form onSubmit={handleSubmit}>
          {!isGenerating ? (
            <>
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
                <button type="submit">Save</button>
                <button 
                  type="button" 
                  onClick={() => setIsGenerating(true)}
                  className="generate-button"
                >
                  Generate
                </button>
                <button type="button" onClick={onClose}>Cancel</button>
              </div>
            </>
          ) : (
            <div className="generation-options">
              <div className="form-group">
                <label>What would you like this lesson to focus on? (Optional)</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter any specific topics or focus areas"
                />
              </div>

              <div className="lesson-selection">
                <div className="select-actions">
                  <button
                    type="button"
                    onClick={() => toggleAllLessons(true)}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllLessons(false)}
                  >
                    Unselect All
                  </button>
                </div>
                
                <div className="lesson-list scrollable">
                  {lessons.map((lesson) => (
                    <div key={lesson.id} className="lesson-item">
                      <label 
                        htmlFor={`lesson-${lesson.id}`}
                        title={lesson.title}
                        className="lesson-label"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLessons.has(lesson.id)}
                          onChange={() => toggleLesson(lesson.id)}
                          id={`lesson-${lesson.id}`}
                        />
                        <span className="lesson-title">{truncateText(lesson.title)}</span>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="modal-buttons">
                  <button 
                    type="button" 
                    onClick={handleGenerateClick}
                    disabled={selectedLessons.size === 0 || isSubmitting}
                  >
                    {isSubmitting ? 'Generating...' : 'Generate'}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleCancelGenerate}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateLessonPlanModal; 
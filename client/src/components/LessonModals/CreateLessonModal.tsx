import React, { useState } from 'react';
import './LessonModals.css';
import CreateLessonPlanModal from '../LessonPlanModals/CreateLessonPlanModal';

interface CreateLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => void;
  lessonPlans: Array<{ id: string; title: string; content: string }>;
}

const CreateLessonModal: React.FC<CreateLessonModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  lessonPlans,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;
    
    const selectedPlan = lessonPlans.find(plan => plan.id === selectedPlanId);
    if (!selectedPlan) return;
    
    onSubmit(selectedPlan.title, selectedPlan.content);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create New Lesson</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group horizontal-layout">
            <div className="select-container">
              <label>Select Lesson Plan:</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                required
              >
                <option value="">Select a lesson plan...</option>
                {lessonPlans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="or-divider">or</div>
            <button
              type="button"
              className="create-plan-button"
              onClick={() => setIsCreatePlanModalOpen(true)}
            >
              Create New Lesson Plan
            </button>
          </div>
          <div className="modal-buttons">
            <button type="submit" disabled={!selectedPlanId}>
              Create Lesson
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
      <CreateLessonPlanModal
        isOpen={isCreatePlanModalOpen}
        onClose={() => setIsCreatePlanModalOpen(false)}
        onSubmit={(title, content) => {
          onSubmit(title, content);
          setIsCreatePlanModalOpen(false);
          onClose();
        }}
      />
    </div>
  );
};

export default CreateLessonModal; 
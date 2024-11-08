import React, { useState, useEffect, useCallback } from 'react';
import Sidepanel from '../Sidepanel/Sidepanel';
import './Courses.css';
import CreateLessonPlanModal from '../LessonPlanModals/CreateLessonPlanModal';
import EditLessonPlanModal from '../LessonPlanModals/EditLessonPlanModal';
import CreateLessonModal from '../LessonModals/CreateLessonModal';
import EditLessonModal from '../LessonModals/EditLessonModal';
import Settings from '../Settings/Settings';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, language: string) => void;
}

interface Course {
  id: string;
  name: string;
  creator_id: string;
  created_at: string;
}

interface LessonPlan {
  id: string;
  course_id: string;
  title: string;
  content: string;
  created_at: string;
}

interface Lesson {
  id: string;
  course_id: string;
  lesson_plan_id: string;
  summary: string;
  chat_id: string;
  created_at: string;
}

const CreateCourseModal: React.FC<CourseModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('My Course');
  const [language, setLanguage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!language.trim()) return;
    onSubmit(name, language);
    setName('My Course');
    setLanguage('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create New Course</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Course Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Language to Learn:</label>
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
              placeholder="e.g., Spanish, French, Japanese"
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

interface CoursesProps {
  token: string;
  onUnauthorized: () => void;
}

const Courses: React.FC<CoursesProps> = ({ token, onUnauthorized }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(window.innerWidth >= 768);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [isCreateLessonPlanModalOpen, setIsCreateLessonPlanModalOpen] = useState(false);
  const [isEditLessonPlanModalOpen, setIsEditLessonPlanModalOpen] = useState(false);
  const [selectedLessonPlan, setSelectedLessonPlan] = useState<LessonPlan | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isCreateLessonModalOpen, setIsCreateLessonModalOpen] = useState(false);
  const [isEditLessonModalOpen, setIsEditLessonModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [chatNames, setChatNames] = useState<{[key: string]: string}>({});

  const fetchCourses = useCallback(async () => {
    try {
      const response = await fetch('/api/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await response.json();
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const handleCreateCourse = async (name: string, language: string) => {
    try {
      const response = await fetch('/api/course/default', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target_language: language,
          name: name
        })
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const newCourse = await response.json();
      setCourses(prevCourses => [newCourse.course, ...prevCourses]);
      setSelectedCourseId(newCourse.course.id);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating course:', error);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      const response = await fetch(`/api/course/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      if (response.ok) {
        setCourses(prevCourses => prevCourses.filter(course => course.id !== id));
        if (selectedCourseId === id) {
          setSelectedCourseId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const fetchLessonPlans = useCallback(async (courseId: string) => {
    try {
      const response = await fetch(`/api/course/${courseId}/lesson-plans`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await response.json();
      setLessonPlans(data || []);
    } catch (error) {
      console.error('Error fetching lesson plans:', error);
    }
  }, [token, onUnauthorized]);

  const fetchLessons = useCallback(async (courseId: string) => {
    try {
      const response = await fetch(`/api/course/${courseId}/lessons`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await response.json();
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchLessonPlans(selectedCourseId);
      fetchLessons(selectedCourseId);
    }
  }, [selectedCourseId, fetchLessonPlans, fetchLessons]);

  const handleCreateLessonPlan = async (title: string, content: string) => {
    try {
      const response = await fetch(`/api/course/${selectedCourseId}/lesson-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, content })
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const newLessonPlan = await response.json();
      setLessonPlans(prev => [...prev, newLessonPlan]);
      setIsCreateLessonPlanModalOpen(false);
    } catch (error) {
      console.error('Error creating lesson plan:', error);
    }
  };

  const handleUpdateLessonPlan = async (title: string, content: string) => {
    if (!selectedLessonPlan) return;

    try {
      const response = await fetch(`/api/course/${selectedCourseId}/lesson-plan/${selectedLessonPlan.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, content })
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const updatedLessonPlan = await response.json();
      setLessonPlans(prev => prev.map(plan => 
        plan.id === updatedLessonPlan.id ? updatedLessonPlan : plan
      ));
      setIsEditLessonPlanModalOpen(false);
      setSelectedLessonPlan(null);
    } catch (error) {
      console.error('Error updating lesson plan:', error);
    }
  };

  const handleDeleteLessonPlan = async () => {
    if (!selectedLessonPlan) return;

    try {
      const response = await fetch(`/api/course/${selectedCourseId}/lesson-plan/${selectedLessonPlan.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      setLessonPlans(prev => prev.filter(plan => plan.id !== selectedLessonPlan.id));
      setIsEditLessonPlanModalOpen(false);
      setSelectedLessonPlan(null);
    } catch (error) {
      console.error('Error deleting lesson plan:', error);
    }
  };

  const fetchLessonPlanDetails = async (planId: string) => {
    try {
      const response = await fetch(`/api/course/${selectedCourseId}/lesson-plan/${planId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        onUnauthorized();
        return null;
      }
      const details = await response.json();
      setSelectedLessonPlan(details);
      return details;
    } catch (error) {
      console.error('Error fetching lesson plan details:', error);
      return null;
    }
  };

  const selectedCourse = courses?.find(course => course.id === selectedCourseId) || null;

  const handleCreateLesson = async (title: string, content: string) => {
    try {
      const response = await fetch(`/api/course/${selectedCourseId}/lesson`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title,
          lesson_plan_content: content
        })
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const newLesson = await response.json();
      setLessons(prev => [...prev, newLesson]);
      setIsCreateLessonModalOpen(false);
      console.log(`Would navigate to chat ${newLesson.chat_id}`);
    } catch (error) {
      console.error('Error creating lesson:', error);
    }
  };

  const handleUpdateLesson = async (summary: string) => {
    if (!selectedLesson) return;

    try {
      const response = await fetch(`/api/course/${selectedCourseId}/lesson/${selectedLesson.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ summary })
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const updatedLesson = await response.json();
      setLessons(prev => prev.map(lesson => 
        lesson.id === updatedLesson.id ? updatedLesson : lesson
      ));
      setIsEditLessonModalOpen(false);
      setSelectedLesson(null);
    } catch (error) {
      console.error('Error updating lesson:', error);
    }
  };

  const fetchChatNames = useCallback(async (chatIds: string[]) => {
    try {
      const response = await fetch(`/api/chats/names`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chat_ids: chatIds })
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const names = await response.json();
      setChatNames(names);
    } catch (error) {
      console.error('Error fetching chat names:', error);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    if (lessons.length > 0) {
      const chatIds = lessons.map(lesson => lesson.chat_id);
      fetchChatNames(chatIds);
    }
  }, [lessons, fetchChatNames]);

  return (
    <div className="courses-container">
      <Sidepanel
        title="Courses"
        items={courses.map(course => ({
          id: course.id,
          name: course.name
        }))}
        selectedId={selectedCourseId}
        onSelect={setSelectedCourseId}
        onCreate={() => setIsModalOpen(true)}
        expanded={isSidebarExpanded}
        onExpandedChange={setIsSidebarExpanded}
      />
      <div className="course-content">
        {selectedCourse ? (
          <div className="selected-course">
            <div className="course-header">
              <h2>{selectedCourse.name}</h2>
              <button 
                className="delete-course-button"
                onClick={() => handleDeleteCourse(selectedCourse.id)}
                aria-label="Delete course"
              >
                🗑️
              </button>
            </div>
            
            <h3 className="section-header">Lesson Plans</h3>
            <div className="lesson-plans-list">
              {lessonPlans.map(plan => (
                <div
                  key={plan.id}
                  className="lesson-plan-item"
                  onClick={async () => {
                    const details = await fetchLessonPlanDetails(plan.id);
                    if (details) {
                      setIsEditLessonPlanModalOpen(true);
                    }
                  }}
                >
                  <div className="lesson-plan-title" title={plan.title}>
                    {plan.title}
                  </div>
                </div>
              ))}
              <button
                className="add-lesson-plan-button"
                onClick={() => setIsCreateLessonPlanModalOpen(true)}
              >
                + Add Lesson Plan
              </button>
            </div>
            <h3 className="section-header">Lessons</h3>
            <div className="lessons-list">
              {lessons.map(lesson => (
                <div key={lesson.id} className="lesson-item">
                  <div 
                    className="lesson-content"
                    onClick={() => console.log(`Would navigate to chat ${lesson.chat_id}`)}
                  >
                    <span className="lesson-title">
                      {chatNames[lesson.chat_id] || 'Loading...'}
                    </span>
                    <button
                      className="edit-lesson-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLesson(lesson);
                        setIsEditLessonModalOpen(true);
                      }}
                    >
                      ⚙️
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="add-lesson-button"
                onClick={() => setIsCreateLessonModalOpen(true)}
              >
                + Add Lesson
              </button>
            </div>
            <h3 className="section-header">Settings</h3>
            <Settings
              token={token}
              id={selectedCourse.id}
              endpoint={`/api/course/${selectedCourse.id}/settings`}
              onSettingsChange={() => {}} // Add handler if needed
              onUnauthorized={onUnauthorized}
              embedded={true}
            />
          </div>
        ) : (
          <div className="no-course-selected">
            <p>Select a course or create a new one to get started</p>
          </div>
        )}
      </div>
      <CreateCourseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateCourse}
      />
      <CreateLessonPlanModal
        isOpen={isCreateLessonPlanModalOpen}
        onClose={() => setIsCreateLessonPlanModalOpen(false)}
        onSubmit={handleCreateLessonPlan}
      />
      <EditLessonPlanModal
        isOpen={isEditLessonPlanModalOpen}
        onClose={() => {
          setIsEditLessonPlanModalOpen(false);
          setSelectedLessonPlan(null);
        }}
        onSave={handleUpdateLessonPlan}
        onDelete={handleDeleteLessonPlan}
        initialTitle={selectedLessonPlan?.title || ''}
        initialContent={selectedLessonPlan?.content || ''}
      />
      <CreateLessonModal
        isOpen={isCreateLessonModalOpen}
        onClose={() => setIsCreateLessonModalOpen(false)}
        onSubmit={handleCreateLesson}
        lessonPlans={lessonPlans}
      />
      <EditLessonModal
        isOpen={isEditLessonModalOpen}
        onClose={() => {
          setIsEditLessonModalOpen(false);
          setSelectedLesson(null);
        }}
        onSave={handleUpdateLesson}
        onDelete={async () => {
          if (!selectedLesson || !selectedCourseId) return;
          try {
            const response = await fetch(`/api/course/${selectedCourseId}/lesson/${selectedLesson.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.status === 401) {
              onUnauthorized();
              return;
            }

            setLessons(prev => prev.filter(lesson => lesson.id !== selectedLesson.id));
            setIsEditLessonModalOpen(false);
            setSelectedLesson(null);
          } catch (error) {
            console.error('Error deleting lesson:', error);
          }
        }}
        initialSummary={selectedLesson?.summary || ''}
      />
    </div>
  );
};

export default Courses;

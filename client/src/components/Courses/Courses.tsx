import React, { useState, useEffect, useCallback } from 'react';
import Sidepanel from '../Sidepanel/Sidepanel';
import './Courses.css';

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

  const selectedCourse = courses?.find(course => course.id === selectedCourseId) || null;

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
            <p>Course ID: {selectedCourse.id}</p>
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
    </div>
  );
};

export default Courses;

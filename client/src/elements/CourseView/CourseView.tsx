import React, { useEffect, useCallback } from 'react';
import './CourseView.css';
import { useStateValue, useSetStateValue, WorkPage, Lesson } from '../../state/state';
import toast from 'react-hot-toast';

interface LessonListProps {
    lessons: Lesson[];
}

const LessonList: React.FC<LessonListProps> = ({ lessons }) => {
    return (
        <div className="course-lesson-list">
            <div className="course-lesson-list-title">Lessons</div>
            <div className="course-lesson-list-add-lesson">
                + New Lesson
            </div>
            {lessons.map(lesson => (
                <div key={lesson.id} className="course-lesson-item">
                    <div>
                        {lesson.name}
                    </div>
                    <div className="course-lesson-item-updated-at">
                        Last used: {lesson.updated_at}
                    </div>
                </div>
            ))}
        </div>
    );
};

const PracticeList: React.FC<LessonListProps> = ({ lessons }) => {
    return (
        <div className="practice-lesson-list">
            <div className="practice-lesson-list-title">Quick Practice</div>
            <div className="practice-lesson-list-add-lesson">
                + New Practice
            </div>
            {lessons.map(lesson => (
                <div key={lesson.id} className="practice-lesson-item">
                    <div>
                        {lesson.name}
                    </div>
                    <div className="practice-lesson-item-updated-at">
                        Last used: {lesson.updated_at}
                    </div>
                </div>
            ))}
        </div>
    );
};

const CourseView: React.FC = () => {
    const setState = useSetStateValue();
    
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const currentCourse = useStateValue(state => state.currentCourse.content);
    const lessons = useStateValue(state => state.currentCourse.lessons);
    
    const fetchCourse = useCallback(async () => {
        try {
            const response = await fetch(`/api/course/${selectedCourseId}`, {
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
            
            if (!response.ok) {
                setState(draft => {
                    draft.currentCourse.content = null;
                    draft.pageChoice.workPage = WorkPage.AllCourses;
                });
                if (response.status === 404) {
                    setState(draft => { draft.pageChoice.selectedCourse = null });
                }
                onRequestError(response, "Error fetching course");
                return;
            }
            const data = await response.json();
            setState(draft => { draft.currentCourse.content = data });
        } catch (error) {
            toast.error(`Error fetching course`);
            console.error('Error fetching course:', error);
        }
    }, [jwt, selectedCourseId, onRequestError, setState]);
    
    useEffect(() => {
        fetchCourse();
    }, [fetchCourse]);
    
    const fetchLessons = useCallback(async () => {
        try {
            const response = await fetch(`/api/course/${selectedCourseId}/lessons`, {
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });
            
            if (!response.ok) {
                onRequestError(response, "Error fetching lessons");
                return;
            }
            const data = await response.json();
            console.log(data);
            setState(draft => { draft.currentCourse.lessons = data || [] });
        } catch (error) {
            toast.error(`Error fetching lessons`);
            console.error('Error fetching lessons:', error);
        }
    }, [jwt, selectedCourseId, onRequestError, setState]);
    
    useEffect(() => {
        fetchLessons();
    }, [fetchLessons]);

    return (
        <div className="course-view">
            <span className="course-title">{currentCourse?.name}</span>
            <div className="course-content-container">
                <div className="course-content-left">
                    <LessonList lessons={lessons.filter(lesson => !lesson.free_practice)} />
                </div>
                <div className="course-content-right">
                    <PracticeList lessons={lessons.filter(lesson => lesson.free_practice)} />
                </div>
            </div>
        </div>
    );
};

export default CourseView;

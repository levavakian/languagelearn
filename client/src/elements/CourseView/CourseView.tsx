import React, { useEffect, useCallback } from 'react';
import './CourseView.css';
import { useStateValue, useSetStateValue, WorkPage } from '../../state/state';
import toast from 'react-hot-toast';

const CourseView: React.FC = () => {
    const setState = useSetStateValue();
    
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const currentCourse = useStateValue(state => state.currentCourse);

    const fetchCourses = useCallback(async () => {
        try {
            const response = await fetch(`/api/course/${selectedCourseId}`, {
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });

            if (!response.ok) {
                toast.error(`Error fetching course ${selectedCourseId}`);
                console.error('Error fetching course:', response);
                setState(draft => {
                    draft.currentCourse = null;
                    draft.pageChoice.workPage = WorkPage.AllCourses;
                });
                if (response.status === 401) {
                    setState(draft => { draft.pageChoice.selectedCourse = null });
                }
                onRequestError(response);
                return;
            }
            const data = await response.json();
            setState(draft => { draft.currentCourse = data });
        } catch (error) {
            toast.error(`Error fetching course ${error}`);
            console.error('Error fetching course:', error);
        }
    }, [jwt, selectedCourseId, onRequestError, setState]);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

  return (
    <div className="course-view">
      <h1>{currentCourse?.name}</h1>
    </div>
  );
};

export default CourseView;

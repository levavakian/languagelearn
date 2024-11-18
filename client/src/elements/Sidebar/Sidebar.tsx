import React, { useEffect, useCallback } from 'react';
import { Icon } from '../Icon/Icon';
import './Sidebar.css';
import { Course, State, useSetStateValue, useStateValue, WorkPage } from '../../state/state';

const CourseBox = ({ course }: { course: Course }) => {
    const setState = useSetStateValue();

    const standardItems = [
        { 
            icon: <Icon scale={12} name="next" />, 
            label: 'Continue Lesson',
            onClick: () => console.log('Continue Lesson for:', course.name)
        },
        { 
            icon: <Icon scale={12} name="color" />, 
            label: 'View Course',
            onClick: () => setState(draft => { draft.pageChoice.workPage = WorkPage.Course; draft.pageChoice.selectedCourse = course.id })
        },
        { 
            icon: <Icon scale={12} name="mic" />, 
            label: 'Free Practice',
            onClick: () => console.log('Free Practice for:', course.name)
        }
    ];
    
    return (
        <div className="course-box space-y-2">
            <div className="course-header">
                <span className="course-name text-truncate" title={course.name}>
                    {course.name}
                </span>
                <Icon scale={20} name="learning" />
            </div>
            
            <div className="space-y-1">
                {standardItems.map((item, itemIndex) => (
                    <button
                        key={itemIndex}
                        className="course-button"
                        onClick={item.onClick}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const NewCourseButton = () => {
    const newCourseItems = [
        { 
            icon: <Icon scale={12} name="shuttle" />, 
            label: 'Start New Course',
            onClick: () => console.log('Start New Course clicked')
        },
        { 
            icon: <Icon scale={12} name="writing" />, 
            label: 'View All Courses',
            onClick: () => console.log('View All Courses clicked')
        }
    ];
    
    return (
        <div className="course-box">
            <div className="space-y-1">
                {newCourseItems.map((item, itemIndex) => (
                    <button
                        key={itemIndex}
                        className="course-button"
                        onClick={item.onClick}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const Sidebar = () => {
    const setState = useSetStateValue();

    const jwt = useStateValue((state: State) => state.auth.token);
    const toggleRefactor = useStateValue((state: State) => state.toggleRefactor);
    const onRequestError = useStateValue((state: State) => state.auth.onRequestError);
    const courses = useStateValue((state: State) => state.courses);

    const fetchCourses = useCallback(async () => {
        try {
            const response = await fetch('/api/courses', {
                headers: {
                    'Authorization': `Bearer ${jwt}`
                }
            });

            if (!response.ok) {
                console.error('Error fetching courses:', response);
                onRequestError(response);
                return;
            }
            const data = await response.json();
            setState(draft => { draft.courses = data || [] });
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    }, [jwt, setState]);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);
    
    return (
        <div className="sidebar">
            <div className="sidebar-title" onClick={toggleRefactor}>
                <span className="sidebar-title-text">ARATTA</span>
            </div>
            
            <div className="p-6">
                <div className="overflow-y-auto scrollbar-hide h-[calc(100vh-120px)]">
                    <div className="mb-4">
                        <h2 className="courses-title courses-header">
                            My Courses
                        </h2>
                        
                        <div className="space-y-4">
                            {courses.map((course, index) => (
                                <CourseBox
                                    key={index}
                                    course={course} 
                                />
                            ))}
                            <NewCourseButton />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
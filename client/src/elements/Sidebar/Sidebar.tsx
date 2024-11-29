import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { Icon } from '../Icon/Icon';
import './Sidebar.css';
import { Course, Lesson, State, useSetStateValue, useStateValue, WorkPage, ModalSelector } from '../../state/state';
import { useQuery } from '@tanstack/react-query';

const CourseBox = ({ course }: { course: Course }) => {
    const setState = useSetStateValue();
    const jwt = useStateValue((state: State) => state.auth.token);
    const selectedLesson = useStateValue((state: State) => state.pageChoice.selectedLesson)
    const onRequestError = useStateValue((state: State) => state.auth.onRequestError);
    const [latestLesson, setLatestLesson] = useState<string | null>(null);
    const [lastFailed, setLastFailed] = useState<number>(0);

    const fetchCourse = useCallback(async () => {
        const response = await fetch(`/api/course/${course.id}/lessons`, {
            headers: { 'Authorization': `Bearer ${jwt}` }
        });

        if (!response.ok) {
            onRequestError(response);
            setLastFailed(Date.now());
            return;
        }

        const data = await response.json() as Lesson[] | null;

        if (data === null) {
            setLatestLesson("");
            return;
        }

        if (data.length > 0) {
            const latestLesson = data.reduce((latest: Lesson, lesson: Lesson) => {
                return new Date(lesson.updated_at) > new Date(latest.updated_at) ? lesson : latest;
            });
            setLatestLesson(latestLesson.id);
        } else {
            setLatestLesson("");
        }
    }, [jwt, onRequestError]);

    useEffect(() => {
        if (Date.now() - lastFailed < 10000) {
            const timeoutId = setTimeout(fetchCourse, 10000 - (Date.now() - lastFailed));
            return () => clearTimeout(timeoutId);
        }
        fetchCourse();
    }, [fetchCourse, lastFailed, selectedLesson]);

    const getFirstItem = () => {
        if (latestLesson) {
            return {
                icon: <Icon scale={12} name="next" />, 
                label: 'Continue Lesson',
                onClick: () => setState(draft => { draft.pageChoice.workPage = WorkPage.Chat; draft.pageChoice.selectedLesson = latestLesson })
            };
        }

        if (latestLesson === "") {
            return {
                icon: <Icon scale={12} name="next" />, 
                label: 'Initial Assessment',
                onClick: () => console.log('Initial Assessment for:', course.name)
            };
        }

        return {
            icon: <Icon scale={12} name="next" />, 
            label: 'Loading...',
            onClick: () => {}
        };
    };

    const standardItems = [
        getFirstItem(),
        { 
            icon: <Icon scale={12} name="color" />, 
            label: 'View Course',
            onClick: () => setState(draft => { draft.pageChoice.workPage = WorkPage.Course; draft.pageChoice.selectedCourse = course.id })
        },
        { 
            icon: <Icon scale={12} name="mic" />, 
            label: 'Quick Practice',
            onClick: () => console.log('Free Practice for:', course.name)
        }
    ];
    
    return (
        <div className="course-box">
            <div className="course-header">
                <span className="course-name text-truncate" title={course.name}>
                    {course.name}
                </span>
                <Icon scale={20} name="learning" />
            </div>
            
            <div>
                {standardItems.map((item, itemIndex) => (
                    <button
                        key={itemIndex}
                        className="course-button"
                        onClick={item.onClick}
                    >
                        {item.icon}
                        <div className="whitespace-nowrap">{item.label}</div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const NewCourseButton = () => {
    const setState = useSetStateValue();

    const newCourseItems = [
        { 
            icon: <Icon scale={12} name="shuttle" />, 
            label: 'Start New Course',
            onClick: () => setState(draft => { draft.modalSelector = ModalSelector.NewCourse })
        },
        { 
            icon: <Icon scale={12} name="writing" />, 
            label: 'View All Courses',
            onClick: () => setState(draft => { draft.pageChoice.workPage = WorkPage.AllCourses })
        }
    ];
    
    return (
        <div className="course-box">
            <div>
                {newCourseItems.map((item, itemIndex) => (
                    <button
                        key={itemIndex}
                        className="course-button"
                        onClick={item.onClick}
                    >
                        {item.icon}
                        <div className="whitespace-nowrap">{item.label}</div>
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

    const coursesElements = useMemo(() => {
        return [...courses]
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 4)
            .map((course, index) => (
                <CourseBox
                    key={index}
                    course={course} 
                />
            ))
    }, [courses]);

    const fetchCourses = useCallback(async () => {
        const response = await fetch('/api/courses', {
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        });

        if (!response.ok) {
            console.error('Error fetching courses:', response);
            onRequestError(response, "Failed to fetch courses", "sidebar-fetch-courses");
            throw new Error("Failed to fetch courses");
            return;
        }
        const data = await response.json();
        setState(draft => { draft.courses = data || [] });
        return data;
    }, [jwt, setState, onRequestError]);

    const {isPending: isFetchingCourses, error: errorCourses, data: dataCourses} = useQuery({
        queryKey: ['side-bar-courses'],
        queryFn: fetchCourses
    });

    return (
        <div className="sidebar">
            <div className="sidebar-title" onClick={toggleRefactor}>
                <span className="sidebar-title-text">ARATTA</span>
            </div>
            
            <div>
                <div>
                    <div>
                        <h2 className="courses-title courses-header">
                            My Courses
                        </h2>
                        
                        <div>
                            {coursesElements}
                            <NewCourseButton />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
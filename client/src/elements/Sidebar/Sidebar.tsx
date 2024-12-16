import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { Icon } from '../Icon/Icon';
import { Course, Lesson, State, useSetStateValue, useStateValue, WorkPage, ModalSelector } from '../../state/state';
import { useQuery } from '@tanstack/react-query';
import { createAssessment } from '../../api/assessment';

const CourseBox = ({ course }: { course: Course }) => {
    const setState = useSetStateValue();
    const jwt = useStateValue((state: State) => state.auth.token);
    const onRequestError = useStateValue((state: State) => state.auth.onRequestError);
    const [latestLesson, setLatestLesson] = useState<string | null>(null);
    const [lastFailed, setLastFailed] = useState<number>(0);
    const timeLastLessonMod = useStateValue((state: State) => state.triggers.timeLastLessonMod);

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
        
        const nonPracticeLessons = data.filter(lesson => !lesson.free_practice);

        if (nonPracticeLessons.length > 0) {
            const latestLesson = nonPracticeLessons.reduce((latest: Lesson, lesson: Lesson) => {
                return new Date(lesson.updated_at) > new Date(latest.updated_at) ? lesson : latest;
            });
            setLatestLesson(latestLesson.id);
        } else {
            setLatestLesson("");
        }
    }, [jwt, onRequestError, course.id]);

    useEffect(() => {
        if (Date.now() - lastFailed < 10000) {
            const timeoutId = setTimeout(fetchCourse, 10000 - (Date.now() - lastFailed));
            return () => clearTimeout(timeoutId);
        }
        fetchCourse();
    }, [fetchCourse, lastFailed, timeLastLessonMod]);

    const handleNewPractice = useCallback(async () => {
        const response = await fetch(`/api/course/${course.id}/lesson`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: "",
                free_practice: true,
                lesson_plan_content: "Let's have a casual conversation to review what you've learned so far. I'll reference your vocabulary list for context, but feel free to explore any topics or concepts you'd like to practice. We can focus on strengthening your communication skills while naturally incorporating previous material.",
            })
        });

        if (!response.ok) {
            onRequestError(response, "Failed to create practice lesson", "course-view-practice-new");
            return;
        }

        const newLesson = await response.json();

        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedCourse = course.id;
            draft.pageChoice.selectedLesson = newLesson.id;
            draft.triggers.timeLastLessonMod = Date.now();
        });
    }, [jwt, onRequestError, course.id, setState]);

    const handleNewAssessment = useCallback(async () => {
        const response = await createAssessment(jwt, course.id, "Initial Assessment");

        if (!response.ok) {
            onRequestError(response, "Failed to create assessment", "course-view-assessment-new");
            return;
        }

        const newLesson = await response.json();

        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedCourse = course.id;
            draft.pageChoice.selectedLesson = newLesson.id;
            draft.triggers.timeLastLessonMod = Date.now();
        });
    }, [jwt, onRequestError, course.id, setState]);

    const getFirstItem = () => {
        if (latestLesson) {
            return {
                icon: <Icon scale={12} name="next" />, 
                label: 'Continue Lesson',
                onClick: () => setState(draft => { draft.pageChoice.workPage = WorkPage.Chat; draft.pageChoice.selectedLesson = latestLesson; draft.pageChoice.selectedCourse = course.id })
            };
        }

        if (latestLesson === "") {
            return {
                icon: <Icon scale={12} name="next" />, 
                label: 'Initial Assessment',
                onClick: handleNewAssessment
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
            onClick: handleNewPractice
        }
    ];
    
    return (
        <div className="bg-alice-dark rounded-xl p-1 px-4 font-nobeluno mx-[12.5%] my-4">
            <div className="flex w-full justify-between items-center pt-4 mb-2.5">
                <span className="text-lg font-semibold text-indigo-dye flex-1 max-w-[150px] truncate" title={course.name}>
                    {course.name}
                </span>
                <Icon scale={20} name="learning" />
            </div>
            
            <div>
                {standardItems.map((item, itemIndex) => (
                    <button
                        key={itemIndex}
                        className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-indigo-dye text-sm transition-colors hover:bg-alice-blue border-none bg-transparent"
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
        <div className="bg-alice-dark rounded-xl p-1 px-4 font-nobeluno mx-[12.5%] my-4">
            <div>
                {newCourseItems.map((item, itemIndex) => (
                    <button
                        key={itemIndex}
                        className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-indigo-dye text-sm transition-colors hover:bg-alice-blue border-none bg-transparent"
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
    const onRequestError = useStateValue((state: State) => state.auth.onRequestError);
    const courses = useStateValue((state: State) => state.courses);
    const sendMessage = useStateValue(state => state.currentChat.ws.sendMessage);
    const sidebarOpen = useStateValue(state => state.sidebarOpen);

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
        }
        const data = await response.json();
        setState(draft => { draft.courses = data || [] });
        return data;
    }, [jwt, setState, onRequestError]);

    useQuery({
        queryKey: ['side-bar-courses', sendMessage],
        queryFn: fetchCourses
    });

    return (
        <div className={`
            min-w-0 bg-alice-blue min-h-screen m-0 p-0 pb-10 top-0 overflow-visible scrollbar-none relative
            transition-all duration-300 ease-in-out
        `}>
            <div className={`
                transition-all duration-300 ease-in-out 
                ${sidebarOpen ? 'w-[250px] opacity-100' : 'w-0 opacity-0'}
                h-screen overflow-y-auto scrollbar-none
            `}>
                <div className="h-full">
                    <div className="text-center text-indigo-dye py-[30px] cursor-pointer"
                        onClick={() => setState(draft => {
                            draft.pageChoice.workPage = WorkPage.Intro
                            draft.triggers.key += 1
                        })}
                    >
                        <span className="font-ancorli font-extralight text-[30pt] tracking-tight">ARATTA</span>
                    </div>
                    
                    <div>
                        <div>
                            <h2 className="font-nobeluno font-semibold text-half-grey mx-[12.5%] flex justify-between items-center">
                                My Courses
                            </h2>
                            
                            <div>
                                {coursesElements}
                                <NewCourseButton />
                                <div className="pb-5"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div 
                className={`
                    absolute top-1 z-10
                    transition-all duration-300 ease-in-out
                    ${sidebarOpen ? 'right-1' : '-right-6'}
                `}
                onClick={() => setState(draft => { draft.sidebarOpen = !draft.sidebarOpen })}
            >
                <Icon 
                    scale={24} 
                    name="bars" 
                    className={`
                        opacity-100 
                        transition-transform duration-300 ease-in-out
                        ${sidebarOpen ? 'transform -scale-x-100' : ''}
                    `}
                />
            </div>
        </div>
    );
};

export default Sidebar;
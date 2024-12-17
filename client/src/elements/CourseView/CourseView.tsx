import React, { useEffect, useCallback, useState, useRef } from 'react';
import './CourseView.css';
import { useStateValue, useSetStateValue, WorkPage, Lesson, LessonPlan, NoteNode, VocabItem, ModalSelector } from '../../state/state';
import toast from 'react-hot-toast';
import { Icon } from '../Icon/Icon';
import { useQuery } from '@tanstack/react-query'
import { LessonPlanModal } from '../LessonPlanModal/LessonPlanModal';
import { LessonEditModal } from '../LessonEditModal/LessonEditModal';
import { createAssessment } from '../../api/assessment';
import { VocabList } from './VocabList';
import { QuickPrompts } from './QuickPrompts';
import { CustomInstructions } from './CustomInstructions';
import { useHandleDeleteLesson, useHandleNewPractice } from '../../utils/requests';

const SettingsLoader = () => {
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const setState = useSetStateValue();

    const fetchSettings = useCallback(async () => {
        const response = await fetch(`/api/course/${selectedCourseId}/settings`, {
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        });
        if (!response.ok) {
            onRequestError(response, "Error fetching course settings");
            return;
        }
        const data = await response.json();
        setState(draft => { draft.currentCourse.settings = data });
    }, [jwt, selectedCourseId, onRequestError, setState]);

    useEffect(() => {
        fetchSettings();

        return () => {
            setState(draft => { draft.currentCourse.settings = null });
        }
    }, [fetchSettings, setState]);

    return null;
}

const LessonPlanList = () => {      
    const setState = useSetStateValue();
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const [selectedLessonPlan, setSelectedLessonPlan] = useState<LessonPlan | null>(null);
    const modalSelector = useStateValue(state => state.modalSelector);

    const fetchLessonPlans = useCallback(async () => {
        const response  = await fetch(`/api/course/${selectedCourseId}/lesson-plans`, {
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        });
        if (!response.ok) {
            onRequestError(response, "Error fetching lesson plans");
            return;
        }
        const data = await response.json();
        setLessonPlans(data);
    }, [jwt, selectedCourseId, onRequestError]);

    useEffect(() => {
        fetchLessonPlans();
    }, [fetchLessonPlans, modalSelector]);

    return (
        <div>
            <div className="lesson-plan-list-title">
                Lesson Templates
            </div>
            <div className="auto-flex">
                <div className="lesson-plan-item add-new-lesson-plan" onClick={() => {setSelectedLessonPlan(null); setState(draft => {draft.modalSelector = ModalSelector.LessonPlan})}}>
                    + New Lesson Template
                </div>
                {lessonPlans
                    ?.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .map(lessonPlan => (
                        <div className="lesson-plan-item text-truncate" key={lessonPlan.id} onClick={() => {setSelectedLessonPlan(lessonPlan); setState(draft => {draft.modalSelector = ModalSelector.LessonPlan})}}>{lessonPlan.title}</div>
                ))}
            </div>
            {modalSelector === ModalSelector.LessonPlan && <LessonPlanModal lessonTemplateExisting={selectedLessonPlan} />}
        </div>
    );
}

const LessonList = ({ lessons }: { lessons: Lesson[] }) => {
    const setState = useSetStateValue();
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const [viewAll, setViewAll] = useState(false);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const [lessonToEdit, setLessonToEdit] = useState<Lesson | null>(null);
    const modalSelector = useStateValue(state => state.modalSelector);

    useEffect(() => {
        setViewAll(false);
    }, [selectedCourseId]);

    const handleLessonChoice = (lesson: Lesson) => {
        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedLesson = lesson.id;
        });
    }

    const handleDeleteLesson = useHandleDeleteLesson();

    return (
        <div className="course-lesson-list">
            {lessonToEdit && modalSelector === ModalSelector.LessonEdit && <LessonEditModal lesson={lessonToEdit} />}
            <div className="course-lesson-list-title">Lessons</div>
            <div className="course-lesson-list-add-lesson"
                onClick={() => setState(draft => { draft.modalSelector = ModalSelector.NewLesson })}
            >
                + Start New Lesson
            </div>
            {lessons
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .slice(0, viewAll ? lessons.length : 4)
                .map(lesson => (
                <div key={lesson.id} className="course-lesson-item group" onClick={() => handleLessonChoice(lesson)}>
                    <div className="flex justify-between items-center w-full">
                        <div>
                            Lesson {lesson.order_index + 1}: {lesson.name}
                        </div>
                        <div className="lesson-actions opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Icon 
                                name="pencil" 
                                scale={14} 
                                style={{ 
                                    cursor: 'pointer', 
                                    marginRight: '10px',
                                    opacity: '0.5',
                                    transition: 'opacity 200ms'
                                }} 
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = '0.5';
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLessonToEdit(lesson);
                                    setState(draft => { draft.modalSelector = ModalSelector.LessonEdit });
                                }}
                            />
                            <Icon 
                                name="bin" 
                                scale={14} 
                                style={{ 
                                    cursor: 'pointer',
                                    opacity: '0.5',
                                    transition: 'opacity 200ms'
                                }} 
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = '0.5';
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLesson(lesson);
                                }}
                            />
                        </div>
                    </div>
                    <div className="course-lesson-item-updated-at">
                        Last used: {lesson.updated_at}
                    </div>
                </div>
            ))}
            {!viewAll && lessons.length > 4 && <div className="lessons-view-all" style={{ cursor: 'pointer' }} onClick={() => setViewAll(true)}>
                View All
            </div>}
        </div>
    );
};

const PracticeList = ({ lessons }: { lessons: Lesson[] }) => {
    const setState = useSetStateValue();
    const [viewAll, setViewAll] = useState(false);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const [lessonToEdit, setLessonToEdit] = useState<Lesson | null>(null);
    const modalSelector = useStateValue(state => state.modalSelector);

    useEffect(() => {
        setViewAll(false);
    }, [selectedCourseId]);

    const handleLessonChoice = (lesson: Lesson) => {
        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedLesson = lesson.id;
            draft.triggers.timeLastLessonMod = Date.now();
        });
    }

    const handleDelete = useHandleDeleteLesson();
    const handleNewPractice = useHandleNewPractice();

    return (
        <div className="practice-lesson-list">
            {lessonToEdit && modalSelector === ModalSelector.LessonEdit && <LessonEditModal lesson={lessonToEdit} />}
            <div className="practice-lesson-list-title">Quick Practice</div>
            <div className="practice-lesson-list-add-lesson" onClick={handleNewPractice}>
                + Start New Practice
            </div>
            {lessons
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .slice(0, viewAll ? lessons.length : 4)
                .map(lesson => (
                <div key={lesson.id} className="practice-lesson-item group mt-5 active:translate-y-1 active:shadow-none" onClick={() => handleLessonChoice(lesson)}>
                    <div className="flex justify-between items-center w-full">
                        <div>
                            {lesson.name}
                        </div>
                        <div className="practice-actions opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Icon 
                                name="pencil" 
                                scale={14} 
                                style={{ 
                                    cursor: 'pointer', 
                                    marginRight: '10px',
                                    opacity: '0.5',
                                    transition: 'opacity 200ms'
                                }} 
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = '0.5';
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLessonToEdit(lesson);
                                    setState(draft => { draft.modalSelector = ModalSelector.LessonEdit });
                                }}
                            />
                            <Icon 
                                name="bin" 
                                scale={14} 
                                style={{ 
                                    cursor: 'pointer',
                                    opacity: '0.5',
                                    transition: 'opacity 200ms'
                                }} 
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = '0.5';
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(lesson);
                                }}
                            />
                        </div>
                    </div>
                    <div className="practice-lesson-item-updated-at">
                        Last used: {lesson.updated_at}
                    </div>
                </div>
            ))}
            {!viewAll && lessons.length > 4 && <div className="practice-view-all" style={{ cursor: 'pointer' }} onClick={() => setViewAll(true)}>
                View All
            </div>}
        </div>
    );
};

const Assessment = ({ lessons }: { lessons: Lesson[] }) => {
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const setState = useSetStateValue();
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    
    const handleNewAssessment = useCallback(async () => {
        if (!selectedCourseId) {
            toast.error("No course selected, please select a course to create an assessment.");
            return;
        }

        const response = await createAssessment(jwt, selectedCourseId, lessons.length === 0 ? "Initial Assessment" : "Review Assessment");

        if (!response.ok) {
            onRequestError(response, "Failed to create assessment", "course-view-assessment-new");
            return;
        }

        const newLesson = await response.json();

        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedLesson = newLesson.id;
            draft.triggers.timeLastLessonMod = Date.now();
        });
    }, [jwt, onRequestError, selectedCourseId, setState, lessons]);
    
    return (
        <div className="flex flex-col gap-3 mt-4">
            <div className="text-[18px]">
                {lessons.length === 0 
                    ? "Do an initial assessment to determine your current level"
                    : "Ready to check your progress? Do a review assessment to see how you've improved!"}
            </div>
            <button 
                className="px-4 py-2 bg-coral font-semibold text-baby-powder border-2 text-nowrap border-indigo-dye rounded-xl transform active:translate-y-[4px] active:shadow-none shadow-[0_4px_0_var(--indigo-dye)] transition-all self-start"
                onClick={handleNewAssessment}
            >
                Take an Assessment
            </button>
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
        const response = await fetch(`/api/course/${selectedCourseId}/lessons`, {
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        })

        if (!response.ok) {
            onRequestError(response, "Failed to fetch lessons", "course-view-lessons");
            throw new Error("Failed to fetch lessons");
        }

        return response.json();
    }, [selectedCourseId, jwt, onRequestError]);

    const {isPending: isPendingLessons, error: errorLessons, data: dataLessons} = useQuery({
        queryKey: ['course-view-lessons-' + selectedCourseId],
        queryFn: fetchLessons
    })

    useEffect(() => {
        if (!isPendingLessons && !errorLessons) {
            setState(draft => { draft.currentCourse.lessons = dataLessons || [] });
        }
    }, [dataLessons, setState, isPendingLessons, errorLessons]);

    return (
        <div className="course-view">
            <SettingsLoader />
            <span className="course-title">{currentCourse?.name}</span>
            <div className="course-content-container">
                <div className="course-content-left">
                    <Assessment lessons={lessons.filter(lesson => !lesson.free_practice)}/>
                    <LessonList lessons={lessons.filter(lesson => !lesson.free_practice)} />
                    <div style={{marginTop: '20px'}}>
                        <LessonPlanList />
                    </div>
                    <QuickPrompts />
                </div>
                <div className="course-content-right">
                    <PracticeList lessons={lessons.filter(lesson => lesson.free_practice)} />
                    <VocabList />
                    <CustomInstructions />
                    <div 
                        className="ml-10 text-coral cursor-pointer mt-4 text-sm hover:brightness-75 transition-all"
                        onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
                                const response = await fetch(`/api/course/${selectedCourseId}`, {
                                    method: 'DELETE',
                                    headers: {
                                        'Authorization': `Bearer ${jwt}`
                                    }
                                });

                                if (!response.ok) {
                                    onRequestError(response, "Failed to delete course", "course-delete");
                                    return;
                                }

                                // Redirect to courses page after successful deletion
                                setState(draft => {
                                    draft.courses = draft.courses.filter(course => course.id !== selectedCourseId);
                                    draft.pageChoice.workPage = WorkPage.AllCourses;
                                    draft.pageChoice.selectedCourse = null;
                                    draft.currentCourse = {
                                        content: null,
                                        lessons: [],
                                        settings: null
                                    };
                                });
                            }
                        }}
                    >
                        Delete Course
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseView;

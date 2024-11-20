import React, { useEffect, useCallback } from 'react';
import './CourseView.css';
import { useStateValue, useSetStateValue, WorkPage, Lesson, LessonPlan } from '../../state/state';
import toast from 'react-hot-toast';

const LessonPlanList = () => {
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);

    const exampleLessonPlans: LessonPlan[] = [
        {
            id: "lp1",
            course_id: "c1",
            title: "Introduction to Spanish Greetings",
            content: "In this lesson, we'll cover basic Spanish greetings:\n- Hola (Hello)\n- Buenos días (Good morning)\n- Buenas tardes (Good afternoon)\n- Buenas noches (Good night)\n- ¿Cómo estás? (How are you?)",
            created_at: "2024-03-20T10:00:00Z"
        },
        {
            id: "lp2",
            course_id: "c1",
            title: "Basic Spanish Numbers 1-10",
            content: "Learn to count in Spanish:\n1. uno\n2. dos\n3. tres\n4. cuatro\n5. cinco\n6. seis\n7. siete\n8. ocho\n9. nueve\n10. diez",
            created_at: "2024-03-20T10:30:00Z"
        },
        {
            id: "lp3",
            course_id: "c2",
            title: "Common French Phrases",
            content: "Essential French phrases:\n- Bonjour (Hello)\n- S'il vous plaît (Please)\n- Merci (Thank you)\n- De rien (You're welcome)\n- Au revoir (Goodbye)",
            created_at: "2024-03-20T11:00:00Z"
        },
        {
            id: "lp4",
            course_id: "c2",
            title: "French Articles",
            content: "Understanding French articles:\n- le (masculine)\n- la (feminine)\n- les (plural)\n- un (indefinite masculine)\n- une (indefinite feminine)",
            created_at: "2024-03-20T11:30:00Z"
        }
    ]

    return (
        <div className="auto-flex">
            {exampleLessonPlans.map(lessonPlan => (
                <div className="lesson-plan-item" key={lessonPlan.id}>{lessonPlan.title}</div>
            ))}
        </div>
    );
}

const LessonList = ({ lessons }: { lessons: Lesson[] }) => {
    const setState = useSetStateValue();

    const handleLessonChoice = (lesson: Lesson) => {
        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedLesson = lesson.id;
        });
    }

    return (
        <div className="course-lesson-list">
            <div className="course-lesson-list-title">Lessons</div>
            <div className="course-lesson-list-add-lesson">
                + Start New Lesson
            </div>
            {lessons.map(lesson => (
                <div key={lesson.id} className="course-lesson-item" onClick={() => handleLessonChoice(lesson)}>
                    <div>
                        Lesson {lesson.order_index + 1}: {lesson.name}
                    </div>
                    <div className="course-lesson-item-updated-at">
                        Last used: {lesson.updated_at}
                    </div>
                </div>
            ))}
        </div>
    );
};

const PracticeList = ({ lessons }: { lessons: Lesson[] }) => {
    const setState = useSetStateValue();

    const handleLessonChoice = (lesson: Lesson) => {
        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedLesson = lesson.id;
        });
    }

    return (
        <div className="practice-lesson-list">
            <div className="practice-lesson-list-title">Quick Practice</div>
            <div className="practice-lesson-list-add-lesson">
                + Start New Practice
            </div>
            {lessons.map(lesson => (
                <div key={lesson.id} className="practice-lesson-item" onClick={() => handleLessonChoice(lesson)}>
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
                    <LessonPlanList />
                </div>
                <div className="course-content-right">
                    <PracticeList lessons={lessons.filter(lesson => lesson.free_practice)} />
                </div>
            </div>
        </div>
    );
};

export default CourseView;

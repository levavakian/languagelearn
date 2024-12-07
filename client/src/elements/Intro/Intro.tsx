import { createAssessment } from "../../api/assessment";
import { useSetStateValue, useStateValue, State, Lesson, WorkPage, ModalSelector } from "../../state/state";
import { useCallback, useEffect, useState } from "react";

export const Intro = () => {
    const courses = useStateValue(state => state.courses);
    const course = courses.length > 0 
        ? courses.reduce((latest, course) => {
            return new Date(course.updated_at) > new Date(latest.updated_at) ? course : latest;
        })
        : null;

    const setState = useSetStateValue();
    const jwt = useStateValue((state: State) => state.auth.token);
    const onRequestError = useStateValue((state: State) => state.auth.onRequestError);
    const [latestLesson, setLatestLesson] = useState<string | null>(null);
    const [lastFailed, setLastFailed] = useState<number>(0);
    const timeLastLessonMod = useStateValue((state: State) => state.triggers.timeLastLessonMod);

    const fetchCourse = useCallback(async () => {
        if (!course?.id) {
            return;
        }

        const response = await fetch(`/api/course/${course?.id}/lessons`, {
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
    }, [jwt, onRequestError, course?.id]);

    useEffect(() => {
        if (Date.now() - lastFailed < 10000) {
            const timeoutId = setTimeout(fetchCourse, 10000 - (Date.now() - lastFailed));
            return () => clearTimeout(timeoutId);
        }
        fetchCourse();
    }, [fetchCourse, lastFailed, timeLastLessonMod]);

    const handleNewPractice = useCallback(async () => {
        if (!course?.id) {
            return;
        }

        const response = await fetch(`/api/course/${course?.id}/lesson`, {
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
            draft.pageChoice.selectedCourse = course?.id;
            draft.pageChoice.selectedLesson = newLesson.id;
            draft.triggers.timeLastLessonMod = Date.now();
        });
    }, [jwt, onRequestError, course?.id, setState]);

    const handleNewAssessment = useCallback(async () => {
        if (!course?.id) {
            return;
        }

        const response = await createAssessment(jwt, course?.id, "Initial Assessment");

        if (!response.ok) {
            onRequestError(response, "Failed to create assessment", "course-view-assessment-new");
            return;
        }

        const newLesson = await response.json();

        setState(draft => {
            draft.pageChoice.workPage = WorkPage.Chat;
            draft.pageChoice.selectedCourse = course?.id;
            draft.pageChoice.selectedLesson = newLesson.id;
            draft.triggers.timeLastLessonMod = Date.now();
        });
    }, [jwt, onRequestError, course?.id, setState]);

    const startCourseButton = <button 
        className="
            px-6 py-3 font-nobel rounded-xl 
            bg-coral text-baby-powder text-[32px]
            border-2 border-indigo-dye
            transform translate-y-0
            shadow-[0_4px_0_0_var(--indigo-dye)]
            transition-all duration-100
            active:shadow-none active:translate-y-1
        "
        onClick={() => setState(draft => {
            draft.modalSelector = ModalSelector.NewCourse
        })}
    >
        Start Course
    </button>;

    const initialAssessmentButton = <button 
        className="
            px-6 py-3 font-nobel rounded-xl 
            bg-coral text-baby-powder text-[32px]
            border-2 border-indigo-dye
            transform translate-y-0
            shadow-[0_4px_0_0_var(--indigo-dye)]
            transition-all duration-100
            active:shadow-none active:translate-y-1
            "
            onClick={handleNewAssessment}
        >
        Start Assessment
    </button>;

    const continueLessonButton = <button 
        className="
            px-6 py-3 font-nobel rounded-xl 
            bg-coral text-baby-powder text-[32px]
            border-2 border-indigo-dye
            transform translate-y-0
            shadow-[0_4px_0_0_var(--indigo-dye)]
            transition-all duration-100
            active:shadow-none active:translate-y-1
        "
        onClick={() => setState(draft => { draft.pageChoice.workPage = WorkPage.Chat })}
    >
        Continue Lesson
    </button>;

    const quickPracticeButton = <button 
className="
    px-6 py-3 font-nobel rounded-xl 
    bg-coral text-baby-powder text-[32px]
    border-2 border-indigo-dye
    transform translate-y-0
    shadow-[0_4px_0_0_var(--indigo-dye)]
    transition-all duration-100
    active:shadow-none active:translate-y-1
"
onClick={handleNewPractice}
>
Quick Practice
</button>;

    return (
        <div className="flex flex-col items-center mt-[30vh] gap-4 p-4">
            <h1 className="text-[42px] font-bold font-nobel mb-4">
                {course ? `Hey, are you ready for today's ${course?.name} lesson?` : "Hey, are you ready to start a new course?"}
            </h1>
            {course ? (
                <div className="flex gap-8">
                    {latestLesson ?  continueLessonButton : initialAssessmentButton}
                    {quickPracticeButton}
                </div>
            ) : startCourseButton}
        </div>
    );
}
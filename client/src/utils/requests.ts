import { WorkPage } from "../state/state";

import { useCallback } from "react";
import { useSetStateValue, useStateValue } from "../state/state";

export const useHandleNewPractice = () => {
    const setState = useSetStateValue();
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);

    const handleNewPractice = useCallback(async () => {
        const response = await fetch(`/api/course/${selectedCourseId}/lesson`, {
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
                draft.pageChoice.selectedLesson = newLesson.id;
            });
    }, [setState, jwt, onRequestError, selectedCourseId]);

    return handleNewPractice;
}
import { useCallback, useEffect } from "react";
import { useSetStateValue, useStateValue } from "../../state/state";
import { useQuery } from "@tanstack/react-query";

export const useCourseInfo = () => {
    const setState = useSetStateValue();
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);

    const fetchLessons = useCallback(async () => {
        const response = await fetch(`/api/course/${selectedCourseId}/lessons`, {
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        })

        if (!response.ok) {
            onRequestError(response, "Failed to fetch lessons", "use-course-info-lessons");
            throw new Error("Failed to fetch lessons");
        }

        return response.json();
    }, [selectedCourseId, jwt, onRequestError]);

    const {isPending: isPendingLessons, error: errorLessons, data: dataLessons} = useQuery({
        queryKey: ['use-course-info-lessons-' + selectedCourseId],
        queryFn: fetchLessons
    })

    useEffect(() => {
        if (!isPendingLessons && !errorLessons && selectedCourseId) {
            setState(draft => {
                if (!(selectedCourseId in draft.courseInfo)) {
                    draft.courseInfo[selectedCourseId] = {
                        content: null,
                        lessons: [],
                        settings: null
                    }
                }
                draft.courseInfo[selectedCourseId].lessons = dataLessons || []
            });
        }
    }, [dataLessons, setState, isPendingLessons, errorLessons, selectedCourseId]);
}
import { useCallback, useEffect } from "react";
import { useSetStateValue, useStateValue, WorkPage } from "../../state/state";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

export const useCourseInfo = () => {
    const setState = useSetStateValue();
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const timeLastLessonPlans = useStateValue(state => state.triggers.timeLastLessonPlans);

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
                        lessonPlans: [],
                        settings: null
                    }
                }
                draft.courseInfo[selectedCourseId].lessons = dataLessons || []
            });
        }
    }, [dataLessons, setState, isPendingLessons, errorLessons, selectedCourseId]);

    const fetchLessonPlans = useCallback(async () => {
        const response = await fetch(`/api/course/${selectedCourseId}/lesson-plans`, {
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        })

        if (!response.ok) {
            onRequestError(response, "Error fetching lesson templates");
            return;
        }

        return response.json();
    }, [selectedCourseId, jwt, onRequestError]);

    const {isPending: isPendingLessonPlans, error: errorLessonPlans, data: dataLessonPlans} = useQuery({
        queryKey: ['use-course-info-lesson-plans-' + selectedCourseId + '-' + timeLastLessonPlans],
        queryFn: fetchLessonPlans
    })

    useEffect(() => {
        if (!isPendingLessonPlans && !errorLessonPlans && selectedCourseId) {
            setState(draft => {
                if (!(selectedCourseId in draft.courseInfo)) {
                    draft.courseInfo[selectedCourseId] = {
                        content: null,
                        lessons: [],
                        lessonPlans: [],
                        settings: null
                    }
                }
                draft.courseInfo[selectedCourseId].lessonPlans = dataLessonPlans || []
            });
        }
    }, [dataLessonPlans, setState, isPendingLessonPlans, errorLessonPlans, selectedCourseId]);
    
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
            
            return response.json();
        } catch (error) {
            toast.error(`Error fetching course`);
            console.error('Error fetching course:', error);
        }
    }, [jwt, selectedCourseId, onRequestError, setState]);

    const {isPending: isPendingCourse, error: errorCourse, data: dataCourse} = useQuery({
        queryKey: ['use-course-info-course-' + selectedCourseId],
        queryFn: fetchCourse
    })

    useEffect(() => {
        if (!isPendingCourse && !errorCourse && selectedCourseId && dataCourse) {
            setState(draft => {
                if (!(selectedCourseId in draft.courseInfo)) {
                    draft.courseInfo[selectedCourseId] = {
                        content: null,
                        lessons: [],
                        lessonPlans: [],
                        settings: null
                    }
                }
                draft.courseInfo[selectedCourseId].content = dataCourse
            });
        }
    }, [dataCourse, setState, isPendingCourse, errorCourse, selectedCourseId]);

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

        return response.json();
    }, [jwt, selectedCourseId, onRequestError]);

    const {isPending: isPendingSettings, error: errorSettings, data: dataSettings} = useQuery({
        queryKey: ['use-course-info-settings-' + selectedCourseId],
        queryFn: fetchSettings
    })

    useEffect(() => {
        if (!isPendingSettings && !errorSettings && selectedCourseId) {
            setState(draft => {
                if (!(selectedCourseId in draft.courseInfo)) {
                    draft.courseInfo[selectedCourseId] = {
                        content: null,
                        lessons: [],
                        lessonPlans: [],
                        settings: null
                    }
                }
                draft.courseInfo[selectedCourseId].settings = dataSettings;
            });
        }
    }, [dataSettings, setState, isPendingSettings, errorSettings, selectedCourseId]);
}
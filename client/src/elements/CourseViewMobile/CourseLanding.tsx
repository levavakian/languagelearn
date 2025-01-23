import { WorkPage } from "../../state/state";

import { useCallback } from "react";
import { useSetStateValue } from "../../state/state";

import { useStateValue } from "../../state/state";
import { Intro } from "../Intro/Intro";

export const CourseLanding = () => {
    const setState = useSetStateValue();
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const courseInfo = useStateValue(state => state.courseInfo[state.pageChoice.selectedCourse || ""]);

    return <div className="flex flex-col min-h-[100%]">
        <div className="flex-0">
            {courseInfo && <Intro providedCourse={courseInfo.content} />}
        </div>
        <div className="flex-1"></div>
        <div 
            className="flex-0 text-coral mb-4 cursor-pointer text-sm hover:brightness-75 transition-all"
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
}
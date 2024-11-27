import React, { useEffect, useState } from 'react';
import { useSetStateValue, useStateValue, WorkPage } from '../../state/state';
import { Course, Lesson, LessonPlan } from '../../state/state';
import toast from 'react-hot-toast';

interface CourseDetails extends Course {
    lesson_plans: LessonPlan[];
    lessons: Lesson[];
}

export const CourseList= () => {
    const setState = useSetStateValue();
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const [courseDetails, setCourseDetails] = useState<CourseDetails[]>([]);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await fetch('/api/courses/details', {
                    headers: { 'Authorization': `Bearer ${jwt}` },
                });

                if (!response.ok) {
                    onRequestError(response, "Error fetching course details");
                    return;
                }

                const data: CourseDetails[] = await response.json();
                setCourseDetails(data);
            } catch (error) {
                toast.error("Error fetching course details");
                console.error("Error fetching course details:", error);
            }
        };
        fetchCourses();
    }, [jwt, onRequestError]);

    console.log(courseDetails);

    const renderLessons = (lessons: Lesson[]) => {
        if (!lessons?.length) {
            return <div className="h-[150px]">
                <p className="text-gray-500 text-[19px]">No lessons created yet</p>
            </div>
        }

        const displayLessons = lessons.slice(0, 2);

        if (lessons.length === 1) {
            return <div key={lessons[0].id} className="rounded-md h-[150px]">
                <p className="text-indigo-dye text-[19px]">{lessons[0].name}</p>
                <p className="text-gray-500 text-sm mt-[-15px]">
                    Last Interaction: {new Date(lessons[0].updated_at).toLocaleString()}
                </p>
            </div>
        }
        
        return (
            <div className="h-[150px]">
                {displayLessons.map((lesson, index) => (
                    <div key={lesson.id} className="rounded-md">
                        <p className="text-indigo-dye text-[19px]">{lesson.name}</p>
                        <p className="text-gray-500 text-sm mt-[-15px]">
                            Last Interaction: {new Date(lesson.updated_at).toLocaleString()}
                        </p>
                        {index === 0 && displayLessons.length > 1 && (
                            <hr className="my-2 border-gray-200" />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderLessonPlans = (lessonPlans: LessonPlan[]) => {
        if (!lessonPlans?.length) {
            return <div className="h-[150px]">
                <p className="text-gray-500 text-[19px]">No lesson plans created yet</p>
            </div>
        }

        const displayPlans = lessonPlans.slice(0, 2);

        if (lessonPlans.length === 1) {
            return <div key={lessonPlans[0].id} className="rounded-md h-[150px]">
                <p className="text-indigo-dye text-[19px]">{lessonPlans[0].title}</p>
                <p className="text-gray-500 text-sm mt-[-15px]">
                    Last Interaction: {new Date(lessonPlans[0].updated_at).toLocaleString()}
                </p>
            </div>
        }
        
        return (
            <div className="h-[150px]">
                {displayPlans.map((plan, index) => (
                    <div key={plan.id} className="rounded-md">
                        <p className="text-gray-700 text-[19px]">{plan.title}</p>
                        <p className="text-gray-500 text-sm mt-[-15px]">
                            Last Interaction: {new Date(plan.updated_at).toLocaleString()}
                        </p>
                        {index === 0 && displayPlans.length > 1 && (
                            <hr className="my-2 border-gray-200" />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-4">
            Courses
            <h1 className="text-2xl font-bold mb-4">Courses</h1>
            <div className="text-indigo-dye text-base">
            Courses organize your learning by language. Each course contains:<br></br><br></br>

            <span className="pl-4 block">
                • <strong>Lessons</strong> - Your conversations with the AI, either following a plan or as independent practice<br></br> 
                • <strong>Lesson Templates</strong> - Reusable lesson plans you can create to guide the lessons <br></br>
                • <strong>Course Tools</strong> - Vocabulary lists, notes, and custom settings 
            </span>
            <br></br>
Choose a course to continue learning, or start a new language journey.
            </div>
            <div className="bg-[--coral] hover:bg-[--coral-dark] text-center my-10 text-[24px] font-semibold text-[--baby-powder] max-w-[250px] rounded-xl p-2 border-[2px] border-solid border-[--indigo-dye] shadow-[0_6px_0_var(--indigo-dye)] cursor-pointer">
                Start New Course
            </div>
            <hr className="my-2 border-gray-200 max-w-[750px] ml-0" />
            <div className="grid mt-5 grid-cols-[repeat(auto-fill,minmax(200px,300px))] gap-6">
                {courseDetails.map(course => (
                    <div key={course.id} className="border px-4 rounded shadow max-w-58 bg-[--porcelain]">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-[24px] font-semibold">{course.name}</h2>
                            <span className="text-indigo-dye text-[24px] cursor-pointer" onClick={() => setState(draft => { draft.pageChoice.selectedCourse = course.id; draft.pageChoice.workPage = WorkPage.Course; })}>→</span>
                        </div>
                        <div className="mb-4">
                            <h3 className="text-[22px] font-semibold mb-2">Lessons</h3>
                            {renderLessons(course.lessons)}
                        </div>
                        <div>
                            <h3 className="text-[22px] font-semibold mb-2">Lesson Plans</h3>
                            {renderLessonPlans(course.lesson_plans)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
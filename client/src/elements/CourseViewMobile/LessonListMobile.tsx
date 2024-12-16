import React from 'react';
import { useStateValue, State } from '../../state/state';
import { Icon } from '../Icon/Icon';

export const LessonListMobile: React.FC = () => {
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const lessons = useStateValue(
        state => state.courseInfo[selectedCourseId || '']?.lessons || [],
        selectedCourseId
    );

    return (
        <div className="mr-3">
            <div className="text-[32px] font-bold">
                Lessons
            </div>
            {lessons.map((lesson) => {
                return (
                    <div key={lesson.id} className="mt-5 flex flex-row w-full">
                        <div className="w-full flex flex-row justify-between min-w-0 bg-alice-blue border-indigo-dye border-solid border-[1px] shadow-[0_4px_0_var(--indigo-dye)] rounded-lg p-2 transition-all duration-200 active:translate-y-1 active:shadow-none" onClick={() => console.log("hello")}>
                            <div className="flex flex-col justify-between">
                                <div className="w-full min-w-0">
                                    <div className="text-nowrap truncate">
                                        {lesson.name}
                                    </div>
                                </div>
                                <div className="text-[12px] text-nowrap truncate">
                                    Last used: {lesson.updated_at}
                                </div>
                            </div>
                            <div className="p-2 rounded-lg" onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("settings");
                            }}>
                                <Icon name="settings" scale={16} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default LessonListMobile;
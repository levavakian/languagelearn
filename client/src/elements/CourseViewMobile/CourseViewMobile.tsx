import { TabSelection, useStateValue } from '../../state/state';
import { LessonListMobile } from './LessonListMobile';
import { TabSelector } from './TabSelector';
import { useCourseInfo } from './courseHooks';

export const CourseViewMobile = () => {
    const tabSelection = useStateValue(state => state.tabSelection)
    useCourseInfo();

    return (
        <div className="flex w-full">
            <div className="ml-2 mt-2 flex-1 min-w-0">
                {tabSelection === TabSelection.Lessons && <LessonListMobile />}
            </div>
            <div className="flex-shrink-0">
                <TabSelector />
            </div>
        </div>
    );
};
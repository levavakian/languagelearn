import { TabSelection, useStateValue } from '../../state/state';
import { LessonListMobile, PracticeListMobile } from './LessonListMobile';
import { TabSelector } from './TabSelector';
import { useCourseInfo } from './courseHooks';

export const CourseViewMobile = () => {
    const tabSelection = useStateValue(state => state.tabSelection)
    useCourseInfo();

    return (
        <div className="flex w-full relative">
            <div className="flex-1 min-w-0 pr-16">
                <div className="ml-2 mt-2">
                    {tabSelection === TabSelection.Lessons && <LessonListMobile />}
                    {tabSelection === TabSelection.Practice && <PracticeListMobile />}
                </div>
            </div>
            <div className="fixed right-0 top-[20vh]">
                <TabSelector />
            </div>
        </div>
    );
};
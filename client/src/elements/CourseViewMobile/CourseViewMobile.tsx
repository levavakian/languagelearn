import { TabSelection, useStateValue } from '../../state/state';
import { CourseLanding } from './CourseLanding';
import { CustomInstructionsMobile } from './CustomInstructionsMobile';
import { LessonListMobile, PracticeListMobile } from './LessonListMobile';
import { TabSelector } from './TabSelector';
import { TooltipSettings } from './TooltipSettings';
import { VocabMobile } from './VocabMobile';
import { useCourseInfo } from './courseHooks';

export const CourseViewMobile = () => {
    const tabSelection = useStateValue(state => state.pageChoice.tabSelection)
    useCourseInfo();
    const courseInfo = useStateValue(state => state.courseInfo[state.pageChoice.selectedCourse || ""]);

    return (
        <div className="flex flex-col h-full w-full">
            <div className="w-full flex-0 text-right text-semibold text-[20px]">
                <div className="mr-3">
                    {courseInfo ? courseInfo.content?.name : "Course"}
                </div>
            </div>
            <div className="flex flex-1 w-full relative">
                <div className="flex-1 flex min-w-0 pr-16">
                    <div className="flex-1 max-w-[100%] ml-2 mt-2">
                        {tabSelection === TabSelection.Lessons && <LessonListMobile />}
                        {tabSelection === TabSelection.Practice && <PracticeListMobile />}
                        {tabSelection === TabSelection.Vocab && <VocabMobile />}
                        {tabSelection === TabSelection.Tooltip && <TooltipSettings />}
                        {tabSelection === TabSelection.CustomInstructions && <CustomInstructionsMobile />}
                        {tabSelection === TabSelection.Main && <CourseLanding />}
                    </div>
                </div>
                <div className="fixed right-0 top-[20vh]">
                    <TabSelector />
                </div>
            </div>
        </div>
    );
};
import { TabSelector } from './TabSelector';

export const CourseViewMobile = () => {
    return (
        <div className="flex w-full">
            <div className="flex-1 min-w-0">
                Content goes here
            </div>
            <div className="flex-shrink-0">
                <TabSelector />
            </div>
        </div>
    );
};
import React from 'react';
import { Icon } from '../Icon/Icon';
import './Sidebar.css';

// Add this interface before the CourseBox component
interface Course {
    name: string;
}

const CourseBox = ({ course }: { course: Course }) => {
    const standardItems = [
        { icon: <Icon scale={12} name="next" />, label: 'Continue Lesson' },
        { icon: <Icon scale={12} name="color" />, label: 'View Course' },
        { icon: <Icon scale={12} name="mic" />, label: 'Free Practice' }
    ];
    
    return (
        <div className="course-box space-y-2">
            <div className="course-header">
                <span className="course-name text-truncate" title={course.name}>
                    {course.name}
                </span>
                <Icon scale={20} name="learning" />
            </div>
            
            <div className="space-y-1">
                {standardItems.map((item, itemIndex) => (
                    <button
                        key={itemIndex}
                        className="course-button"
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const NewCourseButton = () => {
    const newCourseItems = [
        { icon: <Icon scale={12} name="shuttle" />, label: 'Start New Course' },
        { icon: <Icon scale={12} name="writing" />, label: 'View All Courses' }
    ];
    
    return (
        <div className="course-box">
            <div className="space-y-1">
                {newCourseItems.map((item, itemIndex) => (
                    <button
                        key={itemIndex}
                        className="course-button"
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const Sidebar = () => {
    const courses = [
        { name: 'Spanish' },
        { name: 'French' }
    ];
    
    return (
        <div className="sidebar">
            <div className="sidebar-title">
                <span className="sidebar-title-text">ARATTA</span>
            </div>
            
            <div className="p-6">
                <div className="overflow-y-auto scrollbar-hide h-[calc(100vh-120px)]">
                    <div className="mb-4">
                        <h2 className="text-slate-600 text-sm mb-2 flex items-center justify-between courses-title">
                            My Courses
                        </h2>
                        
                        <div className="space-y-4">
                            {courses.map((course, index) => (
                                <CourseBox
                                    key={index}
                                    course={course} 
                                />
                            ))}
                            <NewCourseButton />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
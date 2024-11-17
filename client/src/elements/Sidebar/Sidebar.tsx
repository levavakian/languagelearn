import React from 'react';
import { Icon } from '../Icon/Icon';
import './Sidebar.css';

// Add this interface before the CourseBox component
interface Course {
    name: string;
}

const CourseBox = ({ course }: { course: Course }) => {
    const standardItems = [
        { icon: <Icon scale={12} name="chat" />, label: 'Continue Lesson' },
        { icon: <Icon scale={12} name="chat" />, label: 'Topics' },
        { icon: <Icon scale={12} name="chat" />, label: 'Free Practice' }
    ];
    
    return (
        <div className="course-box space-y-2">
            <div className="course-header">
                <span className="course-name">{course.name}</span>
                <Icon scale={12} name="back" flipX={true} />
            </div>
            
            <div className="space-y-1">
                {standardItems.map((item, itemIndex) => (
                    <button
                        key={itemIndex}
                        className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/50 text-slate-600 text-sm transition-colors"
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
                <h1 className="text-2xl font-bold text-indigo-dye ancorli-fonts">ARATTA</h1>
            </div>
            
            <div className="p-6">
                <div className="overflow-y-auto scrollbar-hide h-[calc(100vh-120px)]">
                    <div className="mb-4">
                        <h2 className="text-slate-600 text-sm mb-2 flex items-center justify-between courses-title">
                            My Courses
                            <span className="text-xl font-medium">+</span>
                        </h2>
                        
                        <div className="space-y-4">
                            {courses.map((course, index) => (
                                <CourseBox
                                    key={index}
                                    course={course} 
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
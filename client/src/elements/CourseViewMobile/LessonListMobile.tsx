import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStateValue } from '../../state/state';
import { Icon } from '../Icon/Icon';
import { useWindowSize } from '../../utils/globals';

interface LessonDropdownProps {
    onClose: () => void;
    iconRef: React.RefObject<HTMLDivElement>;
    position: { x: number; y: number };
    screenHeight: number;
}

const LessonDropdown: React.FC<LessonDropdownProps> = ({ onClose, iconRef, position, screenHeight }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = useCallback((event: MouseEvent) => {
        if (dropdownRef.current && 
            !dropdownRef.current.contains(event.target as Node) && 
            !iconRef.current?.contains(event.target as Node)) {
            onClose();
        }
    }, [onClose, iconRef]);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('scroll', onClose);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('scroll', onClose);
        };
    }, [handleClickOutside, onClose]);

    const isBottomHalf = position.y > screenHeight / 2;

    return (
        <div 
            ref={dropdownRef}
            style={{
                position: 'fixed',
                left: `${position.x - 130}px`,
                top: isBottomHalf ? 'auto' : `${position.y + 25}px`,
                bottom: isBottomHalf ? `${screenHeight - position.y - 2.5}px` : 'auto',
            }}
            className="rounded-md min-w-[100px] bg-[var(--indigo-dye)] text-indigo-dye text-xl 
                border-[1px] border-solid border-[--indigo-dye)] flex flex-col-reverse shadow-[0_4px_0_var(--indigo-dye)]
                z-50"
        >
            {[
                { label: "Delete", onClick: () => {
                    console.log("Delete clicked");
                    onClose();
                }},
                { label: "Edit", onClick: () => {
                    console.log("Edit clicked");
                    onClose();
                }},
            ].map((item, index) => (
                <div
                    key={index}
                    className="relative isolate"
                >
                    <div 
                        onClick={item.onClick}
                        className={`px-2 py-1 cursor-pointer text-right text-[16px]
                            border-[2px] border-solid border-[--indigo-dye] relative rounded-md
                            bg-baby-powder hover:bg-gray-200 ${
                                item.label === "Delete" ? "text-red-500" : "text-indigo-dye"
                            }`}
                    >
                        {item.label}
                    </div>
                </div>
            ))}
        </div>
    );
};

export const LessonListMobile: React.FC = () => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
    const iconRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            console.log("Main component resize detected");
            setShowDropdown(false);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useWindowSize();

    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const lessons = useStateValue(
        state => state.courseInfo[selectedCourseId || '']?.lessons || [],
        selectedCourseId
    );

    return (
        <div className="mr-3 mb-5">
            <div className="text-[32px] font-bold">
                Lessons
            </div>
            {lessons.map((lesson) => {
                return (
                    <div key={lesson.id} className="mt-5 flex flex-row w-full">
                        <div className="w-full flex flex-row justify-between min-w-0 bg-alice-blue border-indigo-dye border-solid border-[1px] shadow-[0_4px_0_var(--indigo-dye)] rounded-lg p-2 transition-all duration-200 active:translate-y-1 active:shadow-none" onClick={() => console.log("hello")}>
                            <div className="flex flex-col justify-between flex-1 min-w-0">
                                <div className="w-full overflow-hidden">
                                    <div className="truncate">
                                        {lesson.name}
                                    </div>
                                </div>
                                <div className="truncate text-[12px]">
                                    Last used: {lesson.updated_at}
                                </div>
                            </div>
                            <div 
                                ref={iconRef}
                                className="p-2 rounded-lg ml-2"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setDropdownPosition({ 
                                        x: rect.right, 
                                        y: rect.top 
                                    });
                                    setShowDropdown(!showDropdown);
                                }}
                            >
                                <Icon name="gear" scale={16} />
                            </div>
                        </div>
                    </div>
                );
            })}
            {showDropdown && (
                <LessonDropdown 
                    onClose={() => setShowDropdown(false)} 
                    iconRef={iconRef}
                    position={dropdownPosition}
                    screenHeight={window.innerHeight}
                />
            )}
        </div>
    );
};

export default LessonListMobile;
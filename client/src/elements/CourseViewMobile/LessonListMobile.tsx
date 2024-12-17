import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lesson, ModalSelector, useSetStateValue, useStateValue, WorkPage } from '../../state/state';
import { Icon } from '../Icon/Icon';
import { useWindowSize } from '../../utils/globals';
import { LessonEditModal } from '../LessonEditModal/LessonEditModal';
import { useHandleNewPractice, useHandleDeleteLesson } from '../../utils/requests';

interface LessonDropdownProps {
    onClose: () => void;
    iconRef: React.RefObject<HTMLDivElement>;
    position: { x: number; y: number };
    screenHeight: number;
    lesson: Lesson;
    onEdit: (lesson: Lesson) => void;
    onDelete: (lesson: Lesson) => void;
}

const LessonDropdown: React.FC<LessonDropdownProps> = ({ onClose, iconRef, position, screenHeight, lesson, onEdit, onDelete }) => {
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
                    onDelete(lesson);
                    onClose();
                }},
                { label: "Edit", onClick: () => {
                    onEdit(lesson);
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

export const UnifiedListMobile: React.FC<{
    filterFn: (lesson: Lesson) => boolean;
    title: string;
    newTitle: string;
    onNew: () => void;
    onEdit: (lesson: Lesson) => void;
    onDelete: (lesson: Lesson) => void;
}> = ({ filterFn, title, newTitle, onNew, onEdit, onDelete }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const iconRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            console.log("Main component resize detected");
            setSelectedLesson(null);
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

    const filtered = useMemo(() => {
        return lessons.filter(filterFn).sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    }, [lessons, filterFn]);

    return (
        <div className="mr-3 mb-5">
            <div className="text-[28px] font-bold">
                {"Lessons"}
            </div>
            <div className="mt-5 rounded-lg w-fit bg-coral text-baby-powder  border-indigo-dye border-solid border-[1px] shadow-[0_4px_0_var(--indigo-dye)] p-2 transition-all duration-200 active:translate-y-1 active:shadow-none" onClick={onNew}>
                + {newTitle}
            </div>
            {filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).map((lesson) => {
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
                                    setSelectedLesson(selectedLesson?.id === lesson.id ? null : lesson);
                                }}
                            >
                                <Icon name="gear" scale={16} />
                            </div>
                        </div>
                    </div>
                );
            })}
            {selectedLesson && (
                <LessonDropdown 
                    onClose={() => setSelectedLesson(null)} 
                    iconRef={iconRef}
                    position={dropdownPosition}
                    screenHeight={window.innerHeight}
                    lesson={selectedLesson}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            )}
        </div>
    );
};

export const LessonListMobile = () => {
    const setState = useSetStateValue();
    const modalSelector = useStateValue(state => state.modalSelector);
    const [lessonToEdit, setLessonToEdit] = useState<Lesson | null>(null);

    const handleDeleteLesson = useHandleDeleteLesson();

    const title = "Lessons";
    const newTitle = "New Lesson";
    const filterFn = (lesson: Lesson) => !lesson.free_practice;
    const onNew = () => {
        setState(draft => { draft.modalSelector = ModalSelector.NewLesson })
    };
    const onEdit = (lesson: Lesson) => {
        setState(draft => { draft.modalSelector = ModalSelector.NewLesson; setLessonToEdit(lesson) })
    };
    const onDelete = (lesson: Lesson) => {
        handleDeleteLesson(lesson);
    };

    return <div>
        {modalSelector === ModalSelector.NewLesson && lessonToEdit && <LessonEditModal lesson={lessonToEdit} />}
        <UnifiedListMobile filterFn={filterFn} title={title} newTitle={newTitle} onNew={onNew} onEdit={onEdit} onDelete={onDelete} />;
    </div>
};

export const PracticeListMobile = () => {
    const setState = useSetStateValue();
    const modalSelector = useStateValue(state => state.modalSelector);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const jwt = useStateValue(state => state.auth.token);
    const [lessonToEdit, setLessonToEdit] = useState<Lesson | null>(null);

    const handleNewPractice = useHandleNewPractice();
    const handleDeletePractice = useHandleDeleteLesson();

    const filterFn = (lesson: Lesson) => lesson.free_practice;
    const title = "Practice";
    const newTitle = "New Practice";
    const onNew = handleNewPractice;
    const onEdit = (lesson: Lesson) => {
        setState(draft => { draft.modalSelector = ModalSelector.NewLesson; setLessonToEdit(lesson) })
    };
    const onDelete = (lesson: Lesson) => {
        handleDeletePractice(lesson);
    };

    return <div>
        {modalSelector === ModalSelector.NewLesson && lessonToEdit && <LessonEditModal lesson={lessonToEdit} />}
        <UnifiedListMobile filterFn={filterFn} title={title} newTitle={newTitle} onNew={onNew} onEdit={onEdit} onDelete={onDelete} />;
    </div>
};

export default LessonListMobile;
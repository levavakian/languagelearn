import React, { useCallback } from 'react';
import { ShowMobileModal, ShowModal } from "../Modal/Modal";
import { smallScreen, useWindowSize } from "../../utils/globals";
import { useSetStateValue, ModalSelector, useStateValue, WorkPage } from '../../state/state';
import { useState } from 'react';
import { Icon } from "../Icon/Icon";
import toast from 'react-hot-toast';

export const NewCourseModal = () => {
    const setState = useSetStateValue();
    const [title, setTitle] = useState('');
    const [language, setLanguage] = useState('');
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateCourse = useCallback(async (name: string, language: string) => {
        try {
            setIsCreating(true);
            const response = await fetch('/api/course/default', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    target_language: language,
                    name: name
                })
            });
            
            if (response.status === 401) {
                onRequestError("There was an error creating your course. Please try again.");
                return;
            }
            
            const newCourse = await response.json();

            setState(draft => {
                draft.courses.push(newCourse.course);
                draft.modalSelector = ModalSelector.None;
                draft.pageChoice.workPage = WorkPage.Course;
                draft.pageChoice.selectedCourse = newCourse.course.id;
            });
        } catch (error) {
            console.error('Error creating course:', error);
        }
    }, [jwt, onRequestError, setState]);

    useWindowSize();
    if (smallScreen()) {
        const renderButtons = () => {
            const textSize = "16px";
            const basePadding = "14px";
            const basePaddingLarge = "18px";
            
            return (
                <div className="flex ml-2 justify-end gap-4 mt-8">
                    <button 
                        style={{ paddingLeft: basePaddingLarge, paddingRight: basePaddingLarge }}
                        className={`py-3 bg-alice-blue text-[${textSize}] hover:bg-alice-blue border-solid border-[1px] border-indigo-dye text-indigo-dye rounded-xl font-nobel shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-105 active:shadow-none active:translate-y-1 transition-all duration-100`}
                        onClick={() => setState(draft => draft.modalSelector = ModalSelector.None)}
                    >
                        Cancel
                    </button>
                    <button 
                        style={{ paddingLeft: basePadding, paddingRight: basePadding }}
                        className={`py-3 bg-coral hover:bg-coral border-solid border-[1px] border-indigo-dye text-baby-powder rounded-xl font-nobel text-[${textSize}] shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-125 active:shadow-none active:translate-y-1 transition-all duration-100 flex items-center gap-3 ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => {
                            if (isCreating) return;
                            if (!language) {
                                toast.error("Please enter a language");
                                return;
                            }
            
                            let tmpTitle = title.trim()
                            if (!title) {
                                tmpTitle = language.trim() + " Course";
                            }
    
                            handleCreateCourse(tmpTitle, language);
                        }}
                        disabled={isCreating}
                    >
                        Create Course
                    </button>
                </div>
            );
        };

        return ShowMobileModal(
            ModalSelector.NewCourse,
            <div className="h-full flex flex-col">
                <div className="text-[40px] font-bold text-nowrap">New Course</div>
                <div className="bg-white border-[2px] border-[--indigo-dye] rounded-xl border-solid shadow-[0_4px_0_var(--indigo-dye)] p-4 mt-4">
                <div className="mb-2">
                    <div className="text-[16px] font-semibold text-indigo-dye">Course Name</div>
                    <input 
                        type="text" 
                        id="course-title" 
                        className="box-border font-regular text-indigo-dye text-[14px] w-full border border-gray-200 rounded-lg p-2 text-gray-400 focus:outline-none" 
                        placeholder="What should your course be called?"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <div>
                    <div className="text-[16px] font-semibold text-indigo-dye">Language</div>
                    <input 
                        type="text" 
                        id="course-language" 
                        className="box-border font-regular text-indigo-dye text-[14px] w-full border border-gray-200 rounded-lg p-2 text-gray-400 focus:outline-none" 
                        placeholder="What language do you want to learn?"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    />
                    </div>
                </div>
                <div className="flex-1"></div>
                {renderButtons()}
                <div className="pb-5" />
            </div>,
            (iconPressed: boolean) => {return true}
        );
    }

    return ShowModal(
        ModalSelector.NewCourse,
        <div>
            <div>
                <h1 className="text-[40px] font-bold text-nowrap">New Course</h1>
            <div className="bg-white border-[2px] border-[--indigo-dye] rounded-xl border-solid min-w-[600px] shadow-[0_4px_0_var(--indigo-dye)] p-4 mt-4">
                <div className="mb-2">
                    <input 
                        type="text" 
                        id="course-title" 
                        className="box-border font-semibold text-indigo-dye text-[20px] w-full border border-gray-200 rounded-lg p-2 text-gray-400 focus:outline-none" 
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <div>
                    <input 
                        type="text" 
                        id="course-language" 
                        className="box-border font-regular text-indigo-dye text-[20px] w-full border border-gray-200 rounded-lg p-2 text-gray-400 focus:outline-none" 
                        placeholder="What language do you want to learn?"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex justify-evenly mt-8">
                <div className="cursor-pointer rounded-xl flex border-2 font-semibold text-[26px] border-solid border-[--indigo-dye] bg-[--alice-blue] text-[--indigo-dye] rounded-xl min-w-[150px] mx-6 py-2 items-center justify-center shadow-[0_4px_0_var(--indigo-dye)] transition-all hover:brightness-95 active:translate-y-1 active:shadow-[0_0px_0_var(--indigo-dye)]"
                    onClick={() => setState(draft => { draft.modalSelector = ModalSelector.None })}
                >
                    Cancel
                </div>
                <div className={`px-5 rounded-xl cursor-pointer flex border-2 font-semibold text-[26px] border-solid border-[--indigo-dye] bg-[--coral] text-[--baby-powder] rounded-xl min-w-[150px] mx-6 py-2 items-center justify-center shadow-[0_4px_0_var(--indigo-dye)] transition-all hover:brightness-95 active:translate-y-1 active:shadow-[0_0px_0_var(--indigo-dye)] ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => {
                        if (isCreating) return;
                        if (!language) {
                            toast.error("Please enter a language");
                            return;
                        }
        
                        let tmpTitle = title.trim()
                        if (!title) {
                            tmpTitle = language.trim() + " Course";
                        }

                        handleCreateCourse(tmpTitle, language);
                    }}
                >
                    {isCreating ? 'Creating...' : 'Create Course'}
                </div>
            </div>
            </div>
        </div>,
        (iconPressed: boolean) => {return true}
    );
}
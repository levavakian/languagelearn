import React, { useCallback } from 'react';
import { ShowModal } from '../Modal/Modal';
import { useSetStateValue, ModalSelector, useStateValue, WorkPage } from '../../state/state';
import { useState } from 'react';
import toast from 'react-hot-toast';

export const NewCourseModal = () => {
    const setState = useSetStateValue();
    const [title, setTitle] = useState('');
    const [language, setLanguage] = useState('');
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);

    const handleCreateCourse = useCallback(async (name: string, language: string) => {
        try {
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
                <div className="px-5 rounded-xl cursor-pointer flex border-2 font-semibold text-[26px] border-solid border-[--indigo-dye] bg-[--coral] text-[--baby-powder] rounded-xl min-w-[150px] mx-6 py-2 items-center justify-center shadow-[0_4px_0_var(--indigo-dye)] transition-all hover:brightness-95 active:translate-y-1 active:shadow-[0_0px_0_var(--indigo-dye)]"
                    onClick={() => {
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
                    Create Course
                </div>
            </div>
            </div>
        </div>,
        (iconPressed: boolean) => {return true}
    );
}
import React, { useCallback } from 'react';
import { ShowModal } from '../Modal/Modal';
import { useSetStateValue, ModalSelector, useStateValue, WorkPage } from '../../state/state';
import { useState } from 'react';
import toast from 'react-hot-toast';

export const NewLessonModal = () => {
    return ShowModal(
        ModalSelector.NewLesson,
        <div className="max-w-6xl mx-auto p-6 my-auto">
            <div className="flex gap-8">
                {/* Left Column */}
                <div className="w-2/3 pr-8 flex flex-col relative">
                    <h2 className="text-3xl font-bold mb-4">New Lesson</h2>
                    <div className="absolute right-0 top-[10%] h-[80%] w-[1px] bg-gray-200"></div>

                    <div className="bg-white border-solid border-[1px] border-indigo-dye rounded-xl border p-6 shadow-sm flex flex-col flex-grow overflow-auto">
                        <input 
                        className="w-[90%] px-3 py-2 border text-indigo-dye font-semibold rounded-lg text-[20px] font-nobel focus:outline-none"
                        placeholder="Title"
                        type="text"
                        />

                        <textarea 
                        className="w-[90%] p-3 border rounded-lg min-w-[500px] text-[20px] text-indigo-dye resize-none font-nobel mt-4 flex-1 focus:outline-none"
                        placeholder="Fill out or generate the lesson plan for today"
                        />
                    </div>
                </div>

                {/* Right Column */}
                <div className="w-1/3 flex flex-col h-full">
                <div className="flex-grow">
                    <h3 className="font-semibold text-[20px] font-nobel focus:outline-none mb-3">Customise plan with focus areas</h3>
                    <textarea 
                    className="w-[90%] p-3 border rounded-xl min-h-[200px] min-w-[300px] resize-none text-[20px] text-indigo-dye font-nobel focus:outline-none"
                    placeholder="What topics or focus areas would you like the lesson to focus on?"
                    />
                </div>

                <div className="space-y-6">
                    <div>
                    <h3 className="font-semibold mb-3">Learning Style</h3>
                    <div className="flex gap-2">
                        <button className="px-4 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700">
                        Neural
                        </button>
                        <button className="px-4 py-1 rounded-md bg-orange-50 border border-orange-200 text-orange-700">
                        Conversational
                        </button>
                        <button className="px-4 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-700">
                        Practice-based
                        </button>
                    </div>
                    </div>

                    <div>
                    <h3 className="font-semibold mb-3">Instructor Style</h3>
                    <select className="w-48 px-3 py-2 border rounded-md bg-white text-gray-700">
                    <option>Select a Lesson Template</option>
                    </select>
                    </div>

                    <div className="flex gap-3">
                    <button className="flex-1 px-4 py-2 border rounded-md bg-white hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button className="flex-1 px-4 py-2 bg-orange-400 text-white rounded-md hover:bg-orange-500 transition-colors flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        Start Lesson
                    </button>
                    </div>
                </div>
                </div>
            </div>
            </div>,
        (iconPressed: boolean) => true
    );
}
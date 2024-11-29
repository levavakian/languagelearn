import React, { ChangeEvent, useCallback, useEffect } from 'react';
import { ShowModal } from '../Modal/Modal';
import { useSetStateValue, PreferredInstructorStyle, ModalSelector, useStateValue, WorkPage, LessonPlan } from '../../state/state';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Icon } from '../Icon/Icon';
import { useQuery } from '@tanstack/react-query'

export const NewLessonModal = () => {
    const setState = useSetStateValue();
    const preferredInstructorStyle = useStateValue(state => state.preferredInstructorStyle);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const lessons = useStateValue(state => state.currentCourse.lessons);

    const [title, setTitle] = useState('');
    const [lessonPlanText, setLessonPlanText] = useState('');
    const [focusAreas, setFocusAreas] = useState('');
    const [generating, isGenerating] = useState(false);

    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);

    const onLessonPick = useCallback((lessonPlans: LessonPlan[], chosen: string) => {
        if (!chosen) {
            return;
        }

        const selectedLessonPlan = lessonPlans.find(plan => plan.id === chosen);
        if (selectedLessonPlan) {
            setLessonPlanText(selectedLessonPlan.content);
            setTitle(selectedLessonPlan.title);
        } else {
            toast.error("Selected lesson plan not found");
            return;
        }
        setLessonPlanText(selectedLessonPlan.content);
        setTitle(selectedLessonPlan.title);
    }, []);

    useEffect(() => {
        if (generating) {
            document.body.style.cursor = 'wait';
        } else {
            document.body.style.cursor = 'default';
        }

        // Cleanup function to reset cursor when component unmounts or generating state changes
        return () => {
            document.body.style.cursor = 'default';
        };
    }, [generating]);

    const onLessonGenerate = useCallback(async () => {
        isGenerating(true);
        const response = await fetch(`/api/lesson/generate-next-plan`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                lesson_ids: Array.from(lessons.map(lesson => lesson.id)),
                prompt: focusAreas,
                course_id: selectedCourseId,
            })
        });
        isGenerating(false);

        if (!response.ok) {
            onRequestError(response, "Failed to generate lesson plan", "generate-new-lesson-modal");
            return;
        }

        const data = await response.json();
        setTitle(data.title);
        setLessonPlanText(data.plan);
    }, [selectedCourseId, jwt, onRequestError, lessons, focusAreas]);

    const fetchLessonPlans = useCallback(async () => {
        const response = await fetch(`/api/course/${selectedCourseId}/lesson-plans`, {
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        })

        if (!response.ok) {
            onRequestError(response, "Failed to fetch lesson plans", "lesson-plans-new-lesson-modal");
            throw new Error("Failed to fetch lesson plans");
            return;
        }

        return response.json();
    }, [selectedCourseId, jwt, onRequestError]);

    const onStartLesson = useCallback(async () => {
        isGenerating(true);
        const response = await fetch(`/api/course/${selectedCourseId}/lesson`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                lesson_plan_content: lessonPlanText,
            })
        });
        isGenerating(false);
        
        if (!response.ok) {
            onRequestError(response, "Failed to start lesson", "new-lesson-modal-create");
            return;
        }

        const newLesson = await response.json();
        setState(drift => {
            drift.pageChoice.workPage = WorkPage.Chat;
            drift.pageChoice.selectedLesson = newLesson.id;
            drift.modalSelector = ModalSelector.None;
        });
    }, [jwt, selectedCourseId, onRequestError, title, lessonPlanText, setState]);

    const {isPending: isPendingLessonPlans, error: errorLessonPlans, data: dataLessonPlans} = useQuery({
        queryKey: ['lesson-plans-new-lesson-modal'],
        queryFn: fetchLessonPlans
    })

    return ShowModal(
        ModalSelector.NewLesson,
        <div className="max-w-6xl mx-auto p-6 my-auto">
            <div className="flex flex-col gap-8">
                <div className="flex gap-8">
                    {/* Left Column */}
                    <div className="w-2/3 pr-8 flex flex-col relative">
                        <h2 className="text-3xl font-bold mb-4">New Lesson</h2>
                        <div className="absolute right-0 top-[10%] h-[80%] w-[1px] bg-gray-200"></div>

                        <div className="bg-white border-solid border-[2px] border-indigo-dye rounded-xl border p-6 shadow-[0_4px_0_0_var(--indigo-dye)] flex flex-col flex-grow overflow-auto">
                            <input 
                            className="w-[90%] px-3 py-2 border-solid text-indigo-dye font-semibold rounded-lg text-[20px] font-nobel focus:outline-none"
                            placeholder="Title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            />

                            <textarea 
                            className="w-[90%] p-3 border-solid rounded-lg min-w-[500px] text-[20px] text-indigo-dye resize-none font-nobel mt-4 flex-1 focus:outline-none"
                            placeholder="Fill out or generate the lesson plan for today"
                            value={lessonPlanText}
                            onChange={(e) => setLessonPlanText(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="w-1/3 flex flex-col h-full">
                    <div className="flex-grow">
                        <h3 className="font-semibold text-[20px] font-nobel focus:outline-none mb-3">Customise plan with focus areas</h3>
                        <textarea 
                        className="w-[90%] p-3 border-solid rounded-xl min-h-[200px] min-w-[300px] resize-none text-[20px] text-indigo-dye font-nobel focus:outline-none"
                        placeholder="What topics or focus areas would you like the lesson to focus on?"
                        value={focusAreas}
                        onChange={(e) => setFocusAreas(e.target.value)}
                        />
                    </div>

                    <div className="space-y-6">
                        <div>
                        <h3 className="font-semibold mb-3">Learning Style</h3>
                        <div className="flex gap-4">
                            <div className={`px-6 py-1 border-solid border border-gray-400 rounded-lg font-nobel text-[16px] hover:brightness-105 transition-all duration-300 cursor-pointer ${preferredInstructorStyle === PreferredInstructorStyle.Strict ? 'bg-coral text-baby-powder' : 'bg-alice-blue text-indigo-dye'}`}
                                onClick={() => {
                                    setState(drift => drift.preferredInstructorStyle = PreferredInstructorStyle.Strict );
                                }}
                            >
                                Strict
                            </div>
                            <div className={`px-6 py-1 border-solid border border-gray-400 rounded-lg font-nobel text-[16px] hover:brightness-105 transition-all duration-300 cursor-pointer ${preferredInstructorStyle === PreferredInstructorStyle.Neutral ? 'bg-coral text-baby-powder' : 'bg-alice-blue text-indigo-dye'}`}
                                onClick={() => {
                                    setState(drift => drift.preferredInstructorStyle = PreferredInstructorStyle.Neutral );
                                }}
                            >
                                Neutral
                            </div>
                            <div className={`px-6 py-1 border-solid border border-gray-400 rounded-lg font-nobel text-[16px] hover:brightness-105 transition-all duration-300 cursor-pointer ${preferredInstructorStyle === PreferredInstructorStyle.Casual ? 'bg-coral text-baby-powder' : 'bg-alice-blue text-indigo-dye'}`}
                                onClick={() => {
                                    setState(drift => drift.preferredInstructorStyle = PreferredInstructorStyle.Casual );
                                }}
                            >
                                Casual
                            </div>
                        </div>
                        </div>
                        <div className="bg-indigo-dye rounded-xl w-fit p-3 px-5 flex flex-row cursor-pointer hover:brightness-125 transition-all duration-300" onClick={onLessonGenerate}>
                            <div className="text-baby-powder font-semibold text-[18px]">
                                Generate Plan
                            </div>
                            <Icon name="shuttle" scale={18} style={{ marginBottom: '-4px', filter: 'invert(100%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(125%) contrast(100%)', marginLeft: '15px' }} />
                        </div>
                        <div>
                            Or
                        </div>
                        <div>
                        <select className="w-full px-3 py-2 border-solid text-indigo-dye text-ellipsis font-semibold rounded-3xl bg-baby-powder text-indigo-dye font-nobel text-[16px]"
                            onChange={(event: ChangeEvent<HTMLSelectElement>) => {onLessonPick(dataLessonPlans, event.target.value)}}>
                            <option value="">Fill Plan from Lesson Template</option>
                            {!isPendingLessonPlans && !errorLessonPlans && dataLessonPlans.map((lessonPlan: LessonPlan) => (
                                <option key={lessonPlan.id} value={lessonPlan.id}>{lessonPlan.title}</option>
                            ))}
                        </select>
                        </div>
                    </div>
                    </div>
                </div>
                
                {/* New buttons row */}
                <div className="flex justify-end gap-4 mt-4">
                    <button 
                        className="px-20 py-3 bg-alice-blue hover:bg-alice-blue border-solid border-[1px] border-indigo-dye text-indigo-dye rounded-xl font-nobel text-[26px] shadow-[0_4px_0_0_#1B365D] hover:brightness-105 active:shadow-none active:translate-y-1 transition-all duration-100"
                        onClick={() => setState(drift => drift.modalSelector = ModalSelector.None)}
                    >
                        Cancel
                    </button>
                    <button 
                        className="px-8 py-3 bg-coral hover:bg-coral border-solid border-[1px] border-indigo-dye text-baby-powder rounded-xl font-nobel text-[26px] shadow-[0_4px_0_0_#1B365D] hover:brightness-125 active:shadow-none active:translate-y-1 transition-all duration-100 flex items-center gap-3"
                        onClick={onStartLesson}
                    >
                        Start Lesson
                        <Icon name="next" scale={22} style={{ marginBottom: '-3px', filter: 'invert(100%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(125%) contrast(100%)' }} />
                    </button>
                </div>
            </div>
        </div>,
        (iconPressed: boolean) => true
    );
}
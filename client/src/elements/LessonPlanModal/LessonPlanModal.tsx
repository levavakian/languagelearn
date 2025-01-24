import React, { ChangeEvent, useCallback, useEffect } from 'react';
import { ShowMobileModal, ShowModal } from '../Modal/Modal';
import { useSetStateValue, ModalSelector, useStateValue, LessonPlan } from '../../state/state';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Icon } from '../Icon/Icon';
import { useQuery } from '@tanstack/react-query'
import { smallScreen, useWindowSize } from '../../utils/globals';

export const LessonPlanModal = ({lessonTemplateExisting}: {lessonTemplateExisting: LessonPlan | null}) => {
    const setState = useSetStateValue();
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const lessons = useStateValue(state => state.currentCourse.lessons);

    const [title, setTitle] = useState(lessonTemplateExisting?.title || '');
    const [lessonPlanText, setLessonPlanText] = useState(lessonTemplateExisting?.content || '');
    const [focusAreas, setFocusAreas] = useState('');
    const [generating, isGenerating] = useState(false);
    const [genPage, setGenPage] = useState(false);

    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);

    useWindowSize();

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
        setGenPage(false);
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
        }

        return response.json();
    }, [selectedCourseId, jwt, onRequestError]);

    const onCreateLessonTemplate = useCallback(async () => {
        isGenerating(true);

        const uri = lessonTemplateExisting ? `/api/course/${selectedCourseId}/lesson-plan/${lessonTemplateExisting.id}` : `/api/course/${selectedCourseId}/lesson-plan`;
        const method = lessonTemplateExisting ? 'PUT' : 'POST';
        const response = await fetch(uri, {
            method: method,
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                content: lessonPlanText,
            })
        });
        isGenerating(false);
        
        if (!response.ok) {
            onRequestError(response, "Failed to create lesson template", "lesson-template-modal-create");
            return;
        }

        setState(drift => {
            drift.modalSelector = ModalSelector.None;
        });
    }, [jwt, selectedCourseId, onRequestError, title, lessonPlanText, setState, lessonTemplateExisting]);

    const {isPending: isPendingLessonPlans, error: errorLessonPlans, data: dataLessonPlans} = useQuery({
        queryKey: ['lesson-plans-lesson-plan-modal'],
        queryFn: fetchLessonPlans
    })

    if (smallScreen()) {
        const renderButtons = () => {
            const textSize = smallScreen() ? "16px" : "26px";
            const iconSize = smallScreen() ? 18 : 22;
            const basePadding = smallScreen() ? "14px" : "16px";
            const basePaddingLarge = smallScreen() ? "18px" : "20px";
            
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
                        className={`py-3 bg-coral hover:bg-coral border-solid border-[1px] border-indigo-dye text-baby-powder rounded-xl font-nobel text-[${textSize}] shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-125 active:shadow-none active:translate-y-1 transition-all duration-100 flex items-center gap-3`}
                        onClick={onCreateLessonTemplate}
                    >
                        {lessonTemplateExisting ? 'Update' : 'Create'}
                        <Icon name="next" scale={iconSize} style={{ marginBottom: '-3px', filter: 'invert(100%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(125%) contrast(100%)' }} />
                    </button>
                </div>
            );
        };

        const renderGenButtons = () => {
            const textSize = smallScreen() ? "16px" : "26px";
            const iconSize = smallScreen() ? 18 : 22;
            const basePadding = smallScreen() ? "14px" : "16px";
            const basePaddingLarge = smallScreen() ? "18px" : "20px";
            
            return (
                <div className="flex ml-2 justify-end gap-4 mt-8">
                    <button 
                        style={{ paddingLeft: basePaddingLarge, paddingRight: basePaddingLarge }}
                        className={`py-3 bg-alice-blue text-[${textSize}] hover:bg-alice-blue border-solid border-[1px] border-indigo-dye text-indigo-dye rounded-xl font-nobel shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-105 active:shadow-none active:translate-y-1 transition-all duration-100`}
                        onClick={() => setGenPage(false)}
                    >
                        Back
                    </button>
                    <div className={`rounded-xl w-fit p-3 px-5 flex flex-row ${
                        generating 
                            ? 'bg-gray-300 cursor-not-allowed' 
                            : 'bg-indigo-dye cursor-pointer hover:brightness-125'
                    } transition-all duration-300`} onClick={onLessonGenerate}>
                        <div className="text-baby-powder font-semibold text-[18px]">
                            {generating ? "Generating..." : "Generate Plan"}
                        </div>
                        <Icon name="shuttle" scale={18} style={{ marginBottom: '-4px', filter: 'invert(100%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(125%) contrast(100%)', marginLeft: '15px' }} />
                    </div>
                </div>
            );
        };

        const renderMain = () => {
            return <div className="flex flex-col grow">
                <div className="flex-0 text-[32px] font-bold overflow-hidden whitespace-nowrap text-ellipsis max-w-[80%] text-indigo-dye font-nobel p-0" title="New Lesson">
                    New Lesson
                </div>
                <input 
                className="w-[95%] flex-0 mt-4 px-3 py-2 border-solid text-indigo-dye font-semibold rounded-lg text-[20px] font-nobel focus:outline-none"
                placeholder="Title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                />
                <textarea 
                className="w-[95%] flex-1 grow p-3 border-solid rounded-lg text-[20px] text-indigo-dye resize-none font-nobel mt-4 flex-1 focus:outline-none"
                placeholder="Fill out or generate the lesson plan for today"
                value={lessonPlanText}
                onChange={(e) => setLessonPlanText(e.target.value)}
                />
                <div className="mt-4 bg-indigo-dye rounded-xl w-fit p-3 px-5 flex flex-row cursor-pointer hover:brightness-125 transition-all duration-300" onClick={() => setGenPage(true)}>
                    <div className="text-baby-powder font-semibold text-[18px]">
                        Generate Plan
                    </div>
                    <Icon name="shuttle" scale={18} style={{ marginBottom: '-4px', filter: 'invert(100%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(125%) contrast(100%)', marginLeft: '15px' }} />
                </div>
                <div className="mt-4">Or</div>
                <select className="w-full mt-4 flex-0 px-3 py-2 border-solid text-indigo-dye text-ellipsis font-semibold rounded-3xl bg-baby-powder text-indigo-dye font-nobel text-[16px]"
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => {onLessonPick(dataLessonPlans, event.target.value)}}
                    disabled={isPendingLessonPlans}>
                    <option value="">
                        {isPendingLessonPlans 
                            ? "Loading templates..." 
                            : errorLessonPlans 
                                ? "Error loading templates" 
                                : "Fill Plan from Lesson Template"}
                    </option>
                    {dataLessonPlans?.map((lessonPlan: LessonPlan) => (
                        <option key={lessonPlan.id} value={lessonPlan.id}>{lessonPlan.title}</option>
                    ))}
                </select>
                {renderButtons()}
                <div className="pb-5" />
            </div>
        }

        const renderGen = () => {
            return <div className="flex flex-col grow">
                <textarea 
                className="w-[95%] flex-1 grow p-3 border-solid rounded-lg text-[20px] text-indigo-dye resize-none font-nobel mt-4 flex-1 focus:outline-none"
                placeholder="What topics or focus areas would you like the lesson to focus on? (optional)"
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                />
                {renderGenButtons()}
                <div className="pb-5" />
            </div>
        }

        return ShowMobileModal(
            ModalSelector.LessonPlan,
            genPage ? renderGen() : renderMain(),
            (iconPressed: boolean) => true
        );
    }

    return ShowModal(
        ModalSelector.LessonPlan,
        <div className="max-w-6xl mx-auto p-6 my-auto">
            <div className="flex flex-col gap-8">
                <div className="flex gap-8">
                    {/* Left Column */}
                    <div className="w-2/3 pr-8 flex flex-col relative">
                        <h2 className="text-3xl font-bold mb-4">{lessonTemplateExisting ? 'Edit Lesson Template' : 'New Lesson Template'}</h2>
                        <div className="absolute right-0 top-[10%] h-[80%] w-[1px] bg-gray-200"></div>

                        <div className="bg-white border-solid border-[2px] border-indigo-dye rounded-xl border p-6 shadow-[0_4px_0_0_var(--indigo-dye)] flex flex-col flex-grow overflow-auto">
                            <input 
                            className="w-[94%] px-3 py-2 border-solid text-indigo-dye font-semibold rounded-lg text-[20px] font-nobel focus:outline-none"
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
                        <div 
                            className="text-coral cursor-pointer mt-4 text-sm hover:brightness-75 transition-all"
                            onClick={async () => {
                                if (window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
                                    const response = await fetch(`/api/course/${selectedCourseId}/lesson-plan/${lessonTemplateExisting?.id}`, {
                                        method: 'DELETE',
                                        headers: {
                                            'Authorization': `Bearer ${jwt}`
                                        }
                                    });

                                    if (!response.ok) {
                                        onRequestError(response, "Failed to delete lesson template", "lesson-template-modal-delete");
                                        return;
                                    }

                                    setState(draft => {
                                        draft.modalSelector = ModalSelector.None;
                                    });
                                }
                            }}
                        >
                            Delete Template
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
                        <div className="bg-indigo-dye mt-4 rounded-xl w-fit p-3 px-5 flex flex-row cursor-pointer hover:brightness-125 transition-all duration-300" onClick={onLessonGenerate}>
                            <Icon name="aicream" scale={18} style={{ marginBottom: '-4px', marginRight: '10px' }} />
                            <div className="text-baby-powder font-semibold text-[18px]">
                                Generate Plan
                            </div>
                        </div>
                        <div>
                            Or
                        </div>
                        <div>
                        <select className="w-full px-3 py-2 border-solid text-indigo-dye text-ellipsis font-semibold rounded-3xl bg-baby-powder text-indigo-dye font-nobel text-[16px]"
                            onChange={(event: ChangeEvent<HTMLSelectElement>) => {onLessonPick(dataLessonPlans, event.target.value)}}
                            disabled={isPendingLessonPlans}>
                            <option value="">
                                {isPendingLessonPlans 
                                    ? "Loading templates..." 
                                    : errorLessonPlans 
                                        ? "Error loading templates" 
                                        : "Fill Template from Existing Template"}
                            </option>
                            {dataLessonPlans?.map((lessonPlan: LessonPlan) => (
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
                        className="px-20 py-3 bg-alice-blue hover:bg-alice-blue border-solid border-[1px] border-indigo-dye text-indigo-dye rounded-xl font-nobel text-[26px] shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-105 active:shadow-none active:translate-y-1 transition-all duration-100"
                        onClick={() => setState(drift => drift.modalSelector = ModalSelector.None)}
                    >
                        Cancel
                    </button>
                    <button 
                        className="px-16 py-3 bg-coral hover:bg-coral border-solid border-[1px] border-indigo-dye text-baby-powder rounded-xl font-nobel text-[26px] shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-125 active:shadow-none active:translate-y-1 transition-all duration-100 flex items-center gap-3"
                        onClick={onCreateLessonTemplate}
                    >
                        {lessonTemplateExisting ? 'Update' : 'Create'}
                        <Icon name="next" scale={22} style={{ marginBottom: '-3px', filter: 'invert(100%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(125%) contrast(100%)' }} />
                    </button>
                </div>
            </div>
        </div>,
        (iconPressed: boolean) => true
    );
}
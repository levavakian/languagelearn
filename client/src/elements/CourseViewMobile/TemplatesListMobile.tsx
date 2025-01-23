import { useStateValue } from "../../state/state";

import { useState } from "react";
import { LessonPlan } from "../../state/state";
import { useSetStateValue, ModalSelector } from "../../state/state";
import { Icon } from "../Icon/Icon";
import { Dropdown } from "../../utils/Dropdown";
import { LessonPlanModal } from "../LessonPlanModal/LessonPlanModal";

export const TemplatesListMobile = () => {
    const [selectedLessonPlan, setSelectedLessonPlan] = useState<LessonPlan | null>(null);
    const [clickPos, setClickPos] = useState<{x: number, y: number} | null>(null);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const setState = useSetStateValue();
    const modalSelector = useStateValue(state => state.modalSelector);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const lessonPlans = useStateValue(
        state => state.courseInfo[selectedCourseId || '']?.lessonPlans || [],
        selectedCourseId
    );

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
            const response = await fetch(`/api/course/${selectedCourseId}/lesson-plan/${id}`, {
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
    }

    const renderPlans = (plan: LessonPlan) => {
        return (
            <div key={plan.id} className="mt-5 flex flex-row w-full">
                {clickPos && <Dropdown x={clickPos.x} y={clickPos.y} onClose={() => {
                    setClickPos(null);
                }}>
                    <div className="flex flex-col gap-[4px] z-10 bg-indigo-dye p-[1px] border-2 border-solid border-indigo-dye rounded-[8px]">
                        <div className="flex bg-alice-blue font-semibold rounded-[6px] p-1 flex-row gap-[6px]"
                            onClick={() => {
                                setSelectedLessonPlan(plan);
                                setState(draft => {
                                    draft.modalSelector = ModalSelector.LessonPlan;
                                });
                                setClickPos(null);
                            }}
                        >
                            <Icon name="pencil" scale={12} style={{ cursor: 'pointer', marginTop: '1px', marginLeft: '8px' }}/>
                            <div>Edit</div>
                        </div>
                        <div className="flex bg-alice-blue font-semibold text-warn-red rounded-[6px] p-1 flex-row gap-[6px]"
                            onClick={() => {
                                handleDelete(plan.id);
                                setClickPos(null);
                            }}
                        >
                            <Icon name="bin" scale={12} style={{ cursor: 'pointer', marginTop: '1px', marginLeft: '8px' }} />
                            <div>Delete</div>
                        </div>
                    </div>
                </Dropdown>}
                <div className="w-full flex flex-row justify-between items-center font-semibold min-w-0 bg-alice-blue border-indigo-dye border-solid border-[1px] shadow-[0_4px_0_var(--indigo-dye)] rounded-lg p-2 transition-all duration-200"
                    onClick={() => {
                        setSelectedLessonPlan(plan);
                        setState(draft => {
                            draft.modalSelector = ModalSelector.LessonPlan;
                        });
                        setClickPos(null);
                    }}
                >
                    <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div className="w-full overflow-hidden">
                            <div className="truncate">
                                {plan.title}
                            </div>
                        </div>
                    </div>
                    <div 
                        className="p-2 rounded-lg ml-2"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setClickPos({x: e.clientX, y: e.clientY});
                            setSelectedLessonPlan(selectedLessonPlan?.id === plan.id ? null : plan);
                        }}
                    >
                        <Icon name="gear" scale={16} />
                    </div>
                </div>
            </div>
        );
    }

    return <div className="flex flex-col">
        <div className="text-2xl font-semibold flex flex-row">
            Lesson Templates
        </div>
        <div className="mt-5 rounded-lg w-fit bg-coral text-baby-powder  border-indigo-dye border-solid border-[1px] shadow-[0_4px_0_var(--indigo-dye)] p-2 transition-all duration-200 active:translate-y-1 active:shadow-none"
            onClick={() => {setSelectedLessonPlan(null); setState(draft => {draft.modalSelector = ModalSelector.LessonPlan})}}>
            + New Template
        </div>
        {lessonPlans.map(renderPlans)}
        {modalSelector === ModalSelector.LessonPlan && <LessonPlanModal lessonTemplateExisting={selectedLessonPlan} />}
    </div>;
}
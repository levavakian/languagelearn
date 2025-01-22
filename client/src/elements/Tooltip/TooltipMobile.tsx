import { useCallback, useEffect, useState } from "react";
import { ModalSelector, useSetStateValue, useStateValue } from "../../state/state";
import { ShowMobileModal } from "../Modal/Modal";
import type { NoteNode } from '../../state/state';
import { useCourseInfo } from '../CourseViewMobile/courseHooks';
import { highlight } from "../../utils/display";
import { Icon } from "../Icon/Icon";
import { produce } from 'immer';

export const TooltipMobile = () => {
    const setState = useSetStateValue();
    useCourseInfo();
    const tooltipInfo = useStateValue(state => state.currentChat.tooltipInfo);
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const settings = useStateValue(
        state => state.courseInfo[selectedCourseId || '']?.settings || null,
        selectedCourseId
    );
    
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const onClose = useCallback((iconPressed: boolean) => {
        setState(draft => {
            draft.currentChat.tooltipInfo = null;
            draft.modalSelector = ModalSelector.None
        });
        return true;
    }, [setState]);

    useEffect(() => {
        if (!tooltipInfo) {
            onClose(false);
        }
    }, [tooltipInfo, settings, onClose]);

    const renderNotes = (notes: NoteNode[]) => {
        return notes.map((note) => {
            return <div>
                {note.type === 'note' ? (
                    <div className="bg-white border-1 border-solid border-indigo-dye text-[20px] font-medium rounded-xl flex-1 mt-[-3px] p-4" key={note.id}
                        onClick={() => {
                            tooltipInfo?.onSelect(note);
                            onClose(false);
                        }}
                    >
                        {highlight(note.name)}
                    </div>
                ) : null}
                {note.type === 'folder' ? (
                    <div className={`transition-all duration-300 ease-in-out flex flex-row justify-between border-1 border-solid border-indigo-dye text-[20px] font-medium rounded-xl flex-1 mt-[-3px] p-4 ${
                        expandedNodes.has(note.id) 
                            ? 'bg-coral text-baby-powder' 
                            : 'bg-alice-blue text-indigo-dye'
                    }`} key={note.id}
                        onClick={() => {
                            console.log('clicked', note.id);
                            setExpandedNodes(produce(draft => {
                                if (draft.has(note.id)) {
                                    draft.delete(note.id);
                                } else {
                                    draft.add(note.id);
                                }
                            }));
                        }}
                    >
                        {note.name}
                        <Icon scale={16} rotation={expandedNodes.has(note.id) ? -90 : 180} name="arrow" />
                    </div>
                ) : null}
                {note.children && expandedNodes.has(note.id) && <div className="flex flex-row">
                    <div className="ml-8 flex-0"></div>
                    <div className="flex flex-col rounded-lg flex-1">
                        {renderNotes(note.children)}
                    </div>
                </div>}
            </div>
        });
    }

    const renderTooltip = () => {
        if (!settings) {
            return <div>Loading...</div>;
        }

        return <div className="overflow-auto pb-2 flex flex-col mt-2 pt-2 rounded-lg p-[1px]">{renderNotes(settings.notes)}</div>;
    }

    return ShowMobileModal(
        ModalSelector.Tooltip,
        renderTooltip(),
        onClose
    );
}
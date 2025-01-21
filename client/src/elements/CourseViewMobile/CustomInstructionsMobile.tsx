import { useEffect, useState } from "react";
import { ModalSelector, State } from "../../state/state";

import { useStateValue, useSetStateValue } from "../../state/state";
import { Icon } from "../Icon/Icon";

export const CustomInstructionsMobile = () => {
    const setState = useSetStateValue();
    const [isEditing, setIsEditing] = useState(false);
    const [tempInstructions, setTempInstructions] = useState('');
    const modalSelector = useStateValue(state => state.modalSelector)
    const selectedCourseId = useStateValue(state => state.pageChoice.selectedCourse);
    const settings = useStateValue(
        state => state.courseInfo[selectedCourseId || '']?.settings || null,
        selectedCourseId
    );

    useEffect(() => {
        if (isEditing) {
            setState(draft => {
                draft.backspaceFn = (event: PopStateEvent) => {
                    if (modalSelector !== ModalSelector.None) {
                        setState(draft => { draft.modalSelector = ModalSelector.None });
                        window.history.replaceState(event.state, '', window.location.pathname);
                        return;
                    }

                    window.history.replaceState(event.state, '', window.location.pathname);
                    setIsEditing(false)
                    return;
                }
            });

            return () => {
                setState(draft => {
                    draft.backspaceFn = null;
                });
            }
        }
    }, [isEditing, setState, modalSelector]);

    return (
        <div className="mr-3 mb-5 flex flex-col flex-1 min-h-0">
          {/* Title stays at top */}
          <div className="text-2xl font-semibold mb- flex flex-row">
            Custom Instructions
            <div className="flex flex-row ml-5 gap-2">
                {!isEditing && <Icon name="pencil" scale={12} onClick={() => { setIsEditing(true); setTempInstructions(tempInstructions || settings?.customInstructions || ""); }}/>}
                {isEditing && <Icon name="x" scale={16} onClick={() => setIsEditing(false)}/>}
                {isEditing && <Icon name="check" scale={16} onClick={() => setIsEditing(false)}/>}
            </div>
          </div>
          
          {/* Content section takes remaining space but becomes scrollable if needed */}
          <div className="flex-1 flex flex-grow overflow-auto grow mt-5">
            {isEditing ? (
              <textarea 
                id="editor" 
                rows={8} 
                className="bg-transparent h-[70vh] p-0 text-nobel text-l text-indigo-dye text-normal outline-none border-none flex-1 w-full p-2 border rounded resize-none" 
                placeholder="Write an article..." 
                required 
                value={tempInstructions}
                onChange={(e) => setTempInstructions(e.target.value)}
              />
            ) : (
              <div className="flex-1 text-l text-normal">{settings?.customInstructions || ''}</div>
            )}
          </div>
        </div>
      );
};
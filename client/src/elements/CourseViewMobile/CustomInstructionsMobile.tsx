import { useEffect, useState } from "react";
import { ModalSelector, State } from "../../state/state";

import { useStateValue, useSetStateValue } from "../../state/state";
import { Icon } from "../Icon/Icon";

export const CustomInstructionsMobile = () => {
    const setState = useSetStateValue();
    const [isEditing, setIsEditing] = useState(false);
    const [tempInstructions, setTempInstructions] = useState('');
    const modalSelector = useStateValue(state => state.modalSelector)

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
        <div className="mr-3 mb-5">
            <div className="flex flex-row">
                <div className="text-[28px] font-bold">
                    {isEditing ? "Custom Instructions Editing" : "Custom Instructions"}
                </div>
                <div className="ml-4 mt-2.5" onClick={() => setIsEditing(true)}>
                    <Icon name="pencil" scale={14} />
                </div>
            </div>
        </div>
    );
};
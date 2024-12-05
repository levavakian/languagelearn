import { ModalSelector, AlwaysOnMode, useStateValue } from "../../state/state";
import { Icon } from "../Icon/Icon";
import { ShowModal } from "../Modal/Modal";
import { useSetStateValue } from "../../state/state";

export const LessonEditModal = () => {
    const setState = useSetStateValue();
    const alwaysOnMode = useStateValue(state => state.currentChat.chatOpts.alwaysOn);

    return ShowModal(
        ModalSelector.LessonEdit,
        <div>
            <div className="text-[32px] font-black font-nobel">Edit Lesson</div>
        </div>,
        () => { return true; },
    );
}
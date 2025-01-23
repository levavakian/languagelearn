import { ModalSelector, AlwaysOnMode, useStateValue } from "../../state/state";
import { Icon } from "../Icon/Icon";
import { ShowMobileModal, ShowModal } from "../Modal/Modal";
import { useSetStateValue } from "../../state/state";
import { smallScreen, useWindowSize } from "../../utils/globals";

export const AlwaysOnModal = () => {
    const setState = useSetStateValue();
    const alwaysOnMode = useStateValue(state => state.currentChat.chatOpts.alwaysOn);

    useWindowSize();

    if (smallScreen()) {
        return ShowMobileModal(
            ModalSelector.AlwaysOn,
            <div>
                <div className="text-[32px] font-black font-nobel">Voice Input Mode</div>
                <div className="text-[22px] max-w-[600px] mt-8 font-normal font-nobel">
                Hold <span className="px-2 py-1 bg-gray-200 rounded">⌥</span> (Option), <span className="px-2 py-1 bg-gray-200 rounded">Alt</span>, or press the microphone icon in the chatbar to speak with push to talk, or use Open Mic mode to converse freely.
                Just a heads up, Open Mic mode can drain credits quickly if left on.
                </div>
                <div className="flex flex-col justify-between items-right mt-8 max-w-[400px] gap-8">
                    <div className="ml-auto flex flex-row items-center gap-2">
                        <div className="text-[18px] font-bold font-nobel">Push to Talk</div>
                        <button className={`w-[70px] h-[70px] border-solid border-[1px] border-indigo-dye rounded-xl shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-105 active:shadow-none active:translate-y-[4px] transition-all duration-100 flex items-center justify-center ${
                            alwaysOnMode === AlwaysOnMode.Off ? 'bg-coral' : 'bg-alice-blue'
                        }`}
                        onClick={() => {
                            setState(draft => {
                                draft.currentChat.chatOpts.alwaysOn = AlwaysOnMode.Off;
                                draft.modalSelector = ModalSelector.None;
                            });
                        }}>
                            <Icon name={alwaysOnMode === AlwaysOnMode.Off ? 'micwhite' : 'mic'} scale={38} />
                        </button>
                    </div>
                    <div className="ml-auto flex flex-row items-center gap-2">
                        <div className="text-[18px] max-w-[300px] text-center font-bold font-nobel">Open Mic for 10 minutes</div>
                        <button className={`w-[70px] h-[70px] border-solid border-[1px] border-indigo-dye rounded-xl shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-105 active:shadow-none active:translate-y-[4px] transition-all duration-100 flex items-center justify-center ${
                            alwaysOnMode === AlwaysOnMode.Temp ? 'bg-coral' : 'bg-alice-blue'
                        }`}
                        onClick={() => {
                            setState(draft => {
                                draft.currentChat.chatOpts.alwaysOn = AlwaysOnMode.Temp;
                                draft.modalSelector = ModalSelector.None;
                            });
                        }}>
                            <Icon name={alwaysOnMode === AlwaysOnMode.Temp ? 'time10white' : 'time10'} scale={36} />
                        </button>
                    </div>
                    <div className="ml-auto flex flex-row items-center gap-2">
                        <div className="text-[18px] max-w-[300px] text-center font-bold font-nobel">Open Mic on permanently</div>
                        <button className={`w-[70px] h-[70px] border-solid border-[1px] border-indigo-dye rounded-xl shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-105 active:shadow-none active:translate-y-[4px] transition-all duration-100 flex items-center justify-center ${
                            alwaysOnMode === AlwaysOnMode.On ? 'bg-coral' : 'bg-alice-blue'
                        }`}
                        onClick={() => {
                            setState(draft => {
                                draft.currentChat.chatOpts.alwaysOn = AlwaysOnMode.On;
                                draft.modalSelector = ModalSelector.None;
                            });
                        }}>
                            <Icon name={alwaysOnMode === AlwaysOnMode.On ? 'timeinfwhite' : 'timeinf'} scale={42} />
                        </button>
                    </div>
                </div>
            </div>,
            () => { return true; },
        );
    }

    return ShowModal(
        ModalSelector.AlwaysOn,
        <div>
            <div className="text-[32px] font-black font-nobel">Voice Input Mode</div>
            <div className="text-[22px] max-w-[600px] mt-8 font-normal font-nobel">
            Hold <span className="px-2 py-1 bg-gray-200 rounded">⌥</span> (Option) or <span className="px-2 py-1 bg-gray-200 rounded">Alt</span> to speak with push to talk, or use Open Mic mode to converse freely.
            Just a heads up, Open Mic mode can drain credits quickly if left on.
            </div>
            <div className="flex justify-between mt-8 max-w-[400px] mx-auto">
                <div className="flex flex-col items-center gap-2">
                    <button className={`w-[70px] h-[70px] border-solid border-[1px] border-indigo-dye rounded-xl shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-105 active:shadow-none active:translate-y-[4px] transition-all duration-100 flex items-center justify-center ${
                        alwaysOnMode === AlwaysOnMode.Off ? 'bg-coral' : 'bg-alice-blue'
                    }`}
                    onClick={() => {
                        setState(draft => {
                            draft.currentChat.chatOpts.alwaysOn = AlwaysOnMode.Off;
                            draft.modalSelector = ModalSelector.None;
                        });
                    }}>
                        <Icon name={alwaysOnMode === AlwaysOnMode.Off ? 'micwhite' : 'mic'} scale={38} />
                    </button>
                    <div className="text-[18px] font-bold font-nobel">Push to Talk</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <button className={`w-[70px] h-[70px] border-solid border-[1px] border-indigo-dye rounded-xl shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-105 active:shadow-none active:translate-y-[4px] transition-all duration-100 flex items-center justify-center ${
                        alwaysOnMode === AlwaysOnMode.Temp ? 'bg-coral' : 'bg-alice-blue'
                    }`}
                    onClick={() => {
                        setState(draft => {
                            draft.currentChat.chatOpts.alwaysOn = AlwaysOnMode.Temp;
                            draft.modalSelector = ModalSelector.None;
                        });
                    }}>
                        <Icon name={alwaysOnMode === AlwaysOnMode.Temp ? 'time10white' : 'time10'} scale={36} />
                    </button>
                    <div className="text-[18px] max-w-[100px] text-center font-bold font-nobel">Open Mic for 10 minutes</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <button className={`w-[70px] h-[70px] border-solid border-[1px] border-indigo-dye rounded-xl shadow-[0_4px_0_0_var(--indigo-dye)] hover:brightness-105 active:shadow-none active:translate-y-[4px] transition-all duration-100 flex items-center justify-center ${
                        alwaysOnMode === AlwaysOnMode.On ? 'bg-coral' : 'bg-alice-blue'
                    }`}
                    onClick={() => {
                        setState(draft => {
                            draft.currentChat.chatOpts.alwaysOn = AlwaysOnMode.On;
                            draft.modalSelector = ModalSelector.None;
                        });
                    }}>
                        <Icon name={alwaysOnMode === AlwaysOnMode.On ? 'timeinfwhite' : 'timeinf'} scale={42} />
                    </button>
                    <div className="text-[18px] max-w-[100px] text-center font-bold font-nobel">Open Mic on permanently</div>
                </div>
            </div>
        </div>,
        () => { return true; },
    );
}
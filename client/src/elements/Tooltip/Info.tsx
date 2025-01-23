import { HelpChat, useSetStateValue } from "../../state/state";
import { useStateValue } from "../../state/state";
import { Icon } from "../Icon/Icon";

export const Info = ({
    x,
    y,
    condition,
    children
}: {
    x: number;
    y: number;
    condition: boolean;
    children: React.ReactNode;
}) => {
    return (
        <div className="relative">
        <div
        className={`
            absolute
            transform
            -translate-x-1/2
            -translate-y-1/2
            bg-white
            rounded-lg
            shadow-xl
            backdrop-blur-md
            p-4
            transition-opacity
            duration-300
            ${condition ? 'opacity-100' : 'opacity-0'}
            ${condition ? '' : 'pointer-events-none'}
        `}
            style={{
                left: `${x}px`,
                top: `${y}px`,
            }}
            >
            {children}
            </div>
            </div>
        );
    };
    
export const CyclingHelpChat = ({
    choice,
    x,
    y,
    children
}: {
    choice: HelpChat;
    x: number;
    y: number;
    children: React.ReactNode;
}) => {
    const helpChat = useStateValue(state => state.helpChat);
    const setState = useSetStateValue();


    return <Info condition={choice === helpChat} x={x} y={y}>
        <div className="flex flex-col gap-2">
            {children}
            <div className="flex flex-row gap-2 ml-auto">
                <div className="flex flex-row gap-2 cursor-pointer" onClick={() => setState(draft => { draft.helpChat = HelpChat.None })}>
                    <Icon scale={16} name="x" />
                </div>
                <div className="flex flex-row gap-2 cursor-pointer"
                    onClick={() => {
                        setState(draft => { 
                            const values = Object.values(HelpChat);
                            const currentIndex = values.indexOf(draft.helpChat);
                            const nextIndex = (currentIndex + 1) % values.length;
                            draft.helpChat = values[nextIndex];
                        })
                    }}>
                    <Icon scale={16} name="arrow" rotation={180} />
                </div>
            </div>
        </div>
    </Info>;
};  

import { useStateValue, TabSelection, useSetStateValue } from "../../state/state";
import { Icon } from "../Icon/Icon";

export const TabSelector = () => {
    const tabSelection = useStateValue(state => state.pageChoice.tabSelection)
    const setState = useSetStateValue();


    return <div className="flex flex-col gap-4 w-full mt-16">
        <div className="mr-2">
            <div 
                onClick={() => setState(draft => { draft.pageChoice.tabSelection = TabSelection.Lessons })}
                className={`rounded-lg p-2 ${tabSelection === TabSelection.Lessons ? 'bg-baby-powder-dark' : ''}`}
            >
                <Icon name="chat" scale={24}/>
            </div>
            <div 
                onClick={() => setState(draft => { draft.pageChoice.tabSelection = TabSelection.Practice })}
                className={`rounded-lg p-2 ${tabSelection === TabSelection.Practice ? 'bg-baby-powder-dark' : ''}`}
            >
                <Icon name="altchat" scale={24}/>
            </div>
            <div 
                onClick={() => setState(draft => { draft.pageChoice.tabSelection = TabSelection.Vocab })}
                className={`rounded-lg p-2 ${tabSelection === TabSelection.Vocab ? 'bg-baby-powder-dark' : ''}`}
            >
                <Icon name="dictionary" scale={24}/>
            </div>
            <div 
                onClick={() => setState(draft => { draft.pageChoice.tabSelection = TabSelection.CustomInstructions })}
                className={`rounded-lg p-2 ${tabSelection === TabSelection.CustomInstructions ? 'bg-baby-powder-dark' : ''}`}
            >
                <Icon name="writing" scale={24}/>
            </div>
        </div>
    </div>;
}
import { Icon } from "../Icon/Icon"
import { IconName } from "../../utils/icons"
import { useState } from "react";

export interface Tab {
    icon: IconName;
    onClick: () => void;
}

const Selector = ({ labels }: {labels: Tab[]}) => {
    const [selected, setSelected] = useState(0);

    return <div className="flex flex-col gap-4 w-full mt-16">
        <div className="mr-2">
            {labels.map((label, i) => (
                <div key={i} onClick={() => { setSelected(i); label.onClick() }} className={`rounded-lg p-2 ${selected === i ? 'bg-baby-powder-dark' : ''}`}>
                    <Icon name={label.icon} scale={24}/>
                </div>
            ))}
        </div>
    </div>;
}

export const MobileNav = ({ content, labels }: { content: React.ReactNode, labels: Tab[] }) => {
    return <div className="h-full">
        <div className="flex flex-col w-full h-full relative">
            <div className="flex-1 h-full min-w-0 pr-16">
                <div className="mt-2 flex-1 h-full">
                    {content}
                </div>
            </div>
            <div className="fixed right-0 top-[20vh]">
                <Selector labels={labels} />
            </div>
        </div>
    </div>
}
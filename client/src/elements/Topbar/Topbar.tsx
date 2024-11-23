import React, { useState } from 'react';
import { Icon } from '../Icon/Icon';
import './Topbar.css';
import { useSetStateValue, ModalSelector, useStateValue } from '../../state/state';
import { closeModal, ShowModal } from '../Modal/Modal';
export const GetBuyModal = () => {
    const setState = useSetStateValue();
    const [customAmount, setCustomAmount] = useState(0);
    const [selectedAmount, setSelectedAmount] = useState(-1);
    const [selectedId, setSelectedId] = useState(0);

    return ShowModal(
        ModalSelector.BuyCoins,
        <div className="w-min">
            <div className="text-3xl font-bold">Buy Coins</div>
            <div className="text-base pt-4">
                Thank you for your support! This is a beta website built on a beta voice API, so pricings and behavior may change often, but I hope you will find it useful.
            </div>
            <div className="flex flex-row gap-4">
                <div className="flex flex-row space-x-4 overflow-visible mt-4">
                    <div className={`w-14 flex flex-col items-center p-10 bg-[var(--alice-blue)] px-[60] rounded-lg shadow-[0_6px_0_var(--indigo-dye)] ${selectedId === 0 ? 'outline outline-[8px] outline-[var(--coral)]' : 'border-[2px] border-solid border-[--indigo-dye]'}`}
                        onClick={() => {
                            setSelectedAmount(500);
                            setSelectedId(0);
                        }}
                    >
                        <Icon name="profit" scale={30} />
                        <div className="text-2xl font-black text-center">500</div>
                        <div className="text-xl pt-[75px] font-semibold text-center">$5</div>
                    </div>
                </div>
                <div className="flex flex-row space-x-4 overflow-visible mt-4">
                    <div className={`w-14 flex flex-col items-center p-10 bg-[var(--alice-blue)] px-[60] rounded-lg shadow-[0_6px_0_var(--indigo-dye)] ${selectedId === 1 ? 'outline outline-[8px] outline-[var(--coral)]' : 'border-[2px] border-solid border-[--indigo-dye]'}`}
                        onClick={() => {
                            setSelectedAmount(1000);
                            setSelectedId(1);
                        }}
                    >
                        <Icon name="profit" scale={30} />
                        <div className="text-2xl font-black text-center">1000</div>
                        <div className="text-xl pt-[75px] font-semibold text-center">$10</div>
                    </div>
                </div>
                <div className="flex flex-row space-x-4 overflow-visible mt-4">
                    <div className={`w-14 flex flex-col items-center p-10 bg-[var(--alice-blue)] px-[60] rounded-lg shadow-[0_6px_0_var(--indigo-dye)] ${selectedId === 2 ? 'outline outline-[8px] outline-[var(--coral)]' : 'border-[2px] border-solid border-[--indigo-dye]'}`}
                        onClick={() => {
                            setSelectedAmount(2000);
                            setSelectedId(2);
                        }}
                    >
                        <Icon name="profit" scale={30} />
                        <div className="text-2xl font-black text-center">2000</div>
                        <div className="text-xl pt-[75px] font-semibold text-center">$20</div>
                    </div>
                </div>
                <div className="flex flex-row space-x-4 overflow-visible mt-4">
                    <div className={`w-14 flex flex-col items-center p-10 bg-[var(--alice-blue)] px-[60] rounded-lg shadow-[0_6px_0_var(--indigo-dye)] ${selectedId === 3 ? 'outline outline-[8px] outline-[var(--coral)]' : 'border-[2px] border-solid border-[--indigo-dye]'}`}
                        onClick={() => {
                            setSelectedAmount(customAmount);
                            setSelectedId(3);
                        }}
                    >
                        <Icon name="profit" scale={30} />
                        <div className="text-2xl font-black text-center">Custom</div>
                        <input 
                            type="number" 
                            placeholder="$" 
                            className="mt-[75px] min-h-[25px] min-w-[75px] rounded-lg bg-white text-center w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none outline-none focus:outline-none focus:ring-0 border-none ring-0 ring-offset-0 focus:border-none focus:ring-offset-0"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(parseInt(e.target.value))}
                        />
                    </div>
                </div>
            </div>
        </div>,
        (iconPressed: boolean) => {console.log("Close Buy Modal", iconPressed); return true}
    );
}


export const Topbar = () => {
    const setState = useSetStateValue();

    const coins = 95;
    return (
        <div>
            <GetBuyModal />
            <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                padding: '10px 20px',
                gap: '15px',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="topbar-icon">
                <div className={`credit-count ${coins < 100 ? 'low' : ''}`}>
                    {coins}
                </div>
                <Icon name="profit" scale={24} />
            </div>
            <button className="buy-button" onClick={() => setState(draft => { draft.modalSelector = ModalSelector.BuyCoins })}>Buy Coins</button>
            <div className="topbar-icon">
                <Icon name="user" scale={24} onClick={() => setState(draft => { draft.auth.token = "" })}/>
                </div>
            </div>
        </div>
    );
};

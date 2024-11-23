import React, { useState } from 'react';
import { Icon } from '../Icon/Icon';
import './Topbar.css';
import { useSetStateValue, ModalSelector, useStateValue } from '../../state/state';
import { closeModal, ShowModal } from '../Modal/Modal';
export const GetBuyModal = () => {
    const modalSelector = useStateValue(state => state.modalSelector);
    const setState = useSetStateValue();

    return ShowModal(
        ModalSelector.BuyCoins,
        <div>
            <h2>Buy Coins</h2>
            <button onClick={() => closeModal(setState)}>Close</button>
        </div>,
        () => console.log("Close Buy Modal")
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

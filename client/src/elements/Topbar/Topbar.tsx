import React from 'react';
import { Icon } from '../Icon/Icon';
import './Topbar.css';
import { useSetStateValue } from '../../state/state';


export const Topbar = () => {
    const setState = useSetStateValue();

    const coins = 95;
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '10px 20px',
            gap: '15px'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="topbar-icon">
            <div className={`credit-count ${coins < 100 ? 'low' : ''}`}>
                {coins}
            </div>
            <Icon name="profit" scale={24} />
        </div>
        <button className="buy-button">Buy Coins</button>
        <div className="topbar-icon">
            <Icon name="user" scale={24} onClick={() => setState(draft => { draft.auth.token = "" })}/>
        </div>
        </div>
    );
};

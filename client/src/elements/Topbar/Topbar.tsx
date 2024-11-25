import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import './Topbar.css';
import { useSetStateValue, ModalSelector, useStateValue } from '../../state/state';
import { closeModal, ShowModal } from '../Modal/Modal';
import { PaymentForm, CreditCard, GooglePay } from 'react-square-web-payments-sdk';
import toast from 'react-hot-toast';

export const GetBuyModal = () => {
    const setState = useSetStateValue();
    const [customAmount, setCustomAmount] = useState(NaN);
    const [selectedAmount, setSelectedAmount] = useState(-1);
    const [selectedId, setSelectedId] = useState(-1);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [onSecondPage, setOnSecondPage] = useState(false);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);
    const contentRef = useRef(null);

    useEffect(() => {
        setSelectedAmount(isNaN(customAmount) ? 0 : customAmount);
    }, [customAmount]);

    const createPaymentRequest = useCallback(() => {
        const amount = selectedAmount / 100.0;
        
        return {
            countryCode: "US",
            currencyCode: "USD",
            total: {
                amount: String(amount),
                label: `$${String(amount)} Purchase`,
            },
        };
    }, [selectedAmount]);

    const handlePayment = async (paymentToken: any, verifiedBuyer: any) => {
        try {
            const response = await fetch('/api/user/credits/buy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`,
                },
                body: JSON.stringify({
                    sourceId: paymentToken.token,
                    credits: selectedAmount,
                }),
            });
            
            if (response.status === 401) {
                onRequestError(response, "Error processing payment");
                return;
            }
            
            const data = await response.json();
            toast.success("Payment successful");
            setState(draft => { draft.modalSelector = ModalSelector.None });
            setState(draft => { draft.triggers.timeLastPayment = Date.now() });
        } catch (error) {
            toast.error("Error processing payment");
        } finally {
            setOnSecondPage(false);
        }
    };

    const firstPage = () => {
        return <div ref={contentRef}><div className="text-3xl font-bold">Buy Coins</div>
        <div className="text-base pt-4">
            Thank you for your support! This is a beta website built on a beta voice API, so pricings and behavior may change often, but I hope you will find it useful.
        </div>
        <div className="flex flex-row gap-4">
            <div className="flex flex-row space-x-4 overflow-visible mt-4">
                <div className={`w-14 flex flex-col items-center p-10 bg-[var(--alice-blue)] px-[60] rounded-lg shadow-[0_6px_0_var(--indigo-dye)] hover:bg-[var(--alice-dark)] ${selectedId === 0 ? 'outline outline-[8px] outline-[var(--coral)]' : 'border-[2px] border-solid border-[--indigo-dye]'}`}
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
                <div className={`w-14 flex flex-col items-center p-10 bg-[var(--alice-blue)] px-[60] rounded-lg shadow-[0_6px_0_var(--indigo-dye)] hover:bg-[var(--alice-dark)] ${selectedId === 1 ? 'outline outline-[8px] outline-[var(--coral)]' : 'border-[2px] border-solid border-[--indigo-dye]'}`}
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
                <div className={`w-14 flex flex-col items-center p-10 bg-[var(--alice-blue)] px-[60] rounded-lg shadow-[0_6px_0_var(--indigo-dye)] hover:bg-[var(--alice-dark)] ${selectedId === 2 ? 'outline outline-[8px] outline-[var(--coral)]' : 'border-[2px] border-solid border-[--indigo-dye]'}`}
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
                <div className={`w-14 flex flex-col items-center p-10 bg-[var(--alice-blue)] px-[60] rounded-lg shadow-[0_6px_0_var(--indigo-dye)] hover:bg-[var(--alice-dark)] ${selectedId === 3 ? 'outline outline-[8px] outline-[var(--coral)]' : 'border-[2px] border-solid border-[--indigo-dye]'}`}
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
                        className="mt-[50px] min-h-[25px] min-w-[75px] rounded-lg bg-white text-center w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none outline-none focus:outline-none focus:ring-0 border-none ring-0 ring-offset-0 focus:border-none focus:ring-offset-0"
                        value={customAmount}
                        onChange={(e) => {setCustomAmount(parseInt(e.target.value)); setSelectedId(3)}}
                    />
                    <div className="text-xl font-semibold text-center">${(isNaN(customAmount) ? 0 : customAmount / 100.0).toFixed(2)}</div>
                </div>
            </div>
        </div>
        <div className="flex justify-center mt-4 space-x-4">
            <button 
                className="w-full bg-[var(--alice-blue)] border-[2px] text-indigo-dye border-solid border-[var(--indigo-dye)] shadow-[0_6px_0_var(--indigo-dye)] text-xl font-semibold py-2 px-4 rounded-lg hover:bg-[var(--alice-dark)]"
                onClick={() => {
                    setState(draft => { draft.modalSelector = ModalSelector.None });
                }}
            >
                Cancel
            </button>
            <button 
                className={`w-full border-[2px] border-solid border-[var(--indigo-dye)] shadow-[0_6px_0_var(--indigo-dye)] text-xl font-semibold py-2 px-4 rounded-lg ${selectedId >= 0 && selectedAmount > 0 ? 'bg-[var(--coral)] text-white hover:bg-[var(--coral-light)]' : 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300'}`}
                        disabled={!(selectedId >= 0 && selectedAmount > 0)}
                title={selectedId >= 0 && selectedAmount > 0 ? "" : "Please select an amount of coins to buy"}
                onClick={() => {
                    if (selectedId >= 0 && selectedAmount > 0) {
                        setOnSecondPage(true);
                        if (contentRef.current) {
                            const { offsetWidth, offsetHeight } = contentRef.current;
                            setDimensions({ width: offsetWidth, height: offsetHeight });
                        }
                    }
                }}
            >
                Confirm
            </button>
        </div>
        </div>
    }

    const secondPage = () => {
        return <div style={{ width: dimensions.width, height: dimensions.height }}>
                <div className="text-3xl font-black">Buy More Coins</div>
                <div className = "h-[80%] w-[100%] flex flex-col justify-center items-center mt-10">
                    <div className="flex flex-row justify-center items-center">
                        <div className=" flex flex-row items-center justify-center space-x-4 overflow-visible mt-4 mr-8">
                            <div className={`w-14 flex flex-col items-center p-10 bg-[var(--alice-blue)] px-[60] rounded-lg shadow-[0_6px_0_var(--indigo-dye)] border-[2px] border-solid border-[--indigo-dye]`}>
                                <Icon name="profit" scale={30} />
                                <div className="text-2xl font-black text-center">{selectedAmount}</div>
                                <div className="text-xl pt-[75px] font-semibold text-center">${(selectedAmount / 100.0).toFixed(2)}</div>
                            </div>
                        </div>

                        <div >
                            <div className="mt-5"></div>
                            <PaymentForm
                                applicationId={process.env.REACT_APP_SQUARE_APP_ID || ''}
                                locationId={process.env.REACT_APP_SQUARE_LOCATION_ID || ''}
                                cardTokenizeResponseReceived={handlePayment}
                                createPaymentRequest={createPaymentRequest}
                            >
                                <GooglePay />
                                <CreditCard />
                                <div>Pay with Stripe</div>
                            </PaymentForm>
                        </div>
                    </div>
                    <div className="w-[40%] justify-center text-center items-center mt-10 bg-[var(--alice-blue)] border-[2px] border-solid border-[--indigo-dye] shadow-[0_6px_0_var(--indigo-dye)] text-xl font-semibold py-2 px-4 rounded-lg hover:bg-[var(--alice-dark)]"
                        onClick={() => {
                            setOnSecondPage(false);
                        }}
                    >Back</div>
            </div>
        </div>
    }

    return ShowModal(
        ModalSelector.BuyCoins,
        <div className="w-min">
            {onSecondPage ? secondPage() : firstPage()}
        </div>,
        (iconPressed: boolean) => {return true}
    );
}

export const CoinCount = () => {
    const [coins, setCoins] = useState(0);
    const timeLastPayment = useStateValue(state => state.triggers.timeLastPayment);
    const jwt = useStateValue(state => state.auth.token);
    const onRequestError = useStateValue(state => state.auth.onRequestError);

    useEffect(() => {
        const fetchCoins = async () => {
            const response = await fetch('/api/user/credits', {
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                },
            });
            if (!response.ok) {
                onRequestError(response, "Error fetching coins");
                return;
            }
            const data = await response.json();
            setCoins(data.credits);
        };
        fetchCoins();

        const interval = setInterval(() => {
            fetchCoins();
        }, 30000);
        return () => clearInterval(interval);
    }, [timeLastPayment]);

    return <div className="text-[var(--indigo-dye)] text-[20px] font-[800] font-['Nobel_Uno',Arial,sans-serif] -mt-1 -ml-1 gap-1">
        {coins}
    </div>
}

export const Topbar = () => {
    const setState = useSetStateValue();
    const modalSelector = useStateValue(state => state.modalSelector);

    const coins = 95;
    return (
        <div>
            {modalSelector === ModalSelector.BuyCoins && <GetBuyModal />}
            <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                padding: '10px 20px',
                gap: '15px',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="topbar-icon">
                {/* <div className={`credit-count ${coins < 100 ? 'low' : ''}`}>
                    {coins}
                </div> */}
                <CoinCount />
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

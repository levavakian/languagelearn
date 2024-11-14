import React, { useState, useMemo, useCallback } from 'react';
import { PaymentForm, CreditCard, GooglePay } from 'react-square-web-payments-sdk';
import './PaymentModal.css';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onUnauthorized: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, token, onUnauthorized }) => {
  const [dollars, setDollars] = useState<number | ''>(1);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCredits, setCurrentCredits] = useState<number>(0);

  const fetchCredits = useCallback(async () => {
    try {
      const response = await fetch('/api/user/credits', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await response.json();
      setCurrentCredits(data.credits);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  }, [token, onUnauthorized]);

  React.useEffect(() => {
    if (isOpen) {
      fetchCredits();
    }
  }, [isOpen, fetchCredits]);

  const createPaymentRequest = useCallback(() => {
    const amount = String(dollars);
    console.log(`Requesting payment for $${typeof dollars === 'number' ? dollars.toFixed(2) : '0.00'}`);
    
    return {
      countryCode: "US",
      currencyCode: "USD",
      total: {
        amount: amount,
        label: `$${dollars} Purchase`,
      },
    };
  }, [dollars]);

  const handlePayment = async (paymentToken: any, verifiedBuyer: any) => {
    setIsSubmitting(true);
    try {
        console.log("token", paymentToken);
        console.log("verifiedBuyer", verifiedBuyer);
      
      const response = await fetch('/api/user/credits/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceId: paymentToken.token,
          credits: dollars,
        }),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await response.json();
      console.log('Payment response:', data);
      setShowPaymentForm(false);
      await fetchCredits();
    } catch (error) {
      setShowPaymentForm(false);
      console.error('Error processing payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const handleContinue = () => {
    setShowPaymentForm(true);
  };

  const handleBack = () => {
    setShowPaymentForm(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>X</button>
        <h2>Buy Credits</h2>
        
        {!showPaymentForm ? (
          <form onSubmit={(e) => { e.preventDefault(); handleContinue(); }}>
            <div className="current-credits">
              <p>Current Credits: {currentCredits}</p>
            </div>
            <div className="form-group">
              <label>Amount to spend ($):</label>
              <input
                type="number"
                value={dollars}
                onChange={(e) => {
                  const value = e.target.value;
                  setDollars(value === '' ? '' : Math.floor(Number(value)));
                }}
                min="1"
                step="1"
                required
              />
            </div>
            <button 
              type="submit" 
              className="primary-button" 
              disabled={!dollars || dollars < 1}
            >Continue to Payment</button>
          </form>
        ) : (
          <div>
            <div className="payment-summary">
              <p>Amount to purchase: ${dollars}</p>
            </div>
            <PaymentForm
              applicationId={process.env.REACT_APP_SQUARE_APP_ID || ''}
              locationId={process.env.REACT_APP_SQUARE_LOCATION_ID || ''}
              cardTokenizeResponseReceived={handlePayment}
              createPaymentRequest={createPaymentRequest}
            >
              <GooglePay />
              <CreditCard />
            </PaymentForm>
            <button onClick={handleBack} className="secondary-button">Back</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal; 
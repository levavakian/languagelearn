import React, { useState } from 'react';
import { PaymentForm, CreditCard, GooglePay } from 'react-square-web-payments-sdk';
import './PaymentModal.css';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const [credits, setCredits] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePayment = async (token: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/user/credits/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceId: token.token,
          credits: credits,
        }),
      });

      const data = await response.json();
      console.log('Payment response:', data);
      // Handle success or error based on response
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const createPaymentRequest = () => ({
    countryCode: "US",
    currencyCode: "USD",
    total: {
      amount: (credits * 1.00).toFixed(2),
      label: "Total",
    },
  });

  if (!isOpen) return null;


  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>X</button>
        <h2>Buy Credits</h2>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label>Number of Credits:</label>
            <input
              type="number"
              value={credits}
              onChange={(e) => setCredits(Math.max(1, Number(e.target.value)))}
              min="1"
              required
            />
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
        </form>
      </div>
    </div>
  );
};

export default PaymentModal; 
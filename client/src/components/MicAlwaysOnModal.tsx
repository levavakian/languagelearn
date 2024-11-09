import React from 'react';

interface MicAlwaysOnModalProps {
  onResponse: (response: 'ten_minutes' | 'permanent' | 'cancel') => void;
}

const MicAlwaysOnModal: React.FC<MicAlwaysOnModalProps> = ({ onResponse }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#1e1e1e',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '400px',
        width: '90%',
      }}>
        <h3 style={{ color: 'white', marginTop: 0 }}>Warning</h3>
        <p style={{ color: 'white' }}>
          Always-on microphone mode can consume credits very quickly. 
          How would you like to proceed?
        </p>
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          justifyContent: 'flex-end',
          marginTop: '20px'
        }}>
          <button
            onClick={() => onResponse('cancel')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#808080',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onResponse('ten_minutes')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#61dafb',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Turn on for 10 minutes
          </button>
          <button
            onClick={() => onResponse('permanent')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Turn on permanently
          </button>
        </div>
      </div>
    </div>
  );
};

export default MicAlwaysOnModal; 
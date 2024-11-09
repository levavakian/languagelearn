import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioService } from '../services/AudioService';

interface MicProps {
  onAudioChunk: (chunk: Blob, isRecordingFinished: boolean) => void;
}

const Mic: React.FC<MicProps> = ({ onAudioChunk }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [lastChunkTime, setLastChunkTime] = useState<number | null>(null);
  const chunkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAltPressed = useRef(false);
  const isRecording = useRef(false);

  useEffect(() => {
    audioService.requestPermissions().then(setHasPermission);
  }, []);

  const startRecording = useCallback(async () => {
    if (!isRecording.current) {
      try {
        await audioService.startRecording((chunk: Blob) => {
          onAudioChunk(chunk, false);
          setLastChunkTime(Date.now());
          
          if (chunkTimeoutRef.current) {
            clearTimeout(chunkTimeoutRef.current);
          }
          
          chunkTimeoutRef.current = setTimeout(() => {
            setLastChunkTime(null);
          }, 500);
        });
        isRecording.current = true;
      } catch (err) {
        setHasPermission(false);
      }
    }
  }, [onAudioChunk]);

  const stopRecording = useCallback(() => {
    if (isRecording.current) {
      audioService.stopRecording();
      onAudioChunk(new Blob(), true); // Signal recording finished
      isRecording.current = false;
    }
  }, [onAudioChunk]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Alt' && !isRecording.current) {
        e.preventDefault();
        await startRecording();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        isAltPressed.current = false;
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      audioService.stopRecording();
    };
  }, [onAudioChunk, startRecording, stopRecording]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div 
        style={{
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#3a3f4b',
          borderRadius: '4px',
          boxShadow: lastChunkTime ? '0 0 10px #4CAF50' : 'none',
          transition: 'box-shadow 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onMouseLeave={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={hasPermission ? (lastChunkTime ? "#4CAF50" : "#808080") : "#ff6b6b"}
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </div>
    </div>
  );
};

export default Mic;

import React from 'react';
import { motion } from 'framer-motion';

export default function AttendanceCamera({
  videoRef,
  isCameraActive,
  currentState,
  overlayMessage,
  isMobile
}) {
  const isVerifying = [
    'LIVENESS_IN_PROGRESS',
    'LIVENESS_PASSED',
    'FACE_MATCHING',
    'FACE_MATCHED',
    'ATTENDANCE_SUBMITTING'
  ].includes(currentState);

  const guideColor = isVerifying
    ? '#2563EB'
    : currentState === 'CAMERA_READY'
    ? '#16A34A'
    : '#F59E0B';

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: isMobile ? '280px' : '360px',
      borderRadius: '16px',
      overflow: 'hidden',
      background: '#0F172A',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)'
        }}
      />

      {/* Dark Vignette Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 45%, rgba(15, 23, 42, 0.7) 100%)',
        pointerEvents: 'none'
      }} />

      {/* Biometric Human Upper-Part Silhouette & Circular HUD Guide */}
      <div style={{
        position: 'absolute',
        width: isMobile ? '220px' : '260px',
        height: isMobile ? '240px' : '280px',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3
      }}>
        {/* Pulsing Outer Glow Ring */}
        <motion.div
          animate={{ scale: [1, 1.04, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${guideColor}33 0%, transparent 70%)`,
            pointerEvents: 'none'
          }}
        />

        {/* Circular Biometric Guide Container */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* SVG: Human Upper-Part Border (Face & Shoulders Silhouette) */}
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              width: '100%',
              height: '100%',
              filter: `drop-shadow(0 0 8px ${guideColor})`
            }}
          >
            {/* Outer Circular Reference Target */}
            <circle
              cx="50"
              cy="50"
              r="47"
              stroke={guideColor}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.5"
            />

            {/* Head Contour (Face Fit Shape) */}
            <path
              d="M 50 16 C 36 16, 28 26, 28 42 C 28 57, 38 66, 50 66 C 62 66, 72 57, 72 42 C 72 26, 64 16, 50 16 Z"
              stroke={guideColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Neck & Shoulders Contour (Upper Body Silhouette Border) */}
            <path
              d="M 39 64 C 39 71, 35 75, 26 79 C 15 84, 6 93, 2 100 L 98 100 C 94 93, 85 84, 74 79 C 65 75, 61 71, 61 64"
              stroke={guideColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Facial Center Crosshairs */}
            <line x1="44" y1="38" x2="56" y2="38" stroke={guideColor} strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
            <line x1="50" y1="32" x2="50" y2="44" stroke={guideColor} strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
            <path d="M 46 53 Q 50 56 54 53" stroke={guideColor} strokeWidth="1.2" opacity="0.6" strokeLinecap="round" fill="none" />
          </svg>

          {/* Sweeping Laser Line inside the silhouette */}
          <motion.div
            animate={{ top: ['14%', '82%', '14%'] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{
              position: 'absolute',
              left: '12%',
              right: '12%',
              height: '2.5px',
              background: `linear-gradient(90deg, transparent, ${guideColor}, transparent)`,
              boxShadow: `0 0 10px ${guideColor}, 0 0 3px #FFFFFF`,
              pointerEvents: 'none'
            }}
          />

          {/* HUD Corner Framing Brackets */}
          <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '22px', height: '22px', borderTop: `3px solid ${guideColor}`, borderLeft: `3px solid ${guideColor}`, borderRadius: '6px 0 0 0' }} />
          <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '22px', height: '22px', borderTop: `3px solid ${guideColor}`, borderRight: `3px solid ${guideColor}`, borderRadius: '0 6px 0 0' }} />
          <div style={{ position: 'absolute', bottom: '-4px', left: '-4px', width: '22px', height: '22px', borderBottom: `3px solid ${guideColor}`, borderLeft: `3px solid ${guideColor}`, borderRadius: '0 0 0 6px' }} />
          <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '22px', height: '22px', borderBottom: `3px solid ${guideColor}`, borderRight: `3px solid ${guideColor}`, borderRadius: '0 0 6px 0' }} />
        </div>
      </div>

      {/* Bottom Overlay Message */}
      <div style={{ position: 'absolute', bottom: '16px', zIndex: 5, padding: '0 12px', textAlign: 'center' }}>
        <span style={{
          background: 'rgba(15, 23, 42, 0.85)',
          color: '#FFFFFF',
          padding: '8px 18px',
          borderRadius: '24px',
          fontSize: '13px',
          fontWeight: 600,
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'inline-block'
        }}>
          {overlayMessage || 'Fit face and upper body in border silhouette'}
        </span>
      </div>
    </div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, MapPin, CheckCircle2, ArrowRight, Lock, X } from 'lucide-react';

export default function AttendanceVerificationStepper({
  onContinue,
  onClose,
  actionType = 'CHECK_IN'
}) {
  const isCheckIn = actionType === 'CHECK_IN';

  const checkList = [
    {
      icon: <ShieldCheck size={20} style={{ color: '#6D3DF5' }} />,
      title: 'Verify your identity',
      desc: 'Secure face verification'
    },
    {
      icon: <MapPin size={20} style={{ color: '#6D3DF5' }} />,
      title: 'Check office location',
      desc: 'Ensure you are at office'
    },
    {
      icon: <CheckCircle2 size={20} style={{ color: '#6D3DF5' }} />,
      title: isCheckIn ? 'Mark your attendance' : (actionType === 'VERIFY_CHECK_OUT' ? 'Verify for check-out' : 'Record check-out'),
      desc: 'Quick and secure'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 15 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        padding: 'clamp(20px, 4vw, 32px) clamp(16px, 4vw, 28px) clamp(18px, 4vw, 28px)',
        width: '100%',
        maxWidth: '440px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 20px 40px -15px rgba(109, 61, 245, 0.12), 0 8px 16px -8px rgba(0, 0, 0, 0.04)',
        border: '1px solid #E7EAF0',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: '#F8FAFC',
          border: '1px solid #E7EAF0',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748B',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#111827'; }}
        onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#64748B'; }}
      >
        <X size={16} />
      </button>

      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 800,
          color: '#6D3DF5',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '15px' }}>⚡</span> GharKaPaisa
        </div>
        <h2 style={{
          margin: 0,
          fontSize: '22px',
          fontWeight: 800,
          color: '#111827',
          letterSpacing: '-0.3px'
        }}>
          Face Liveness Check
        </h2>
        <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '2px', display: 'block' }}>
          Live Biometric Verification
        </span>
      </div>

      {/* Central Biometric Human Upper Part & Face Fit Shape */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px'
      }}>
        <div style={{
          position: 'relative',
          width: '140px',
          height: '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Outer Pulsing Glow Ring */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: '-6px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(109, 61, 245, 0.25) 0%, rgba(59, 130, 246, 0.05) 70%, transparent 100%)',
              pointerEvents: 'none'
            }}
          />

          {/* Circular Frame with Dashed High-Tech Border */}
          <div style={{
            position: 'relative',
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
            border: '2.5px solid #6D3DF5',
            boxShadow: '0 12px 28px -6px rgba(109, 61, 245, 0.35), inset 0 0 20px rgba(109, 61, 245, 0.2)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* SVG: Human Upper Part (Head & Shoulders) Border Silhouette */}
            <svg
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                width: '90%',
                height: '90%',
                filter: 'drop-shadow(0 0 6px rgba(147, 197, 253, 0.6))'
              }}
            >
              {/* Outer Circular Reference Guide */}
              <circle cx="50" cy="50" r="46" stroke="#6D3DF5" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />

              {/* Head Contour (Face Fit Shape) */}
              <path
                d="M 50 18 C 38 18, 30 27, 30 42 C 30 56, 39 65, 50 65 C 61 65, 70 56, 70 42 C 70 27, 62 18, 50 18 Z"
                stroke="#60A5FA"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Neck & Shoulders Contour (Upper Body Border) */}
              <path
                d="M 40 63 C 40 70, 37 74, 28 78 C 18 82, 9 91, 5 100 L 95 100 C 91 91, 82 82, 72 78 C 63 74, 60 70, 60 63"
                stroke="#60A5FA"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Facial Alignment Reticles */}
              <line x1="45" y1="38" x2="55" y2="38" stroke="#93C5FD" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
              <line x1="50" y1="33" x2="50" y2="43" stroke="#93C5FD" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
              <path d="M 47 52 Q 50 55 53 52" stroke="#93C5FD" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" fill="none" />
            </svg>

            {/* Sweeping Laser Scan Line */}
            <motion.div
              animate={{ top: ['10%', '85%', '10%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                left: '10%',
                right: '10%',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #38BDF8, transparent)',
                boxShadow: '0 0 10px #38BDF8, 0 0 4px #FFFFFF',
                pointerEvents: 'none'
              }}
            />

            {/* HUD Corner Reticles */}
            <div style={{ position: 'absolute', top: '10px', left: '10px', width: '8px', height: '8px', borderTop: '2px solid #60A5FA', borderLeft: '2px solid #60A5FA' }} />
            <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderTop: '2px solid #60A5FA', borderRight: '2px solid #60A5FA' }} />
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '8px', height: '8px', borderBottom: '2px solid #60A5FA', borderLeft: '2px solid #60A5FA' }} />
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '8px', height: '8px', borderBottom: '2px solid #60A5FA', borderRight: '2px solid #60A5FA' }} />
          </div>
        </div>

        {/* Guidance Badge under the Shape */}
        <div style={{
          marginTop: '10px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(109, 61, 245, 0.08)',
          border: '1px solid rgba(109, 61, 245, 0.2)',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '11.5px',
          fontWeight: 700,
          color: '#6D3DF5'
        }}>
          <span>Fit face &amp; upper body in outline</span>
        </div>
      </div>

      {/* Checklist items */}
      <div style={{
        background: '#F8FAFC',
        border: '1px solid #E7EAF0',
        borderRadius: '18px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {checkList.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: '#F2EEFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Start Video Button */}
      <button
        type="button"
        onClick={onContinue}
        style={{
          width: '100%',
          height: '50px',
          borderRadius: '14px',
          border: 'none',
          background: 'linear-gradient(135deg, #6D3DF5 0%, #8B6CFF 100%)',
          color: '#FFFFFF',
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 8px 20px -4px rgba(109, 61, 245, 0.35)',
          transition: 'transform 0.15s ease, boxShadow 0.15s ease'
        }}
        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        Start Video <ArrowRight size={18} />
      </button>

      {/* Encrypted Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        marginTop: '16px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#94A3B8'
      }}>
        <Lock size={12} />
        <span>Secure • Private • Encrypted</span>
      </div>
    </motion.div>
  );
}


import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaLock, FaPhoneAlt, FaTimes } from 'react-icons/fa';
import { getBankApplyLink } from './cardLinkHelper';
import { getApiV1Url } from '../../../../config/api';
import { useMsg91OTP } from '../../../../hooks/useMsg91OTP';

export default function CardApplyVerificationModal({ card, onClose, C }) {
  const [step, setStep] = useState('details');
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { sdkReady } = useMsg91OTP();

  useEffect(() => {
    if (otpTimer === 0) return undefined;
    const timer = window.setTimeout(() => setOtpTimer(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [otpTimer]);

  const handleSendOtp = () => {
    setErrorMsg('');
    if (!customerName.trim()) {
      setErrorMsg('Enter your name.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setErrorMsg('Enter a valid 10-digit mobile number.');
      return;
    }
    if (!sdkReady || typeof window.sendOtp !== 'function') {
      setErrorMsg('OTP service is loading. Try again shortly.');
      return;
    }

    setLoading(true);
    try {
      window.sendOtp(
        `91${mobile}`,
        () => {
          setOtp('');
          setOtpTimer(120);
          setStep('otp');
          setLoading(false);
        },
        (error) => {
          setErrorMsg(error?.message || 'Could not send OTP. Try again.');
          setLoading(false);
        }
      );
    } catch (error) {
      setErrorMsg(error.message || 'Could not send OTP. Try again.');
      setLoading(false);
    }
  };

  const handleResendOtp = () => {
    setErrorMsg('');
    if (typeof window.retryOtp !== 'function') {
      setErrorMsg('OTP service is not available. Try again shortly.');
      return;
    }

    setLoading(true);
    try {
      window.retryOtp(
        null,
        () => {
          setOtp('');
          setOtpTimer(120);
          setLoading(false);
        },
        (error) => {
          setErrorMsg(error?.message || 'Could not resend OTP. Try again.');
          setLoading(false);
        }
      );
    } catch (error) {
      setErrorMsg(error.message || 'Could not resend OTP. Try again.');
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    setErrorMsg('');
    if (!/^\d{6}$/.test(otp)) {
      setErrorMsg('Enter the 6-digit OTP.');
      return;
    }
    if (typeof window.verifyOtp !== 'function') {
      setErrorMsg('OTP service is not available. Try again shortly.');
      return;
    }

    setLoading(true);
    try {
      window.verifyOtp(
        otp,
        async () => {
          try {
            const response = await fetch(`${getApiV1Url()}/card-applications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerName: customerName.trim(),
                mobile,
                bankName: card.bankName || 'Unknown Bank',
                cardName: card.cardName || 'Credit Card',
                category: card.category || card.product?.category || 'credit_card'
              })
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
              throw new Error(result.message || 'Could not save your application. Try again.');
            }

            setStep('success');
            window.setTimeout(() => {
              const product = card.product || card.card || card;
              const applyLink = card.applyLink || getBankApplyLink(product, card.bankId);
              onClose();
              if (applyLink) window.location.href = applyLink;
            }, 900);
          } catch (error) {
            setErrorMsg(error.message || 'Could not save your application. Try again.');
            setLoading(false);
          }
        },
        (error) => {
          setErrorMsg(error?.message || 'Incorrect OTP. Try again.');
          setLoading(false);
        }
      );
    } catch (error) {
      setErrorMsg(error.message || 'OTP verification failed. Try again.');
      setLoading(false);
    }
  };

  const colors = {
    card: C.card || '#ffffff',
    background: C.bgSecondary || '#f8fafc',
    text: C.text || '#1e293b',
    muted: C.textLight || '#64748b',
    border: C.border || '#e2e8f0',
    primary: C.teal || '#0ea5e9',
    danger: C.red || '#dc2626'
  };
  const fieldStyle = {
    width: '100%',
    minHeight: '46px',
    padding: '11px 13px',
    border: `1px solid ${colors.border}`,
    borderRadius: '10px',
    background: colors.background,
    color: colors.text,
    font: 'inherit',
    fontSize: '14px',
    boxSizing: 'border-box'
  };
  const buttonStyle = {
    width: '100%',
    minHeight: '46px',
    padding: '11px 16px',
    border: 0,
    borderRadius: '10px',
    background: colors.primary,
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: loading ? 'wait' : 'pointer',
    opacity: loading ? 0.7 : 1
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(15, 23, 42, 0.68)'
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-apply-title"
        style={{
          width: '100%',
          maxWidth: '390px',
          padding: '22px',
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          background: colors.card,
          color: colors.text,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.22)',
          boxSizing: 'border-box'
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
          <div>
            <h2 id="card-apply-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
              {step === 'success' ? 'Mobile verified' : 'Continue your application'}
            </h2>
            <p style={{ margin: '5px 0 0', color: colors.muted, fontSize: '13px', lineHeight: 1.4 }}>
              {step === 'details' ? card.cardName : step === 'otp' ? `OTP sent to +91 ${mobile}` : 'Taking you to the application…'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ border: 0, background: 'transparent', color: colors.muted, cursor: 'pointer', padding: '4px', height: 'fit-content' }}
          >
            <FaTimes />
          </button>
        </header>

        {errorMsg && (
          <p role="alert" style={{ margin: '0 0 14px', color: colors.danger, fontSize: '13px' }}>
            {errorMsg}
          </p>
        )}

        {step === 'details' && (
          <form onSubmit={(event) => { event.preventDefault(); handleSendOtp(); }} style={{ display: 'grid', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '6px', color: colors.muted, fontSize: '12px', fontWeight: 700 }}>
              Name
              <input
                type="text"
                autoComplete="name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Your name"
                style={fieldStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: '6px', color: colors.muted, fontSize: '12px', fontWeight: 700 }}>
              Mobile number
              <span style={{ position: 'relative' }}>
                <FaPhoneAlt aria-hidden="true" style={{ position: 'absolute', top: '16px', left: '13px', color: colors.muted }} />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  style={{ ...fieldStyle, paddingLeft: '36px' }}
                />
              </span>
            </label>
            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={(event) => { event.preventDefault(); handleVerifyOtp(); }} style={{ display: 'grid', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '6px', color: colors.muted, fontSize: '12px', fontWeight: 700 }}>
              6-digit OTP
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter OTP"
                style={{ ...fieldStyle, letterSpacing: '0.2em' }}
              />
            </label>
            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? 'Verifying…' : 'Verify and continue'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: colors.muted, fontSize: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setStep('details');
                  setErrorMsg('');
                  setOtp('');
                }}
                style={{ border: 0, background: 'transparent', color: colors.primary, font: 'inherit', cursor: 'pointer' }}
              >
                Change number
              </button>
              {otpTimer > 0 ? (
                <span>Resend in {otpTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  style={{ border: 0, background: 'transparent', color: colors.primary, font: 'inherit', cursor: 'pointer' }}
                >
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        )}

        {step === 'success' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.primary, fontSize: '14px', fontWeight: 700 }}>
            <FaCheckCircle aria-hidden="true" />
            <span>Verified. Continuing to {card.bankName || 'the bank'}.</span>
          </div>
        )}

        {step !== 'success' && (
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '14px 0 0', color: colors.muted, fontSize: '11px' }}>
            <FaLock aria-hidden="true" />
            Mobile verification is required to continue.
          </p>
        )}
      </section>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  FaArrowLeft, FaShieldAlt, FaEnvelope, FaPhone, FaMapMarkerAlt, 
  FaGlobe, FaUndo, FaCreditCard, FaCoins, FaMoneyBillWave, 
  FaSearch, FaPrint, FaCheckCircle, FaExclamationCircle, FaExchangeAlt,
  FaFileInvoiceDollar, FaBuilding
} from 'react-icons/fa';

export default function RefundPolicy() {
  const { C, isDark } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const sections = useMemo(() => [
    {
      id: 'nature-of-services',
      number: '1',
      title: 'Nature of Platform Services & Free Application Policy',
      icon: FaBuilding,
      tags: ['free', 'services', 'platform', 'charges', 'transparency', 'gharkapaisa'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            <strong>GharKaPaisa</strong> (operated by <strong>GharKaPaisa Technologies</strong>, hereinafter referred to as "<strong>GharKaPaisa</strong>", "<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>") is committed to absolute transparency regarding all platform fees, cancellation workflows, refunds, partner incentives, and wallet withdrawals.
          </p>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            <strong>GharKaPaisa does NOT charge retail customers any upfront fee or application fee</strong> for browsing, checking eligibility, comparing, or submitting standard applications for Credit Cards, Personal Loans, Business Loans, or related financial products offered by partner Banks and Non-Banking Financial Companies (NBFCs).
          </p>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
            Any loan processing fees, documentation charges, stamp duty, or card joining/annual fees levied by the lending institution are determined solely by the respective Bank/NBFC and are either deducted from the disbursed loan amount or billed directly in the customer’s official card statement.
          </p>
        </>
      )
    },
    {
      id: 'cancellation-terms',
      number: '2',
      title: 'Application Cancellation Workflow & Limitations',
      icon: FaUndo,
      tags: ['cancellation', 'cancel', 'cooling-off', 'withdraw application'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            Customers have the right to request cancellation of their financial product application subject to the stage of processing:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Cancellation Prior to Institutional Transmission:</strong> If an application has been drafted or submitted on GharKaPaisa but has not yet been electronically forwarded or integrated with the partner Bank/NBFC system, you may request immediate cancellation by contacting <a href="mailto:support@gharkapaisa.in" style={{ color: C.teal, fontWeight: 600 }}>support@gharkapaisa.in</a> or calling <a href="tel:9270319438" style={{ color: C.teal }}>+91 9270319438</a> with your registered application number.</li>
            <li><strong>Post-Transmission & Bank Underwriting:</strong> Once an application has been formally transmitted to the bank's loan origination system (LOS) or card issuance portal, the application becomes subject to that institution's regulatory processing lifecycle. While GharKaPaisa can record your request to discontinue the application, final cancellation is governed by the bank’s internal verification protocols.</li>
            <li><strong>Video KYC (VKYC) Discontinuation:</strong> If you do not wish to proceed with a sanctioned product, you may simply choose not to complete the Video KYC (VKYC) or physical biometric verification with the bank's representative, which will automatically cause the application to lapse without liability.</li>
          </ul>
        </>
      )
    },
    {
      id: 'payment-refund-eligibility',
      number: '3',
      title: 'Payment Transactions & Refund Eligibility Criteria',
      icon: FaCreditCard,
      tags: ['payment', 'refund', 'duplicate', 'eligibility', 'razorpay', 'gateway'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            If a fee is collected directly by GharKaPaisa for an optional paid service (such as specialized financial health advisory reports, partner software subscription, or physical doorstep document pickup):
          </p>
          <div style={{ background: isDark ? '#1e293b' : '#f0fdf4', border: `1px solid ${C.teal}30`, borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
            <div style={{ fontWeight: 700, color: C.teal, marginBottom: '6px', fontSize: '14px' }}>Eligible Circumstances for Refund:</div>
            <ul style={{ paddingLeft: '18px', margin: 0, color: C.textMid, fontSize: '13px', lineHeight: 1.7 }}>
              <li><strong>Duplicate Charges:</strong> Technical glitches resulting in multiple successful debits for the same transaction.</li>
              <li><strong>Service Non-Delivery:</strong> The purchased premium advisory report or digital onboarding service was completely unrendered due to an internal system failure attributable solely to GharKaPaisa.</li>
              <li><strong>Erroneous Payment Gateway Deductions:</strong> Amounts deducted from your bank account/card where the transaction timed out or failed to generate an active order.</li>
            </ul>
          </div>

          <div style={{ background: isDark ? '#1e293b' : '#fef2f2', border: `1px solid ${C.error}30`, borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontWeight: 700, color: C.error, marginBottom: '6px', fontSize: '14px' }}>Strictly Non-Refundable Scenarios:</div>
            <ul style={{ paddingLeft: '18px', margin: 0, color: C.textMid, fontSize: '13px', lineHeight: 1.7 }}>
              <li><strong>Bank / NBFC Rejection:</strong> A bank or financial institution rejecting your loan or credit card application based on credit score, low income, high DTI ratio, or internal policy decline.</li>
              <li><strong>Sanction Variations:</strong> A bank offering a lower credit limit or loan amount than requested by the customer.</li>
              <li><strong>Customer Incomplete Documentation:</strong> Failure of the applicant to submit mandatory KYC documents, complete VKYC, or attend the bank's physical verification.</li>
              <li><strong>Change of Mind:</strong> Voluntary withdrawal by the applicant after the bank has completed underwriting or credit bureau checks.</li>
            </ul>
          </div>
        </>
      )
    },
    {
      id: 'refund-timeline-mode',
      number: '4',
      title: 'Refund Settlement SLA & Mode of Payment',
      icon: FaExchangeAlt,
      tags: ['refund timeline', 'sla', 'days', 'payment mode', 'settlement'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            For all approved refund claims:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
            <li><strong>Settlement Timeline:</strong> Approved refunds are initiated by our finance desk within <strong>24 to 48 hours</strong> of verification. The credit typically reflects in the customer's account within <strong>5 to 7 business days</strong>, depending on the beneficiary bank, card network (Visa/Mastercard/RuPay), or UPI service provider.</li>
            <li><strong>Strict Original Mode Refund:</strong> In accordance with RBI anti-money laundering regulations, refunds can only be processed back to the <strong>exact payment source</strong> (originating bank account, credit card, debit card, or UPI VPA) from which the funds were received. Cash refunds are strictly prohibited.</li>
            <li><strong>Payment Gateway Convenience Charges:</strong> Nominal payment gateway processing charges or GST deducted by third-party processors during the initial transaction may not be refundable unless the refund is caused by our platform error.</li>
          </ul>
        </>
      )
    },
    {
      id: 'partner-incentive-policy',
      number: '5',
      title: 'Partner / DSA Incentive & Commission Policy',
      icon: FaCoins,
      tags: ['incentive', 'commission', 'payout', 'tds', 'section 194h', 'disbursement', 'clawback'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            GharKaPaisa rewards registered Direct Selling Agents (DSAs), channel partners, financial influencers, and employees through transparent commission matrices:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Condition Precedent for Incentive Credit:</strong> Commissions are earned <strong>strictly upon successful loan disbursement or physical credit card activation</strong>, as reconciled in official monthly MIS statements issued by the lending Bank/NBFC. Merely generating a customer inquiry, punching a lead, or submitting KYC papers confers no legal right to an incentive.</li>
            <li><strong>Statutory TDS Deductions (Income Tax Act 1961):</strong> All commission payments are subject to mandatory <strong>Tax Deducted at Source (TDS) under Section 194H</strong> (commission/brokerage) or Section 194J (professional/technical fees) at the prevailing rate of 5% (or 20% for non-PAN accounts under Section 206AA). TDS certificates (Form 16A) are provided on a quarterly basis.</li>
            <li><strong>Commission Reversals & Anti-Fraud Clawback:</strong> If an application for which an incentive was disbursed is subsequently found to be:
              <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
                <li>Associated with forged documents, manipulated salary slips, or fake KYC.</li>
                <li>Cancelled or closed within the partner bank's statutory cooling-off window (30 to 90 days).</li>
                <li>Flagged as an early default, fraud account, or chargeback by the institutional lender.</li>
              </ul>
              GharKaPaisa reserves the absolute right to <strong>clawback, withhold, or debit the incentive</strong> from the partner’s available wallet balance or adjust the amount against future payouts.
            </li>
          </ul>
        </>
      )
    },
    {
      id: 'wallet-withdrawal-policy',
      number: '6',
      title: 'Partner Wallet Balance & Payout Withdrawal Policy',
      icon: FaMoneyBillWave,
      tags: ['withdrawal', 'wallet', 'bank transfer', 'penny drop', 'threshold', 'settlement'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            Withdrawal of approved wallet balances by registered partners is governed by the following binding rules:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Mandatory Penny-Drop Bank Verification:</strong> Payout withdrawals are permitted only to an Indian bank savings or current account verified via automated penny-drop validation. <strong>The name on the bank account must exactly match the partner’s verified PAN card name.</strong> Withdrawals to third-party accounts, virtual wallets, or non-KYC accounts are blocked.</li>
            <li><strong>Minimum Withdrawal Limit:</strong> The minimum threshold to request a payout withdrawal is <strong>₹500 (Rupees Five Hundred Only)</strong>.</li>
            <li><strong>Processing Timeline & Settlement Batches:</strong> Withdrawal requests are processed in regular payout batches via NEFT, IMPS, or UPI Payouts within <strong>2 to 5 business days</strong> (excluding Sundays and national banking holidays).</li>
            <li><strong>Account Freezing & Security Holds:</strong> In the event of audit anomalies, multiple loan rejections indicating spam lead generation, or pending KYC inquiries, GharKaPaisa reserves the right to temporarily place withdrawal requests on hold pending compliance verification.</li>
          </ul>
        </>
      )
    },
    {
      id: 'refund-contact-support',
      number: '7',
      title: 'Grievance Desk & Refund Claim Submission',
      icon: FaMapMarkerAlt,
      tags: ['contact', 'refund claim', 'support', 'email', 'phone', 'pune'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            To submit a cancellation, refund claim, or withdrawal inquiry, please contact our dedicated desk:
          </p>
          <div style={{ background: isDark ? '#0f172a' : C.bgSecondary, border: `1px solid ${C.border}`, padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 800, color: C.teal, fontSize: '16px' }}>GharKaPaisa Finance & Refund Support Desk</div>
            <div><FaEnvelope style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Refund Desk Email:</strong> <a href="mailto:support@gharkapaisa.in" style={{ color: C.teal }}>support@gharkapaisa.in</a></div>
            <div><FaEnvelope style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Grievance Escalations:</strong> <a href="mailto:grievance@gharkapaisa.in" style={{ color: C.teal }}>grievance@gharkapaisa.in</a></div>
            <div><FaPhone style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Direct Helpline:</strong> <a href="tel:9270319438" style={{ color: C.teal }}>+91 9270319438</a></div>
            <div><FaMapMarkerAlt style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Corporate Office:</strong> Rajnandini Tower Dighi, Pune, Maharashtra 411015, India</div>
          </div>
          <p style={{ color: C.textMid, fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
            When raising a refund or withdrawal ticket, please provide: (1) Your Full Legal Name, (2) Registered Mobile Number, (3) Application ID or Transaction Reference, (4) Date of Payment / Withdrawal Request, and (5) A concise statement of your inquiry.
          </p>
        </>
      )
    }
  ], [C, isDark]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    return sections.filter(sec => 
      sec.title.toLowerCase().includes(query) ||
      sec.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [sections, searchQuery]);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '40px 16px', fontFamily: "'Inter', sans-serif", color: C.text }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        
        {/* Navigation Breadcrumb / Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button 
              onClick={() => navigate('/')}
              aria-label="Back to Home"
              style={{ 
                background: C.card, border: `1px solid ${C.border}`, borderRadius: '50%', 
                width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: C.textMid, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s'
              }}
            >
              <FaArrowLeft />
            </button>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 900, color: C.text, margin: 0 }}>Cancellation, Refund & Withdrawal Policy</h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => window.print()}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                borderRadius: '12px', border: `1px solid ${C.border}`, background: C.card,
                color: C.textMid, fontSize: '13px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <FaPrint /> Print / PDF
            </button>
          </div>
        </div>

        {/* Global Policy Switcher Tabs */}
        <div style={{ 
          display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px',
          borderBottom: `1px solid ${C.border}`
        }}>
          {[
            { id: 'terms', label: 'Terms & Conditions', path: '/terms-and-conditions', active: false },
            { id: 'privacy', label: 'Privacy Policy', path: '/privacy-policy', active: false },
            { id: 'refund', label: 'Cancellation & Refund', path: '/cancellation-and-refund-policy', active: true },
            { id: 'shipping', label: 'Shipping & Delivery', path: '/shipping-and-delivery-policy', active: false }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              style={{
                padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: tab.active ? C.teal : (isDark ? '#1e293b' : '#f1f5f9'),
                color: tab.active ? '#ffffff' : C.textMid,
                boxShadow: tab.active ? '0 4px 12px rgba(0, 138, 96, 0.25)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Feature Filter Bar */}
        <div style={{ 
          background: C.card, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '16px 20px',
          marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <FaSearch style={{ color: C.teal, fontSize: '16px' }} />
          <input 
            type="text" 
            placeholder="Search policies (e.g., Refund SLA, Duplicate Payments, Incentives, Withdrawal, TDS)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'transparent', color: C.text,
              fontSize: '14px', outline: 'none'
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: C.textLight, cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Keyword Jump Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: C.textLight, display: 'flex', alignItems: 'center' }}>Quick Topics:</span>
          {['Free Applications', 'Cancellation Stages', 'Refund Eligibility', '5-7 Days SLA', 'Incentive Rules', 'TDS Deduction', 'Wallet Withdrawals', 'Penny Drop Bank Verification'].map(tag => (
            <button
              key={tag}
              onClick={() => setSearchQuery(tag.split(' ')[0])}
              style={{
                fontSize: '12px', padding: '4px 12px', borderRadius: '20px',
                background: isDark ? '#1e293b' : '#f0fdf4',
                color: C.teal, border: `1px solid ${C.teal}30`, cursor: 'pointer', fontWeight: 600
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Highlighted Compliance Notice Card */}
        <div style={{ 
          background: isDark ? '#1e293b' : '#f0fdf4', border: `1px solid ${C.teal}40`, 
          borderRadius: '18px', padding: '20px 24px', color: C.textMid, fontSize: '14px', lineHeight: 1.65, marginBottom: '28px',
          display: 'flex', gap: '16px', alignItems: 'flex-start'
        }}>
          <FaShieldAlt style={{ color: C.teal, fontSize: '24px', marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: '15px', marginBottom: '4px' }}>
              Zero Hidden Charges Commitment
            </div>
            GharKaPaisa ensures zero predatory pricing. All loan and credit card applications submitted via our platform are 100% free of service charges for customers. Approved partner commissions are settled securely via verified Indian banking rails with full compliance under the Indian Income Tax Act.
            <div style={{ marginTop: '8px', fontSize: '12px', color: C.textLight }}>
              <strong>Effective Date:</strong> November 15, 2026 | <strong>Version:</strong> 2.4
            </div>
          </div>
        </div>

        {/* Main Document Card */}
        <div style={{ 
          background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', 
          padding: '36px 30px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '32px' 
        }}>
          {filteredSections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMid }}>
              <FaSearch style={{ fontSize: '32px', color: C.textLight, marginBottom: '12px' }} />
              <div style={{ fontWeight: 700, fontSize: '16px' }}>No sections matched "{searchQuery}"</div>
              <div style={{ fontSize: '13px', marginTop: '6px' }}>Try searching for "Refund", "Incentive", "Withdrawal", "TDS", or "SLA".</div>
            </div>
          ) : (
            filteredSections.map((sec, idx) => {
              const IconComp = sec.icon;
              return (
                <section 
                  key={sec.id} 
                  id={sec.id}
                  style={{ 
                    borderTop: idx > 0 ? `1px solid ${C.border}` : 'none', 
                    paddingTop: idx > 0 ? '28px' : '0' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '10px', 
                      background: isDark ? '#1e293b' : '#ecfdf5', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', color: C.teal, fontSize: '16px' 
                    }}>
                      <IconComp />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: C.text, margin: 0 }}>
                      <span style={{ color: C.teal, marginRight: '8px' }}>{sec.number}.</span>
                      {sec.title}
                    </h2>
                  </div>
                  <div>
                    {sec.content}
                  </div>
                </section>
              );
            })
          )}
        </div>

        {/* Footer Navigation Note */}
        <div style={{ textAlign: 'center', marginTop: '36px', color: C.textLight, fontSize: '13px' }}>
          <div>© {new Date().getFullYear()} GharKaPaisa Technologies. All rights reserved.</div>
          <div style={{ marginTop: '6px' }}>
            <span onClick={() => navigate('/terms-and-conditions')} style={{ color: C.teal, cursor: 'pointer', fontWeight: 600 }}>Terms & Conditions</span> • 
            <span onClick={() => navigate('/privacy-policy')} style={{ color: C.teal, cursor: 'pointer', fontWeight: 600, marginLeft: '8px' }}>Privacy Policy</span> • 
            <span onClick={() => navigate('/shipping-and-delivery-policy')} style={{ color: C.teal, cursor: 'pointer', fontWeight: 600, marginLeft: '8px' }}>Shipping & Delivery Policy</span>
          </div>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  FaArrowLeft, FaShieldAlt, FaEnvelope, FaPhone, FaMapMarkerAlt, 
  FaGlobe, FaLock, FaKey, FaMobileAlt, FaIdCard, FaCreditCard, 
  FaCoins, FaUndo, FaMoneyBillWave, FaSearch, FaPrint, FaFileContract,
  FaCheckCircle, FaExclamationTriangle, FaUserCheck
} from 'react-icons/fa';

export default function TermsAndConditions() {
  const { C, isDark } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('terms');

  const sections = useMemo(() => [
    {
      id: 'introduction',
      number: '1',
      title: 'About GharKaPaisa & Acceptance of Terms',
      icon: FaFileContract,
      tags: ['gharkapaisa', 'acceptance', 'contract', 'platform', 'it act'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            Welcome to <strong>GharKaPaisa</strong> (operated under <strong>GharKaPaisa Technologies</strong>, hereinafter referred to as "<strong>GharKaPaisa</strong>", "<strong>Company</strong>", "<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>"). These Terms and Conditions constitute a legally binding electronic contract under the <strong>Information Technology Act, 2000</strong>, the rules framed thereunder, and the amended provisions pertaining to electronic records in various statutes as amended by the Information Technology Act, 2000.
          </p>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            By registering, accessing, browsing, or utilizing our website (<a href="https://gharkapaisa.in" target="_blank" rel="noreferrer" style={{ color: C.teal, fontWeight: 600 }}>https://gharkapaisa.in</a>), web portals, partner dashboards, APIs, or mobile applications (collectively, the "<strong>Platform</strong>"), you explicitly agree to comply with and be bound by these Terms and Conditions, our Privacy Policy, Cancellation & Refund Policy, and any product-specific terms. If you do not agree to these terms in their entirety, you must immediately discontinue using our Platform.
          </p>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
            GharKaPaisa operates as a digital financial marketplace and corporate Direct Selling Agent (DSA) / technology facilitator connecting customers with Reserve Bank of India (RBI) regulated commercial banks, Non-Banking Financial Companies (NBFCs), and institutional lending partners for products including Credit Cards, Personal Loans, Business Loans, Home Loans, Loan Against Property, and related financial services. GharKaPaisa is not a bank or an NBFC itself and does not directly disburse loans or issue credit cards.
          </p>
        </>
      )
    },
    {
      id: 'eligibility',
      number: '2',
      title: 'User Eligibility & Account Registration',
      icon: FaUserCheck,
      tags: ['eligibility', 'age', 'registration', 'kyc', 'account'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            Use of the Platform is available only to persons who can form legally binding contracts under the <strong>Indian Contract Act, 1872</strong>. To register an account or apply for financial products through GharKaPaisa, you represent and warrant that:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li>You are at least 18 years of age.</li>
            <li>You are an Indian citizen or a legal tax resident of India.</li>
            <li>You have full legal capacity to enter into binding agreements.</li>
            <li>All registration details, contact numbers, email addresses, and identification documents provided belong to you and are true, accurate, and up-to-date.</li>
            <li>You will maintain the security and confidentiality of your login credentials and immediately notify GharKaPaisa of any unauthorized access.</li>
          </ul>
        </>
      )
    },
    {
      id: 'otp-verification',
      number: '3',
      title: 'OTP (One-Time Password) Verification & Consent Architecture',
      icon: FaKey,
      tags: ['otp', 'one-time password', 'sms', 'whatsapp', 'consent', 'authentication', 'security', 'electronic signature'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            To ensure zero unauthorized fraud, authenticate identity, and record explicit legal consent, GharKaPaisa implements cryptographic One-Time Password (OTP) verification across login, onboarding, application submission, bank document dispatch, and withdrawal requests:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Channels of Dispatch:</strong> OTPs are transmitted via encrypted SMS routes, official WhatsApp Business notifications, and/or verified email addresses provided by you. Standard telecom operator message rates may apply.</li>
            <li><strong>Legal Effect of OTP Submission:</strong> In accordance with Section 10A of the Information Technology Act, 2000, entering the OTP generated and sent to your registered mobile number or email constitutes your <strong>explicit electronic signature and unequivocal consent</strong> to:
              <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
                <li>Submit the credit card or loan application to the designated bank/NBFC.</li>
                <li>Authorize GharKaPaisa and partner institutions to verify identity via NSDL, UIDAI (masked Aadhaar), and credit bureaus.</li>
                <li>Affirm the truthfulness of all financial information submitted.</li>
              </ul>
            </li>
            <li><strong>Expiry & Anti-Tampering:</strong> Each generated OTP is uniquely tied to a session ID, valid for a strictly limited duration (maximum 10 minutes), and will automatically expire after specified incorrect attempts to prevent brute-force attacks.</li>
            <li><strong>Zero-Sharing Security Mandate:</strong> OTPs are strictly confidential. <strong>GharKaPaisa, its employees, partners, agents, or bank representatives will NEVER ask you to disclose your OTP over a phone call, chat, or email.</strong> If you share your OTP with any third party, you assume full and exclusive financial and legal responsibility for any resultant actions or losses.</li>
          </ul>
        </>
      )
    },
    {
      id: 'mobile-communications',
      number: '4',
      title: 'Mobile Number Usage & TRAI / DND Exemption Consent',
      icon: FaMobileAlt,
      tags: ['mobile', 'phone', 'trai', 'dnd', 'calls', 'sms', 'whatsapp', 'ncpr'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            Your mobile number serves as your primary customer identifier on the GharKaPaisa platform. By submitting your mobile number on GharKaPaisa:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Express Consent Overriding DND/NDNC:</strong> You expressly grant GharKaPaisa, its corporate affiliates, authorized DSA partners, verification agencies, and partner Banks/NBFCs permission to contact you via telephone calls, SMS messages, Rich Communication Services (RCS), and WhatsApp notifications regarding your application status, document pickup, verification, loan offers, and servicing updates.</li>
            <li>This consent explicitly supersedes and overrides any registration of your mobile phone number on the <strong>National Do Not Call (NDNC) Registry</strong> or Telecom Regulatory Authority of India (TRAI) <strong>National Customer Preference Register (NCPR)</strong> regulations.</li>
            <li><strong>Accuracy of Mobile Number:</strong> You agree not to provide a phone number that does not belong to you or a temporary burner number. In case of change of mobile number, you must promptly update your profile.</li>
            <li><strong>Opt-Out Mechanism:</strong> You may opt-out of promotional marketing messages at any time by emailing <a href="mailto:support@gharkapaisa.in" style={{ color: C.teal }}>support@gharkapaisa.in</a>. However, essential transactional notices (such as OTPs, application milestone alerts, and security warnings) cannot be opted out of as long as your account remains active.</li>
          </ul>
        </>
      )
    },
    {
      id: 'email-communications',
      number: '5',
      title: 'Email Address Usage & Electronic Documentation',
      icon: FaEnvelope,
      tags: ['email', 'notices', 'statements', 'documentation', 'invoices'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            By registering with GharKaPaisa, you consent to receive electronic communication at your designated email address:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
            <li><strong>Official Communication Medium:</strong> Formal notices, application acknowledgment receipts, digital sanction letters, partner commission invoices, TDS credit notes, and amendments to these Terms will be transmitted electronically via email.</li>
            <li><strong>Proof of Delivery:</strong> Any electronic message sent by GharKaPaisa to your registered email address shall be deemed legally received by you within 24 hours of transmission.</li>
            <li>It is your sole responsibility to ensure that your email inbox is active, capable of receiving emails from <code>@gharkapaisa.in</code>, and regularly checked.</li>
          </ul>
        </>
      )
    },
    {
      id: 'pan-kyc-bureau',
      number: '6',
      title: 'PAN Card Number, Financial KYC & Credit Bureau Inquiries',
      icon: FaIdCard,
      tags: ['pan', 'pan card', 'kyc', 'cibil', 'experian', 'credit score', 'aadhaar', 'nsdl', 'income tax'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            In compliance with the <strong>Reserve Bank of India (Know Your Customer) Directions</strong>, the <strong>Prevention of Money Laundering Act, 2002 (PMLA)</strong>, and statutory tax laws:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Mandatory PAN Collection:</strong> Providing a valid Permanent Account Number (PAN) issued by the Income Tax Department of India is mandatory for evaluating creditworthiness, processing loan and credit card applications, and disbursing partner commissions.</li>
            <li><strong>PAN & Identity Verification:</strong> You authorize GharKaPaisa and its authorized verification partners to authenticate your PAN details directly with NSDL / Protean eGov Technologies and the Income Tax Department database.</li>
            <li><strong>Credit Bureau Consent (CIBIL / Experian / CRIF / Equifax):</strong> You grant explicit and unconditional consent to GharKaPaisa, its partner Banks, and NBFCs to pull your <strong>Credit Information Report (CIR)</strong> and credit score from authorized credit bureaus to determine pre-qualification, interest rate eligibility, and card limits. You acknowledge that multiple hard credit inquiries initiated with different banks within a short window may affect your credit score.</li>
            <li><strong>Aadhaar & Privacy Protections:</strong> When submitting Aadhaar details for Video KYC (VKYC) or identity verification, GharKaPaisa strictly complies with UIDAI guidelines. <strong>Unmasked 12-digit Aadhaar numbers are never stored in plain text.</strong> Supporting documents (salary slips, bank statements, ITR) are encrypted using AES-256 standards in transit and at rest.</li>
          </ul>
        </>
      )
    },
    {
      id: 'payments-and-fees',
      number: '7',
      title: 'Payments, Gateway Processing & Platform Charges',
      icon: FaCreditCard,
      tags: ['payment', 'charges', 'fees', 'gateway', 'razorpay', 'upi', 'cards', 'rbi tokenization'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            GharKaPaisa strives to provide transparent, accessible financial tools:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Free Customer Applications:</strong> GharKaPaisa does not charge retail customers any upfront fee or processing charge merely for browsing, comparing, or submitting standard credit card and loan applications. Any processing fee, documentation charge, or stamp duty levied by the lending Bank/NBFC is directly deducted by the respective institution during loan disbursement or billed in the initial credit card statement.</li>
            <li><strong>Ancillary & Partner Platform Services:</strong> If any paid service (such as detailed credit advisory reports, physical document doorstep pickup, or premium partner onboarding tools) is rendered, the exact non-negotiable fee and applicable GST (18%) will be displayed before checkout.</li>
            <li><strong>Payment Gateway Integration:</strong> All payments are processed through PCI-DSS certified Indian payment aggregators (e.g. Razorpay, Cashfree, UPI, Netbanking). GharKaPaisa complies with RBI Card-on-File Tokenization (CoFT) directives and never stores your CVV or debit/credit card PINs.</li>
            <li><strong>Failed Transactions:</strong> In the event of an erroneous debit or gateway network timeout where funds are deducted without service activation, the amount will be automatically reversed to the originating bank account within 3 to 7 banking days.</li>
          </ul>
        </>
      )
    },
    {
      id: 'incentive-and-commission',
      number: '8',
      title: 'Partner / DSA Incentive & Commission Architecture',
      icon: FaCoins,
      tags: ['incentive', 'commission', 'payout', 'tds', 'section 194h', 'clawback', 'partner', 'dsa'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            GharKaPaisa empowers registered channel partners, Direct Selling Agents (DSAs), employees, and financial advisors through a performance-driven incentive structure:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Earning Eligibility:</strong> Commission and incentive payouts are earned strictly upon verified <strong>successful disbursement of loans or formal issuance and activation of credit cards</strong>, as certified in the official reconciliation MIS provided by partner Banks/NBFCs. Mere lead generation, application punching, or customer document submission does not confer any entitlement to commissions.</li>
            <li><strong>Statutory TDS Deduction (Section 194H / 194J):</strong> In accordance with the Indian Income Tax Act, 1961, <strong>Tax Deducted at Source (TDS)</strong> at the prevailing statutory rate (typically 5% for PAN verified accounts or 20% under Section 206AA in case of invalid/non-furnished PAN) will be deducted prior to credit. TDS certificates (Form 16A) will be issued quarterly.</li>
            <li><strong>Commission Slabs & Modifications:</strong> Commission slabs, incentive matrices, and milestone bonuses are determined based on product categories (Credit Cards, Personal Loans, Business Loans) and are subject to periodic revision based on banking partner commercial agreements.</li>
            <li><strong>Anti-Fraud & Commission Clawback Policy:</strong> GharKaPaisa maintains zero tolerance for fraudulent practices. If an application is found to involve:
              <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
                <li>Fabricated or forged salary slips, PAN, or bank statements.</li>
                <li>Customer identity impersonation or unauthorized application punching.</li>
                <li>Early loan foreclosure or card cancellation within the bank's cooling-off period (30 to 90 days).</li>
                <li>Bank dispute, chargeback, or commission rejection on post-disbursal audit.</li>
              </ul>
              GharKaPaisa reserves the absolute legal right to <strong>clawback, withhold, or debit the entire incentive amount</strong> from the partner's wallet balance or future commission settlements, and initiate appropriate civil and criminal proceedings under the Indian Penal Code.
            </li>
          </ul>
        </>
      )
    },
    {
      id: 'withdrawal-policy',
      number: '9',
      title: 'Partner Wallet Balance & Payout Withdrawal Policy',
      icon: FaMoneyBillWave,
      tags: ['withdrawal', 'wallet', 'payout', 'bank transfer', 'neft', 'imps', 'settlement'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            Channel partners and employees may withdraw approved wallet earnings subject to the following binding conditions:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Mandatory Bank Verification (Penny-Drop Validation):</strong> Payouts can only be made to a valid savings or current account in a scheduled Indian bank. The account holder's name must exactly match the registered partner's PAN name as verified through automated penny-drop validation. Payouts to third-party bank accounts are strictly prohibited.</li>
            <li><strong>Minimum Withdrawal Threshold:</strong> A minimum wallet balance of <strong>₹500 (Rupees Five Hundred Only)</strong> is required to request a withdrawal.</li>
            <li><strong>Settlement Cycles:</strong> Withdrawal requests are processed in regular payout batches via NEFT, IMPS, RTGS, or UPI Payouts within <strong>2 to 5 business days</strong> from the date of the request, excluding bank holidays and weekends.</li>
            <li><strong>Administrative Hold & Freezing:</strong> GharKaPaisa reserves the right to freeze withdrawal privileges and suspend account access if anomalous conversion patterns, duplicate customer data, or KYC discrepancies are detected until satisfactory internal audit clearance.</li>
          </ul>
        </>
      )
    },
    {
      id: 'cancellation-and-refund',
      number: '10',
      title: 'Cancellation & Refund Summary',
      icon: FaUndo,
      tags: ['refund', 'cancellation', 'policy', 'rejection'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            Application cancellation and refund requests are governed by our official <a href="/cancellation-and-refund-policy" onClick={(e) => { e.preventDefault(); navigate('/cancellation-and-refund-policy'); }} style={{ color: C.teal, fontWeight: 600 }}>Cancellation & Refund Policy</a>:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
            <li><strong>Bank Rejection is Non-Refundable:</strong> The final decision regarding loan approval, card issuance, credit limit, and interest rates rests solely with the lending institution. A bank's rejection, sanction of an amount lower than requested, or delay does not constitute service deficiency and is not ground for monetary compensation or refund.</li>
            <li><strong>Duplicate Debits:</strong> Any verified duplicate charge for paid platform services will be refunded within 5 to 7 business days to the original payment source.</li>
          </ul>
        </>
      )
    },
    {
      id: 'prohibited-activities',
      number: '11',
      title: 'Prohibited Conduct & Misuse of Platform',
      icon: FaExclamationTriangle,
      tags: ['prohibited', 'fraud', 'scraping', 'security', 'abuse'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 8px 0' }}>Users and partners must not:</p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
            <li>Submit fraudulent, forged, or altered identification or financial documents.</li>
            <li>Impersonate another individual or apply for loans/cards without express written authorization.</li>
            <li>Use automated bots, web scrapers, spiders, or scripts to harvest rates, bank data, or customer records.</li>
            <li>Bypass or attempt to bypass security authentication mechanisms, OTP gates, or rate-limiting firewalls.</li>
            <li>Engage in abusive, threatening, or extortionate conduct toward GharKaPaisa staff or bank executives.</li>
            <li>Resell, redistribute, or reverse engineer platform source code, APIs, or proprietary algorithm data.</li>
          </ul>
        </>
      )
    },
    {
      id: 'disclaimer-liability',
      number: '12',
      title: 'Disclaimers & Limitation of Liability',
      icon: FaShieldAlt,
      tags: ['disclaimer', 'liability', 'indemnity', 'warranties'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            The Platform and its services are provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied. To the fullest extent permissible under Indian law:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
            <li>GharKaPaisa disclaims all liability for rejection of credit applications, reduction in loan amounts, credit bureau score recalculations, or delays caused by third-party banking servers.</li>
            <li>In no event shall GharKaPaisa, its directors, officers, employees, or partners be liable for any indirect, punitive, incidental, special, or consequential damages resulting from platform downtime, telecom SMS gateway failures, or banking API latency.</li>
            <li>Our aggregate liability for any proven claim arising out of your platform use shall be strictly limited to the direct fees paid by you to GharKaPaisa, if any, in the preceding three (3) months.</li>
          </ul>
        </>
      )
    },
    {
      id: 'governing-law',
      number: '13',
      title: 'Governing Law & Dispute Resolution',
      icon: FaGlobe,
      tags: ['governing law', 'jurisdiction', 'pune', 'arbitration', 'courts'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            These Terms and Conditions shall be governed by, construed, and enforced in accordance with the substantive laws of India.
          </p>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
            Any dispute, controversy, or claim arising out of or relating to these terms shall be settled through mutual good-faith negotiations failing which it shall be referred to arbitration under the <strong>Arbitration and Conciliation Act, 1996</strong> before a sole arbitrator appointed by GharKaPaisa. The seat and venue of arbitration shall be Pune, Maharashtra, and the proceedings shall be conducted in the English language. Subject to arbitration, the courts of competent jurisdiction at <strong>Pune, Maharashtra, India</strong> shall have exclusive jurisdiction.
          </p>
        </>
      )
    },
    {
      id: 'contact-grievance',
      number: '14',
      title: 'Grievance Officer & Official Company Contact',
      icon: FaMapMarkerAlt,
      tags: ['contact', 'grievance', 'support', 'email', 'phone', 'address'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            In accordance with the <strong>Information Technology Act, 2000</strong> and the <strong>Consumer Protection (E-Commerce) Rules, 2020</strong>, the contact details of the Company and its designated Grievance Officer are:
          </p>
          <div style={{ background: isDark ? '#0f172a' : C.bgSecondary, border: `1px solid ${C.border}`, padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
            <div style={{ fontWeight: 800, color: C.teal, fontSize: '16px' }}>GharKaPaisa Technologies</div>
            <div><FaGlobe style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Website:</strong> <a href="https://gharkapaisa.in" target="_blank" rel="noreferrer" style={{ color: C.teal }}>https://gharkapaisa.in</a></div>
            <div><FaEnvelope style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Support Email:</strong> <a href="mailto:support@gharkapaisa.in" style={{ color: C.teal }}>support@gharkapaisa.in</a></div>
            <div><FaEnvelope style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Grievance Email:</strong> <a href="mailto:grievance@gharkapaisa.in" style={{ color: C.teal }}>grievance@gharkapaisa.in</a></div>
            <div><FaPhone style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Customer Helpline:</strong> <a href="tel:9270319438" style={{ color: C.teal }}>+91 9270319438</a></div>
            <div><FaMapMarkerAlt style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Corporate Office:</strong> Rajnandini Tower Dighi, Pune, Maharashtra 411015, India</div>
            <div style={{ fontSize: '13px', color: C.textLight, marginTop: '6px' }}>Grievances are acknowledged within 24–48 working hours and resolved within 15 working days.</div>
          </div>
        </>
      )
    }
  ], [C, isDark, navigate]);

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
              <h1 style={{ fontSize: '26px', fontWeight: 900, color: C.text, margin: 0 }}>Terms & Conditions of Service</h1>
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
            { id: 'terms', label: 'Terms & Conditions', path: '/terms-and-conditions', active: true },
            { id: 'privacy', label: 'Privacy Policy', path: '/privacy-policy', active: false },
            { id: 'refund', label: 'Cancellation & Refund', path: '/cancellation-and-refund-policy', active: false },
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
            placeholder="Search features (e.g., OTP, Mobile, PAN, Incentives, Withdrawal, TDS, Refunds)..."
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
          <span style={{ fontSize: '12px', fontWeight: 700, color: C.textLight, display: 'flex', alignItems: 'center' }}>Popular Features:</span>
          {['OTP Verification', 'Mobile Number & DND', 'Email Usage', 'PAN & Credit Bureau', 'Payments & Charges', 'Incentives & TDS', 'Withdrawal Rules', 'Grievance Desk'].map(tag => (
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
              Statutory Disclosure & Regulatory Transparency
            </div>
            <strong>GharKaPaisa</strong> is a technology-enabled financial distribution and marketing facilitator. We partner with RBI-licensed Banks, NBFCs, and financial institutions to bring transparent credit solutions to customers across India. All credit card approvals, loan sanctions, interest rates, and loan disbursements are governed strictly by the respective regulated lending entities.
            <div style={{ marginTop: '8px', fontSize: '12px', color: C.textLight }}>
              <strong>Effective Date:</strong> November 15, 2026 | <strong>Version:</strong> 2.4 (Incorporating DPDP Act 2023 & RBI Digital Lending Guidelines)
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
              <div style={{ fontSize: '13px', marginTop: '6px' }}>Try searching for "OTP", "PAN", "Withdrawal", "Incentive", or "Refund".</div>
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
            <span onClick={() => navigate('/privacy-policy')} style={{ color: C.teal, cursor: 'pointer', fontWeight: 600 }}>Privacy Policy</span> • 
            <span onClick={() => navigate('/cancellation-and-refund-policy')} style={{ color: C.teal, cursor: 'pointer', fontWeight: 600, marginLeft: '8px' }}>Cancellation & Refund Policy</span> • 
            <span onClick={() => navigate('/shipping-and-delivery-policy')} style={{ color: C.teal, cursor: 'pointer', fontWeight: 600, marginLeft: '8px' }}>Shipping & Delivery Policy</span>
          </div>
        </div>

      </div>
    </div>
  );
}

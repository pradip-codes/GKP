import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  FaArrowLeft, FaShieldAlt, FaEnvelope, FaPhone, FaMapMarkerAlt, 
  FaGlobe, FaLock, FaKey, FaMobileAlt, FaIdCard, FaCreditCard, 
  FaCoins, FaMoneyBillWave, FaSearch, FaPrint, FaUserShield,
  FaServer, FaDatabase, FaHistory, FaUserCheck
} from 'react-icons/fa';

export default function PrivacyPolicy() {
  const { C, isDark } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const sections = useMemo(() => [
    {
      id: 'commitment-and-scope',
      number: '1',
      title: 'Our Commitment to Data Privacy & Statutory Scope',
      icon: FaShieldAlt,
      tags: ['dpdp act', 'privacy', 'fiduciary', 'rbi', 'scope', 'it act'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            At <strong>GharKaPaisa</strong> (operated under <strong>GharKaPaisa Technologies</strong>, hereinafter referred to as "<strong>GharKaPaisa</strong>", "<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>"), we prioritize the security, confidentiality, and protection of your personal and financial information.
          </p>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            This Privacy Policy sets out the practices and principles governing the collection, processing, storage, and sharing of personal data across our website (<a href="https://gharkapaisa.in" target="_blank" rel="noreferrer" style={{ color: C.teal, fontWeight: 600 }}>https://gharkapaisa.in</a>), mobile applications, customer portals, partner dashboards, and APIs (collectively, the "<strong>Platform</strong>").
          </p>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
            This policy is formulated in strict compliance with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, the <strong>Information Technology Act, 2000</strong>, the <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 (SPDI Rules)</strong>, and the <strong>Reserve Bank of India (RBI) Guidelines on Digital Lending</strong>. In accordance with applicable Indian laws, GharKaPaisa acts as a <strong>Data Fiduciary</strong> regarding data processed through our Platform.
          </p>
        </>
      )
    },
    {
      id: 'information-we-collect',
      number: '2',
      title: 'Categories of Information We Collect',
      icon: FaDatabase,
      tags: ['data', 'collect', 'personal', 'employment', 'financial', 'kyc', 'telemetry'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            Depending on your relationship with GharKaPaisa (e.g., loan applicant, credit card customer, channel partner, DSA, or platform visitor), we collect the following categories of information:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '12px' }}>
            
            <div style={{ background: isDark ? '#1e293b' : '#f8fafc', padding: '16px', borderRadius: '14px', border: `1px solid ${C.border}` }}>
              <div style={{ fontWeight: 700, color: C.teal, marginBottom: '6px', fontSize: '14px' }}>1. Personal & Contact Identifiers</div>
              <ul style={{ paddingLeft: '18px', margin: 0, color: C.textMid, fontSize: '13px', lineHeight: 1.7 }}>
                <li>Full legal name, father’s/spouse's name, gender</li>
                <li>Date of birth & marital status</li>
                <li>Mobile number & alternate phone numbers</li>
                <li>Personal & business email addresses</li>
                <li>Current & permanent residential address with pincode</li>
              </ul>
            </div>

            <div style={{ background: isDark ? '#1e293b' : '#f8fafc', padding: '16px', borderRadius: '14px', border: `1px solid ${C.border}` }}>
              <div style={{ fontWeight: 700, color: C.teal, marginBottom: '6px', fontSize: '14px' }}>2. Government KYC & Financial Identifiers</div>
              <ul style={{ paddingLeft: '18px', margin: 0, color: C.textMid, fontSize: '13px', lineHeight: 1.7 }}>
                <li>Permanent Account Number (PAN)</li>
                <li>Masked Aadhaar details (strictly UIDAI compliant)</li>
                <li>Passport, Voter ID, or Driving License (where provided)</li>
                <li>Bank account number, account holder name, & IFSC code</li>
                <li>Salary slips, Form 16, & Income Tax Returns (ITR)</li>
              </ul>
            </div>

            <div style={{ background: isDark ? '#1e293b' : '#f8fafc', padding: '16px', borderRadius: '14px', border: `1px solid ${C.border}` }}>
              <div style={{ fontWeight: 700, color: C.teal, marginBottom: '6px', fontSize: '14px' }}>3. Employment & Professional Data</div>
              <ul style={{ paddingLeft: '18px', margin: 0, color: C.textMid, fontSize: '13px', lineHeight: 1.7 }}>
                <li>Employment type (Salaried, Self-Employed, Professional)</li>
                <li>Employer / company name & office address</li>
                <li>Work email address & total work experience</li>
                <li>Monthly net take-home salary or annual turnover</li>
              </ul>
            </div>

            <div style={{ background: isDark ? '#1e293b' : '#f8fafc', padding: '16px', borderRadius: '14px', border: `1px solid ${C.border}` }}>
              <div style={{ fontWeight: 700, color: C.teal, marginBottom: '6px', fontSize: '14px' }}>4. Technical, Device & Bureau Telemetry</div>
              <ul style={{ paddingLeft: '18px', margin: 0, color: C.textMid, fontSize: '13px', lineHeight: 1.7 }}>
                <li>IP address, browser type, & operating system</li>
                <li>Device identifiers & session timestamps</li>
                <li>Approximate geographic location (for fraud prevention)</li>
                <li>Credit Information Report (CIR) from CIBIL/Experian</li>
              </ul>
            </div>

          </div>
        </>
      )
    },
    {
      id: 'otp-privacy-policy',
      number: '3',
      title: 'OTP (One-Time Password) Privacy & Authentication Security',
      icon: FaKey,
      tags: ['otp', 'authentication', 'security', 'sms', 'whatsapp', 'consent', 'it act'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            GharKaPaisa utilizes cryptographically secure One-Time Passwords (OTPs) to authenticate logins, verify ownership of contact information, record digital consent for loan/card applications, and approve partner wallet withdrawals:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Purpose Limitation:</strong> OTP data is collected solely for two-factor authentication (2FA), electronic signature logging under Section 10A of the IT Act 2000, and fraud prevention.</li>
            <li><strong>Ephemeral In-Memory Storage:</strong> Generated OTP codes are securely hashed, stored in memory for a maximum validity window of 10 minutes, and expunged immediately upon successful verification or expiry. <strong>Plaintext OTPs are never stored in databases or permanent logs.</strong></li>
            <li><strong>Encrypted Transmission:</strong> OTPs are transmitted via secure, TLS-encrypted channels to licensed telecom SMS gateways, official Meta/WhatsApp Business Cloud APIs, or AWS Simple Email Service (SES).</li>
            <li><strong>Zero Third-Party Sharing:</strong> OTP information is never shared with, sold to, or accessible by any unauthorized third party, advertiser, or corporate affiliate.</li>
          </ul>
        </>
      )
    },
    {
      id: 'mobile-privacy-policy',
      number: '4',
      title: 'Mobile Number Privacy & TRAI / DND Communication Governance',
      icon: FaMobileAlt,
      tags: ['mobile', 'phone', 'dnd', 'calls', 'sms', 'whatsapp', 'trai'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            Your mobile phone number serves as your unique account anchor. We manage mobile data under strict privacy standards:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Transactional Communications:</strong> We use your verified mobile number to transmit critical application tracking updates, verification appointment schedules, bank sanction letters, and security alerts via SMS, WhatsApp, and phone calls.</li>
            <li><strong>Express Consent & DND/NCPR Exemption:</strong> By submitting your mobile number on GharKaPaisa, you provide unambiguous authorization to receive communications from GharKaPaisa and participating lending institutions, overriding any registration on the National Do Not Call (NDNC) or TRAI National Customer Preference Register (NCPR).</li>
            <li><strong>Protection Against Spam:</strong> We enforce strict internal anti-spam controls. We do not sell your mobile phone number to telemarketing databases or lead resellers.</li>
            <li><strong>Revocation of Promotional Communications:</strong> While transactional messages are mandatory to operate your account, you can opt out of promotional offers at any time by emailing <a href="mailto:support@gharkapaisa.in" style={{ color: C.teal }}>support@gharkapaisa.in</a> or following the unsubscribe instructions in our messages.</li>
          </ul>
        </>
      )
    },
    {
      id: 'email-privacy-policy',
      number: '5',
      title: 'Email Address Usage & Confidential Digital Delivery',
      icon: FaEnvelope,
      tags: ['email', 'delivery', 'confidential', 'statements', 'notices'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            We handle your registered email address with utmost confidentiality:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
            <li><strong>Confidential Document Dispatch:</strong> Email is used for the transmission of sensitive records including application receipts, partner commission credit advice, quarterly TDS certificates (Form 16A), password reset links, and formal grievance resolutions.</li>
            <li><strong>Spam Prevention:</strong> We do not engage in third-party list sharing or unsolicited spam. All outgoing emails originate from authenticated domains (<code>gharkapaisa.in</code>) equipped with SPF, DKIM, and DMARC cryptographic email verification protocols.</li>
            <li><strong>User Choice:</strong> You have the option to unsubscribe from marketing newsletters while maintaining critical operational delivery for ongoing financial applications.</li>
          </ul>
        </>
      )
    },
    {
      id: 'pan-and-kyc-privacy',
      number: '6',
      title: 'PAN Card Number, Financial KYC & Credit Bureau Privacy',
      icon: FaIdCard,
      tags: ['pan', 'kyc', 'cibil', 'experian', 'aadhaar', 'nsdl', 'bureau', 'income tax'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            Given the highly sensitive nature of financial identifiers, GharKaPaisa adheres to stringent legal safeguards regarding PAN, Aadhaar, and credit bureau data:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Statutory Verification:</strong> Your Permanent Account Number (PAN) is utilized strictly for identity authentication with NSDL / Protean eGov Technologies, creditworthiness assessment with partner Banks/NBFCs, and mandatory statutory reporting of Tax Deducted at Source (TDS) under Section 194H/194J to the Income Tax Department.</li>
            <li><strong>Credit Bureau Data (CIBIL / Experian / CRIF / Equifax):</strong> With your explicit consent recorded via OTP, we request your credit information report from authorized credit bureaus. This report is used solely to evaluate eligibility for requested financial products. GharKaPaisa never alters, resells, or exposes your credit score report to unauthorized entities.</li>
            <li><strong>UIDAI & Aadhaar Compliance:</strong> In accordance with UIDAI regulations, GharKaPaisa does not store full unmasked 12-digit Aadhaar numbers. During Video KYC (VKYC) or offline paperless Aadhaar verification, only masked Aadhaar numbers (displaying only the last 4 digits) or cryptographic reference tokens are processed.</li>
            <li><strong>Document Encryption:</strong> Sensitive documents such as bank statements, ITR filings, and salary slips uploaded to our portal are stored in dedicated AWS S3 buckets protected by AES-256 Server-Side Encryption with strict role-based access control (IAM).</li>
          </ul>
        </>
      )
    },
    {
      id: 'payments-and-financial-privacy',
      number: '7',
      title: 'Payment Data Privacy & RBI Tokenization Compliance',
      icon: FaCreditCard,
      tags: ['payment', 'tokenization', 'card', 'rbi', 'pci-dss', 'razorpay'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            Payment security is fundamental to our platform:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
            <li><strong>Zero Storage of Raw Card Data:</strong> GharKaPaisa does NOT store, log, or have access to your debit or credit card CVV codes, ATM PINs, or Netbanking passwords.</li>
            <li><strong>RBI Card-on-File Tokenization (CoFT):</strong> Where card transactions occur, we partner with RBI-authorized payment aggregators (e.g. Razorpay, Cashfree) that tokenize card details into randomized tokens, ensuring your actual card number is never exposed across the web.</li>
            <li><strong>PCI-DSS Certified Rails:</strong> All monetary transactions are processed across end-to-end TLS 1.3 encrypted sockets directly handled by PCI-DSS Level 1 certified gateway processors.</li>
          </ul>
        </>
      )
    },
    {
      id: 'incentives-and-withdrawals-privacy',
      number: '8',
      title: 'Partner Incentive, Commission & Withdrawal Data Privacy',
      icon: FaCoins,
      tags: ['incentive', 'withdrawal', 'wallet', 'tds', 'bank account', 'penny-drop'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            For channel partners, DSAs, and agents earning commissions through GharKaPaisa:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Bank Account Verification Data:</strong> When you provide your bank account number and IFSC code for withdrawal of wallet earnings, we perform an automated <strong>penny-drop verification</strong> via banking APIs to ensure the account holder name matches your verified PAN. This data is stored in encrypted form and used solely for NEFT/IMPS/UPI payout settlements.</li>
            <li><strong>Statutory Tax Records:</strong> Commission statements and TDS deduction ledgers are maintained in compliance with the Income Tax Act, 1961, and are periodically transmitted to the Income Tax Department for filing quarterly Form 24Q / 26Q returns.</li>
            <li><strong>Audit & Anti-Money Laundering (PMLA):</strong> Commission transaction logs, withdrawal timestamps, and associated bank disbursement IDs are preserved for mandatory regulatory compliance under the Prevention of Money Laundering Act, 2002.</li>
          </ul>
        </>
      )
    },
    {
      id: 'how-we-share-data',
      number: '9',
      title: 'Lawful Sharing of Data & Third-Party Safeguards',
      icon: FaServer,
      tags: ['sharing', 'banks', 'nbfcs', 'third party', 'statutory', 'aws'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            We share your personal information only to the minimum extent necessary to deliver the financial services requested by you:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>Participating Banks & NBFCs:</strong> When you apply for a credit card or loan, your application data and documents are transmitted securely to the selected institutional lender (e.g. HDFC Bank, ICICI Bank, SBI Cards, Axis Bank, Kotak Mahindra Bank, IDFC First Bank, Bajaj Finance) for credit assessment, underwriting, and card/loan issuance.</li>
            <li><strong>Credit Bureaus:</strong> Upon your authorization, data is shared with CIBIL, Experian, CRIF High Mark, and Equifax to pull credit scores.</li>
            <li><strong>Infrastructure & Technology Sub-processors:</strong> We utilize secure enterprise cloud infrastructure hosted in Amazon Web Services (AWS) data centers in <strong>ap-south-1 (Mumbai, India)</strong>, ensuring data remains localized within India.</li>
            <li><strong>Statutory & Legal Requirements:</strong> We may disclose information if required to do so by applicable Indian law, court subpoena, regulatory mandate by the Reserve Bank of India, or lawful order of law enforcement authorities.</li>
            <li><strong>WE NEVER SELL YOUR DATA:</strong> GharKaPaisa does not sell, rent, or trade your personal information to third-party telemarketers or external advertisers for unrequested solicitations.</li>
          </ul>
        </>
      )
    },
    {
      id: 'data-security-retention',
      number: '10',
      title: 'Data Security Architecture & Retention Schedule',
      icon: FaLock,
      tags: ['security', 'encryption', 'aes-256', 'tls', 'retention', 'aws mumbai'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            We implement comprehensive technical, physical, and administrative safeguards:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: '0 0 12px 0' }}>
            <li><strong>End-to-End Cryptography:</strong> All communications between your browser/app and our servers are encrypted using Transport Layer Security (TLS 1.3). Database volumes and customer documents are encrypted at rest using AES-256.</li>
            <li><strong>Indian Data Localization:</strong> All production databases, document repositories, and core processing engines reside exclusively within Indian territorial jurisdiction (AWS Asia Pacific - Mumbai region).</li>
            <li><strong>Statutory Retention Requirements:</strong> As a regulated financial facilitator, we are mandated under RBI guidelines and the Prevention of Money Laundering Act, 2002, to retain customer KYC records, application files, and financial transaction histories for a <strong>minimum period of 5 to 8 years</strong> from the date of the transaction or termination of the customer relationship. Data exceeding statutory mandates is purged securely.</li>
          </ul>
        </>
      )
    },
    {
      id: 'your-dpdp-rights',
      number: '11',
      title: 'Your Legal Rights under the DPDP Act, 2023',
      icon: FaUserShield,
      tags: ['dpdp rights', 'access', 'correction', 'erasure', 'grievance', 'nominate'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            As a Data Principal under the Digital Personal Data Protection Act, 2023, you are entitled to the following rights:
          </p>
          <ul style={{ paddingLeft: '20px', color: C.textMid, fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
            <li><strong>Right to Access Information:</strong> You may request a summary of the personal data held about you and the processing activities undertaken.</li>
            <li><strong>Right to Correction & Updating:</strong> You may request the correction of inaccurate or incomplete personal data.</li>
            <li><strong>Right to Erasure:</strong> You may request erasure of personal data that is no longer required for the purpose for which it was collected, subject to statutory retention obligations under banking, tax, and anti-money laundering laws.</li>
            <li><strong>Right to Grievance Redressal:</strong> You have the right to register a complaint with our designated Grievance Officer and subsequently with the Data Protection Board of India.</li>
            <li><strong>Right to Nominate:</strong> You have the right to nominate an individual to exercise your data rights in the event of death or incapacity.</li>
          </ul>
        </>
      )
    },
    {
      id: 'grievance-and-contact',
      number: '12',
      title: 'Designated Grievance Redressal Officer & Company Contact',
      icon: FaMapMarkerAlt,
      tags: ['grievance officer', 'contact', 'dpo', 'support', 'pune', 'email'],
      content: (
        <>
          <p style={{ color: C.textMid, fontSize: '14px', lineHeight: 1.7, margin: '0 0 12px 0' }}>
            In accordance with Rule 5(9) of the SPDI Rules and the Digital Personal Data Protection Act, 2023, the details of our official Data Protection & Grievance Redressal Officer are:
          </p>
          <div style={{ background: isDark ? '#0f172a' : C.bgSecondary, border: `1px solid ${C.border}`, padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
            <div style={{ fontWeight: 800, color: C.teal, fontSize: '16px' }}>GharKaPaisa Technologies — Grievance Redressal Cell</div>
            <div><FaGlobe style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Official Portal:</strong> <a href="https://gharkapaisa.in" target="_blank" rel="noreferrer" style={{ color: C.teal }}>https://gharkapaisa.in</a></div>
            <div><FaEnvelope style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Privacy & Grievance Email:</strong> <a href="mailto:grievance@gharkapaisa.in" style={{ color: C.teal }}>grievance@gharkapaisa.in</a></div>
            <div><FaEnvelope style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Customer Support:</strong> <a href="mailto:support@gharkapaisa.in" style={{ color: C.teal }}>support@gharkapaisa.in</a></div>
            <div><FaPhone style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Helpline Number:</strong> <a href="tel:9270319438" style={{ color: C.teal }}>+91 9270319438</a></div>
            <div><FaMapMarkerAlt style={{ display: 'inline', marginRight: 8, color: C.teal }} /> <strong>Registered Address:</strong> Rajnandini Tower Dighi, Pune, Maharashtra 411015, India</div>
            <div style={{ fontSize: '13px', color: C.textLight, marginTop: '6px' }}>
              All privacy requests and grievances are acknowledged within <strong>24 to 48 hours</strong> and resolved within <strong>15 business days</strong>.
            </div>
          </div>
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
              <h1 style={{ fontSize: '26px', fontWeight: 900, color: C.text, margin: 0 }}>Privacy Policy & Data Protection</h1>
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
            { id: 'privacy', label: 'Privacy Policy', path: '/privacy-policy', active: true },
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
            placeholder="Search privacy topics (e.g., OTP, Mobile, PAN, Aadhaar, Credit Bureau, Withdrawals)..."
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
          <span style={{ fontSize: '12px', fontWeight: 700, color: C.textLight, display: 'flex', alignItems: 'center' }}>Features Covered:</span>
          {['OTP Privacy', 'Mobile Number & DND', 'Email Protection', 'PAN & Aadhaar', 'Payment Tokenization', 'Withdrawal Bank Data', 'DPDP Act Rights', 'Grievance Officer'].map(tag => (
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
          <FaLock style={{ color: C.teal, fontSize: '24px', marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: '15px', marginBottom: '4px' }}>
              Digital Personal Data Protection (DPDP) Compliance
            </div>
            GharKaPaisa is strictly committed to protecting customer confidentiality. We process personal and financial data solely with your informed consent and for statutory banking facilitation purposes. We maintain bank-grade 256-bit AES encryption across Indian cloud infrastructure and do not sell data to third-party telemarketers.
            <div style={{ marginTop: '8px', fontSize: '12px', color: C.textLight }}>
              <strong>Last Updated:</strong> November 15, 2026 | <strong>Version:</strong> 2.4 (DPDP Act 2023 & RBI Digital Lending Standards)
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
              <div style={{ fontSize: '13px', marginTop: '6px' }}>Try searching for "OTP", "PAN", "Aadhaar", "Withdrawal", or "Security".</div>
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
            <span onClick={() => navigate('/cancellation-and-refund-policy')} style={{ color: C.teal, cursor: 'pointer', fontWeight: 600, marginLeft: '8px' }}>Cancellation & Refund Policy</span> • 
            <span onClick={() => navigate('/shipping-and-delivery-policy')} style={{ color: C.teal, cursor: 'pointer', fontWeight: 600, marginLeft: '8px' }}>Shipping & Delivery Policy</span>
          </div>
        </div>

      </div>
    </div>
  );
}

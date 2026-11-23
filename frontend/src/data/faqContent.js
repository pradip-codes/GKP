// Shared FAQ content — used by the public home/contact pages and every role panel
// (partner, employee, admin, HR, super-admin) so answers stay consistent everywhere.

export const FAQ_CATEGORIES = [
  {
    id: 'general',
    label: 'General',
    items: [
      { q: 'What is GharKaPaisa?', a: 'GharKaPaisa is a financial product discovery and application platform. We help customers compare and apply for credit cards, loans, insurance and other financial products from partner banks — and help employees, partners and HR teams manage the journey from lead to disbursal.' },
      { q: 'How do I create an account?', a: 'Click Register, enter your name, mobile number and email, verify the OTP sent to your phone, and set a password. Your account is activated once KYC details are verified.' },
      { q: 'I forgot my password. What should I do?', a: 'Click "Forgot Password" on the login screen, enter your registered mobile or email, verify the OTP and set a new password. If password attempts are exhausted, you can log in using OTP directly.' },
      { q: 'How do I contact support?', a: 'Raise a ticket from the Support section in the app or website, or email support@gharkapaisa.in. Employees can also reach HR from Settings → Help & Support.' },
      { q: 'Is my data secure?', a: 'Yes. We use encryption in transit and at rest, OTP-based verification, role-based access control and masking for sensitive fields like mobile numbers and PAN.' },
    ],
  },
  {
    id: 'credit-cards',
    label: 'Credit Cards',
    items: [
      { q: 'How do I apply for a credit card?', a: 'Step 1: Open Credit Cards. Step 2: Filter by bank, rewards or eligibility. Step 3: Click Apply Now and complete the form. Step 4: Upload documents if asked. Step 5: Track status under My Applications.' },
      { q: 'What documents are required?', a: 'Usually PAN card, Aadhaar for KYC, income proof (salary slip or ITR) and a passport-size photo. Pre-approved offers may need fewer documents.' },
      { q: 'How long does approval take?', a: 'Pre-approved applications can be approved within minutes; standard applications typically take 24–72 hours depending on bank verification.' },
      { q: 'Why was my card application rejected?', a: 'Common reasons: low credit score, incomplete KYC, PAN/Aadhaar mismatch, or existing limits with the bank. You can re-apply after improving eligibility or choose another card.' },
      { q: 'What is a lifetime free credit card?', a: 'A lifetime free card has zero joining fee and zero annual fee for life — no spending requirement to waive it.' },
    ],
  },
  {
    id: 'loans',
    label: 'Loans',
    items: [
      { q: 'How do I apply for a personal loan?', a: 'Step 1: Go to Loans and pick a product. Step 2: Use the eligibility checker or EMI calculator. Step 3: Fill personal, employment and bank details. Step 4: Upload documents and submit. Step 5: Track status in My Applications.' },
      { q: 'What is the minimum CIBIL score needed?', a: 'Most partner banks require 700+. Some products accept 650+ with additional conditions like higher income proof or a co-applicant.' },
      { q: 'How is my EMI calculated?', a: 'EMI = P × r × (1+r)^n / ((1+r)^n − 1). Use the in-app EMI calculator for exact figures including processing fees.' },
      { q: 'What documents are needed for a loan?', a: 'PAN, Aadhaar, address proof, income proof (salary slips / bank statements / ITR) and photos. Self-employed applicants usually need 2 years of ITR.' },
      { q: 'Can I prepay or foreclose my loan?', a: 'Yes, most loans allow prepayment or foreclosure. Charges, if any, are stated in your sanction letter and loan agreement.' },
    ],
  },
  {
    id: 'insurance',
    label: 'Insurance',
    items: [
      { q: 'What types of insurance can I buy here?', a: 'Term life, health, motor, travel and general insurance from partner insurers. Compare premiums, coverage and claim settlement ratios before applying.' },
      { q: 'How does claim settlement work?', a: 'Cashless claims settle directly with network hospitals/partners. Reimbursement claims require upfront payment; the insurer settles after verification, typically in 15–30 days.' },
      { q: 'What is a waiting period in health insurance?', a: 'The period after policy start during which specific illnesses (e.g., pre-existing conditions) are not covered — usually 2–4 years for pre-existing diseases.' },
      { q: 'Can I port my existing policy?', a: 'Yes, health insurance portability lets you switch insurers without losing waiting-period benefits. Apply at least 45 days before renewal.' },
    ],
  },
  {
    id: 'employee',
    label: 'Employee Panel',
    items: [
      { q: 'How do I mark my attendance?', a: 'Step 1: Open Attendance. Step 2: Complete face verification if prompted. Step 3: Tap Start Work to check in and End Work to check out. Keep location permission on if your office uses geofencing.' },
      { q: 'Where can I see my attendance history?', a: 'Attendance → "View Attendance History". Switch months with the selector and tap any record for verification details.' },
      { q: 'How are incentives calculated?', a: 'Incentives are computed from approved applications per the bonus rules for your department and bank targets. See My Incentives → Monthly Audit for the breakdown and the ledger for every credit.' },
      { q: 'Where do I find my payslips?', a: 'My Salary & Payslips (or Settings → Payroll). Select the month and download the payslip PDF; salary structure and PF/tax details are listed there too.' },
      { q: 'How do I invite a candidate or partner?', a: 'Open the menu and choose "Invite Employee / Candidate" or "Invite Partner", then share the generated referral link.' },
      { q: 'My attendance is not marking. What should I check?', a: 'Confirm face verification is complete, location permission is granted, and you are inside the office geofence during working hours. If it persists, raise a ticket from Support.' },
    ],
  },
  {
    id: 'partner',
    label: 'Partner Panel',
    items: [
      { q: 'How do I add a lead?', a: 'Tap the "+" button in the bottom navigation (Add Lead), fill the customer\'s details, select the product and submit. The lead appears in your Applications/Leads list immediately.' },
      { q: 'How do I track my commissions?', a: 'Open Reports or Wallet from the More menu. Commissions appear once the bank approves the application; pending amounts show under hold and release per the commission cycle.' },
      { q: 'How do I withdraw my earnings?', a: 'Go to Wallet → Withdraw. Add/verify your bank account first, then request a payout. Withdrawals process after the standard holding period.' },
      { q: 'Why is my lead not showing?', a: 'Check the application was submitted with the correct product and your partner account is active. Leads created under a different role appear in that role\'s queue.' },
      { q: 'How do team members work under me?', a: 'Team members you add share your downline structure. Their applications and commissions roll up to your reports per the configured hierarchy.' },
    ],
  },
];

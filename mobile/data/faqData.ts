export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  icon: string;
  items: FaqItem[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'general',
    label: 'General',
    icon: 'help-circle',
    items: [
      { q: 'What is GharKaPaisa?', a: 'GharKaPaisa is a financial product discovery and application platform. We help customers compare and apply for credit cards, loans, insurance and other financial products from partner banks, and we help employees, partners and HR teams manage the entire journey from lead to disbursal.' },
      { q: 'How do I create an account?', a: 'Tap Register on the login screen, enter your name, mobile number and email, verify the OTP sent to your phone, and set a password. Your account is activated once KYC details are verified by the team.' },
      { q: 'I forgot my password. What should I do?', a: 'On the login screen tap "Forgot Password", enter your registered mobile or email, verify the OTP, and set a new password. If you have failed password attempts, you can also log in using OTP directly.' },
      { q: 'How do I contact support?', a: 'Use the Support section in the app or website to raise a ticket, or reach us at support@gharkapaisa.in. Employees can also contact HR directly from Settings → Help & Support.' },
      { q: 'Is my data secure?', a: 'Yes. We use bank-grade encryption, OTP-based verification, role-based access control and data masking for sensitive fields like mobile numbers and PAN.' },
    ],
  },
  {
    id: 'credit-cards',
    label: 'Credit Cards',
    icon: 'card',
    items: [
      { q: 'How do I apply for a credit card?', a: 'Step 1: Open the Credit Cards section. Step 2: Browse or filter cards by bank, reward type or eligibility. Step 3: Tap Apply Now and complete the application form. Step 4: Upload required documents if asked. Step 5: Track the status anytime under My Applications.' },
      { q: 'What documents are required?', a: 'Usually you need a PAN card, Aadhaar (for KYC), income proof (salary slip or ITR) and a passport-size photo. Some pre-approved offers may need fewer documents.' },
      { q: 'How long does approval take?', a: 'Pre-approved applications can be approved within minutes. Standard applications typically take 24–72 hours depending on the bank\'s verification process.' },
      { q: 'Why was my card application rejected?', a: 'Common reasons include low credit score, incomplete KYC, mismatched PAN/Aadhaar details or existing card limits with the bank. You can re-apply after improving eligibility or choose another card.' },
      { q: 'What is a lifetime free credit card?', a: 'A lifetime free card has zero joining fee and zero annual fee for life — no spending requirement to waive the fee.' },
    ],
  },
  {
    id: 'loans',
    label: 'Loans',
    icon: 'cash',
    items: [
      { q: 'How do I apply for a personal loan?', a: 'Step 1: Go to Loans and pick a product. Step 2: Use the eligibility checker or EMI calculator to estimate your offer. Step 3: Fill the application with personal, employment and bank details. Step 4: Upload documents and submit. Step 5: Track status in My Applications.' },
      { q: 'What is the minimum CIBIL score needed?', a: 'Most partner banks require a CIBIL score of 700 or above. Some products accept scores down to 650 with additional conditions like higher income proof or a co-applicant.' },
      { q: 'How is my EMI calculated?', a: 'EMI = P × r × (1+r)^n / ((1+r)^n − 1), where P is principal, r is monthly interest rate and n is tenure in months. Use the in-app EMI calculator for exact figures including processing fees.' },
      { q: 'What documents are needed for a loan?', a: 'PAN card, Aadhaar, address proof, income proof (salary slips / bank statements / ITR) and passport-size photos. Self-employed applicants typically need ITR for the last 2 years.' },
      { q: 'Can I prepay or foreclose my loan?', a: 'Yes, most loans allow prepayment or foreclosure. Foreclosure charges, if any, are shown in your sanction letter and loan agreement.' },
    ],
  },
  {
    id: 'insurance',
    label: 'Insurance',
    icon: 'shield',
    items: [
      { q: 'What types of insurance can I buy here?', a: 'We offer term life, health, motor, travel and general insurance products from partner insurers. Compare premiums, coverage and claim settlement ratios before applying.' },
      { q: 'How does claim settlement work?', a: 'Cashless claims are settled directly with network hospitals/partners. Reimbursement claims require you to pay first and submit bills, which the insurer settles after verification — typically within 15–30 days.' },
      { q: 'What is a waiting period in health insurance?', a: 'The waiting period is the time after policy start during which specific illnesses (e.g., pre-existing conditions) are not covered. It is usually 2–4 years for pre-existing diseases.' },
      { q: 'Can I port my existing policy?', a: 'Yes, health insurance portability lets you switch insurers without losing waiting-period benefits. Apply for portability at least 45 days before renewal.' },
    ],
  },
  {
    id: 'employee',
    label: 'Employee Panel',
    icon: 'person',
    items: [
      { q: 'How do I mark my attendance?', a: 'Step 1: Open Attendance from the bottom navigation. Step 2: Complete face verification when prompted. Step 3: Tap Start Work to check in and End Work to check out. Make sure location permission is enabled if your office uses geofencing.' },
      { q: 'Where can I see my attendance history?', a: 'In the Attendance screen tap "View Attendance History". You can switch months using the month/year selector and tap any record for verification details.' },
      { q: 'How are incentives calculated?', a: 'Incentives are computed from approved applications as per the bonus rules assigned to your department and bank targets. Check My Incentives → Monthly Audit for the bank-wise breakdown and ledger for every credit.' },
      { q: 'Where do I find my payslips?', a: 'Go to My Salary & Payslips (or Settings → Payroll). Select the month and download the payslip PDF. Your salary structure and PF/tax details are also listed there.' },
      { q: 'How do I invite a candidate or partner?', a: 'Open the menu (☰) in the top bar and choose "Invite Employee / Candidate" or "Invite Partner". Share the generated referral link with your contact.' },
      { q: 'My attendance is not marking. What should I check?', a: 'Ensure face verification is completed in onboarding, location permission is granted, and you are inside the office geofence during working hours. If the issue persists, raise a ticket from Support.' },
    ],
  },
  {
    id: 'partner',
    label: 'Partner Panel',
    icon: 'people',
    items: [
      { q: 'How do I add a lead?', a: 'Tap the "+" button in the bottom navigation (Add Lead), fill the customer\'s details, select the product and submit. The lead appears in your Applications/Leads list immediately.' },
      { q: 'How do I track my commissions?', a: 'Open Reports or Wallet from the More menu. Commissions appear once the bank approves the application; pending amounts show under hold and release as per the commission cycle.' },
      { q: 'How do I withdraw my earnings?', a: 'Go to Wallet → Withdraw. Add/verify your bank account first, then request a payout. Withdrawals are processed after the standard holding period.' },
      { q: 'Why is my lead not showing?', a: 'Check that the application was submitted with the correct product and that your partner account is active. If the lead was created under a different role, it may appear under that role\'s queue instead.' },
      { q: 'How do team members work under me?', a: 'Team members you add share your downline structure. Their applications and commissions roll up to your reports based on the hierarchy configured by the admin.' },
    ],
  },
];

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
  {
    id: 'admin',
    label: 'Admin Panel',
    items: [
      { q: 'How do I approve or reject an application?', a: 'Step 1: Open Applications/Queue. Step 2: Filter by status (Pending, KYC, Approved). Step 3: Open the application and review customer documents. Step 4: Choose Approve or Reject with a reason — the customer is notified automatically.' },
      { q: 'How do I manage partners and employees?', a: 'Go to Partners or Employees from the menu. You can add new accounts, assign designations, set reporting managers and deactivate accounts. Bank-wise access is controlled by the employee\'s assigned bank.' },
      { q: 'How do I handle withdrawals?', a: 'Open Withdrawals, verify the partner\'s bank details and KYC status, then approve or reject the request. Approved payouts are processed in the next settlement cycle.' },
      { q: 'Where do I see daily analytics?', a: 'The Admin dashboard shows applications, approvals, conversions and partner activity. Use the date filters to compare periods.' },
      { q: 'How do I assign a product to a bank?', a: 'Open Product Management, select the product, and map it to the correct bank and category. Product links (partner_url / public_url) control where Apply Now sends the customer.' },
      { q: 'A partner says their applications are missing. What do I check?', a: 'Confirm the partner account is active, the application status isn\'t filtered out by designation/bank scope, and the product is mapped to an active bank.' },
    ],
  },
  {
    id: 'operator',
    label: 'Operator Panel',
    items: [
      { q: 'What is my queue?', a: 'Your queue shows only the applications assigned to your designation and bank scope. KYC Operators verify documents, PAN Checkers validate PAN, QD Operators update qualification details, Remark Operators add remarks, and Curable Operators cure rejected bank applications.' },
      { q: 'Why do I see only some applications?', a: 'Access is controlled by your designation and the banks assigned to you in the Super Admin panel. If an application belongs to a bank outside your scope, it will not appear in your queue.' },
      { q: 'What do the queue tabs mean?', a: 'All shows your full queue. Operational Verified lists cases pending operator action. Declined/Rejected shows cases you have declined or the bank rejected. Cured & Approved shows cases you solved and approved.' },
      { q: 'How does curing work for Physical/Digital Curable?', a: 'Open the application, fill the Current Address and Office Address, add the Curebal Sales Remark and Digital Remark, then choose a CUREABLE REMARK: PHYSICAL SOLVED / DIGITAL SOLVED moves it to Cured & Approved, PHYSICAL PENDING / DIGITAL PENDING keeps it in Operational Verified, and NOT REQUIRED moves it to Declined/Rejected.' },
      { q: 'I cleared an address field but it still shows the old value. Why?', a: 'Make sure you click Save Remarks & Stage after clearing the field — the empty value is only persisted on save. If it still reappears, raise a ticket from Support with the application number.' },
      { q: 'How do I approve or decline an application?', a: 'Open the application from your queue, review the customer and bank details, then use Approve Application or the Decline/Reject action. Always add a remark explaining the decision — it is visible to admins and the customer.' },
      { q: 'What is the difference between Queryable and Curable?', a: 'Queryable Operators handle rejected/declined cases that need re-querying with the bank. Curable Operators (Physical, Digital, Email) actually cure the case — fixing addresses, remarks and journey links until the bank approves it.' },
      { q: 'An application is stuck or showing wrong data. What do I do?', a: 'Re-open the application and check the remarks/stage you saved. If the status does not match the CUREABLE REMARK you selected, note the application number and raise a Support ticket — admins can correct the stage from their panel.' },
    ],
  },
  {
    id: 'hr',
    label: 'HR Panel',
    items: [
      { q: 'How do I review a candidate application?', a: 'Step 1: Open Candidates. Step 2: Filter by stage (Registered, Interview Pending, Selected, Rejected). Step 3: Open the profile to verify documents and details. Step 4: Schedule an interview or update the stage — the candidate gets notified by email/SMS.' },
      { q: 'How do I provision an HR account?', a: 'In the HR dashboard click "Create HR Account", enter name, email, mobile and designation, then submit. The account is created with HR role access.' },
      { q: 'How does payroll work?', a: 'HR → Payroll: assign salary structures to employees, run payroll for the month, review PF/ESI/PT deductions and approve. Employees see payslips under My Salary & Payslips.' },
      { q: 'How do I reject a candidate?', a: 'Open the candidate profile → Reject. A reference code and HR contact details are shared with the candidate by email, and dependent records are cleaned up automatically.' },
      { q: 'Where do I see onboarding/KYC status?', a: 'The Candidates list shows onboarding and KYC stages per candidate. Filter by stage to find pending verifications.' },
    ],
  },
  {
    id: 'super-admin',
    label: 'Super Admin',
    items: [
      { q: 'What can Super Admin access?', a: 'Everything: all panels (admin, HR, employee, partner), commission rules, product and bank management, support tickets, withdrawals, payroll oversight and system settings.' },
      { q: 'How do I manage commission rules?', a: 'Open Commission Rules / Manage Commissions. Define per-department, per-bank incentive slabs and bonus rules — changes apply to new approvals automatically.' },
      { q: 'How do I respond to support tickets?', a: 'Open Support Tickets, select a ticket, review the conversation and reply as Support Team. Set status to In Progress or Resolved when done.' },
      { q: 'How do I manage product links?', a: 'Product Links lets you set the partner_url / public_url used by Apply Now for each product — per-bank HDFC links are mapped automatically by card name.' },
      { q: 'How do I add or deactivate staff?', a: 'Use Staff/Employees management to create accounts with any role (Admin, HR, Employee) and deactivate or reassign them anytime.' },
    ],
  },
];

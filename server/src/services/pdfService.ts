import PDFDocument from 'pdfkit';
import { Employee, Offer, Payslip, Setting } from '../types';
import { maskSensitive } from '../utils/crypto';

export class PdfService {
  /**
   * Generates a buffer for an Offer Letter
   */
  static async generateOfferLetterPdf(
    candidateName: string,
    offer: Offer,
    templateText?: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      // Header / Letterhead
      doc.fillColor('#166534').fontSize(22).font('Helvetica-Bold').text('MASTERED SKILL ACADEMY', { align: 'center' });
      doc.fillColor('#475569').fontSize(10).font('Helvetica').text('Kerala, India | info@masteredskill.com | www.masteredskill.com', { align: 'center' });
      doc.moveDown(1);
      doc.strokeColor('#16a34a').lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1.5);

      // Date & Recipient
      doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text(`Date: ${new Date().toLocaleDateString('en-IN')}`);
      doc.moveDown(0.5);
      doc.text(`To: ${candidateName}`);
      doc.moveDown(1);

      // Title
      doc.fillColor('#166534').fontSize(14).font('Helvetica-Bold').text('SUB: OFFER OF EMPLOYMENT', { underline: true });
      doc.moveDown(1);

      // Body text
      doc.fillColor('#334155').fontSize(10.5).font('Helvetica');
      doc.text(`Dear ${candidateName},`);
      doc.moveDown(0.8);

      const defaultBody = `We are pleased to offer you the position of ${offer.designation} in the ${offer.department} department at Mastered Skill Academy. We were thoroughly impressed by your credentials and enthusiasm during the selection process.

Key terms of employment:
• Position / Designation: ${offer.designation}
• Department: ${offer.department}
• Date of Joining: ${offer.joining_date || 'To be mutually decided'}
• Probation Period: ${offer.probation_months || 3} months from the date of joining
• Work Location: Mastered Skill Academy Campus / Office

Salary Structure:
Please find detailed monthly compensation structure outlined in the annexure. All payments will be subject to applicable statutory deductions as per government regulations.

Please sign and return the duplicate copy of this letter as acceptance of this offer within 3 business days.`;

      doc.text(templateText || defaultBody, {
        align: 'justify',
        lineGap: 4
      });

      doc.moveDown(2);

      // Signatures
      doc.text('For Mastered Skill Academy,', 50, doc.y);
      doc.moveDown(3);
      doc.font('Helvetica-Bold').text('Authorized Signatory', 50, doc.y);
      doc.font('Helvetica').text('HR & Operations');

      doc.text('Accepted & Agreed:', 350, doc.y - 45);
      doc.moveDown(3);
      doc.font('Helvetica-Bold').text(`${candidateName}`, 350, doc.y);
      doc.font('Helvetica').text('Candidate Signature');

      doc.end();
    });
  }

  /**
   * Generates a Payslip PDF in INR
   */
  static async generatePayslipPdf(
    payslip: Payslip,
    employee: Employee,
    companySettings?: Record<string, string>
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const compName = companySettings?.company_name || 'MASTERED SKILL ACADEMY';
      const compAddress = companySettings?.company_address || 'Kerala, India';
      const compContact = companySettings?.company_email || 'hr@masteredskill.com';

      // Header
      doc.fillColor('#166534').fontSize(18).font('Helvetica-Bold').text(compName, { align: 'center' });
      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(`${compAddress} | Email: ${compContact}`, { align: 'center' });
      doc.moveDown(0.5);

      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(`PAYSLIP FOR THE MONTH OF ${payslip.month.toUpperCase()}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.8);

      // Employee Info Box (2-column key-value)
      const startY = doc.y;
      doc.fontSize(9).fillColor('#334155');

      // Left Column
      doc.font('Helvetica-Bold').text('Employee Name:', 45, startY);
      doc.font('Helvetica').text(employee.full_name, 140, startY);

      doc.font('Helvetica-Bold').text('Employee ID:', 45, startY + 16);
      doc.font('Helvetica').text(employee.employee_id, 140, startY + 16);

      doc.font('Helvetica-Bold').text('Designation:', 45, startY + 32);
      doc.font('Helvetica').text(employee.designation || 'Staff', 140, startY + 32);

      doc.font('Helvetica-Bold').text('Department:', 45, startY + 48);
      doc.font('Helvetica').text(employee.department || 'Operations', 140, startY + 48);

      doc.font('Helvetica-Bold').text('Date of Joining:', 45, startY + 64);
      doc.font('Helvetica').text(employee.joining_date || 'N/A', 140, startY + 64);

      // Right Column
      doc.font('Helvetica-Bold').text('PAN Number:', 320, startY);
      doc.font('Helvetica').text(employee.pan ? maskSensitive(employee.pan, 4) : 'N/A', 410, startY);

      doc.font('Helvetica-Bold').text('Bank Account:', 320, startY + 16);
      doc.font('Helvetica').text(employee.account_no_enc ? 'XXXX-XXXX-AC' : 'N/A', 410, startY + 16);

      doc.font('Helvetica-Bold').text('Bank IFSC:', 320, startY + 32);
      doc.font('Helvetica').text(employee.ifsc || 'N/A', 410, startY + 32);

      doc.font('Helvetica-Bold').text('UAN Number:', 320, startY + 48);
      doc.font('Helvetica').text(employee.uan || 'N/A', 410, startY + 48);

      doc.font('Helvetica-Bold').text('Payment Status:', 320, startY + 64);
      doc.font('Helvetica-Bold').fillColor(payslip.paid_status === 'Paid' ? '#16a34a' : '#ea580c').text(payslip.paid_status || 'Unpaid', 410, startY + 64);

      doc.y = startY + 84;
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.6);

      // Attendance summary box
      let att: any = {};
      try {
        att = typeof payslip.attendance_json === 'string' ? JSON.parse(payslip.attendance_json) : (payslip.attendance_json || {});
      } catch (e) {
        att = {};
      }

      const attY = doc.y;
      doc.rect(40, attY, 515, 24).fill('#f8fafc');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5);
      doc.text(`Total Days: ${att.totalCalendarDays || 30}   |   Present: ${att.presentDays || 0}   |   Half Days: ${att.halfDays || 0}   |   Leave: ${att.paidLeaveDays || 0}   |   Holidays/Off: ${(att.holidays || 0) + (att.weeklyOffs || 0)}   |   Paid Days: ${att.paidDays || 0}   |   LOP: ${att.lopDays || 0}`, 48, attY + 7);

      doc.y = attY + 32;

      // Earnings & Deductions Tables side-by-side
      let earnings: { name: string; amount: number }[] = [];
      let deductions: { name: string; amount: number }[] = [];
      try {
        earnings = typeof payslip.earnings_json === 'string' ? JSON.parse(payslip.earnings_json) : (payslip.earnings_json || []);
        deductions = typeof payslip.deductions_json === 'string' ? JSON.parse(payslip.deductions_json) : (payslip.deductions_json || []);
      } catch (e) {}

      const tableTop = doc.y;
      const colWidth = 250;

      // Table Headers
      doc.rect(40, tableTop, colWidth, 20).fill('#166534');
      doc.rect(305, tableTop, colWidth, 20).fill('#991b1b');

      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
      doc.text('EARNINGS', 48, tableTop + 5);
      doc.text('AMOUNT (₹)', 220, tableTop + 5, { align: 'right', width: 65 });

      doc.text('DEDUCTIONS', 313, tableTop + 5);
      doc.text('AMOUNT (₹)', 485, tableTop + 5, { align: 'right', width: 65 });

      let curY = tableTop + 24;
      const maxRows = Math.max(earnings.length, deductions.length, 5);

      for (let i = 0; i < maxRows; i++) {
        const earn = earnings[i];
        const ded = deductions[i];

        doc.fillColor('#334155').font('Helvetica').fontSize(8.5);

        if (earn) {
          doc.text(earn.name, 48, curY);
          doc.text(Number(earn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 210, curY, { align: 'right', width: 75 });
        }
        if (ded) {
          doc.text(ded.name, 313, curY);
          doc.text(Number(ded.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 475, curY, { align: 'right', width: 75 });
        }

        curY += 16;
      }

      // Totals
      doc.rect(40, curY, colWidth, 20).fill('#f0fdf4');
      doc.rect(305, curY, colWidth, 20).fill('#fef2f2');

      doc.fillColor('#166534').font('Helvetica-Bold').fontSize(9);
      doc.text('Total Earnings (Gross)', 48, curY + 5);
      doc.text(`₹ ${Number(payslip.gross || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 200, curY + 5, { align: 'right', width: 85 });

      doc.fillColor('#991b1b').font('Helvetica-Bold').fontSize(9);
      doc.text('Total Deductions', 313, curY + 5);
      doc.text(`₹ ${Number(payslip.total_deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 465, curY + 5, { align: 'right', width: 85 });

      curY += 30;

      // Net Pay Box
      doc.rect(40, curY, 515, 36).fill('#14532d');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12);
      doc.text(`NET TAKE-HOME PAY:   ₹ ${Number(payslip.net_pay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55, curY + 8);
      doc.fontSize(8.5).font('Helvetica').text(`In words: ${payslip.net_in_words || ''}`, 55, curY + 22);

      curY += 50;

      // Footer
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Oblique').text(
        'Note: This is a computer-generated document and does not require a signature.',
        40,
        curY,
        { align: 'center', width: 515 }
      );

      doc.end();
    });
  }
}

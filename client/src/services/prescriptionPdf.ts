import { jsPDF } from 'jspdf';

/**
 * Generate a professional prescription PDF with comprehensive clinical details.
 * Includes: Doctor info, Patient info, Vitals, Diagnosis, Medicines table, Advice, Follow-up.
 */
export const generatePrescriptionPDF = (prescription: any) => {
    console.log('Generating PDF for prescription:', prescription);
    try {
        const doc = new jsPDF();
        const {
            doctor,
            diagnosis,
            medicinesJson,
            summaryNotes,
            followUpInstruction,
            createdAt,
            patientNameSnapshot,
            patientGenderSnapshot,
            patientDobSnapshot,
            vitalsSnapshotJson,
            nurseObservations,
            versionNumber,
        } = prescription;

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 14;
        const contentWidth = pageWidth - margin * 2;
        let y = 0;

        // ─── Colors ───
        const primaryR = 242, primaryG = 80, primaryB = 34; // IMMIDIT Orange
        const darkR = 26, darkG = 31, darkB = 54;
        const mutedR = 120, mutedG = 130, mutedB = 140;
        const headerBgR = 249, headerBgG = 250, headerBgB = 251;

        // ─── Helper: Section Header ───
        const drawSectionHeader = (title: string, yPos: number): number => {
            doc.setFillColor(primaryR, primaryG, primaryB);
            doc.rect(margin, yPos, 3, 10, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(darkR, darkG, darkB);
            doc.text(title.toUpperCase(), margin + 7, yPos + 7);
            doc.setDrawColor(230, 230, 230);
            doc.line(margin, yPos + 12, pageWidth - margin, yPos + 12);
            return yPos + 18;
        };

        // ─── Helper: Check page break ───
        const checkPageBreak = (needed: number): void => {
            if (y + needed > 275) {
                doc.addPage();
                y = 20;
            }
        };

        // ═══════════════════════════════════════════
        // HEADER
        // ═══════════════════════════════════════════
        doc.setFillColor(headerBgR, headerBgG, headerBgB);
        doc.rect(0, 0, pageWidth, 48, 'F');

        // Brand
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryR, primaryG, primaryB);
        doc.text('IMMIDIT', margin, 16);
        doc.setFontSize(8);
        doc.setTextColor(mutedR, mutedG, mutedB);
        doc.text('Healthcare at your doorstep', margin, 22);

        // Doctor
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkR, darkG, darkB);
        doc.text(`Dr. ${doctor?.name || 'Medical Officer'}`, margin, 33);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(mutedR, mutedG, mutedB);
        doc.text(`Reg No: ${doctor?.medicalRegNo || 'IMMIDIT-DOC'}`, margin, 39);

        // Right side - date & version
        const dateStr = createdAt ? new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN');
        doc.setFontSize(9);
        doc.setTextColor(mutedR, mutedG, mutedB);
        doc.text(`Date: ${dateStr}`, pageWidth - margin, 33, { align: 'right' });
        if (versionNumber) {
            doc.text(`Version: v${versionNumber}`, pageWidth - margin, 39, { align: 'right' });
        }

        // Divider
        doc.setDrawColor(primaryR, primaryG, primaryB);
        doc.setLineWidth(0.8);
        doc.line(margin, 48, pageWidth - margin, 48);
        doc.setLineWidth(0.2);

        y = 56;

        // ═══════════════════════════════════════════
        // PATIENT DETAILS
        // ═══════════════════════════════════════════
        doc.setFillColor(245, 248, 250);
        doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryR, primaryG, primaryB);
        doc.text('PATIENT DETAILS', margin + 6, y + 7);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(darkR, darkG, darkB);

        let ageStr = 'N/A';
        if (patientDobSnapshot) {
            try { ageStr = calculateAge(patientDobSnapshot).toString() + ' yrs'; } catch { }
        }

        doc.text(`Name: ${patientNameSnapshot || 'N/A'}`, margin + 6, y + 15);
        doc.text(`Age: ${ageStr}`, margin + 80, y + 15);
        doc.text(`Gender: ${patientGenderSnapshot || 'N/A'}`, margin + 120, y + 15);

        y += 30;

        // ═══════════════════════════════════════════
        // VITALS (if available)
        // ═══════════════════════════════════════════
        if (vitalsSnapshotJson && typeof vitalsSnapshotJson === 'object' && Object.keys(vitalsSnapshotJson).length > 0) {
            checkPageBreak(50);
            y = drawSectionHeader('Recorded Vitals', y);

            const vitalsLabels: Record<string, { label: string; unit: string }> = {
                bloodPressure: { label: 'Blood Pressure', unit: 'mmHg' },
                temperature: { label: 'Temperature', unit: '°F' },
                pulse: { label: 'Pulse Rate', unit: 'bpm' },
                spO2: { label: 'SpO₂', unit: '%' },
                respiratoryRate: { label: 'Resp. Rate', unit: '/min' },
                weight: { label: 'Weight', unit: 'kg' },
                bloodSugar: { label: 'Blood Sugar', unit: 'mg/dL' },
                randomBloodSugar: { label: 'Random BS', unit: 'mg/dL' },
            };

            const vitalEntries = Object.entries(vitalsSnapshotJson).filter(([key, val]) => {
                if (typeof val === 'string' && val.startsWith('data:image')) return false;
                if (typeof val === 'boolean') return false;
                if (val === null || val === undefined || val === '') return false;
                return true;
            });

            // Draw vitals as a compact grid (2 columns)
            doc.setFontSize(9);
            const colWidth = contentWidth / 2;
            vitalEntries.forEach(([key, val], i) => {
                const col = i % 2;
                if (col === 0 && i > 0) y += 8;
                if (col === 0) checkPageBreak(10);

                const x = margin + col * colWidth;
                const meta = vitalsLabels[key] || { label: key.replace(/([A-Z])/g, ' $1').trim(), unit: '' };

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(mutedR, mutedG, mutedB);
                doc.text(`${meta.label}:`, x, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(darkR, darkG, darkB);
                doc.text(`${val}${meta.unit ? ' ' + meta.unit : ''}`, x + 42, y);
            });
            y += 12;
        }

        // ═══════════════════════════════════════════
        // NURSE OBSERVATIONS
        // ═══════════════════════════════════════════
        if (nurseObservations) {
            checkPageBreak(30);
            y = drawSectionHeader('Nurse Observations', y);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(darkR, darkG, darkB);
            const lines = doc.splitTextToSize(nurseObservations, contentWidth - 8);
            doc.text(lines, margin + 4, y);
            y += lines.length * 5 + 8;
        }

        // ═══════════════════════════════════════════
        // DIAGNOSIS
        // ═══════════════════════════════════════════
        checkPageBreak(30);
        y = drawSectionHeader('Diagnosis', y);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkR, darkG, darkB);
        const diagLines = doc.splitTextToSize(diagnosis || 'N/A', contentWidth - 8);
        doc.text(diagLines, margin + 4, y);
        y += diagLines.length * 6 + 4;

        if (summaryNotes) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            const noteLines = doc.splitTextToSize(summaryNotes, contentWidth - 8);
            doc.text(noteLines, margin + 4, y);
            y += noteLines.length * 5 + 6;
        }

        // ═══════════════════════════════════════════
        // PRESCRIPTION (Rx) TABLE
        // ═══════════════════════════════════════════
        if (medicinesJson && Array.isArray(medicinesJson) && medicinesJson.length > 0) {
            checkPageBreak(40);
            y = drawSectionHeader('Prescription (Rx)', y);

            // Table header
            const cols = [
                { label: '#', w: 8 },
                { label: 'Medicine', w: 46 },
                { label: 'Dosage', w: 28 },
                { label: 'Frequency', w: 30 },
                { label: 'Duration', w: 22 },
                { label: 'Timing', w: 22 },
                { label: 'Instructions', w: 26 },
            ];

            doc.setFillColor(primaryR, primaryG, primaryB);
            doc.rect(margin, y - 4, contentWidth, 8, 'F');
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);

            let cx = margin + 2;
            cols.forEach(col => {
                doc.text(col.label, cx, y);
                cx += col.w;
            });
            y += 8;

            // Table rows
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(darkR, darkG, darkB);

            medicinesJson.forEach((med: any, i: number) => {
                checkPageBreak(10);
                if (i % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(margin, y - 4, contentWidth, 8, 'F');
                }

                cx = margin + 2;
                doc.text(`${i + 1}`, cx, y); cx += cols[0].w;
                doc.setFont('helvetica', 'bold');
                doc.text(truncate(med.name || '', 24), cx, y); cx += cols[1].w;
                doc.setFont('helvetica', 'normal');
                doc.text(truncate(med.dosage || '', 14), cx, y); cx += cols[2].w;
                doc.text(truncate(med.frequency || '', 16), cx, y); cx += cols[3].w;
                doc.text(med.durationDays ? `${med.durationDays}d` : '–', cx, y); cx += cols[4].w;
                doc.text(truncate(med.timing || '', 12), cx, y); cx += cols[5].w;
                doc.text(truncate(med.instructions || '–', 14), cx, y);

                y += 8;
            });
            y += 4;
        }

        // ═══════════════════════════════════════════
        // ADVICE / NOTES
        // ═══════════════════════════════════════════
        if (summaryNotes || followUpInstruction) {
            checkPageBreak(30);
            y = drawSectionHeader('Advice & Follow-up', y);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(darkR, darkG, darkB);

            if (followUpInstruction) {
                doc.setFont('helvetica', 'bold');
                doc.text('Follow-up: ', margin + 4, y);
                doc.setFont('helvetica', 'normal');
                const fLines = doc.splitTextToSize(followUpInstruction, contentWidth - 30);
                doc.text(fLines, margin + 30, y);
                y += fLines.length * 5 + 6;
            }
        }

        // ═══════════════════════════════════════════
        // FOOTER
        // ═══════════════════════════════════════════
        const footerY = 280;
        doc.setDrawColor(primaryR, primaryG, primaryB);
        doc.setLineWidth(0.5);
        doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);
        doc.setLineWidth(0.2);

        // Signature on right
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryR, primaryG, primaryB);
        doc.text(`Dr. ${doctor?.name || 'Medical Officer'}`, pageWidth - margin, footerY, { align: 'right' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(mutedR, mutedG, mutedB);
        doc.text(`Reg: ${doctor?.medicalRegNo || 'IMMIDIT-DOC'}`, pageWidth - margin, footerY + 5, { align: 'right' });

        // Disclaimer
        doc.setFontSize(7);
        doc.setTextColor(mutedR, mutedG, mutedB);
        doc.text('This is a computer-generated prescription via Immidit Medical Coordination.', margin, footerY);
        doc.text('No physical signature is required.', margin, footerY + 4);

        // Save
        const fileName = `Prescription_${(patientNameSnapshot || 'Patient').replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
        console.log('Saving PDF:', fileName);
        doc.save(fileName);
        console.log('PDF save call completed');
    } catch (err) {
        console.error('CRITICAL: Error in generatePrescriptionPDF:', err);
    }
};

function calculateAge(dob: string) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function truncate(str: string, max: number): string {
    return str.length > max ? str.substring(0, max - 1) + '…' : str;
}

import { jsPDF } from 'jspdf';

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
            patientDobSnapshot
        } = prescription;

        if (!patientNameSnapshot) {
            console.error('Missing patient name in prescription snapshot');
        }

        // Header
        doc.setFontSize(22);
        doc.setTextColor(15, 185, 177); // Primary color
        doc.text('IMMIDIT', 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('Healthcare at your doorstep', 105, 25, { align: 'center' });

        doc.setDrawColor(200);
        doc.line(10, 30, 200, 30);

        // Doctor Info
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(`Dr. ${doctor?.name || 'Medical Officer'}`, 10, 40);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Reg No: ${doctor?.medicalRegNo || 'N/A'}`, 10, 45);

        // Patient Info
        doc.setFont('helvetica', 'bold');
        doc.text('Patient Details:', 140, 40);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${patientNameSnapshot || 'N/A'}`, 140, 45);

        let ageStr = 'N/A';
        if (patientDobSnapshot) {
            try {
                ageStr = calculateAge(patientDobSnapshot).toString();
            } catch (e) {
                console.warn('Failed to calculate age:', e);
            }
        }
        doc.text(`Age/Gender: ${ageStr} / ${patientGenderSnapshot || 'N/A'}`, 140, 50);
        doc.text(`Date: ${createdAt ? new Date(createdAt).toLocaleDateString() : new Date().toLocaleDateString()}`, 140, 55);

        doc.line(10, 65, 200, 65);

        // Diagnosis
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Diagnosis:', 10, 75);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(diagnosis || 'N/A', 10, 82);

        // Medicines
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Prescription (Rx):', 10, 95);

        let y = 105;
        doc.setFontSize(10);
        doc.setFillColor(245, 245, 245);
        doc.rect(10, y - 5, 190, 8, 'F');
        doc.text('Medicine Name', 15, y);
        doc.text('Dosage', 80, y);
        doc.text('Instructions', 130, y);

        y += 10;
        doc.setFont('helvetica', 'normal');
        if (medicinesJson && Array.isArray(medicinesJson)) {
            medicinesJson.forEach((med: any) => {
                doc.text(med.name || '', 15, y);
                doc.text(med.dosage || '', 80, y);
                doc.text(med.instructions || med.frequency || '', 130, y);
                y += 8;
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
            });
        }

        // Notes
        if (summaryNotes) {
            y += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('Notes / Advice:', 10, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            const splitNotes = doc.splitTextToSize(summaryNotes, 180);
            doc.text(splitNotes, 10, y);
            y += (splitNotes.length * 5);
        }

        // Follow up
        if (followUpInstruction) {
            y += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('Follow-up:', 10, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.text(followUpInstruction, 10, y);
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('This is an electronically generated prescription. No signature is required.', 105, 285, { align: 'center' });

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

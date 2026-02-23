/**
 * Prescription Service
 * Handles prescription generation, versioning, and follow-up task management.
 * PDF is generated client-side using jsPDF — server only stores structured data.
 */

import { prisma } from '../index';
import { logAudit } from './auditService';
import path from 'path';
import fs from 'fs';

interface MedicineEntry {
    name: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    timing: string;
    instructions: string;
}

/**
 * Generate a prescription for a given service.
 * Freezes vitals + nurse observations into a snapshot.
 */
export async function generatePrescription(
    serviceId: string,
    doctorId: string,
    data: {
        diagnosis: string;
        summaryNotes?: string;
        medicinesJson: MedicineEntry[];
        followUpInstruction?: string;
    },
) {
    // 1. Fetch clinical report
    const service = await prisma.serviceRequest.findUnique({
        where: { id: serviceId },
        include: {
            clinicalReport: true,
            doctorAction: true,
            patient: true,
        },
    });

    if (!service) throw new Error('Service request not found');
    if (!service.clinicalReport) throw new Error('Clinical report not found — nurse vitals required');
    if (!service.patient) throw new Error('Patient not found');

    // 2. Validate required fields
    const report = service.clinicalReport;
    const vitals = report.vitalsJson as any;

    if (!vitals || Object.keys(vitals).length === 0) {
        throw new Error('Vitals not recorded — cannot generate prescription');
    }
    if (!data.diagnosis || !data.diagnosis.trim()) {
        throw new Error('Diagnosis is required');
    }
    if (!data.medicinesJson || data.medicinesJson.length === 0) {
        throw new Error('At least one medicine must be added');
    }

    // Validate doctor registration (doctorId must exist)
    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new Error('Doctor not found');

    // 3. Check for existing prescription (for versioning)
    const existingPrescription = await prisma.prescription.findUnique({
        where: { clinicalReportId: report.id },
    });

    if (existingPrescription) {
        // ============ VERSIONING: Create new version, update prescription ============
        const newVersionNum = existingPrescription.versionNumber + 1;

        // Save old state as a version
        await prisma.prescriptionVersion.create({
            data: {
                prescriptionId: existingPrescription.id,
                versionNumber: existingPrescription.versionNumber,
                vitalsSnapshotJson: existingPrescription.vitalsSnapshotJson as any,
                nurseObservations: existingPrescription.nurseObservations,
                medicinesJson: existingPrescription.medicinesJson as any,
                diagnosis: existingPrescription.diagnosis,
                summaryNotes: existingPrescription.summaryNotes,
            },
        });

        // Update existing prescription (no pdfUrl — PDF generated client-side)
        const updatedPrescription = await prisma.prescription.update({
            where: { id: existingPrescription.id },
            data: {
                diagnosis: data.diagnosis,
                summaryNotes: data.summaryNotes || null,
                vitalsSnapshotJson: vitals,
                nurseObservations: report.nurseObservations,
                medicinesJson: data.medicinesJson as any,
                followUpInstruction: data.followUpInstruction || null,
                pdfUrl: null,
                versionNumber: newVersionNum,
            },
        });

        await logAudit(doctorId, 'PRESCRIPTION_VERSION_CREATED', 'Prescription', updatedPrescription.id);
        return updatedPrescription;
    }

    // ============ NEW PRESCRIPTION ============

    const prescriptionId = require('crypto').randomUUID();

    // Create prescription record (no pdfUrl — PDF generated client-side)
    const prescription = await prisma.prescription.create({
        data: {
            id: prescriptionId,
            serviceId,
            doctorId,
            patientId: service.patientId,
            clinicalReportId: report.id,
            diagnosis: data.diagnosis,
            summaryNotes: data.summaryNotes || null,
            vitalsSnapshotJson: vitals as any,
            nurseObservations: report.nurseObservations,
            medicinesJson: data.medicinesJson as any,
            followUpInstruction: data.followUpInstruction || null,
            pdfUrl: null,
            versionNumber: 1,
            patientNameSnapshot: service.patient.name,
            patientGenderSnapshot: service.patient.gender,
            patientDobSnapshot: service.patient.dateOfBirth,
        },
    });

    // Update ServiceRequest status
    await prisma.serviceRequest.update({
        where: { id: serviceId },
        data: { status: 'doctor_completed' as any },
    });

    // Create FollowUpTask if instruction is present
    if (data.followUpInstruction) {
        await prisma.followUpTask.create({
            data: {
                serviceId,
                patientId: service.patientId,
                prescriptionId: prescription.id,
                instruction: data.followUpInstruction,
                dueDate: service.doctorAction?.followupDate || null,
                status: 'pending',
            },
        });
    }

    // Audit log
    await logAudit(doctorId, 'PRESCRIPTION_GENERATED', 'Prescription', prescription.id);

    return prescription;
}



/**
 * Generate a professional prescription PDF using HTML template.
 * Saves to server/uploads/prescriptions/ and returns the URL path.
 */
async function generatePrescriptionPDF(params: {
    prescriptionId: string;
    doctor: any;
    patient: any;
    service: any;
    report: any;
    diagnosis: string;
    summaryNotes: string | null;
    vitalsSnapshot: any;
    nurseObservations: string | null;
    medicines: MedicineEntry[];
    followUpInstruction: string | null;
    versionNumber: number;
}): Promise<string> {
    const {
        prescriptionId, doctor, patient, service, report,
        diagnosis, summaryNotes, vitalsSnapshot, nurseObservations,
        medicines, followUpInstruction, versionNumber,
    } = params;

    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const vitalsTimestamp = new Date(report.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Build medicine table rows
    const medicineRows = medicines.map((m, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${m.name}</strong></td>
            <td>${m.dosage}</td>
            <td>${m.frequency}</td>
            <td>${m.durationDays} days</td>
            <td>${m.timing}</td>
            <td>${m.instructions || '–'}</td>
        </tr>
    `).join('');

    // Build vitals display
    const vitalsKeys: Record<string, string> = {
        bloodPressure: 'Blood Pressure',
        temperature: 'Temperature',
        pulse: 'Pulse',
        spO2: 'SpO₂',
        respiratoryRate: 'Respiratory Rate',
        weight: 'Weight',
        bloodSugar: 'Blood Sugar',
        randomBloodSugar: 'Random Blood Sugar',
    };

    const vitalsRows = Object.entries(vitalsSnapshot)
        .filter(([key, val]) => {
            if (typeof val === 'string' && val.startsWith('data:image')) return false;
            if (val === null || val === undefined || val === '') return false;
            return true;
        })
        .map(([key, val]) => {
            const label = vitalsKeys[key] || key.replace(/([A-Z])/g, ' $1').trim();
            let unit = '';
            if (key === 'bloodPressure') unit = ' mmHg';
            if (key === 'temperature') unit = ' °F';
            if (key === 'pulse') unit = ' bpm';
            if (key === 'spO2') unit = '%';
            if (key === 'respiratoryRate') unit = '/min';
            if (key === 'weight') unit = ' kg';
            return `<tr><td><strong>${label}</strong></td><td>${val}${unit}</td></tr>`;
        })
        .join('');

    // Nurse observations
    const nurseObsSection = nurseObservations ? `
        <div class="section">
            <h3>SECTION 4 — NURSE OBSERVATIONS</h3>
            <p>${nurseObservations.replace(/\\n/g, '<br/>')}</p>
        </div>
    ` : '';

    // Medical history section
    const medHistorySection = (report.medicalHistory || report.allergies || report.currentMedications) ? `
        <div class="section">
            <h3>SECTION 2 — MEDICAL HISTORY</h3>
            ${report.medicalHistory ? `<p><strong>Known Conditions:</strong> ${report.medicalHistory}</p>` : ''}
            ${report.allergies ? `<p><strong>Allergies:</strong> ${report.allergies}</p>` : ''}
            ${report.currentMedications ? `<p><strong>Current Medications:</strong> ${report.currentMedications}</p>` : ''}
        </div>
    ` : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            color: #1a1a2e;
            padding: 40px;
            font-size: 13px;
            line-height: 1.6;
        }
        .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 3px solid #F25022;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .header-left h1 {
            font-size: 20px;
            color: #F25022;
            margin-bottom: 4px;
        }
        .header-left p {
            font-size: 12px;
            color: #555;
        }
        .header-right {
            text-align: right;
            font-size: 12px;
            color: #555;
        }

        .patient-info {
            background: #FFF5F2;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        .patient-info p { font-size: 13px; }
        .patient-info strong { color: #F25022; }

        .section {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        .section h3 {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #F25022;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 6px;
            margin-bottom: 10px;
            font-weight: 700;
        }

        table.vitals {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        table.vitals td {
            padding: 6px 12px;
            border: 1px solid #e0e0e0;
            font-size: 12px;
        }
        table.vitals td:first-child {
            width: 40%;
            background: #f7f7f7;
        }

        table.medicines {
            width: 100%;
            border-collapse: collapse;
        }
        table.medicines th {
            background: #F25022;
            color: white;
            padding: 8px 10px;
            font-size: 11px;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        table.medicines td {
            padding: 8px 10px;
            border: 1px solid #e0e0e0;
            font-size: 12px;
        }
        table.medicines tr:nth-child(even) {
            background: #f9f9f9;
        }

        .advice-box {
            background: #FFFBEB;
            border: 1px solid #FDE68A;
            padding: 14px 16px;
            border-radius: 8px;
            margin-bottom: 16px;
        }
        .advice-box h4 {
            color: #B45309;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 6px;
        }
        .advice-box p {
            font-size: 13px;
            color: #78350F;
        }

        .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 2px solid #F25022;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .footer-left { font-size: 11px; color: #888; }
        .footer-right { text-align: right; }
        .footer-right .signature {
            font-weight: 700;
            font-size: 14px;
            color: #F25022;
            border-top: 1px solid #333;
            padding-top: 4px;
        }

        .version-badge {
            display: inline-block;
            background: #F25022;
            color: white;
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
        }

        .disclaimer {
            margin-top: 16px;
            padding: 10px 14px;
            background: #F3F4F6;
            border-radius: 6px;
            font-size: 10px;
            color: #6B7280;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <!-- HEADER -->
    <div class="header">
        <div class="header-left">
            <h1>Dr. ${doctor.name}</h1>
            <p>Registration: ${doctor.medicalRegNo || 'IMMIDIT-DOC-' + doctor.id.substring(0, 8).toUpperCase()}</p>
            <p>Immidit Medical Coordination</p>
        </div>
        <div class="header-right">
            <p><strong>Consultation Ref:</strong> ${service.id.substring(0, 8).toUpperCase()}</p>
            <p><strong>Date:</strong> ${timestamp}</p>
            <p><span class="version-badge">v${versionNumber}</span></p>
        </div>
    </div>

    <!-- PATIENT DETAILS -->
    <div class="patient-info">
        <p><strong>Patient Name:</strong> ${patient.name}</p>
        <p><strong>Patient ID:</strong> ${patient.id.substring(0, 8).toUpperCase()}</p>
        <p><strong>Mobile:</strong> ${patient.phone}</p>
        <p><strong>Service:</strong> ${service.serviceType}</p>
        ${patient.gender ? `<p><strong>Gender:</strong> ${patient.gender}</p>` : ''}
        ${patient.dateOfBirth ? `<p><strong>DOB:</strong> ${new Date(patient.dateOfBirth).toLocaleDateString('en-IN')}</p>` : ''}
    </div>

    <!-- SECTION 1: CHIEF COMPLAINT -->
    <div class="section">
        <h3>SECTION 1 — CHIEF COMPLAINT</h3>
        <p><strong>Chief Complaints:</strong> ${report.chiefComplaint || service.symptoms || '–'}</p>
        ${report.durationOfSymptoms ? `<p><strong>Duration:</strong> ${report.durationOfSymptoms}</p>` : ''}
    </div>

    <!-- SECTION 2: MEDICAL HISTORY -->
    ${medHistorySection}

    <!-- SECTION 3: VITALS -->
    <div class="section">
        <h3>SECTION 3 — VITALS RECORDED</h3>
        <table class="vitals">
            ${vitalsRows}
        </table>
        <p style="font-size: 11px; color: #888; margin-top: 4px;">Vitals recorded at: ${vitalsTimestamp}</p>
    </div>

    <!-- SECTION 4: NURSE OBSERVATIONS -->
    ${nurseObsSection}

    <!-- SECTION 5: DIAGNOSIS -->
    <div class="section">
        <h3>SECTION 5 — DIAGNOSIS</h3>
        <p style="font-size: 14px; font-weight: 600;">${diagnosis}</p>
        ${summaryNotes ? `<p style="margin-top: 8px; color: #555;">${summaryNotes}</p>` : ''}
    </div>

    <!-- SECTION 6: PRESCRIPTION TABLE -->
    <div class="section">
        <h3>SECTION 6 — PRESCRIPTION</h3>
        <table class="medicines">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Timing</th>
                    <th>Instructions</th>
                </tr>
            </thead>
            <tbody>
                ${medicineRows}
            </tbody>
        </table>
    </div>

    <!-- SECTION 7: DOCTOR ADVICE -->
    ${(service.doctorAction?.advice || service.doctorAction?.medications) ? `
    <div class="section">
        <h3>SECTION 7 — DOCTOR'S ADVICE</h3>
        ${service.doctorAction.advice ? `
        <div class="advice-box">
            <h4>General Advice</h4>
            <p>${service.doctorAction.advice.replace(/\\n/g, '<br/>')}</p>
        </div>
        ` : ''}
        ${service.doctorAction.medications ? `
        <div class="advice-box">
            <h4>Additional Medications / OTC</h4>
            <p>${service.doctorAction.medications.replace(/\\n/g, '<br/>')}</p>
        </div>
        ` : ''}
    </div>
    ` : ''}

    <!-- SECTION 8: FOLLOW-UP -->
    ${followUpInstruction ? `
    <div class="section">
        <h3>SECTION 8 — FOLLOW-UP & NOTES</h3>
        <p><strong>Follow-up:</strong> ${followUpInstruction}</p>
        ${service.doctorAction?.followupDate ? `<p><strong>Next Visit By:</strong> ${new Date(service.doctorAction.followupDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>` : ''}
    </div>
    ` : ''}

    <!-- FOOTER -->
    <div class="footer">
        <div class="footer-left">
            <p>Case ID: ${service.id.substring(0, 8).toUpperCase()}</p>
            <p>Patient ID: ${patient.id.substring(0, 8).toUpperCase()}</p>
            <p>Generated: ${timestamp}</p>
        </div>
        <div class="footer-right">
            <div class="signature">Dr. ${doctor.name}</div>
            <p style="font-size: 11px; color: #555;">Reg: ${doctor.medicalRegNo || 'IMMIDIT-DOC-' + doctor.id.substring(0, 8).toUpperCase()}</p>
            <p style="font-size: 11px; color: #555;">${timestamp}</p>
        </div>
    </div>

    <div class="disclaimer">
        This is a computer-generated prescription via Immidit Medical Coordination Platform.
        No physical signature is required. The prescription was generated based on a structured
        clinical assessment — including nurse-recorded vitals and telemedicine doctor consultation.
        For emergencies, please contact your nearest hospital.
    </div>
</body>
</html>`;


    // Save HTML file as the "PDF" (later can use puppeteer for real PDF)
    const uploadsDir = path.join(__dirname, '../../uploads/prescriptions');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `prescription_${prescriptionId}_v${versionNumber}.html`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, html, 'utf-8');

    return `/uploads/prescriptions/${filename}`;
}

/**
 * Get prescription by service ID.
 */
export async function getPrescriptionByService(serviceId: string) {
    console.log('getPrescriptionByService called for:', serviceId);
    return prisma.prescription.findFirst({
        where: { serviceId },
        include: {
            doctor: true,
            versions: {
                orderBy: { versionNumber: 'desc' },
            },
        },
    });
}

/**
 * Get all follow-up tasks for a patient.
 */
export async function getPatientFollowUps(patientId: string) {
    return prisma.followUpTask.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        include: {
            service: {
                select: { serviceType: true, id: true },
            },
        },
    });
}

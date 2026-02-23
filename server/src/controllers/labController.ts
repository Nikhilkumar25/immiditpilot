import { Response } from 'express';
import { prisma, getServerIO } from '../index';
import { AuthRequest } from '../middleware/auth';
import { canTransitionLab } from '../services/statusEngine';
import { logAudit } from '../services/auditService';
import { getSignedDownloadUrl } from '../services/storageService';

// Get all active lab tests for dropdown selection
export async function getAvailableTests(_req: AuthRequest, res: Response): Promise<void> {
    try {
        const tests = await prisma.labTest.findMany({
            where: { active: true },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
            select: { id: true, name: true, category: true, price: true, preparationInstructions: true, reportTAT: true },
        });
        res.json(tests);
    } catch (err) {
        console.error('Get available tests error:', err);
        res.status(500).json({ error: 'Failed to fetch available tests' });
    }
}

export async function createLabOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { serviceId, patientId, testsJson, urgency } = req.body;
        const doctorId = req.user!.id;

        if (!serviceId || !patientId || !testsJson || !urgency) {
            res.status(400).json({ error: 'serviceId, patientId, testsJson, urgency are required' });
            return;
        }

        // Calculate total price from selected tests
        const totalPrice = (testsJson as any[]).reduce((sum: number, t: any) => sum + (Number(t.price) || 0), 0);

        const order = await prisma.labOrder.create({
            data: {
                serviceId,
                patientId,
                doctorId,
                testsJson,
                urgency,
                totalPrice: totalPrice || null,
            },
        });

        await logAudit(doctorId, 'CREATE_LAB_ORDER', 'LabOrder', order.id);

        getServerIO().to(`user:${patientId}`).emit('lab_order_created', { labOrderId: order.id, serviceId });
        getServerIO().to('role:admin').emit('lab_order_created', { labOrderId: order.id, serviceId });

        res.status(201).json(order);
    } catch (err) {
        console.error('Create lab order error:', err);
        res.status(500).json({ error: 'Failed to create lab order' });
    }
}

export async function confirmLabOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { confirmedTests } = req.body; // Optional: array of testIds the patient wants to keep
        const order = await prisma.labOrder.findUnique({ where: { id } });

        if (!order) {
            res.status(404).json({ error: 'Lab order not found' });
            return;
        }

        if (order.patientId !== req.user!.id) {
            res.status(403).json({ error: 'Only the patient can confirm this order' });
            return;
        }

        if (!canTransitionLab(order.status, 'pending_sample_collection')) {
            res.status(400).json({ error: 'Invalid status transition' });
            return;
        }

        // If patient opted out of some tests, filter the testsJson
        let finalTests = order.testsJson as any[];
        if (confirmedTests && Array.isArray(confirmedTests) && confirmedTests.length > 0) {
            finalTests = finalTests.filter((t: any) => confirmedTests.includes(t.testId || t.name));
        }

        const totalPrice = finalTests.reduce((sum: number, t: any) => sum + (Number(t.price) || 0), 0);

        const updated = await prisma.labOrder.update({
            where: { id },
            data: {
                status: 'pending_sample_collection' as any,
                testsJson: finalTests,
                totalPrice: totalPrice || null,
            },
        });

        await logAudit(req.user!.id, 'CONFIRM_LAB', 'LabOrder', id);

        getServerIO().to('role:nurse').emit('status_update', { labOrderId: id, status: 'pending_sample_collection' });
        getServerIO().to('role:admin').emit('status_update', { labOrderId: id, status: 'pending_sample_collection' });

        res.json(updated);
    } catch (err) {
        console.error('Confirm lab order error:', err);
        res.status(500).json({ error: 'Failed to confirm lab order' });
    }
}

export async function collectSample(req: AuthRequest, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { checklist, samplePhotos, barcodes } = req.body;

        // Validate checklist
        const required = ['identityConfirmed', 'fastingConfirmed', 'sampleCollected', 'properLabeling'];
        for (const item of required) {
            if (!checklist || !checklist[item]) {
                res.status(400).json({ error: `Checklist item "${item}" must be confirmed` });
                return;
            }
        }

        const order = await prisma.labOrder.findUnique({ where: { id } });
        if (!order) {
            res.status(404).json({ error: 'Lab order not found' });
            return;
        }

        if (!canTransitionLab(order.status, 'sample_collected')) {
            // Also allow from pending_sample_collection directly
            if (order.status !== 'pending_sample_collection' && order.status !== 'sample_collection_scheduled') {
                res.status(400).json({ error: 'Invalid status for sample collection' });
                return;
            }
        }

        const updated = await prisma.labOrder.update({
            where: { id },
            data: {
                status: 'sample_collected' as any,
                collectionTime: new Date(),
                samplePhotos: samplePhotos || undefined,
                barcodes: barcodes || undefined,
            },
        });

        await logAudit(req.user!.id, 'COLLECT_SAMPLE', 'LabOrder', id);

        getServerIO().to(`user:${order.patientId}`).emit('status_update', { labOrderId: id, status: 'sample_collected' });
        getServerIO().to('role:admin').emit('status_update', { labOrderId: id, status: 'sample_collected' });

        res.json(updated);
    } catch (err) {
        console.error('Collect sample error:', err);
        res.status(500).json({ error: 'Failed to collect sample' });
    }
}

export async function confirmSampleReceipt(req: AuthRequest, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const order = await prisma.labOrder.findUnique({ where: { id } });

        if (!order) {
            res.status(404).json({ error: 'Lab order not found' });
            return;
        }

        if (order.status !== 'sample_collected' && order.status !== 'sent_to_lab') {
            res.status(400).json({ error: 'Order must be in sample_collected or sent_to_lab status' });
            return;
        }

        const updated = await prisma.labOrder.update({
            where: { id },
            data: { status: 'received_at_lab' as any },
        });

        await logAudit(req.user!.id, 'RECEIVE_SAMPLE', 'LabOrder', id);

        getServerIO().to('role:lab').emit('status_update', { labOrderId: id, status: 'received_at_lab' });
        getServerIO().to('role:admin').emit('status_update', { labOrderId: id, status: 'received_at_lab' });

        res.json(updated);
    } catch (err) {
        console.error('Confirm sample receipt error:', err);
        res.status(500).json({ error: 'Failed to confirm sample receipt' });
    }
}

export async function uploadLabReport(req: AuthRequest, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { fileId } = req.body;

        if (!fileId) {
            res.status(400).json({ error: 'fileId is required' });
            return;
        }

        // Validate the file exists in FileUpload table
        const fileRecord = await prisma.fileUpload.findUnique({ where: { id: fileId } });
        if (!fileRecord) {
            res.status(404).json({ error: 'File not found. Upload the file first via /api/upload' });
            return;
        }

        const order = await prisma.labOrder.findUnique({
            where: { id },
            include: { labReport: true }
        });
        if (!order) {
            res.status(404).json({ error: 'Lab order not found' });
            return;
        }

        // Store fileId as reportUrl so we can resolve to a signed URL later
        const report = await prisma.labReport.create({
            data: {
                labOrderId: id,
                reportUrl: fileId,
            },
        });

        await prisma.labOrder.update({
            where: { id },
            data: { status: 'report_ready' as any },
        });

        await logAudit(req.user!.id, 'UPLOAD_REPORT', 'LabReport', report.id);

        getServerIO().to(`user:${order.patientId}`).emit('report_uploaded', { labOrderId: id });
        getServerIO().to(`user:${order.doctorId}`).emit('report_uploaded', { labOrderId: id });
        getServerIO().to('role:admin').emit('report_uploaded', { labOrderId: id });

        res.status(201).json(report);
    } catch (err) {
        console.error('Upload lab report error:', err);
        res.status(500).json({ error: 'Failed to upload lab report' });
    }
}

/**
 * Get a fresh signed URL for a lab report.
 * Access: patient (owner), referring doctor, uploading lab user, or admin.
 * GET /lab/order/:id/report/url
 */
export async function getLabReportUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const order = await prisma.labOrder.findUnique({
            where: { id },
            include: { labReport: true },
        });

        if (!order || !order.labReport) {
            res.status(404).json({ error: 'Lab report not found' });
            return;
        }

        // The reportUrl field now stores a fileId
        const fileId = order.labReport.reportUrl;
        const fileRecord = await prisma.fileUpload.findUnique({ where: { id: fileId } });

        if (!fileRecord) {
            res.status(404).json({ error: 'Report file record not found' });
            return;
        }

        // Access control: patient, referring doctor, uploading lab user, or admin
        const isPatient = order.patientId === userId;
        const isDoctor = order.doctorId === userId;
        const isUploader = fileRecord.userId === userId;
        const isAdmin = userRole === 'admin';

        if (!isPatient && !isDoctor && !isUploader && !isAdmin) {
            res.status(403).json({ error: 'You do not have permission to view this report' });
            return;
        }

        // Generate fresh 10-minute signed URL
        const signedUrl = await getSignedDownloadUrl(fileRecord.gcsPath, 10);

        res.json({ url: signedUrl, filename: fileRecord.filename });
    } catch (err) {
        console.error('Get lab report URL error:', err);
        res.status(500).json({ error: 'Failed to get report URL' });
    }
}

export async function reviewLabReport(req: AuthRequest, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { doctorReviewNotes } = req.body;

        if (!doctorReviewNotes) {
            res.status(400).json({ error: 'doctorReviewNotes is required' });
            return;
        }

        const order = await prisma.labOrder.findUnique({
            where: { id },
            include: { labReport: true },
        });

        if (!order) {
            res.status(404).json({ error: 'Lab order not found' });
            return;
        }

        if (!order.labReport) {
            res.status(400).json({ error: 'No lab report uploaded yet' });
            return;
        }

        await prisma.$transaction([
            prisma.labReport.update({
                where: { id: order.labReport.id },
                data: { doctorReviewNotes, reviewedAt: new Date() },
            }),
            prisma.labOrder.update({
                where: { id },
                data: { status: 'lab_closed' as any },
            }),
        ]);

        await logAudit(req.user!.id, 'REVIEW_LAB_REPORT', 'LabOrder', id);

        getServerIO().to(`user:${order.patientId}`).emit('status_update', { labOrderId: id, status: 'lab_closed' });
        getServerIO().to('role:admin').emit('status_update', { labOrderId: id, status: 'lab_closed' });

        res.json({ message: 'Lab report reviewed and order closed' });
    } catch (err) {
        console.error('Review lab report error:', err);
        res.status(500).json({ error: 'Failed to review lab report' });
    }
}

export async function getPatientLabOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
        const orders = await prisma.labOrder.findMany({
            where: { patientId: req.params.patientId as string },
            include: { labReport: true, doctor: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lab orders' });
    }
}

export async function getNurseLabTasks(req: AuthRequest, res: Response): Promise<void> {
    try {
        // Get lab orders for services assigned to this nurse
        const orders = await prisma.labOrder.findMany({
            where: {
                status: { in: ['pending_sample_collection', 'sample_collection_scheduled'] as any },
                service: { nurseId: req.user!.id },
            },
            include: {
                patient: { select: { id: true, name: true, phone: true } },
                doctor: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch nurse lab tasks' });
    }
}

export async function getDoctorLabReviews(req: AuthRequest, res: Response): Promise<void> {
    try {
        const orders = await prisma.labOrder.findMany({
            where: {
                doctorId: req.user!.id,
                status: { in: ['report_ready', 'doctor_review_pending'] as any },
            },
            include: {
                patient: { select: { id: true, name: true } },
                labReport: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch doctor lab reviews' });
    }
}

export async function getLabQueue(req: AuthRequest, res: Response): Promise<void> {
    try {
        const orders = await prisma.labOrder.findMany({
            where: {
                status: { not: 'pending_patient_confirmation' as any }
            },
            include: {
                patient: { select: { id: true, name: true, phone: true } },
                doctor: { select: { id: true, name: true } },
                labReport: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(orders);
    } catch (err) {
        console.error('Get lab queue error:', err);
        res.status(500).json({ error: 'Failed to fetch lab queue' });
    }
}

import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

/**
 * Get current user's profile
 * GET /api/profile
 */
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true, email: true, name: true, phone: true,
                role: true, createdAt: true, dateOfBirth: true,
                gender: true, bloodGroup: true, emergencyContact: true,
                allergicInfo: true, medicalHistory: true, medicalRegNo: true,
                degreeProofUrl: true, registrationProofUrl: true,
            },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ user });
    } catch (err) {
        console.error('GetProfile error:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
}

/**
 * Update current user's profile
 * PATCH /api/profile
 */
export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const {
            name, dateOfBirth, gender, bloodGroup, emergencyContact,
            medicalRegNo, medicalHistory, allergicInfo,
            degreeProofUrl, registrationProofUrl
        } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        if (gender !== undefined) updateData.gender = gender || null;
        if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup || null;
        if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact || null;
        if (medicalRegNo !== undefined) updateData.medicalRegNo = medicalRegNo || null;
        if (medicalHistory !== undefined) updateData.medicalHistory = medicalHistory || null;
        if (allergicInfo !== undefined) updateData.allergicInfo = allergicInfo || null;
        if (degreeProofUrl !== undefined) updateData.degreeProofUrl = degreeProofUrl || null;
        if (registrationProofUrl !== undefined) updateData.registrationProofUrl = registrationProofUrl || null;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: {
                id: true, email: true, name: true, phone: true,
                role: true, createdAt: true, dateOfBirth: true,
                gender: true, bloodGroup: true, emergencyContact: true,
                medicalRegNo: true, medicalHistory: true, allergicInfo: true,
                degreeProofUrl: true, registrationProofUrl: true,
            },
        });

        res.json({ user });
    } catch (err) {
        console.error('UpdateProfile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
}

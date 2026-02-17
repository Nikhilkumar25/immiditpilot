import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

export async function saveAddress(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { label, address, flatNumber, buildingName, floor, landmark, area, city, pincode, lat, lng } = req.body;
        const userId = req.user!.id;

        if (!address || !label) {
            res.status(400).json({ error: 'Label and Address are required' });
            return;
        }

        // Default lat/lng if missing (e.g. from manual API calls) to avoid Prisma crash
        const finalLat = lat || 28.6139;
        const finalLng = lng || 77.2090;

        const savedAddress = await prisma.savedAddress.create({
            data: {
                userId,
                label,
                address,
                flatNumber,
                buildingName,
                floor,
                landmark,
                area,
                city,
                pincode,
                lat: finalLat,
                lng: finalLng
            }
        });

        res.status(201).json(savedAddress);
    } catch (err: any) {
        console.error('Save address error:', err);
        res.status(500).json({ error: 'Failed to save address', details: err.message });
    }
}

export async function getAddresses(req: AuthRequest, res: Response): Promise<void> {
    try {
        const userId = req.user!.id;
        const addresses = await prisma.savedAddress.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(addresses);
    } catch (err) {
        console.error('Get addresses error:', err);
        res.status(500).json({ error: 'Failed to fetch addresses' });
    }
}

export async function deleteAddress(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        await prisma.savedAddress.deleteMany({
            where: { id: id as string, userId } // Ensure user owns the address
        });

        res.json({ message: 'Address deleted' });
    } catch (err) {
        console.error('Delete address error:', err);
        res.status(500).json({ error: 'Failed to delete address' });
    }
}

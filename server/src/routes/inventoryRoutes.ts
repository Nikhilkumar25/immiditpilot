import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
    getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem,
    getStockMovements, createStockMovement,
    getServiceConsumables, addServiceConsumable,
    getLowStockItems,
} from '../controllers/inventoryController';

const router = Router();

router.use(authenticate);

// Inventory Items (admin only for write, nurse can read)
router.get('/items', getInventoryItems as any);
router.post('/items', authorize('admin'), createInventoryItem as any);
router.patch('/items/:id', authorize('admin'), updateInventoryItem as any);
router.delete('/items/:id', authorize('admin'), deleteInventoryItem as any);

// Stock Movements (admin only)
router.get('/movements', authorize('admin'), getStockMovements as any);
router.post('/movements', authorize('admin'), createStockMovement as any);

// Service Consumables (nurse + admin can add)
router.get('/consumables/:serviceId', getServiceConsumables as any);
router.post('/consumables/:serviceId', authorize('admin', 'nurse'), addServiceConsumable as any);

// Low Stock Alerts
router.get('/low-stock', authorize('admin'), getLowStockItems as any);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { saveAddress, getAddresses, deleteAddress } from '../controllers/addressController';

const router = Router();

router.use(authenticate);

router.post('/', saveAddress);
router.get('/', getAddresses);
router.delete('/:id', deleteAddress);

export default router;

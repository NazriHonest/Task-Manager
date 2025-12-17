import { Router } from 'express';
import { 
  getProfile, 
  updateProfile, 
  changePassword, 
  uploadAvatar, 
  deleteAccount 
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { updateProfileSchema } from '../validators/auth.validator';

const router = Router();

// Protected routes - require authentication
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.put('/password', authenticate, changePassword);
router.post('/avatar', authenticate, uploadAvatar);
router.delete('/account', authenticate, deleteAccount);

export default router;
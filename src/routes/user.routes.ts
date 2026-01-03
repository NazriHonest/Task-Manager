import { Router } from 'express';
import { 
  getProfile, 
  updateProfile, 
  changePassword, 
  uploadAvatar, 
  getUserStatistics,
  deleteAccount 
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { updateProfileSchema } from '../validators/auth.validator';
import { avatarMiddleware } from '../middleware/upload.middleware'; // Import the avatar handler

const router = Router();

// Protected routes - require authentication
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.put('/password', authenticate, changePassword);
router.get('/statistics', authenticate, getUserStatistics);

// Avatar upload route with avatar-specific middleware
router.post(
  '/avatar', 
  authenticate, 
  avatarMiddleware.single, // Use avatar-specific middleware
  uploadAvatar
);


router.delete('/account', authenticate, deleteAccount);

export default router;
import { Router } from 'express';
import {
    addDeliveryAddress,
    changePassword,
    deleteDeliveryAddress,
    deleteUser,
    forgotPassword,
    getAllUsers,
    getDeliveryAddresses,
    getUserById,
    getUserProfile,
    registerPushToken,
    login,
    register,
    resetPassword,
    updateDeliveryAddress,
    updateUser,
    updateUserProfile,
    updateUserSettings,
} from '../controllers/userController.js';

const router = Router();

// Auth Routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// User Profile Routes
router.get('/:userId/profile', getUserProfile);
router.put('/:userId/profile', updateUserProfile);
router.post('/:userId/change-password', changePassword);

// Delivery Addresses Routes
router.get('/:userId/addresses', getDeliveryAddresses);
router.post('/:userId/addresses', addDeliveryAddress);
router.put('/:userId/addresses/:addressId', updateDeliveryAddress);
router.delete('/:userId/addresses/:addressId', deleteDeliveryAddress);

// Push token registration
router.post('/:userId/push-token', registerPushToken);

// User Settings Routes
router.put('/:userId/settings', updateUserSettings);

// Legacy Routes
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
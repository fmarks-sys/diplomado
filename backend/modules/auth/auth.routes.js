import express from 'express';
import * as controller from './auth.controller.js';
import { verifyToken } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/rolMiddleware.js';

const router = express.Router();

router.post('/register', verifyToken, isAdmin, controller.register);
router.post('/login', controller.login);

export default router;

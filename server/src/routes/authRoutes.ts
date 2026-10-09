import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SheetsRepo } from '../services/sheetsRepo';
import { User, Employee } from '../types';
import { comparePassword, hashPassword } from '../utils/crypto';
import { signToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { loginLimiter } from '../middleware/rateLimit';
import { AuditService } from '../services/auditService';

const router = Router();

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or Employee ID is required'),
  password: z.string().min(1, 'Password is required')
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: parseResult.error.errors[0].message });
    }

    const { identifier, password } = parseResult.data;
    const cleanId = identifier.trim().toLowerCase();

    // Find in Users tab by email or employee_id
    let users = await SheetsRepo.list<User>('Users');
    if (users.length === 0) {
      const { autoSeedInitialData } = await import('../services/sheetsRepo');
      await autoSeedInitialData();
      users = await SheetsRepo.list<User>('Users');
    }
    const user = users.find(u => 
      (u.email && u.email.toLowerCase() === cleanId) || 
      (u.employee_id && u.employee_id.toLowerCase() === cleanId) ||
      (u.phone && u.phone === cleanId)
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.is_active === false || user.is_active === 'FALSE' || user.is_active === 'false') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact HR.' });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last_login
    await SheetsRepo.update<User>('Users', user.id, {
      last_login: new Date().toISOString()
    });

    // Find Employee record
    const employees = await SheetsRepo.list<Employee>('Employees');
    const employee = employees.find(e => e.employee_id === user.employee_id);

    const mustChangePassword = false;

    const token = signToken({
      userId: user.id,
      employeeId: user.employee_id,
      email: user.email,
      role: user.role,
      mustChangePassword
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    await AuditService.log(user.employee_id, 'LOGIN', 'Users', user.id, undefined, undefined, req.ip);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        employee_id: user.employee_id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        must_change_password: mustChangePassword,
        name: employee?.full_name || user.email,
        designation: employee?.designation || user.role,
        department: employee?.department || 'Operations',
        photo_url: employee?.photo_url
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await SheetsRepo.getById<User>('Users', req.user!.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const employees = await SheetsRepo.list<Employee>('Employees');
    const employee = employees.find(e => e.employee_id === user.employee_id);

    const mustChangePassword = false;

    return res.json({
      success: true,
      user: {
        id: user.id,
        employee_id: user.employee_id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        must_change_password: mustChangePassword,
        name: employee?.full_name || user.email,
        designation: employee?.designation || user.role,
        department: employee?.department || 'Operations',
        photo_url: employee?.photo_url
      }
    });
  } catch (err: any) {
    console.error('Me endpoint error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: parseResult.error.errors[0].message });
    }

    const { currentPassword, newPassword } = parseResult.data;
    const user = await SheetsRepo.getById<User>('Users', req.user!.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await comparePassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(newPassword);

    await SheetsRepo.update<User>('Users', user.id, {
      password_hash: newHash,
      must_change_password: false
    });

    await AuditService.log(user.employee_id, 'PASSWORD_CHANGE', 'Users', user.id, undefined, undefined, req.ip);

    // Issue refreshed token
    const token = signToken({
      userId: user.id,
      employeeId: user.employee_id,
      email: user.email,
      role: user.role,
      mustChangePassword: false
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({ success: true, message: 'Password changed successfully', token });
  } catch (err: any) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

const resetPasswordSchema = z.object({
  employeeId: z.string().min(1),
  newPassword: z.string().min(8)
});

router.post('/reset-password', authenticate, requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: parseResult.error.errors[0].message });
    }

    const { employeeId, newPassword } = parseResult.data;
    const users = await SheetsRepo.list<User>('Users');
    const user = users.find(u => u.employee_id === employeeId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found for given Employee ID' });
    }

    const newHash = await hashPassword(newPassword);
    await SheetsRepo.update<User>('Users', user.id, {
      password_hash: newHash,
      must_change_password: true // Force password change on reset
    });

    await AuditService.log(req.user!.employeeId, 'PASSWORD_RESET', 'Users', user.id, undefined, { target: employeeId }, req.ip);

    return res.json({ success: true, message: `Password reset successfully for ${employeeId}` });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

export default router;

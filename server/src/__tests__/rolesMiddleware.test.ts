import { Request, Response, NextFunction } from 'express';
import { requireRole } from '../middleware/roles';
import { TokenPayload } from '../utils/jwt';

describe('Role Authorization Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFn = jest.fn();
  });

  test('allows access when user has required role', () => {
    mockReq = {
      user: {
        userId: 'u1',
        employeeId: 'MSA-0001',
        email: 'hrmanager@masteredskill.com',
        role: 'HR Manager',
        mustChangePassword: false
      } as TokenPayload
    };

    const middleware = requireRole('HR Manager');
    middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test('blocks access (403) when user does not have required role', () => {
    mockReq = {
      user: {
        userId: 'u3',
        employeeId: 'MSA-0003',
        email: 'employee@masteredskill.com',
        role: 'Employee',
        mustChangePassword: false
      } as TokenPayload
    };

    const middleware = requireRole('HR Manager');
    middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });
});

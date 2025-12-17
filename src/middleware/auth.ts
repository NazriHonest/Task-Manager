import { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '../utils/auth.utils';
import { prisma } from '../../lib/prisma';

//const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
  token?: string;
}

// Main authentication middleware
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from Authorization header
    const token = AuthUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided. Please login to access this resource.'
      });
    }

    // Verify the access token
    const payload = AuthUtils.verifyAccessToken(token);
    
    if (!payload) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token. Please login again.'
      });
    }

    // Check if user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, isVerified: true }
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User no longer exists.'
      });
    }

    // Optionally check if email is verified
    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.isVerified) {
      return res.status(403).json({
        status: 'error',
        message: 'Please verify your email address to access this resource.'
      });
    }

    // Attach user info to request object
    req.user = {
      userId: user.id,
      email: user.email
    };
    req.token = token;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed due to server error.'
    });
  }
};

// Optional email verification requirement middleware
export const requireVerifiedEmail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isVerified: true }
    });

    if (!user || !user.isVerified) {
      return res.status(403).json({
        status: 'error',
        message: 'Email verification required. Please verify your email address.'
      });
    }

    next();
  } catch (error) {
    console.error('Email verification check error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error during email verification check.'
    });
  }
};

// Role-based authorization middleware (for future use)
export const authorize = (...allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required.'
        });
      }

      // For now, we'll implement this later when we have roles
      // You can extend this to check user roles from database
      
      // Example for future implementation:
      // const user = await prisma.user.findUnique({
      //   where: { id: req.user.userId },
      //   include: { roles: true }
      // });
      
      // const userRoles = user?.roles.map(role => role.name) || [];
      // const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
      
      // if (!hasRequiredRole) {
      //   return res.status(403).json({
      //     status: 'error',
      //     message: 'You do not have permission to access this resource.'
      //   });
      // }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Server error during authorization check.'
      });
    }
  };
};

// Rate limiting middleware (basic implementation)
export const rateLimit = (options: { windowMs: number; max: number }) => {
  const requests = new Map<string, number>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - options.windowMs;
    
    // Clean up old entries
    requests.forEach((timestamp, key) => {
      if (timestamp < windowStart) {
        requests.delete(key);
      }
    });
    
    // Count requests from this IP
    const ipRequests = Array.from(requests.entries())
      .filter(([key]) => key.startsWith(`${ip}:`))
      .length;
    
    if (ipRequests >= options.max) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many requests. Please try again later.'
      });
    }
    
    // Add current request
    const requestKey = `${ip}:${now}`;
    requests.set(requestKey, now);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', options.max - ipRequests - 1);
    res.setHeader('X-RateLimit-Reset', new Date(now + options.windowMs).toISOString());
    
    next();
  };
};

// CSRF protection middleware - removed session references
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // For JWT-based APIs, CSRF is less critical since we're not using cookies
  // We can implement token-based CSRF protection if needed
  // For now, we'll skip CSRF for API routes
  
  next();
};

// CORS middleware configuration
export const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
};
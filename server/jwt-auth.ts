import jwt from 'jsonwebtoken';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { Request, Response, NextFunction } from 'express';
import type { User } from '@shared/schema';

// Convert callback-based scrypt to Promise-based
const scryptAsync = promisify(scrypt);

// Secret key for JWT
const JWT_SECRET = process.env.SESSION_SECRET || 'your-secret-key';

// JWT token expiration (1 day)
const TOKEN_EXPIRATION = '1d';

// Helper to generate JWT token
export function generateToken(user: { id: number; email: string; username: string }): string {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
}

// Middleware to verify JWT token 
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // Get token from Authorization header or cookies
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1] || req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { 
      id: number; 
      email: string; 
      username: string; 
    };
    
    // Attach user to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Password hashing and verification
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        username: string;
      };
    }
  }
}
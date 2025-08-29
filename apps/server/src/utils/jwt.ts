import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';

export interface JwtPayload {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'technician';
  worksiteIds: string[];
}

export interface RefreshTokenPayload {
  id: string;
  tokenVersion: number;
}

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRE as string,
    issuer: 'chryso-forms-v2',
    audience: 'chryso-forms-client',
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRE as string,
    issuer: 'chryso-forms-v2',
    audience: 'chryso-forms-client',
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET as string, {
      issuer: 'chryso-forms-v2',
      audience: 'chryso-forms-client',
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET as string, {
      issuer: 'chryso-forms-v2',
      audience: 'chryso-forms-client',
    }) as RefreshTokenPayload;

    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
};

import jwt from 'jsonwebtoken';

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('JWT_SECRET must be set to a string of at least 16 characters.');
  return s;
};

export const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, secret(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, secret());
  } catch {
    return null;
  }
};

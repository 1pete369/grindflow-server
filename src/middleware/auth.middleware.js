// middleware/auth.js

import jwt from 'jsonwebtoken';
import User from "../models/user.model.js"
/**
 * Middleware: protectRoute
 * ------------------------
 * Checks for a JWT in an HTTP-only cookie named `token`. If present and valid,
 * attaches the corresponding user (minus password) to req.user and calls next().
 * Otherwise, returns 401 Unauthorized.
 *
 * For React Native clients, you can also send the token via the `Authorization` header:
 *   Authorization: Bearer <token>
 * In that case, uncomment/check the code under “// React Native: Bearer token support” below.
 */
export const protectRoute = async (req, res, next) => {
  try {
    // 1. Try to read token from HTTP-only cookie
    let token = req.cookies?.token;

    // React Native: Bearer token support (if you prefer sending token in header instead of cookies)
    // Uncomment these lines if you want to accept “Authorization: Bearer <token>” in addition to cookies:
    //
    // if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    //   token = req.headers.authorization.split(' ')[1];
    // }

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized – No token provided' });
    }

    // 2. Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Assuming you stored userId in the token payload as { userId: '...' }
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 3. Attach user to request and proceed
    req.user = user;
    next();
  } catch (error) {
    console.error('Error in protectRoute middleware:', error.message);
    return res.status(401).json({ message: 'Unauthorized – Invalid or expired token' });
  }
};

/**
 * Middleware: authenticateSocket
 * ------------------------------
 * For Socket.IO authentication. Expects the client to pass:
 *   io('https://your-domain', { auth: { token: '<jwt>' } });
 * Verifies the token, retrieves the user, and attaches it to socket.user.
 * If invalid or missing, rejects the connection.
 */
export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Unauthorized – No token provided'));
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) {
      return next(new Error('Unauthorized – User not found'));
    }

    socket.user = user; // attach user object to socket
    next();
  } catch (err) {
    console.error('Error in authenticateSocket middleware:', err.message);
    next(new Error('Unauthorized – Invalid or expired token'));
  }
};

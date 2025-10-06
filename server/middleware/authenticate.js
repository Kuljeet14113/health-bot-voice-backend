import jwt from 'jsonwebtoken'
import User from '../models/user.js';
import Doctor from '../models/doctor.js';

export const authenticate = async (req, res, next) => {
    try {
        let token = req.cookies?.access_token;
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }
        
        const decodeToken = jwt.verify(token, process.env.JWT_SECRET);

        // Attach decoded first
        req.user = decodeToken;

        // Validate token exists in DB tokens[] for the user (skip for hardcoded admin)
        if (decodeToken.role === 'admin' && decodeToken._id === 'admin_id') {
            return next();
        }

        const userId = decodeToken._id || decodeToken.userId || decodeToken.id;
        const role = decodeToken.role;

        let account = null;
        if (role === 'doctor') {
            account = await Doctor.findById(userId).select('tokens');
        } else {
            account = await User.findById(userId).select('tokens');
        }

        if (!account) {
            return res.status(401).json({ success: false, message: 'Unauthorized: user not found' });
        }

        const hasToken = (account.tokens || []).some(t => t.token === token);
        if (!hasToken) {
            return res.status(401).json({ success: false, message: 'Unauthorized: token invalidated' });
        }

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired.'
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Authentication failed.'
            });
        }
    }
}
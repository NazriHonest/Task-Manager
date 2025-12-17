"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        // Check if user exists
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }
        // Create user (in real app, hash the password!)
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password, // TODO: Hash password before saving
                name
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true
            }
        });
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: user
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user
        const user = await prisma_1.default.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        // Check password (in real app, use bcrypt)
        if (user.password !== password) { // TODO: Use proper password comparison
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        // Generate token (simplified for now)
        const token = 'dummy-jwt-token'; // TODO: Use jsonwebtoken
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: userWithoutPassword,
                token
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
exports.login = login;
//# sourceMappingURL=auth.controller.js.map
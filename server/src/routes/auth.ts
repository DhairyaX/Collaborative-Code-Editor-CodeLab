import express, { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-prod";

// Simple in-memory user store (replace with database in production)
const users: Map<string, any> = new Map();

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    if (users.has(email)) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const userId = uuidv4();

    users.set(email, {
      id: userId,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: userId, email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: { id: userId, email },
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: { id: user.id, email },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
}



export function verifyToken(req: AuthRequest, res: Response, next: Function) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
}

router.post("/register", register);
router.post("/login", login);

export default router;

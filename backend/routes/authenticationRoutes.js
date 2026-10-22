import { prisma } from "../utils/prisma.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({ error: "Missing required fields!" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        login: {
          email: email,
        },
      },
      include: {
        login: true,
      },
    });

    if (!existingUser) {
      return res.status(409).json({ error: "User does not exist" });
    }

    if (!existingUser.approved) {
      return res
        .status(403)
        .json({
          error: "User has not been approved yet. Please try again later.",
        });
    }

    if (!existingUser.isActive) {
      return res.status(403).json({ error: "This account has been disabled." });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.login.password,
    );

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    const token = jwt.sign(
      { userId: existingUser.id, role: existingUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    return res.status(200).json({
      message: "User logged in Successfully",
      token: token,
      user: {
        id: existingUser.id,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        role: existingUser.role,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "There was an Internal server error" });
  }
}

export async function register(req, res) {
  try {
    const body = req.body ?? {};
    const firstName = body.firstName ?? body.first_name;
    const lastName = body.lastName ?? body.last_name;
    const phoneNumber = body.phoneNumber ?? body.phone_number;
    const role = body.role ?? body.user_type;
    const address = body.address;
    const dateOfBirth = body.dateOfBirth ?? body.date_of_birth;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;

    if (
      !firstName ||
      !lastName ||
      !phoneNumber ||
      !role ||
      !address ||
      !dateOfBirth ||
      !email ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({ error: "Missing required fields!" });
    }

    if (!["buyer", "seller", "admin"].includes(role)) {
      return res.status(400).json({ error: "Role must be buyer, seller, or admin." });
    }

    const parsedDateOfBirth = new Date(dateOfBirth);
    if (Number.isNaN(parsedDateOfBirth.getTime())) {
      return res.status(400).json({ error: "Date of birth is invalid." });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        login: {
          email: email,
        },
      },
    });

    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phoneNumber,
        role,
        address: address,
        dateOfBirth: parsedDateOfBirth,
        approved: false,
        login: {
          create: {
            email: email,
            password: hashedPassword,
          },
        },
      },
    });

    return res.status(201).json({
      message: "User registered Successfully",
      user: {
        id: createdUser.id,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        role: createdUser.role,
      },
    });
  } catch (error) {
    console.log(error);
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    return res.status(500).json({ error: "There was an Internal server error" });
  }
}

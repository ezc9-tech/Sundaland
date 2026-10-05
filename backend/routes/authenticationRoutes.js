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
        }
      },
      include: {
        login: true
      }
    })

    if(!existingUser) {
      return res.status(409).json({ error: "User does not exist"});
    }

    if (!existingUser.approved) {
      return res.status(403).json({ error: "User has not been approved yet. Please try again later."})
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.login.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid Credentials"})
    }

    const token = jwt.sign({ userId: existingUser.id, userType: existingUser.user_type }, process.env.JWT_SECRET, { expiresIn: "1h"});

    return res.status(201).json({
      message: "User logged in Successfully",
      token: token, 
      user: {id: existingUser.id, first_name: existingUser.first_name, last_name: existingUser.last_name, user_type: existingUser.user_type}
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({error: "There was an Internal server error"});
  }
}

export async function register(req, res) {
  try {
    const { first_name, last_name, phone_number, user_type, address, date_of_birth, email, password } = req.body;

    if (!first_name || !last_name || !phone_number || !user_type || !address || !date_of_birth || !email || !password) {
      return res.status(401).json({ error: "Missing required fields!" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        login: {
          email: email,
        }
      }
    })

    if(existingUser) {
      return res.status(409).json({ error: "User already exists"});
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await prisma.user.create({
      data: {
        first_name: first_name,
        last_name: last_name,
        phone_number: phone_number,
        user_type: user_type,
        address: address,
        date_of_birth: new Date(date_of_birth),
        approved: false,
        login: {
          create: {
            email: email,
            password: hashedPassword,
          },
        },
      },
    });

    const token = jwt.sign({ userId: createdUser.id, userType: createdUser.user_type }, process.env.JWT_SECRET, { expiresIn: "1h"});

    return res.status(201).json({
      message: "User registerd Successfully",
      token: token, 
      user: {id: createdUser.id, first_name: createdUser.first_name, last_name: createdUser.last_name, user_type: createdUser.user_type}
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({error: "There was an Internal server error"});
  }
}

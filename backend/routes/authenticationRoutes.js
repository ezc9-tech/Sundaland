import { prisma } from "../utils/prisma.ts";

export async function testQuery(req, res) {
  try {
    const createdAdmin = await prisma.user.create({
      data: {
        first_name: "System",
        last_name: "Admin",
        phone_number: "5551234567",
        user_type: "admin",
        address: "123 Server Lane",
        date_of_birth: new Date("1990-01-01"),
        approved: true,
        login: {
          create: {
            email: "admin@example.com",
            password: "super_secret_hashed_password",
          },
        },
      },
    });

    const fetchedAdmin = await prisma.user.findUnique({
      where: {
        id: createdAdmin.id,
      },
      include: {
        login: true, 
      },
    });

    return res.status(200).json({
      success: true,
      message: "Admin created and fetched",
      data: fetchedAdmin,
    });
  } catch (error) {
    console.error("Test query failed:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to run test query",
    });
  }
}

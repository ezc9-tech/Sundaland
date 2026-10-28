import { prisma } from "../utils/prisma.ts";
import dotenv from "dotenv";

dotenv.config();

export async function getUnapprovedUsers(req, res) {
  try {
    const unapprovedUsers = await prisma.user.findMany({
      where: { approved: false },
      include: {
        login: {
          select: {
            email: true,
          },
        },
      },
    });

    return res.status(200).json({ unapprovedUsers });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function getApprovedUsers(req, res) {
  try {
    const approvedUsers = await prisma.user.findMany({
      where: { approved: true },
      include: {
        login: {
          select: {
            email: true,
          },
        },
      },
    });

    return res.status(200).json({ approvedUsers });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function approveUser(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "User ID not provided" });
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { approved: true },
    });

    return res
      .status(200)
      .json({
        message: "User approved successfylly",
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          approved: user.approved,
        },
      });
  } catch (error) {
    console.log(error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function setUserActiveStatus(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const { isActive } = req.body ?? {};

  if (!Number.isInteger(id) || id <= 0 || typeof isActive !== "boolean") {
    return res.status(400).json({ error: "A valid user ID and isActive status are required" });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    return res.status(200).json({ user });
  } catch (error) {
    console.error(error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function getUnapprovedProducts(req, res) {
  try {
    const unapprovedProducts = await prisma.product.findMany({
      where: { approved: false },
      include: {
        company: true,
      }
    });

    return res.status(200).json({ unapprovedProducts });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function getApprovedProducts(req, res) {
  try {
    const approvedProducts = await prisma.product.findMany({
      where: { approved: true },
      include: {
        company: true,
      }
    });

    return res.status(200).json({ approvedProducts });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function approveProduct(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Product ID not provided" });
    }

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { approved: true },
      include: {
        company: true, 
      },
    });

    return res.status(200).json({
      message: "Product approved successfully",
      product: {
        id: product.id,
        name: product.name,
        company_name: product.company.name,
        approved: product.approved,
      },
    });
  } catch (error) {
    console.error(error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function setProductActiveStatus(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const { isActive } = req.body ?? {};

  if (!Number.isInteger(id) || id <= 0 || typeof isActive !== "boolean") {
    return res.status(400).json({ error: "A valid product ID and isActive status are required" });
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data: { isActive },
      include: { company: true },
    });

    return res.status(200).json({ product });
  } catch (error) {
    console.error(error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.status(500).json({ error: "There was an internal server error" });
  }
}


export async function denyUser(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "A valid user ID is required" });
  }

  try {
    await prisma.user.delete({ where: { id } });

    return res.status(200).json({ message: "User denied and removed" });
  } catch (error) {
    console.error(error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function denyProduct(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "A valid product ID is required" });
  }

  try {
    const orderCount = await prisma.orderItem.count({ where: { productId: id } });
    if (orderCount > 0) {
      return res.status(409).json({
        error: "This product has been ordered before and can't be deleted. Set its inventory to 0 instead.",
      });
    }

    await prisma.$transaction([
      prisma.cartToProducts.deleteMany({ where: { productId: id } }),
      prisma.review.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    return res.status(200).json({ message: "Product denied and removed" });
  } catch (error) {
    console.error(error);

    if (error.code === "P2003") {
      return res.status(409).json({
        error: "This product can't be deleted because other records still reference it.",
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function setAccountInactive(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const { isActive } = req.body ?? {};

  if (!Number.isInteger(id) || id <= 0 || typeof isActive !== "boolean") {
    return res.status(400).json({ error: "A valid product ID and isActive status are required" });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      include: { company: true },
    });

    return res.status(200).json({ product });
  } catch (error) {
    console.error(error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product " });
    }

    return res.status(500).json({ error: "There was an internal server error" });
  }
}
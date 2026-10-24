import { prisma } from "../utils/prisma.ts";
import dotenv from "dotenv";
import { validateProductName, validateProductDescription } from "../utils/validateText.js";

dotenv.config();

function userIdOf(user) {
  const id = Number(user?.id ?? user?.userId ?? user?.sub);
  return Number.isInteger(id) ? id : null;
}

function ownedBy(user) {
  if (user?.role === "admin") return {};

  const userId = userIdOf(user);

  if (userId === null) return { id: -1 };

  return { company: { users: { some: { userId } } } };
}

export async function getProducts(req, res) {
  try {
    const products = await prisma.product.findMany({
      where: { approved: true, isActive: true },
      include: { company: { select: { name: true } } },
    });
    return res.status(200).json({ products });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function getProductById(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }
    const product = await prisma.product.findFirst({
      where: { id, approved: true, isActive: true },
      include: { company: { select: { name: true } } },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.status(200).json({ product });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function createProduct(req, res) {
  try {
    const { name, price, description, pictureUrl, inventory, companyName } =
      req.body;

    if (!name || !description || price === undefined || !companyName) {
      return res
        .status(400)
        .json({
          error: "name, price, description, and companyName are required",
        });
    }

    const nameError = validateProductName(name);
    if (nameError) {
      return res.status(400).json({ error: nameError });
    }

    const descriptionError = validateProductDescription(description);
    if (descriptionError) {
      return res.status(400).json({ error: descriptionError });
    }

    const parsedPrice = Number(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return res
        .status(400)
        .json({ error: "price must be a non-negative number" });
    }

    const parsedInventory = inventory === undefined ? 0 : Number(inventory);
    if (!Number.isInteger(parsedInventory) || parsedInventory < 0) {
      return res
        .status(400)
        .json({ error: "inventory must be a non-negative whole number" });
    }

    const trimmedCompanyName = String(companyName).trim();
    if (
      trimmedCompanyName.length === 0 ||
      trimmedCompanyName.length > 100 ||
      !/^[A-Za-z0-9 ]+$/.test(trimmedCompanyName)
    ) {
      return res.status(400).json({
        error: "companyName must be 1-100 characters: letters, numbers, and spaces only",
      });
    }

    const userId = userIdOf(req.user);
    if (userId === null) {
      return res.status(401).json({ error: "Token is missing a user id" });
    }

    let company = await prisma.company.findFirst({
      where: { name: { equals: trimmedCompanyName, mode: "insensitive" } },
    });

    if (!company) {
      const creator = await prisma.user.findUnique({ where: { id: userId } });
      if (!creator) {
        return res.status(401).json({ error: "User not found" });
      }

      company = await prisma.company.create({
        data: {
          name: trimmedCompanyName,
          address: creator.address,
          phoneNumber: creator.phoneNumber,
          users: { create: { userId } },
        },
      });
    } else if (req.user.role !== "admin") {
      const membership = await prisma.usersToCompany.findUnique({
        where: {
          userId_companyId: { userId, companyId: company.id },
        },
      });

      if (!membership) {
        return res.status(403).json({
          error: "That company name is already taken by another company",
        });
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        price: parsedPrice,
        description,
        pictureUrl: pictureUrl ?? null,
        inventory: parsedInventory,
        companyId: company.id,
      },
    });

    return res
      .status(201)
      .json({ message: "Product created successfully", product });
  } catch (error) {
    console.log(error);

    if (error.code === "P2003") {
      return res.status(400).json({ error: "Could not link this product to a company" });
    }

    res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function getMyProducts(req, res) {
  try {
    const products = await prisma.product.findMany({
      where: ownedBy(req.user),
      orderBy: { id: "desc" },
      include: { company: { select: { id: true, name: true } } },
    });

    return res.status(200).json({ products });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function getMyProduct(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const product = await prisma.product.findFirst({
      where: { id, ...ownedBy(req.user) },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.status(200).json({ product });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function updateProduct(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const { name, description, price, inventory, pictureUrl } = req.body;
    const data = {};

    if (name !== undefined) {
      const nameError = validateProductName(name);
      if (nameError) return res.status(400).json({ error: nameError });
      data.name = name.trim();
    }

    if (description !== undefined) {
      const descriptionError = validateProductDescription(description);
      if (descriptionError) return res.status(400).json({ error: descriptionError });
      data.description = description.trim();
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: "price must be a non-negative number" });
      }
      data.price = parsedPrice;
    }

    if (inventory !== undefined) {
      const parsedInventory = Number(inventory);
      if (!Number.isInteger(parsedInventory) || parsedInventory < 0) {
        return res.status(400).json({ error: "inventory must be a non-negative whole number" });
      }
      data.inventory = parsedInventory;
    }

    if (pictureUrl !== undefined) {
      data.pictureUrl = pictureUrl ? String(pictureUrl).trim() : null;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const existing = await prisma.product.findFirst({
      where: { id, ...ownedBy(req.user) },
    });

    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (req.user.role !== "admin" && (data.name !== undefined || data.description !== undefined)) {
      data.approved = false;
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    return res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    console.log(error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function deleteProduct(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const existing = await prisma.product.findFirst({
      where: { id, ...ownedBy(req.user) },
    });

    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }

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

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.log(error);

    if (error.code === "P2003") {
      return res.status(409).json({
        error: "This product can't be deleted because other records still reference it.",
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(500).json({ error: "There was an internal server error" });
  }
}
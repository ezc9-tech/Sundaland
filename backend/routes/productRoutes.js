import { prisma } from "../utils/prisma.ts";
import dotenv from "dotenv";
import { validateProductName, validateProductDescription } from "../utils/validateText.js";
import { validateProductTag, PRODUCT_TAGS } from "../utils/productTags.js";
import { listingSnapshot, recordListingAudit } from "../utils/listingAudit.js";

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

export function getProductTags(req, res) {
  return res.status(200).json({ tags: PRODUCT_TAGS });
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
    const { name, price, description, pictureUrl, inventory, tag } = req.body;

    if (!name || !description || price === undefined) {
      return res
        .status(400)
        .json({ error: "name, price, and description are required" });
    }

    const nameError = validateProductName(name);
    if (nameError) {
      return res.status(400).json({ error: nameError });
    }

    const descriptionError = validateProductDescription(description);
    if (descriptionError) {
      return res.status(400).json({ error: descriptionError });
    }

    const tagError = validateProductTag(tag);
    if (tagError) {
      return res.status(400).json({ error: tagError });
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

    const userId = userIdOf(req.user);
    if (userId === null) {
      return res.status(401).json({ error: "Token is missing a user id" });
    }

    //company not required anymore, this is just for the schema
    const membership = await prisma.usersToCompany.findFirst({
      where: { userId },
      include: { company: true },
      orderBy: { companyId: "asc" },
    });

    let company = membership?.company;

    if (!company) {
      const creator = await prisma.user.findUnique({ where: { id: userId } });
      if (!creator) {
        return res.status(401).json({ error: "User not found" });
      }

      company = await prisma.company.create({
        data: {
          name: `Seller ${userId}`,
          address: creator.address,
          phoneNumber: creator.phoneNumber,
          users: { create: { userId } },
        },
      });
    }

    const product = await prisma.$transaction(async (transaction) => {
      const createdProduct = await transaction.product.create({
        data: {
          name,
          price: parsedPrice,
          description,
          pictureUrl: pictureUrl ?? null,
          inventory: parsedInventory,
          tag,
          companyId: company.id,
        },
        include: { company: true },
      });

      await recordListingAudit(transaction, {
        product: createdProduct,
        actor: req.user,
        action: "CREATED",
        currentData: listingSnapshot(createdProduct),
      });

      return createdProduct;
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

    const { name, description, price, inventory, pictureUrl, tag } = req.body;
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

    if (tag !== undefined) {
      const tagError = validateProductTag(tag);
      if (tagError) return res.status(400).json({ error: tagError });
      data.tag = tag;
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

    if (req.user.role !== "admin" && (data.name !== undefined || data.description !== undefined)) {
      data.approved = false;
    }

    const product = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.product.findFirst({
        where: { id, ...ownedBy(req.user) },
        include: { company: true },
      });

      if (!existing) {
        const error = new Error("Product not found");
        error.code = "P2025";
        throw error;
      }

      const updatedProduct = await transaction.product.update({
        where: { id },
        data,
        include: { company: true },
      });

      await recordListingAudit(transaction, {
        product: updatedProduct,
        actor: req.user,
        action: "UPDATED",
        previousData: listingSnapshot(existing),
        currentData: listingSnapshot(updatedProduct),
      });

      return updatedProduct;
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
      include: { company: true },
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

    await prisma.$transaction(async (transaction) => {
      await recordListingAudit(transaction, {
        product: existing,
        actor: req.user,
        action: "DELETED",
        previousData: listingSnapshot(existing),
      });
      await transaction.cartToProducts.deleteMany({ where: { productId: id } });
      await transaction.review.deleteMany({ where: { productId: id } });
      await transaction.product.delete({ where: { id } });
    });

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
import { prisma } from "../utils/prisma.ts";
import dotenv from "dotenv";

dotenv.config();

export async function createProduct(req, res) {
  try {
    const { name, price, description, pictureUrl, inventory, companyId } =
      req.body;

    if (!name || !description || price === undefined || !companyId) {
      return res
        .status(400)
        .json({
          error: "name, price, description, and companyId are required",
        });
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

    const parsedCompanyId = parseInt(companyId);
    if (Number.isNaN(parsedCompanyId)) {
      return res.status(400).json({ error: "companyId must be a number" });
    }

    const product = await prisma.product.create({
      data: {
        name,
        price: parsedPrice,
        description,
        pictureUrl: pictureUrl ?? null,
        inventory: parsedInventory,
        companyId: parsedCompanyId,
      },
    });

    return res
      .status(201)
      .json({ message: "Product created successfully", product });
  } catch (error) {
    console.log(error);

    if (error.code === "P2003") {
      return res.status(404).json({ error: "Company not found" });
    }

    res.status(500).json({ error: "There was an internal server error" });
  }
}
export async function getProducts(req, res) {
  try {
    const products = await prisma.product.findMany({
      where: { approved: true },
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
      where: { id, approved: true },
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

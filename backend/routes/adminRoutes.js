import { prisma } from "../utils/prisma.ts";
import dotenv from "dotenv";
import { listingSnapshot, recordListingAudit } from "../utils/listingAudit.js";
import { recordActivity } from "../utils/activityLog.js";

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

export async function getRecentActivity(req, res) {
  try {
    const activityEvents = await prisma.activityLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });

    return res.status(200).json({ activityEvents });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function approveUser(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "A valid user ID is required" });
    }

    const { user, activityEvent } = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.user.findUnique({
        where: { id },
        include: { login: { select: { email: true } } },
      });
      if (!existing) {
        const error = new Error("User not found");
        error.code = "P2025";
        throw error;
      }

      const user = await transaction.user.update({
        where: { id },
        data: { approved: true },
      });
      const activityEvent = existing.approved
        ? null
        : await recordActivity(transaction, {
            actor: req.user,
            action: "ACCOUNT_APPROVED",
            entityType: "USER",
            entityId: id,
            subject: existing,
          });

      return { user, activityEvent };
    });

    return res.status(200).json({
      message: "User approved successfully",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        approved: user.approved,
      },
      activityEvent,
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
    const { user, activityEvent } = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.user.findUnique({
        where: { id },
        include: { login: { select: { email: true } } },
      });
      if (!existing) {
        const error = new Error("User not found");
        error.code = "P2025";
        throw error;
      }

      const user = await transaction.user.update({
        where: { id },
        data: { isActive },
      });
      const activityEvent = existing.isActive === isActive
        ? null
        : await recordActivity(transaction, {
            actor: req.user,
            action: isActive ? "ACCOUNT_ACCESS_RESTORED" : "ACCOUNT_ACCESS_REVOKED",
            entityType: "USER",
            entityId: id,
            subject: existing,
            details: { isActive },
          });

      return { user, activityEvent };
    });

    return res.status(200).json({ user, activityEvent });
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

export async function getAllProducts(req, res) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { id: "desc" },
      include: {
        company: {
          include: {
            users: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    login: { select: { email: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return res.status(200).json({ products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function getProductAuditHistory(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "A valid product ID is required" });
  }

  try {
    const auditEvents = await prisma.productAuditLog.findMany({
      where: { productId: id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    return res.status(200).json({ auditEvents });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "There was an internal server error" });
  }
}

export async function getRecentProductAuditHistory(req, res) {
  try {
    const auditEvents = await prisma.productAuditLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });

    return res.status(200).json({ auditEvents });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "There was an internal server error" });
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
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "A valid product ID is required" });
    }

    const { product, auditEvent } = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.product.findUnique({
        where: { id },
        include: { company: true },
      },
      );
      if (!existing) {
        const error = new Error("Product not found");
        error.code = "P2025";
        throw error;
      }

      const updatedProduct = await transaction.product.update({
        where: { id: existing.id },
        data: { approved: true },
        include: { company: true },
      });

      const auditEvent = await recordListingAudit(transaction, {
        product: updatedProduct,
        actor: req.user,
        action: "APPROVED",
        previousData: listingSnapshot(existing),
        currentData: listingSnapshot(updatedProduct),
      });

      return { product: updatedProduct, auditEvent };
    });

    return res.status(200).json({
      message: "Product approved successfully",
      product: {
        id: product.id,
        name: product.name,
        company_name: product.company.name,
        approved: product.approved,
      },
      auditEvent,
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
    const product = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.product.findUnique({
        where: { id },
        include: { company: true },
      });
      if (!existing) {
        const error = new Error("Product not found");
        error.code = "P2025";
        throw error;
      }

      const updatedProduct = await transaction.product.update({
        where: { id },
        data: { isActive },
        include: { company: true },
      });

      const auditEvent = await recordListingAudit(transaction, {
        product: updatedProduct,
        actor: req.user,
        action: isActive ? "ENABLED" : "DISABLED",
        previousData: listingSnapshot(existing),
        currentData: listingSnapshot(updatedProduct),
      });

      return { product: updatedProduct, auditEvent };
    });

    return res.status(200).json({
      product: product.product,
      auditEvent: product.auditEvent,
    });
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
    const activityEvent = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id },
        include: { login: { select: { email: true } } },
      });
      if (!user) {
        const error = new Error("User not found");
        error.code = "P2025";
        throw error;
      }
      if (user.approved) {
        const error = new Error("Approved accounts must be revoked, not denied");
        error.code = "ACCOUNT_ALREADY_APPROVED";
        throw error;
      }

      const event = await recordActivity(transaction, {
        actor: req.user,
        action: "ACCOUNT_DENIED",
        entityType: "USER",
        entityId: id,
        subject: user,
      });
      await transaction.user.delete({ where: { id } });
      return event;
    });

    return res.status(200).json({
      message: "User denied and removed",
      activityEvent,
    });
  } catch (error) {
    console.error(error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    if (error.code === "ACCOUNT_ALREADY_APPROVED") {
      return res.status(409).json({ error: error.message });
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

    const auditEvent = await prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findUnique({
        where: { id },
        include: { company: true },
      });
      if (!product) {
        const error = new Error("Product not found");
        error.code = "P2025";
        throw error;
      }
      if (product.approved) {
        const error = new Error("Approved listings must be revoked, not denied");
        error.code = "PRODUCT_ALREADY_APPROVED";
        throw error;
      }

      const auditEvent = await recordListingAudit(transaction, {
        product,
        actor: req.user,
        action: "DENIED",
        previousData: listingSnapshot(product),
      });
      await transaction.cartToProducts.deleteMany({ where: { productId: id } });
      await transaction.review.deleteMany({ where: { productId: id } });
      await transaction.product.delete({ where: { id } });

      return auditEvent;
    });

    return res.status(200).json({
      message: "Product denied and removed",
      auditEvent,
    });
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
    if (error.code === "PRODUCT_ALREADY_APPROVED") {
      return res.status(409).json({ error: error.message });
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
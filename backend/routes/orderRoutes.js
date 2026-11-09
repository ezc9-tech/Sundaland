import {prisma} from "../utils/prisma.ts";
import {recordActivity} from "../utils/activityLog.js";

// Limits order queries to orders containing products the seller's company owns.
// Admins see everything.
function sellerOwnsItems(user) {
    if (user?.role === "admin") return {};

    const userId = Number(user?.userId ?? user?.id ?? user?.sub);
    if (!Number.isInteger(userId)) return {id: -1};

    return {
        items: {
            some: {product: {company: {users: {some: {userId}}}}},
        },
    };
}

export async function createOrder(req,res) {
    try {
        if (req.user.role !== "buyer") {
            return res.status(403).json({error: "Only buyers can place orders"});
        }

        const productId = parseInt(req.body.productId);
        const {shippingAddress} = req.body;
        if(Number.isNaN(productId) || !shippingAddress) {
            return res.status(400).json({error: "productId and shippingAddress are required"});
        }
        const quantity = req.body.quantity === undefined ? 1 : Number(req.body.quantity);
        if (!Number.isInteger(quantity) || quantity < 1)
        {
            return res.status(400).json({error: "Quantity must be at least 1"});
        }
        const product = await prisma.product.findFirst({
            where: {id: productId, approved: true, isActive: true},
        });
        if (!product) {
            return res.status(404).json({error: "Product not found"});
        }
        if (product.inventory < quantity) {
            return res.status(409).json({error: "not enough stock"});
        }
        await prisma.$transaction(async (transaction) => {
            const order = await transaction.order.create({
                data: {
                    totalCost: product.price * quantity,
                    status: "PAID",
                    shippingAddress,
                    userId: req.user.userId,
                    items: {
                        create: {
                            quantity,
                            priceAtPurchase: product.price,
                            productId,
                        },
                    },
                },
            });

            await transaction.product.update({
                where: {id: productId},
                data: {inventory: {decrement: quantity}},
            });
            await recordActivity(transaction, {
                actor: req.user,
                action: "ORDER_PLACED",
                entityType: "ORDER",
                entityId: order.id,
                details: {
                    productId,
                    productName: product.name,
                    quantity,
                    totalCost: Number(product.price) * quantity,
                },
            });
        });
        return res.status(201).json({message: "Order placed"});

    } catch (error) {
        console.log(error);
        res.status(500).json({error: "There was an internal server error"});
    }
}
export async function getOrders(req,res) {
    try {
        if (req.user.role !== "buyer") {
            return res.status(403).json({error: "Only buyers have an order history"});
        }
        const orders = await prisma.order.findMany({
            where: {userId: req.user.userId},
            orderBy: {orderDate: "desc"},
            include: {
                items: {
                    include: {product: {select: {name: true}}},
                },
            },
        });
        return res.status(200).json({orders});
    } catch (error) {
        console.log(error);
        res.status(500).json({error: "There was an internal service error"});
    }
}

export async function requestRefund(req,res) {
    try {
        if (req.user.role !== "buyer") {
            return res.status(403).json({error: "Only buyers can request a refund"});
        }
        const orderId = parseInt(req.params.id);
        if(Number.isNaN(orderId)) {
            return res.status(400).json({error: "Invalid order ID"});
        }
        const {reason} = req.body;
        if (typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({error: "Refund reason required."});
        }
        const order = await prisma.order.findFirst({
            where: {id: orderId, userId: req.user.userId},
        });
        if(!order) {
            return res.status(404).json({error: "Order not found"});
        }
        if (!["PAID", "SHIPPED", "DELIVERED"].includes(order.status)) {
            return res.status(409).json({error: "Order cannot be refunded"});
        }
        const activityEvent = await prisma.$transaction(async (transaction) => {
            const updatedOrder = await transaction.order.update({
                where: {id: orderId},
                data: {status: "REFUND_REQUESTED", refundReason: reason.trim(),},
            });
            const event = await recordActivity(transaction, {
                actor: req.user,
                action: "REFUND_REQUESTED",
                entityType: "ORDER",
                entityId: updatedOrder.id,
                details: {
                    previousStatus: order.status,
                    status: updatedOrder.status,
                },
            });
            return event;
        });
        return res.status(200).json({message: "Refund requested", activityEvent});
    } catch (error) {
        console.log(error);
        res.status(500).json({error: "There was an internal service error"});
    }
}

//SELLER refends
export async function getRefundRequests(req, res) {
    try {
        if (req.user.role !== "seller" && req.user.role !== "admin") {
            return res.status(403).json({error: "Only sellers can view refund requests"});
        }

        const orders = await prisma.order.findMany({
            where: {status: "REFUND_REQUESTED", ...sellerOwnsItems(req.user)},
            orderBy: {orderDate: "desc"},
            include: {
                user: {select: {firstName: true, lastName: true}},
                items: {
                    include: {product: {select: {name: true}}},
                },
            },
        });

        return res.status(200).json({orders});
    } catch (error) {
        console.log(error);
        res.status(500).json({error: "There was an internal service error"});
    }
}

async function resolveRefund(req, res, approve) {
    try {
        if (req.user.role !== "seller" && req.user.role !== "admin") {
            return res.status(403).json({error: "Only sellers can resolve refund requests"});
        }

        const orderId = parseInt(req.params.id);
        if (Number.isNaN(orderId)) {
            return res.status(400).json({error: "Invalid order ID"});
        }

        const updatedOrder = await prisma.$transaction(async (transaction) => {
            const order = await transaction.order.findFirst({
                where: {
                    id: orderId,
                    status: "REFUND_REQUESTED",
                    ...sellerOwnsItems(req.user),
                },
                include: {items: true},
            });

            if (!order) {
                const error = new Error("Refund request not found");
                error.code = "NOT_FOUND";
                throw error;
            }

            let newStatus;

            if (approve) {
                newStatus = "CANCELLED";

                for (const item of order.items) {
                    await transaction.product.update({
                        where: {id: item.productId},
                        data: {inventory: {increment: item.quantity}},
                    });
                }
            } else {
                const requestEvent = await transaction.activityLog.findFirst({
                    where: {
                        entityType: "ORDER",
                        entityId: orderId,
                        action: "REFUND_REQUESTED",
                    },
                    orderBy: {createdAt: "desc"},
                });

                const previous = requestEvent?.details?.previousStatus;
                newStatus = ["PAID", "SHIPPED", "DELIVERED"].includes(previous)
                    ? previous
                    : "DELIVERED";
            }

            const updated = await transaction.order.update({
                where: {id: orderId},
                data: {status: newStatus},
            });

            await recordActivity(transaction, {
                actor: req.user,
                action: approve ? "REFUND_APPROVED" : "REFUND_DENIED",
                entityType: "ORDER",
                entityId: orderId,
                details: {
                    previousStatus: "REFUND_REQUESTED",
                    status: newStatus,
                },
            });

            return updated;
        });

        return res.status(200).json({
            message: approve ? "Refund approved" : "Refund denied",
            order: updatedOrder,
        });
    } catch (error) {
        console.log(error);

        if (error.code === "NOT_FOUND") {
            return res.status(404).json({error: "Refund request not found"});
        }

        res.status(500).json({error: "There was an internal service error"});
    }
}

export function approveRefund(req, res) {
    return resolveRefund(req, res, true);
}

export function denyRefund(req, res) {
    return resolveRefund(req, res, false);
}

const EARNED_STATUSES = ["PAID", "SHIPPED", "DELIVERED"];

function roundMoney(value) {
    return Math.round(value * 100) / 100;
}

export async function getSales(req, res) {
    try {
        if (req.user.role !== "seller" && req.user.role !== "admin") {
            return res.status(403).json({error: "Only sellers can view sales history"});
        }

        const isAdmin = req.user.role === "admin";
        const userId = Number(req.user.userId ?? req.user.id ?? req.user.sub);

        const itemFilter = isAdmin
            ? {}
            : {product: {company: {users: {some: {userId}}}}};

        const orders = await prisma.order.findMany({
            where: sellerOwnsItems(req.user),
            orderBy: {orderDate: "desc"},
            include: {
                user: {select: {firstName: true, lastName: true}},
                items: {
                    where: itemFilter,
                    include: {product: {select: {name: true}}},
                },
            },
        });

        const summary = {totalEarned: 0, onHold: 0, refunded: 0, orderCount: 0};

        const sales = orders.map((order) => {
            const sellerTotal = order.items.reduce(
                (sum, item) => sum + Number(item.priceAtPurchase) * item.quantity,
                0
            );

            if (EARNED_STATUSES.includes(order.status)) {
                summary.totalEarned += sellerTotal;
                summary.orderCount += 1;
            } else if (order.status === "REFUND_REQUESTED") {
                summary.onHold += sellerTotal;
            } else if (order.status === "CANCELLED") {
                summary.refunded += sellerTotal;
            }

            return {
                id: order.id,
                orderDate: order.orderDate,
                status: order.status,
                buyerName: order.user
                    ? `${order.user.firstName} ${order.user.lastName}`
                    : "Unknown",
                items: order.items.map((item) => ({
                    id: item.id,
                    name: item.product?.name,
                    quantity: item.quantity,
                    priceAtPurchase: Number(item.priceAtPurchase),
                })),
                sellerTotal: roundMoney(sellerTotal),
            };
        });

        summary.totalEarned = roundMoney(summary.totalEarned);
        summary.onHold = roundMoney(summary.onHold);
        summary.refunded = roundMoney(summary.refunded);

        return res.status(200).json({orders: sales, summary});
    } catch (error) {
        console.log(error);
        res.status(500).json({error: "There was an internal service error"});
    }
}
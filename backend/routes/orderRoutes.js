import {prisma} from "../utils/prisma.ts";
import {recordActivity} from "../utils/activityLog.js";

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
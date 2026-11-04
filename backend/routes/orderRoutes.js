import {prisma} from "../utils/prisma.ts";

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
        await prisma.order.create({
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

        await prisma.product.update({
            where: {id: productId},
            data: {inventory: {decrement: quantity}},
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
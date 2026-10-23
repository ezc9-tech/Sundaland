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
        const product = await prisma.product.findFirst({
            where: {id: productId, approved: true, isActive: true},
        });
        if (!product) {
            return res.status(404).json({error: "Product not found"});
        }
        if (product.inventory < 1) {
            return res.status(409).json({error: "Product out of stock"});
        }
        await prisma.order.create({
            data: {
                totalCost: product.price,
                status: "PAID",
                shippingAddress,
                userId: req.user.userId,
                items: {
                    create: {
                        quantity: 1,
                        priceAtPurchase: product.price,
                        productId, 
                    },
                },
            },
        });

        await prisma.product.update({
            where: {id: productId},
            data: {inventory: {decrement: 1}},
        });
        return res.status(201).json({message: "Order placed"});

    } catch (error) {
        console.log(error);
        res.status(500).json({error: "There was an internal server error"});
    }
}
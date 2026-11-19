import {prisma} from "../utils/prisma.ts";

function getReviewMode(myReview, latestPurchase) {
    if (!latestPurchase) {
        return "none";
    }
    if (!myReview) {
        return "new";
    }
    if (myReview.createdAt < latestPurchase.orderDate) {
        return "new";
    }
    return "edit";
}

export async function getReviews(req, res) {
    try {
        const productId = Number(req.params.id);
        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({error: "Invalid product ID"});
        }
        const reviews = await prisma.review.findMany({
            where: {productId},
            orderBy: {createdAt: "desc"},
            include: {user: {select: {firstName: true}}},
        });
        const total = reviews.reduce((sum, review) => sum + review.rating, 0);
        const average = reviews.length ? total / reviews.length : 0;

        const myReview = await prisma.review.findFirst({
            where: {userId: req.user.userId, productId},
        });

        const latestPurchase = await prisma.order.findFirst({
            where: {
                userId: req.user.userId,
                status: {in: ["PAID", "SHIPPED", "DELIVERED"]},
                items: {some: {productId}},
            },
            orderBy: {orderDate: "desc"},
        });
        const mode = getReviewMode(myReview, latestPurchase);
        return res.status(200).json({reviews, average, count: reviews.length, mode, myReview});
    } catch (error) {
        console.log(error);
        res.status(500).json({error: "There was an internal server error"});
    }
}

export async function getReviewSummary(req, res) {
    try {
        const reviews = await prisma.review.findMany();
        const totals = {};
        for (const review of reviews) {
            if (!totals[review.productId]) {
                totals[review.productId] = {sum: 0, count: 0};
            }
            totals[review.productId].sum += review.rating;
            totals[review.productId].count += 1;
        }
        const summary = {};
        for (const productId in totals) {
            summary[productId] = {
                average: totals[productId].sum / totals[productId].count,
                count: totals[productId].count,
            };
        }
        return res.status(200).json({summary});
    } catch(error) {
        console.log(error);
        res.status(500).json({error: "There was an internal server error"});
    }
}

export async function createReview(req, res) {
    try {
        if (req.user.role !== "buyer") {
            return res.status(403).json({error: "Only buyers can leave reviews"});
        }
        const body = req.body ?? {};
        const productId = Number(body.productId);
        const rating = Number(body.rating);
        const comment = body.comment ? String(body.comment).trim() : "";

        if(!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({error: "Invalid product ID"});
        }
        if(!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({error: "Rating must be a whole number from 1 to 5"});
        }
        if(!comment) {
            return res.status(400).json({error: "A comment is required"});
        }
        if (comment.length > 500) {
            return res.status(400).json({error: "Comment must be 500 characters or less"});
        }

        const purchase = await prisma.orderItem.findFirst({
            where: {
                productId,
                order: {
                    userId: req.user.userId,
                    status: {in: ["PAID", "SHIPPED", "DELIVERED"]},
                },
            },
        });
        if(!purchase) {
            return res.status(403).json({error: "You can only review products you bought"});
        }
        await prisma.$transaction(async (transaction) => {
            await transaction.review.deleteMany ({
                where: {userId: req.user.userId, productId},
            });
            await transaction.review.create({
                data: {rating, comment, userId: req.user.userId, productId},
            });
        });
        return res.status(201).json({message: "Review posted"});
    } catch (error) {
        console.log(error);
        res.status(500).json({error: "There was an internal server error"});
    }
}

export async function flagReview(req, res) {
    try {
        if (req.user.role !== "seller") {
            return res.status(403).json({error: "Only sellers can flag reviews"});
        }

        const reviewId = Number(req.params.id);
        if(!Number.isInteger(reviewId) || reviewId <= 0) {
            return res.status(400).json({error: "Invalid review ID"});
        }

        const review = await prisma.review.findFirst({
            where: {
                id: reviewId,
                product: {company: {users: {some: {userId: req.user.userId}}}},
            },
        });
        if(!review) {
            return res.status(404).json({error: "Review not found"});
        }

        await prisma.review.update({
            where: {id: reviewId},
            data: {flagged: true},
        });
        return res.status(200).json({message: "Review flagged"});
    } catch (error) {
        console.log(error);
        res.status(500).json({error: "There was an internal server error"});
    }
}


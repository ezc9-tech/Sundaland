import {jest, test, beforeEach, describe, expect} from "@jest/globals";

const prisma = {
    review: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    order: {findFirst: jest.fn()},
    orderItem: {findFirst: jest.fn()},
    $transaction: jest.fn(),
};

jest.unstable_mockModule("../utils/prisma.ts", () => ({prisma}));

const {createReview, flagReview, getReviews} = await import("../routes/reviewRoutes.js");

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

async function call(handler, req) {
    const res = mockRes();
    await handler(req, res);
    return res;
}
const buyer = {userId: 1, role: "buyer"};
const seller = {userId: 2, role: "seller"};

beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
});

describe("createReview", () => {
    test("only buyers can leave reviews", async () => {
        const res = await call(createReview, {
            user: seller,
            body: {productId: 3, rating: 5, comment: "Great"},
        });
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({error: "Only buyers can leave reviews"});
    });
    test("rejects a product id that isn't a number", async () => {
        const res = await call(createReview, {
            user: buyer,
            body: {productId: "abc", rating: 5, comment: "Great"},
        });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({error: "Invalid product ID"});
    });
    test("rejects a rating outside 1 to 5", async () => {
        const res = await call(createReview, {
            user: buyer,
            body: {productId: 3, rating: 6, comment: "Great"},
        });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({error: "Rating must be a whole number from 1 to 5"});
    });
    test("requires a comment", async () => {
        const res = await call(createReview, {
            user: buyer,
            body: {productId: 3, rating: 5, comment: " "},
        });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({error: "A comment is required"});
    });
    test("403 when the buyer never bought the product", async () => {
        prisma.orderItem.findFirst.mockResolvedValue(null);
        const res = await call(createReview, {
            user: buyer,
            body: {productId: 3, rating: 5, comment: "Great"},
        });
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({error: "You can only review products you bought"});
    });
    test("replaces the old review with the new one", async () => {
        prisma.orderItem.findFirst.mockResolvedValue({id: 1});
        const res = await call(createReview, {
            user: buyer,
            body: {productId: 3, rating: 5, comment: "Great"},
        });
        expect(prisma.review.deleteMany).toHaveBeenCalledWith({
            where: {userId: 1, productId: 3},
        });
        expect(prisma.review.create).toHaveBeenCalledWith({
            data: {rating: 5, comment: "Great", userId: 1, productId: 3},
        });
        expect(res.status).toHaveBeenCalledWith(201);
    });
});

describe("flagReview", () => {
    test("only sellers can flag reviews", async () => {
        const res = await call(flagReview, {
            user: buyer,
            params: {id: "5"},
        });
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({error: "Only sellers can flag reviews"});
    });
    test("rejects a review id that isn't a number", async () => {
        const res = await call(flagReview, {
            user: seller,
            params: {id: "abc"},
        });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({error: "Invalid review ID"});
    });
    test("404 when the review isn't on the seller's product", async () => {
        prisma.review.findFirst.mockResolvedValue(null);
        const res = await call(flagReview, {
            user: seller,
            params: {id: "5"},
        });
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({error: "Review not found"});
        expect(prisma.review.update).not.toHaveBeenCalled();
    });
    test("only looks for reviews on the seller's own company products", async () => {
        prisma.review.findFirst.mockResolvedValue({id:5});
        await call(flagReview, {
            user: seller,
            params: {id: "5"},
        });
        expect(prisma.review.findFirst).toHaveBeenCalledWith({
            where: {
                id: 5,
                product: {company: {users: {some: {userId: 2}}}},
            },
        });
    });
    test("flags the review", async () => {
        prisma.review.findFirst.mockResolvedValue({id: 5});
        const res = await call(flagReview, {
            user: seller,
            params: {id: "5"},
        });
        expect(prisma.review.update).toHaveBeenCalledWith({
            where: {id: 5},
            data: {flagged: true},
        });
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

describe("getReviews", () => {
    test("rejects a review id that isn't a number", async () => {
        const res = await call(getReviews, {
            user: seller,
            params: {id: "abc"},
        });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({error: "Invalid product ID"});
    });
    test("mode is none when the user never bought the product", async () => {
        prisma.review.findMany.mockResolvedValue([]);
        prisma.review.findFirst.mockResolvedValue(null);
        prisma.order.findFirst.mockResolvedValue(null);
        const res = await call(getReviews, {
            user: buyer,
            params: {id: "3"},
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({mode: "none"}));
    });
    test("mode is new when the user bought but never reviewed", async () => {
        prisma.review.findMany.mockResolvedValue([]);
        prisma.review.findFirst.mockResolvedValue(null);
        prisma.order.findFirst.mockResolvedValue({orderDate: new Date("2026-10-01")});
        const res = await call(getReviews, {
            user: buyer,
            params: {id: "3"},
        });
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({mode: "new"}));
    });
    test("mode is new when the review is older than the latest purchase", async () => {
        prisma.review.findMany.mockResolvedValue([]);
        prisma.review.findFirst.mockResolvedValue({
            id: 1,
            rating: 4,
            createdAt: new Date("2026-10-01"),
        });
        prisma.order.findFirst.mockResolvedValue({orderDate: new Date("2026-11-01")});
        const res = await call(getReviews, {
            user: buyer,
            params: {id: "3"},
        });
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({mode: "new"}));
    });
    test("mode is edit, with average and count, when the review is newer than the purchase", async () => {
        prisma.review.findMany.mockResolvedValue([{rating: 5}, {rating: 4}]);
        prisma.review.findFirst.mockResolvedValue({
            id: 1,
            rating: 5,
            createdAt: new Date("2026-11-01"),
        });
        prisma.order.findFirst.mockResolvedValue({orderDate: new Date("2026-10-01")});
        const res = await call(getReviews, {
            user: buyer,
            params: {id: "3"},
        });
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({mode: "edit", average: 4.5, count: 2}));
    });
});
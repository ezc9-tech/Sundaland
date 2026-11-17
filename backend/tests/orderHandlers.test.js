import {jest, test, beforeEach, describe, expect} from "@jest/globals";

const prisma = {
    product: {findFirst: jest.fn(), update: jest.fn()},
    order: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    $transaction: jest.fn(),
};
const recordActivity = jest.fn();

jest.unstable_mockModule("../utils/prisma.ts", () => ({prisma}));
jest.unstable_mockModule("../utils/activityLog.js", () => ({recordActivity}));

const {createOrder, getOrders, requestRefund} = await import("../routes/orderRoutes.js");

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

describe("requestRefund", () => {
    test("only buyers can request a refund", async () => {
        const res = await call(requestRefund, {
            user: seller,
            params: {id: "5"},
            body: {reason: "Broken"},
        });
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({error: "Only buyers can request a refund"});
    });
    test("reject an order id that isn't a number", async () => {
        const res = await call(requestRefund, {
            user: buyer,
            params: {id: "abc"},
            body: {reason: "Broken"},
        });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({error: "Invalid order ID"});
    });
    test("requires a reason for refund", async () => {
        const res = await call(requestRefund, {
            user: buyer,
            params: {id: "5"},
            body: {reason: "  "},
        });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({error: "Refund reason required."});
    });
    test("404 when the order isn't the buyer's", async () => {
        prisma.order.findFirst.mockResolvedValue(null);
        const res = await call(requestRefund, {
            user: buyer,
            params: {id: "5"},
            body: {reason: "Broken"},
        });
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({error: "Order not found"});
    });
    test("409 when order can't be refunded", async () => {
        prisma.order.findFirst.mockResolvedValue({ id: 5, status: "PENDING"});
        const res = await call(requestRefund, {
            user: buyer,
            params: {id: "5"},
            body: {reason: "Broken"},
        });
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({error: "Order cannot be refunded"});
    });
});

describe("createOrder", () => {
    test("only buyers can create an order", async () => {
        const res = await call(createOrder, {
            user: seller,
            body: {productId: 1, shippingAddress: "123 Main St"},
        });
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({error: "Only buyers can place orders"});
    });
    test("requires a shipping address", async () => {
        const res = await call(createOrder, {
            user: buyer,
            body: {productId: 1},
        });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({error: "productId and shippingAddress are required"});
    });
    test("rejects a quantity below 1", async () => {
        const res = await call(createOrder, {
            user: buyer,
            body: {productId: 1, shippingAddress: "123 Main St", quantity: 0},
        });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({error: "Quantity must be at least 1"});
    });
    test("404 when product isn't available", async () => {
        prisma.product.findFirst.mockResolvedValue(null);
        const res = await call(createOrder, {
            user: buyer,
            body: {productId: 1, shippingAddress: "123 Main St"},
        });
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({error: "Product not found"});
    });
    test("409 when there isn't enough stock", async () => {
        prisma.product.findFirst.mockResolvedValue({id: 1, price: 10, inventory: 1});
        const res = await call(createOrder, {
            user: buyer,
            body: {productId: 1, shippingAddress: "123 Main St", quantity: 2},
        });
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({error: "not enough stock"});
    });
});

describe("successful order and refund", () => {
    test("createOrder saves order and lowers the stock", async () => {
        prisma.product.findFirst.mockResolvedValue({
            id: 1,
            name: "Ultra Wireless Mouse",
            price: 79.50,
            inventory: 120,
        });
        prisma.order.create.mockResolvedValue({ id:99});
        const res = await call(createOrder, {
            user: buyer,
            body: {productId: 1, shippingAddress: "123 Main St", quantity: 2},
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(prisma.order.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                totalCost: 159,
                status: "PAID",
                userId: 1,
            }),
        });
        expect(prisma.product.update).toHaveBeenCalledWith({
            where: {id: 1},
            data: {inventory: {decrement: 2}},
        });
        expect(recordActivity).toHaveBeenCalledTimes(1);
    });
    test("getOrders returns only the buyer's own orders", async () => {
        prisma.order.findMany.mockResolvedValue([{id: 1}, {id: 2}]);
        const res = await call(getOrders, {user: buyer});
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ orders: [{id: 1}, {id: 2}]});
        expect(prisma.order.findMany).toHaveBeenCalledWith(
            expect.objectContaining({where: {userId: 1}})
        );
    });
    test("getOrders is for buyers only", async () => {
        const res = await call(getOrders, {user: seller});
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({error: "Only buyers have an order history"});
    });
    test("requestRefund saves the reason and changes the status", async () => {
        prisma.order.findFirst.mockResolvedValue({ id: 5, status: "PAID"});
        prisma.order.update.mockResolvedValue({id: 5, status: "REFUND_REQUESTED"});
        recordActivity.mockResolvedValue({ id: 1});

        const res = await call(requestRefund, {
            user: buyer,
            params: {id: "5"},
            body: {reason: "Broken"},
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(prisma.order.findFirst).toHaveBeenCalledWith({
            where: {id: 5, userId: 1},
        });
        expect(prisma.order.update).toHaveBeenCalledWith({
            where: {id: 5},
            data: {status: "REFUND_REQUESTED", refundReason: "Broken"},
        });
    });
});
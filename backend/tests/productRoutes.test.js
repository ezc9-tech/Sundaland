import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const prisma = {
  product: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  company: { create: jest.fn() },
  user: { findUnique: jest.fn() },
  usersToCompany: { findFirst: jest.fn() },
  productAuditLog: { create: jest.fn() },
  orderItem: { count: jest.fn() },
  cartToProducts: { deleteMany: jest.fn() },
  review: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
};

jest.unstable_mockModule("../utils/prisma.ts", () => ({ prisma }));

const {
  getProducts,
  getProductById,
  createProduct,
  getMyProducts,
  getMyProduct,
  updateProduct,
  deleteProduct,
} = await import("../routes/productRoutes.js");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const seller = { id: 7, role: "seller" };
const admin = { id: 1, role: "admin" };
const sellerRecord = {
  id: 7,
  firstName: "Seller",
  lastName: "User",
  role: "seller",
  address: "1 Main St",
  phoneNumber: "555-0100",
  login: { email: "seller@example.com" },
};

function productRecord(overrides = {}) {
  return {
    id: 5,
    name: "Teak Chair",
    description: "Handmade teak dining chair.",
    price: 49.99,
    inventory: 10,
    pictureUrl: null,
    approved: true,
    isActive: true,
    company: { id: 3, name: "Seller 7" },
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  prisma.$transaction.mockImplementation((callback) => callback(prisma));
  prisma.user.findUnique.mockResolvedValue(sellerRecord);
  prisma.company.create.mockResolvedValue({ id: 12 });
  prisma.product.create.mockResolvedValue(productRecord({ id: 9 }));
  prisma.product.update.mockImplementation(({ data }) =>
    Promise.resolve(productRecord(data)),
  );
  prisma.productAuditLog.create.mockResolvedValue({ id: 1 });
  jest.spyOn(console, "log").mockImplementation(() => {});
});

describe("getProducts", () => {
  test("returns only approved products", async () => {
    const products = [{ id: 1, name: "Chair" }];
    prisma.product.findMany.mockResolvedValue(products);
    const res = mockRes();

    await getProducts({}, res);

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          approved: true,
          isActive: true,
        },
      })
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ products });
  });

  test("returns 500 when the database fails", async () => {
    prisma.product.findMany.mockRejectedValue(new Error("db down"));
    const res = mockRes();

    await getProducts({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getProductById", () => {
  test("returns 400 for a non-numeric id", async () => {
    const res = mockRes();

    await getProductById({ params: { id: "abc" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
  });

  test("returns 404 when the product doesn't exist or isn't approved", async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    const res = mockRes();

    await getProductById({ params: { id: "5" } }, res);

    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 5,
          approved: true,
          isActive: true,
        },
      })
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("returns the product when found", async () => {
    const product = { id: 5, name: "Chair" };
    prisma.product.findFirst.mockResolvedValue(product);
    const res = mockRes();

    await getProductById({ params: { id: "5" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ product });
  });

  test("returns 500 when the database fails", async () => {
    prisma.product.findFirst.mockRejectedValue(new Error("db down"));
    const res = mockRes();

    await getProductById({ params: { id: "5" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("createProduct", () => {
  const validBody = {
    name: "Teak Chair",
    price: 49.99,
    description: "Handmade teak dining chair.",
    inventory: 10,
  };

  const makeReq = (overrides = {}, user = seller) => ({
    body: { ...validBody, ...overrides },
    user,
  });

  test.each([
    ["name", { name: "" }],
    ["description", { description: "" }],
    ["price", { price: undefined }],
  ])("returns 400 when %s is missing", async (_field, overrides) => {
    const res = mockRes();
    await createProduct(makeReq(overrides), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  test("returns 400 for a name with disallowed characters", async () => {
    const res = mockRes();
    await createProduct(makeReq({ name: "Chair!!" }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "name contains characters that aren't allowed",
    });
  });

  test("returns 400 for a negative or non-numeric price", async () => {
    for (const price of [-1, "abc"]) {
      const res = mockRes();
      await createProduct(makeReq({ price }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  test("returns 400 for a negative or fractional inventory", async () => {
    for (const inventory of [-1, 1.5]) {
      const res = mockRes();
      await createProduct(makeReq({ inventory }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
  });

  test("accepts a price of 0 and defaults inventory to 0", async () => {
    prisma.usersToCompany.findFirst.mockResolvedValue({
      company: { id: 3 },
    });
    const res = mockRes();

    await createProduct(makeReq({ price: 0, inventory: undefined }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(prisma.product.create.mock.calls[0][0].data).toMatchObject({
      price: 0,
      inventory: 0,
    });
  });

  test("returns 401 when the token has no usable user id", async () => {
    const res = mockRes();
    await createProduct(makeReq({}, { role: "seller" }), res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(prisma.usersToCompany.findFirst).not.toHaveBeenCalled();
  });

  test("uses the seller's existing company", async () => {
    prisma.usersToCompany.findFirst.mockResolvedValue({
      company: { id: 3 },
    });

    await createProduct(makeReq(), mockRes());

    expect(prisma.usersToCompany.findFirst).toHaveBeenCalledWith({
      where: { userId: 7 },
      include: { company: true },
      orderBy: { companyId: "asc" },
    });
    expect(prisma.company.create).not.toHaveBeenCalled();
  });

  test("creates a default company linked to the seller when none exists", async () => {
    const res = mockRes();

    await createProduct(makeReq(), res);

    expect(prisma.company.create).toHaveBeenCalledWith({
      data: {
        name: "Seller 7",
        address: "1 Main St",
        phoneNumber: "555-0100",
        users: { create: { userId: 7 } },
      },
    });
    expect(prisma.product.create.mock.calls[0][0].data.companyId).toBe(12);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("returns 401 when the creator no longer exists", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = mockRes();

    await createProduct(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(prisma.company.create).not.toHaveBeenCalled();
  });

  test("creates a product under the seller's existing company", async () => {
    prisma.usersToCompany.findFirst.mockResolvedValue({
      company: { id: 3 },
    });
    const res = mockRes();

    await createProduct(makeReq(), res);

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        name: "Teak Chair",
        price: 49.99,
        description: "Handmade teak dining chair.",
        pictureUrl: null,
        inventory: 10,
        companyId: 3,
      },
      include: { company: true },
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("creates a default company for an admin with no company membership", async () => {
    const res = mockRes();

    await createProduct(makeReq({}, admin), res);

    expect(prisma.usersToCompany.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 1 } }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("returns 400 when the database rejects the company link", async () => {
    prisma.usersToCompany.findFirst.mockResolvedValue({
      company: { id: 3 },
    });
    prisma.$transaction.mockRejectedValue({ code: "P2003" });
    const res = mockRes();

    await createProduct(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 500 for unexpected errors", async () => {
    prisma.usersToCompany.findFirst.mockRejectedValue(new Error("boom"));
    const res = mockRes();

    await createProduct(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getMyProducts", () => {
  test("filters a seller's products by company membership", async () => {
    prisma.product.findMany.mockResolvedValue([]);

    await getMyProducts({ user: seller }, mockRes());

    expect(prisma.product.findMany.mock.calls[0][0].where).toEqual({
      company: { users: { some: { userId: 7 } } },
    });
  });

  test("accepts the user id under userId or sub, even as a string", async () => {
    prisma.product.findMany.mockResolvedValue([]);

    await getMyProducts({ user: { sub: "7", role: "seller" } }, mockRes());

    expect(prisma.product.findMany.mock.calls[0][0].where).toEqual({
      company: { users: { some: { userId: 7 } } },
    });
  });

  test("doesn't filter for admins", async () => {
    prisma.product.findMany.mockResolvedValue([]);

    await getMyProducts({ user: admin }, mockRes());

    expect(prisma.product.findMany.mock.calls[0][0].where).toEqual({});
  });

  test("matches nothing when the user id is missing", async () => {
    prisma.product.findMany.mockResolvedValue([]);

    await getMyProducts({ user: { role: "seller" } }, mockRes());

    expect(prisma.product.findMany.mock.calls[0][0].where).toEqual({ id: -1 });
  });
});

describe("getMyProduct", () => {
  test("returns 400 for a non-numeric id", async () => {
    const res = mockRes();
    await getMyProduct({ params: { id: "x" }, user: seller }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 404 when the seller doesn't own the product", async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    const res = mockRes();

    await getMyProduct({ params: { id: "5" }, user: seller }, res);

    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 5, company: { users: { some: { userId: 7 } } } },
    });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("includes unapproved products (no approved filter)", async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 5, approved: false });
    const res = mockRes();

    await getMyProduct({ params: { id: "5" }, user: seller }, res);

    expect(prisma.product.findFirst.mock.calls[0][0].where).not.toHaveProperty("approved");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("updateProduct", () => {
  const makeReq = (body, user = seller, id = "5") => ({ params: { id }, body, user });

  test("returns 400 for a non-numeric id", async () => {
    const res = mockRes();
    await updateProduct(makeReq({ price: 5 }, seller, "abc"), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 400 when there are no valid fields to update", async () => {
    const res = mockRes();
    await updateProduct(makeReq({}), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  test("returns 400 for an invalid name before touching the database", async () => {
    const res = mockRes();
    await updateProduct(makeReq({ name: "Bad!!" }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
  });

  test("returns 400 for a negative price and a fractional inventory", async () => {
    for (const body of [{ price: -5 }, { inventory: 2.5 }]) {
      const res = mockRes();
      await updateProduct(makeReq(body), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
  });

  test("returns 404 when the seller doesn't own the product", async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    const res = mockRes();

    await updateProduct(makeReq({ price: 5 }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  test("sends a seller's text changes back for approval", async () => {
    prisma.product.findFirst.mockResolvedValue(productRecord());

    await updateProduct(makeReq({ name: "  New Name  " }), mockRes());

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { name: "New Name", approved: false },
      include: { company: true },
    });
  });

  test("also resets approval when only the description changes", async () => {
    prisma.product.findFirst.mockResolvedValue(productRecord());

    await updateProduct(makeReq({ description: "A new description." }), mockRes());

    expect(prisma.product.update.mock.calls[0][0].data.approved).toBe(false);
  });

  test("keeps approval when only price, inventory, or picture change", async () => {
    prisma.product.findFirst.mockResolvedValue(productRecord());

    await updateProduct(
      makeReq({ price: 12, inventory: 3, pictureUrl: "https://x.test/a.jpg" }),
      mockRes()
    );

    expect(prisma.product.update.mock.calls[0][0].data).toEqual({
      price: 12,
      inventory: 3,
      pictureUrl: "https://x.test/a.jpg",
    });
  });

  test("clears the picture when an empty pictureUrl is sent", async () => {
    prisma.product.findFirst.mockResolvedValue(productRecord());

    await updateProduct(makeReq({ pictureUrl: "" }), mockRes());

    expect(prisma.product.update.mock.calls[0][0].data).toEqual({ pictureUrl: null });
  });

  test("doesn't reset approval for admins", async () => {
    prisma.product.findFirst.mockResolvedValue(productRecord());

    await updateProduct(makeReq({ name: "Admin Edit" }, admin), mockRes());

    expect(prisma.product.update.mock.calls[0][0].data).toEqual({ name: "Admin Edit" });
  });

  test("returns 200 with the updated product", async () => {
    prisma.product.findFirst.mockResolvedValue(productRecord());
    const res = mockRes();

    await updateProduct(makeReq({ price: 12 }), res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("deleteProduct", () => {
  const makeReq = (user = seller, id = "5") => ({ params: { id }, user });

  test("returns 400 for a non-numeric id", async () => {
    const res = mockRes();
    await deleteProduct(makeReq(seller, "abc"), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 404 when the seller doesn't own the product", async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    const res = mockRes();

    await deleteProduct(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test("refuses to delete a product that has been ordered", async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 5 });
    prisma.orderItem.count.mockResolvedValue(2);
    const res = mockRes();

    await deleteProduct(makeReq(), res);

    expect(prisma.orderItem.count).toHaveBeenCalledWith({ where: { productId: 5 } });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test("clears carts and reviews, then deletes an unordered product", async () => {
    prisma.product.findFirst.mockResolvedValue(productRecord());
    prisma.orderItem.count.mockResolvedValue(0);
    const res = mockRes();

    await deleteProduct(makeReq(), res);

    expect(prisma.cartToProducts.deleteMany).toHaveBeenCalledWith({ where: { productId: 5 } });
    expect(prisma.review.deleteMany).toHaveBeenCalledWith({ where: { productId: 5 } });
    expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("returns 409 when another table still references the product", async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 5 });
    prisma.orderItem.count.mockResolvedValue(0);
    prisma.$transaction.mockRejectedValue({ code: "P2003" });
    const res = mockRes();

    await deleteProduct(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("returns 404 when the product vanishes mid-delete", async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 5 });
    prisma.orderItem.count.mockResolvedValue(0);
    prisma.$transaction.mockRejectedValue({ code: "P2025" });
    const res = mockRes();

    await deleteProduct(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
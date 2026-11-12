import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const prisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  productAuditLog: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  orderItem: { count: jest.fn() },
  cartToProducts: { deleteMany: jest.fn() },
  review: { deleteMany: jest.fn() },
  activityLog: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.unstable_mockModule("../utils/prisma.ts", () => ({ prisma }));

const {
  approveUser,
  approveProduct,
  denyUser,
  denyProduct,
  getUnapprovedUsers,
  getApprovedUsers,
  getUnapprovedProducts,
  getApprovedProducts,
  getAllProducts,
  getProductAuditHistory,
  getRecentProductAuditHistory,
  getRecentActivity,
  setUserActiveStatus,
  setProductActiveStatus,
} = await import("../routes/adminRoutes.js");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const admin = {
  id: 1,
  firstName: "Admin",
  lastName: "User",
  role: "admin",
  login: { email: "admin@example.com" },
};
const account = {
  id: 5,
  firstName: "New",
  lastName: "Member",
  role: "buyer",
  approved: false,
  isActive: true,
  login: { email: "member@example.com" },
};
const product = {
  id: 12,
  name: "Teak Chair",
  description: "Handmade chair",
  price: 49.99,
  inventory: 10,
  pictureUrl: null,
  approved: false,
  isActive: true,
  companyId: 3,
  company: { id: 3, name: "Acme" },
};
const req = { params: { id: "5" }, user: { userId: 1, role: "admin" } };

beforeEach(() => {
  jest.resetAllMocks();
  prisma.$transaction.mockImplementation((callback) => callback(prisma));
  prisma.user.findUnique.mockImplementation(({ where: { id } }) =>
    Promise.resolve(id === account.id ? account : admin),
  );
  prisma.product.findUnique.mockResolvedValue(product);
  prisma.product.update.mockImplementation(({ data }) =>
    Promise.resolve({ ...product, ...data }),
  );
  prisma.productAuditLog.create.mockResolvedValue({
    id: 10,
    action: "APPROVED",
  });
  prisma.orderItem.count.mockResolvedValue(0);
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

describe("admin account oversight", () => {
  test("lists users pending approval with their email addresses", async () => {
    const unapprovedUsers = [account];
    prisma.user.findMany.mockResolvedValue(unapprovedUsers);
    const res = mockRes();

    await getUnapprovedUsers({}, res);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { approved: false },
      include: { login: { select: { email: true } } },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ unapprovedUsers });
  });

  test("lists approved users", async () => {
    const approvedUsers = [{ ...account, approved: true }];
    prisma.user.findMany.mockResolvedValue(approvedUsers);
    const res = mockRes();

    await getApprovedUsers({}, res);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { approved: true },
      include: { login: { select: { email: true } } },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ approvedUsers });
  });

  test("returns an error when loading users fails", async () => {
    prisma.user.findMany.mockRejectedValue(new Error("db down"));
    const res = mockRes();

    await getUnapprovedUsers({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  test("lists the most recent 100 activity events", async () => {
    const activityEvents = [{ id: 4, action: "ACCOUNT_REGISTERED" }];
    prisma.activityLog.findMany.mockResolvedValue(activityEvents);
    const res = mockRes();

    await getRecentActivity({}, res);

    expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ activityEvents });
  });

  test("approves a new account and records the admin decision", async () => {
    const approvedAccount = { ...account, approved: true };
    const activityEvent = { id: 7, action: "ACCOUNT_APPROVED" };
    prisma.user.update.mockResolvedValue(approvedAccount);
    prisma.activityLog.create.mockResolvedValue(activityEvent);
    const res = mockRes();

    await approveUser(req, res);

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "ACCOUNT_APPROVED",
        entityType: "USER",
        entityId: account.id,
        actorId: admin.id,
        subjectId: account.id,
      }),
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ activityEvent }),
    );
  });

  test("revokes an approved account and records the decision", async () => {
    const activityEvent = { id: 8, action: "ACCOUNT_ACCESS_REVOKED" };
    prisma.user.findUnique.mockImplementation(({ where: { id } }) =>
      Promise.resolve(id === account.id ? { ...account, approved: true } : admin),
    );
    prisma.user.update.mockResolvedValue({ ...account, isActive: false });
    prisma.activityLog.create.mockResolvedValue(activityEvent);
    const res = mockRes();

    await setUserActiveStatus(
      { ...req, body: { isActive: false } },
      res,
    );

    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "ACCOUNT_ACCESS_REVOKED",
        entityType: "USER",
        entityId: account.id,
        subjectId: account.id,
      }),
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ activityEvent }),
    );
  });

  test("denies a pending account and preserves the decision in the audit log", async () => {
    const activityEvent = { id: 9, action: "ACCOUNT_DENIED" };
    prisma.activityLog.create.mockResolvedValue(activityEvent);
    const res = mockRes();

    await denyUser(req, res);

    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: account.id },
    });
    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "ACCOUNT_DENIED",
        entityType: "USER",
        entityId: account.id,
        subjectId: account.id,
      }),
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("does not allow denying an approved account", async () => {
    prisma.user.findUnique.mockResolvedValue({ ...account, approved: true });
    const res = mockRes();

    await denyUser(req, res);

    expect(prisma.user.delete).not.toHaveBeenCalled();
    expect(prisma.activityLog.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("rejects account status updates with invalid input", async () => {
    const res = mockRes();

    await setUserActiveStatus(
      { ...req, params: { id: "0" }, body: { isActive: "false" } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test("does not create another activity event when account status is unchanged", async () => {
    prisma.user.findUnique.mockResolvedValue({ ...account, approved: true });
    prisma.user.update.mockResolvedValue({ ...account, isActive: true });
    const res = mockRes();

    await setUserActiveStatus(
      { ...req, body: { isActive: true } },
      res,
    );

    expect(prisma.activityLog.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      user: { ...account, isActive: true },
      activityEvent: null,
    });
  });
});

describe("admin listing oversight", () => {
  test("lists pending products with company data", async () => {
    const unapprovedProducts = [product];
    prisma.product.findMany.mockResolvedValue(unapprovedProducts);
    const res = mockRes();

    await getUnapprovedProducts({}, res);

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { approved: false },
      include: { company: true },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ unapprovedProducts });
  });

  test("lists approved products", async () => {
    const approvedProducts = [{ ...product, approved: true }];
    prisma.product.findMany.mockResolvedValue(approvedProducts);
    const res = mockRes();

    await getApprovedProducts({}, res);

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { approved: true },
      include: { company: true },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ approvedProducts });
  });

  test("lists all products with seller details in descending order", async () => {
    const products = [product];
    prisma.product.findMany.mockResolvedValue(products);
    const res = mockRes();

    await getAllProducts({}, res);

    expect(prisma.product.findMany).toHaveBeenCalledWith({
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
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ products });
  });

  test("loads an individual product's audit history and validates its id", async () => {
    const auditEvents = [{ id: 10, action: "CREATED" }];
    prisma.productAuditLog.findMany.mockResolvedValue(auditEvents);
    const res = mockRes();

    await getProductAuditHistory(
      { params: { id: String(product.id) } },
      res,
    );

    expect(prisma.productAuditLog.findMany).toHaveBeenCalledWith({
      where: { productId: product.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ auditEvents });

    const invalidRes = mockRes();
    await getProductAuditHistory({ params: { id: "nope" } }, invalidRes);
    expect(invalidRes.status).toHaveBeenCalledWith(400);
    expect(prisma.productAuditLog.findMany).toHaveBeenCalledTimes(1);
  });

  test("lists the 100 most recent listing audit events", async () => {
    const auditEvents = [{ id: 10, action: "APPROVED" }];
    prisma.productAuditLog.findMany.mockResolvedValue(auditEvents);
    const res = mockRes();

    await getRecentProductAuditHistory({}, res);

    expect(prisma.productAuditLog.findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ auditEvents });
  });

  test("approves a pending product and records the listing audit", async () => {
    prisma.product.findUnique.mockResolvedValue(product);
    const res = mockRes();

    await approveProduct(
      { ...req, params: { id: String(product.id) } },
      res,
    );

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { approved: true },
      include: { company: true },
    });
    expect(prisma.productAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: product.id,
        action: "APPROVED",
        actorId: admin.id,
        previousData: expect.objectContaining({ approved: false }),
        currentData: expect.objectContaining({ approved: true }),
      }),
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        product: {
          id: product.id,
          name: product.name,
          company_name: product.company.name,
          approved: true,
        },
      }),
    );
  });

  test("rejects invalid product approval ids", async () => {
    const res = mockRes();

    await approveProduct({ ...req, params: { id: "0" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test("updates listing status and records an audit event", async () => {
    prisma.product.findUnique.mockResolvedValue({ ...product, approved: true });
    const res = mockRes();

    await setProductActiveStatus(
      { ...req, params: { id: String(product.id) }, body: { isActive: false } },
      res,
    );

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { isActive: false },
      include: { company: true },
    });
    expect(prisma.productAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: product.id,
        action: "DISABLED",
      }),
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        product: expect.objectContaining({ isActive: false }),
      }),
    );
  });

  test("rejects invalid listing status updates", async () => {
    const res = mockRes();

    await setProductActiveStatus(
      { ...req, params: { id: String(product.id) }, body: { isActive: 0 } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test("denies a pending product, deleting dependent cart and review records", async () => {
    prisma.orderItem.count.mockResolvedValue(0);
    prisma.product.findUnique.mockResolvedValue(product);
    const res = mockRes();

    await denyProduct(
      { ...req, params: { id: String(product.id) } },
      res,
    );

    expect(prisma.orderItem.count).toHaveBeenCalledWith({
      where: { productId: product.id },
    });
    expect(prisma.productAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: product.id,
        action: "DENIED",
      }),
    });
    expect(prisma.cartToProducts.deleteMany).toHaveBeenCalledWith({
      where: { productId: product.id },
    });
    expect(prisma.review.deleteMany).toHaveBeenCalledWith({
      where: { productId: product.id },
    });
    expect(prisma.product.delete).toHaveBeenCalledWith({
      where: { id: product.id },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("does not deny an approved or previously ordered product", async () => {
    prisma.product.findUnique.mockResolvedValue({ ...product, approved: true });
    const approvedRes = mockRes();

    await denyProduct(
      { ...req, params: { id: String(product.id) } },
      approvedRes,
    );

    expect(approvedRes.status).toHaveBeenCalledWith(409);
    expect(prisma.product.delete).not.toHaveBeenCalled();

    jest.resetAllMocks();
    prisma.orderItem.count.mockResolvedValue(1);
    const orderedRes = mockRes();

    await denyProduct(
      { ...req, params: { id: String(product.id) } },
      orderedRes,
    );

    expect(orderedRes.status).toHaveBeenCalledWith(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

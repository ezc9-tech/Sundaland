import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const prisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  activityLog: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.unstable_mockModule("../utils/prisma.ts", () => ({ prisma }));

const { approveUser, denyUser, getRecentActivity, setUserActiveStatus } =
  await import("../routes/adminRoutes.js");

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
const req = { params: { id: "5" }, user: { userId: 1, role: "admin" } };

beforeEach(() => {
  jest.resetAllMocks();
  prisma.$transaction.mockImplementation((callback) => callback(prisma));
  prisma.user.findUnique.mockImplementation(({ where: { id } }) =>
    Promise.resolve(id === account.id ? account : admin),
  );
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

describe("admin account oversight", () => {
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
});

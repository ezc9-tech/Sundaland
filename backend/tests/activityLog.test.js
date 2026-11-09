import { describe, expect, jest, test } from "@jest/globals";
import { recordActivity } from "../utils/activityLog.js";

describe("recordActivity", () => {
  test("stores actor and subject snapshots with action details", async () => {
    const actor = {
      id: 8,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      login: { email: "admin@example.com" },
    };
    const event = { id: 12, action: "ACCOUNT_APPROVED" };
    const transaction = {
      user: { findUnique: jest.fn().mockResolvedValue(actor) },
      activityLog: { create: jest.fn().mockResolvedValue(event) },
    };
    const subject = {
      id: 15,
      firstName: "New",
      lastName: "Member",
      role: "buyer",
      login: { email: "new@example.com" },
    };

    await expect(
      recordActivity(transaction, {
        actor: { userId: 8 },
        action: "ACCOUNT_APPROVED",
        entityType: "USER",
        entityId: 15,
        subject,
      }),
    ).resolves.toBe(event);

    expect(transaction.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: "ACCOUNT_APPROVED",
        entityType: "USER",
        entityId: 15,
        actorId: 8,
        actorName: "Admin User",
        actorEmail: "admin@example.com",
        actorRole: "admin",
        subjectId: 15,
        subjectName: "New Member",
        subjectEmail: "new@example.com",
        subjectRole: "buyer",
      },
    });
  });

  test("rejects attempts to log activity without a valid actor", async () => {
    const transaction = {
      user: { findUnique: jest.fn() },
      activityLog: { create: jest.fn() },
    };

    await expect(
      recordActivity(transaction, {
        actor: null,
        action: "ORDER_PLACED",
        entityType: "ORDER",
      }),
    ).rejects.toThrow("Cannot record activity without a valid actor");

    expect(transaction.user.findUnique).not.toHaveBeenCalled();
    expect(transaction.activityLog.create).not.toHaveBeenCalled();
  });
});

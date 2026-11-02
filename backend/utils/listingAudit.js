export function listingSnapshot(product) {
  return {
    name: product.name,
    description: product.description,
    price: product.price.toString(),
    inventory: product.inventory,
    pictureUrl: product.pictureUrl,
    approved: product.approved,
    isActive: product.isActive,
    company: product.company?.name ?? null,
  };
}

export async function recordListingAudit(
  transaction,
  { product, actor, action, previousData = null, currentData = null },
) {
  const actorId = Number(actor?.userId ?? actor?.id);
  const actorRecord = Number.isInteger(actorId)
    ? await transaction.user.findUnique({
        where: { id: actorId },
        include: { login: { select: { email: true } } },
      })
    : null;

  if (!actorRecord) {
    throw new Error("Cannot record listing audit without a valid actor");
  }

  return transaction.productAuditLog.create({
    data: {
      productId: product.id,
      productName: product.name,
      action,
      actorId: actorRecord.id,
      actorName: `${actorRecord.firstName} ${actorRecord.lastName}`,
      actorEmail: actorRecord.login?.email ?? null,
      actorRole: actor.role,
      ...(previousData ? { previousData } : {}),
      ...(currentData ? { currentData } : {}),
    },
  });
}

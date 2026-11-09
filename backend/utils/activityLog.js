export async function recordActivity(
  transaction,
  { actor, action, entityType, entityId = null, subject = null, details = null },
) {
  const actorId = Number(actor?.userId ?? actor?.id);
  if (!Number.isInteger(actorId) || actorId <= 0) {
    throw new Error("Cannot record activity without a valid actor");
  }

  const actorRecord = await transaction.user.findUnique({
    where: { id: actorId },
    include: { login: { select: { email: true } } },
  });
  if (!actorRecord) {
    throw new Error("Cannot record activity for an unknown actor");
  }

  return transaction.activityLog.create({
    data: {
      action,
      entityType,
      entityId,
      actorId: actorRecord.id,
      actorName: `${actorRecord.firstName} ${actorRecord.lastName}`,
      actorEmail: actorRecord.login?.email ?? null,
      actorRole: actorRecord.role,
      ...(subject
        ? {
            subjectId: subject.id,
            subjectName: `${subject.firstName} ${subject.lastName}`,
            subjectEmail: subject.login?.email ?? null,
            subjectRole: subject.role,
          }
        : {}),
      ...(details === null ? {} : { details }),
    },
  });
}

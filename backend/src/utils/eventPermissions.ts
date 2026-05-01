interface EventPermissionTarget {
  hostAdminId?: string | null;
  adminIds?: string[] | null;
}

const normalizeId = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeAdminIds = (adminIds: unknown): string[] => {
  if (!Array.isArray(adminIds)) return [];

  return Array.from(new Set(
    adminIds
      .map((adminId) => normalizeId(adminId))
      .filter((adminId) => adminId.length > 0),
  ));
};

export const isEventOwner = (userId: string, event: EventPermissionTarget | null | undefined): boolean => {
  if (!event) return false;
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) return false;

  return normalizeId(event.hostAdminId) === normalizedUserId;
};

export const isEventAdmin = (userId: string, event: EventPermissionTarget | null | undefined): boolean => {
  if (!event) return false;
  const normalizedUserId = normalizeId(userId);
  if (!normalizedUserId) return false;

  return normalizeAdminIds(event.adminIds).includes(normalizedUserId);
};

export const canManageEvent = (userId: string, event: EventPermissionTarget | null | undefined): boolean => {
  return isEventOwner(userId, event) || isEventAdmin(userId, event);
};

export const manageableEventQuery = (userId: string) => ({
  $or: [{ hostAdminId: userId }, { adminIds: userId }],
});

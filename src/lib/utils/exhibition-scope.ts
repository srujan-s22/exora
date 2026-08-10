import mongoose from 'mongoose';
import { User as UserModel } from '@/lib/db/models/user.model';
import { connectToDatabase } from '@/lib/db/connection';

export interface ExhibitionScope {
  isGlobal: boolean;
  allowedExhibitionIds: string[];
}

/**
 * Resolve effective exhibition scope synchronously from a hydrated user object.
 *
 * Effective Access = Role + Permission + Exhibition Scope
 *
 * Rules:
 * 1. super_admin -> isGlobal: true
 * 2. admin with exhibitionAccessMode === 'SELECTED' -> isGlobal: false, allowedExhibitionIds: assignedExhibitions
 * 3. admin with exhibitionAccessMode === 'GENERAL' (or default/undefined) -> isGlobal: true
 * 4. other staff roles (counter, gate, ride) -> isGlobal: false, allowedExhibitionIds: assignedExhibitions
 */
export function getUserExhibitionScope(user: any): ExhibitionScope {
  if (!user) {
    return { isGlobal: false, allowedExhibitionIds: [] };
  }

  const role = user.role;

  if (role === 'super_admin') {
    return { isGlobal: true, allowedExhibitionIds: [] };
  }

  if (role === 'admin') {
    const mode = user.exhibitionAccessMode || 'GENERAL';
    if (mode === 'SELECTED') {
      const rawExhibitions = user.assignedExhibitions || user.exhibitions || [];
      const allowedExhibitionIds = rawExhibitions.map((e: any) =>
        typeof e === 'object' && e !== null ? (e._id ? e._id.toString() : e.id?.toString() || String(e)) : String(e)
      ).filter(Boolean);
      return { isGlobal: false, allowedExhibitionIds };
    }
    // GENERAL scope or backward compatible default
    return { isGlobal: true, allowedExhibitionIds: [] };
  }

  // Non-admin roles (counter, gate, ride) are tied to their assigned exhibitions
  const rawExhibitions = user.assignedExhibitions || user.exhibitions || [];
  const allowedExhibitionIds = rawExhibitions.map((e: any) =>
    typeof e === 'object' && e !== null ? (e._id ? e._id.toString() : e.id?.toString() || String(e)) : String(e)
  ).filter(Boolean);

  return { isGlobal: false, allowedExhibitionIds };
}

/**
 * Resolve effective exhibition scope directly from MongoDB Atlas (Database as source of truth).
 * Ensures instant updates when Super Admin modifies an Admin's assigned exhibitions or mode.
 */
export async function fetchFreshUserExhibitionScope(userId: string): Promise<ExhibitionScope> {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { isGlobal: false, allowedExhibitionIds: [] };
  }

  await connectToDatabase();
  const freshUser = await UserModel.findById(userId)
    .select('role exhibitionAccessMode assignedExhibitions isActive')
    .lean();

  if (!freshUser || !freshUser.isActive) {
    return { isGlobal: false, allowedExhibitionIds: [] };
  }

  return getUserExhibitionScope(freshUser);
}

/**
 * Check if user has access to a specific exhibition ID synchronously.
 */
export function hasExhibitionAccess(user: any, exhibitionId: string | mongoose.Types.ObjectId): boolean {
  if (!exhibitionId) return false;

  const scope = getUserExhibitionScope(user);
  if (scope.isGlobal) return true;

  const exhIdStr = exhibitionId.toString();
  return scope.allowedExhibitionIds.includes(exhIdStr);
}

/**
 * Check if user has access to a specific exhibition ID using real-time DB state.
 */
export async function hasExhibitionAccessAsync(
  user: any,
  exhibitionId: string | mongoose.Types.ObjectId
): Promise<boolean> {
  if (!exhibitionId) return false;

  const userId = user?.id || user?.sub || (typeof user === 'string' ? user : null);
  const scope = userId ? await fetchFreshUserExhibitionScope(userId) : getUserExhibitionScope(user);

  if (scope.isGlobal) return true;

  const exhIdStr = exhibitionId.toString();
  return scope.allowedExhibitionIds.includes(exhIdStr);
}

/**
 * Verify user exhibition access or throw an authorization error.
 */
export function requireExhibitionAccess(user: any, exhibitionId?: string | mongoose.Types.ObjectId): void {
  if (!exhibitionId) {
    const scope = getUserExhibitionScope(user);
    if (!scope.isGlobal && scope.allowedExhibitionIds.length === 0) {
      const error: any = new Error('Access denied: No exhibitions assigned to your account.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_NO_EXHIBITION';
      throw error;
    }
    return;
  }

  if (!hasExhibitionAccess(user, exhibitionId)) {
    const error: any = new Error('Access denied: You do not have access to this exhibition.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN_EXHIBITION_SCOPE';
    throw error;
  }
}

/**
 * Modify a Mongoose query object to strictly enforce the user's exhibition scope.
 *
 * @param user Authenticated user object or DB user document
 * @param query Existing Mongoose query filter object
 * @param fieldName Name of the exhibition reference field (defaults to 'exhibitionId')
 */
export function applyExhibitionScopeQuery(
  user: any,
  query: Record<string, any> = {},
  fieldName: string = 'exhibitionId'
): Record<string, any> {
  const scope = getUserExhibitionScope(user);

  // Global scope: return query as-is
  if (scope.isGlobal) {
    return { ...query };
  }

  // If a user is querying sales/records sold by themselves, allow access to their own transactions
  const userId = user?.id || user?._id?.toString() || user?.sub || (typeof user === 'string' ? user : null);
  if (userId && query.soldBy && query.soldBy.toString() === userId.toString()) {
    return { ...query };
  }

  // Non-existent ObjectId used to force empty query result when user has 0 allowed exhibitions or requests unassigned exhibition
  const ZERO_MATCH_ID = new mongoose.Types.ObjectId('000000000000000000000000');

  if (scope.allowedExhibitionIds.length === 0) {
    return {
      ...query,
      [fieldName]: ZERO_MATCH_ID,
    };
  }

  const allowedObjectIds = scope.allowedExhibitionIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  // If query already filters by a specific exhibitionId, ensure it is within allowed scope
  if (query[fieldName]) {
    const specifiedExh = query[fieldName];
    const specifiedStr =
      typeof specifiedExh === 'object' && specifiedExh !== null && specifiedExh.toString
        ? specifiedExh.toString()
        : String(specifiedExh);

    if (scope.allowedExhibitionIds.includes(specifiedStr)) {
      return { ...query };
    } else {
      // Forbidden exhibition specified -> return zero match query
      return {
        ...query,
        [fieldName]: ZERO_MATCH_ID,
      };
    }
  }

  // Filter query to allowed exhibitions
  return {
    ...query,
    [fieldName]: { $in: allowedObjectIds },
  };
}

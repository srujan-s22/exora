import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { SaleService } from '@/lib/services/sale.service';
import { TicketService } from '@/lib/services/ticket.service';
import { ExhibitionService } from '@/lib/services/exhibition.service';
import { Sale as SaleModel } from '@/lib/db/models/sale.model';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { createTicketSchema } from '@/lib/validators/ticket.schema';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import { hasCounterPermission } from '@/lib/utils/permission-helpers';

/**
 * GET /api/sales
 * List sales records. Admins see all; counter staff see only their own.
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    const user = await AuthService.verifyToken(token);
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Invalid or expired session', 401);
    }

    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'counter') {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    if (!hasCounterPermission(user, 'canViewEntrySales')) {
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to view entry sales', 403);
    }

    const { searchParams } = new URL(req.url);
    const exhibitionId = searchParams.get('exhibitionId') || undefined;
    const paymentMethod = searchParams.get('paymentMethod') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Counter staff is scoped to their own sales; Admins and Super Admins can filter by soldBy
    const soldBy = (user.role === 'admin' || user.role === 'super_admin')
      ? (searchParams.get('soldBy') || undefined)
      : user.id;

    const result = await SaleService.list(
      {
        page,
        limit,
        exhibitionId,
        soldBy,
        paymentMethod,
      },
      user
    );

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error in GET /api/sales:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to list sales'), 500);
  }
}

/**
 * POST /api/sales
 * Process a counter sale and issue tickets.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    const user = await AuthService.verifyToken(token);
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Invalid or expired session', 401);
    }

    // Only admin and counter roles can create sales
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'counter') {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    if (!hasCounterPermission(user, 'canSellEntryTickets')) {
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to sell entry tickets', 403);
    }

    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid sale/ticket data', 400, parsed.error.flatten().fieldErrors);
    }

    // Safety rule: verify exhibition exists and staff member is assigned to it if they are counter staff
    const exhibition = await ExhibitionService.findById(parsed.data.exhibitionId);
    if (!exhibition) {
      return errorResponse('VALIDATION_ERROR', 'Exhibition not found', 400);
    }

    const opCheck = ExhibitionService.isOperational(exhibition);
    if (!opCheck.operational) {
      return errorResponse('BAD_REQUEST', opCheck.reason || 'Ticket sales are disabled for this exhibition.', 400);
    }

    if (user.role !== 'admin') {
      const isAssigned = (exhibition.assignedStaffIds || []).some(
        (staff: any) => staff.id?.toString() === user.id || staff.toString() === user.id
      ) || user.assignedExhibitions.includes(parsed.data.exhibitionId);

      if (!isAssigned) {
        return errorResponse('FORBIDDEN', 'Access denied: You are not assigned to this exhibition counter', 403);
      }
    }

    // Process sale and issue tickets
    const result = await TicketService.create(
      {
        ...parsed.data,
        source: 'counter',
      },
      user.id
    );

    // Fetch the created Sale record to return to caller
    const transactionId = result.tickets[0]?.metadata?.transactionId;
    let sale = null;
    if (transactionId) {
      const saleDoc: any = await SaleModel.findOne({ transactionId })
        .populate('exhibitionId', 'name venue')
        .populate('soldBy', 'name staffId')
        .lean();
      if (saleDoc) {
        sale = {
          ...saleDoc,
          id: saleDoc._id.toString(),
          exhibitionId: saleDoc.exhibitionId ? { ...saleDoc.exhibitionId, id: saleDoc.exhibitionId._id?.toString() } : undefined,
          soldBy: saleDoc.soldBy ? { ...saleDoc.soldBy, id: saleDoc.soldBy._id?.toString() } : undefined,
        };
      }
    }

    return createdResponse({
      sale,
      tickets: result.tickets,
      qrDataUrls: result.qrDataUrls,
    });
  } catch (error: any) {
    logger.error('Error in POST /api/sales:', error);

    // Gracefully handle specific logic errors as 400s
    if (
      error.message?.includes('Capacity') ||
      error.message?.includes('not configured') ||
      error.message?.includes('closed to active') ||
      error.message?.includes('not found')
    ) {
      return errorResponse('VALIDATION_ERROR', error.message, 400);
    }

    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to process sale'), 500);
  }
}

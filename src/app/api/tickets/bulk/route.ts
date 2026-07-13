import { errorResponse } from '@/lib/utils/api-response';

export async function POST() {
  return errorResponse('NOT_AVAILABLE', 'Bulk ticket creation is not yet available', 501);
}

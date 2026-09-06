import { NextRequest, NextResponse } from 'next/server';
import { getInvoices } from '@/app/actions/invoice-actions';
import { InvoiceStatus, Segment } from '@prisma/client';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const status = params.get('status');
  const segment = params.get('segment');
  const search = params.get('search');
  const minRisk = params.get('minRisk');
  const sortBy = params.get('sortBy');
  const sortDir = params.get('sortDir');
  const page = params.get('page');
  const pageSize = params.get('pageSize');

  try {
    const result = await getInvoices({
      status: status ? (status as InvoiceStatus) : undefined,
      segment: segment ? (segment as Segment) : undefined,
      search: search || undefined,
      minRisk: minRisk ? Number(minRisk) : undefined,
      sortBy: (sortBy as 'dueDate' | 'amount' | 'riskScore') || undefined,
      sortDir: (sortDir as 'asc' | 'desc') || undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Erro ao listar faturas:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}

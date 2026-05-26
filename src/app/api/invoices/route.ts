import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET() {
  try {
    // Busca as 10 faturas com maior score de risco para você validar a priorização
    const topInvoices = await prisma.invoice.findMany({
      take: 10,
      orderBy: { riskScore: 'desc' },
      include: { customer: true }
    });
    
    return NextResponse.json({ success: true, data: topInvoices });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro ao buscar faturas' }, { status: 500 });
  }
}
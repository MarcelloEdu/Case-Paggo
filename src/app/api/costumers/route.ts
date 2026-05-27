import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' }
    });
    
    return NextResponse.json(customers);
  } catch (error: any) {
    console.error("❌ Erro na API de clientes:", error);
    return NextResponse.json(
      { error: "Falha ao carregar clientes do banco." }, 
      { status: 500 }
    );
  }
}
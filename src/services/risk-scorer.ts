/**
 * Utilitário central de scoring de risco para o ecossistema Paggo.
 * Calcula uma pontuação de 0 a 100 baseada em múltiplos fatores de comportamento B2B.
 */

interface RiskFactors {
  daysOverdue: number;
  previousLateInvoices: number;
  attempts: number;
  customerSegment: 'SMB' | 'MID' | 'ENT' | string;
  openBalance: number;
  creditLimit: number;
}

export function calculateInvoiceRiskScore({
  daysOverdue,
  previousLateInvoices,
  attempts,
  customerSegment,
  openBalance,
  creditLimit,
}: RiskFactors): number {
  let score = 0;

  // 1. Fator de Tempo (Aging das faturas em aberto)
  if (daysOverdue > 0) {
    if (daysOverdue <= 15) score += 20;
    else if (daysOverdue <= 30) score += 40;
    else score += 60; // Mais de 30 dias de atraso ganha peso máximo de tempo
  }

  // 2. Fator Histórico de Inadimplência
  if (previousLateInvoices > 0) {
    if (previousLateInvoices <= 2) score += 10;
    else score += 25; // Cliente recorrente em atrasos possui risco severo
  }

  // 3. Fator de Atrito de Cobrança (Tentativas falhas de contato)
  if (attempts > 0) {
    if (attempts === 1) score += 5;
    else if (attempts <= 3) score += 15;
    else score += 20; // Se o time já tentou mais de 3 contatos sem sucesso
  }

  // 4. Alavancagem Financeira (Razão entre saldo em aberto e limite total)
  if (creditLimit > 0 && openBalance > 0) {
    const leverageRatio = openBalance / creditLimit;
    if (leverageRatio > 0.8) {
      score += 15; // Quase estourando o limite de crédito
    } else if (leverageRatio > 0.5) {
      score += 5;
    }
  }

  // 5. Ajuste por Segmento (Mitigação de Risco)
  // Empresas Grandes (Enterprise) costumam ter processos de governança mais rígidos,
  // enquanto SMB (Pequenas empresas) historicamente têm mais volatilidade de caixa.
  if (customerSegment === 'SMB') {
    score += 5; // Pequeno acréscimo de risco estrutural
  } else if (customerSegment === 'ENT') {
    score -= 10; // Amortização por ser grande conta corporativa
  }

  // Garante que o score final fique estritamente limitado na régua de 0 a 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Retorna a classificação visual e semântica do risco
 */
export function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}
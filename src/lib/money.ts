// src/lib/money.ts

/** Converte entradas humanas para número (pt-BR e en-US mistos).
 * Suporta:
 *  - "1.234,56"  => 1234.56
 *  - "1234,56"   => 1234.56
 *  - "1,234.56"  => 1234.56
 *  - "1234.56"   => 1234.56
 *  - "1.000"     => 1000     (ponto como milhar)
 *  - "1.000.000" => 1000000  (vários pontos como milhar)
 *  - "1000"      => 1000
 */
export function parseAmountBR(raw: string): number {
  if (!raw) return NaN;
  const s0 = raw.trim().replace(/\s/g, ''); // tira espaços
  if (!s0) return NaN;

  const hasComma = s0.includes(',');
  const hasDot = s0.includes('.');

  // Caso tenha vírgula E ponto: decidir quem é decimal olhando o último separador
  if (hasComma && hasDot) {
    const lastComma = s0.lastIndexOf(',');
    const lastDot = s0.lastIndexOf('.');
    // vírgula depois do ponto -> vírgula é decimal (pt-BR estilo "1.234,56")
    if (lastComma > lastDot) {
      const normalized = s0.replace(/\./g, '').replace(',', '.');
      return toNumber(normalized);
    }
    // ponto depois da vírgula -> ponto é decimal (en-US "1,234.56")
    const normalized = s0.replace(/,/g, '');
    return toNumber(normalized);
  }

  // Só vírgula -> vírgula é decimal; pontos (se houver) são milhar
  if (hasComma && !hasDot) {
    const normalized = s0.replace(/\./g, '').replace(',', '.');
    return toNumber(normalized);
  }

  // Só ponto -> pode ser decimal OU milhar
  if (!hasComma && hasDot) {
    const parts = s0.split('.');
    // Se houver 2+ pontos, tratamos todos como milhar (ex.: "1.000.000")
    if (parts.length > 2) {
      const normalized = parts.join('');
      return toNumber(normalized);
    }
    // Um único ponto: decidir por heurística
    const [intPart, fracPart = ''] = parts;
    // Se houver exatamente 3 dígitos após o ponto (e pelo menos 1 antes),
    // é MUITO provável que seja milhar: "1.000" -> 1000
    if (fracPart.length === 3 && intPart.length >= 1) {
      const normalized = intPart + fracPart; // remove o ponto
      return toNumber(normalized);
    }
    // Caso contrário, tratar como decimal: "1.5" -> 1.5
    return toNumber(s0);
  }

  // Só dígitos
  return toNumber(s0);
}

function toNumber(x: string): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

/** 1000.5 -> "1.000,50" */
export function formatMoneyBR(n: number): string {
  return (Number(n) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

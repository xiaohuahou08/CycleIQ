/** Total opening commission for the leg (stored as `commission_fee` on the trade). */
export function commissionFeeTotal(
  perContract: number | undefined,
  contracts: number
): number | undefined {
  if (perContract === undefined || !Number.isFinite(perContract)) return undefined;
  const c = Math.max(1, Math.floor(Number(contracts)) || 1);
  return Math.round(perContract * c * 100) / 100;
}

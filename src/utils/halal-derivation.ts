export type DerivedReviewStatus = 'approved' | 'rejected';

export function deriveReviewStatus(
  noAlcohol: boolean,
  noPork: boolean,
  noGambling: boolean,
): DerivedReviewStatus {
  return (noAlcohol && noPork && noGambling) ? 'approved' : 'rejected';
}

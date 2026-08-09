import type { Loan, LoanStatus } from '../types'

export interface LoanSnapshotTracker {
  initialized: boolean
  statuses: ReadonlyMap<string, LoanStatus>
}

export function createLoanSnapshotTracker(): LoanSnapshotTracker {
  return { initialized: false, statuses: new Map() }
}

export function processLoanSnapshot(
  tracker: LoanSnapshotTracker,
  loans: Loan[],
): { tracker: LoanSnapshotTracker; newlyApproved: Loan[] } {
  const statuses = new Map(loans.map((loan) => [loan.id, loan.status] as const))
  const newlyApproved = tracker.initialized
    ? loans.filter((loan) => tracker.statuses.get(loan.id) === 'pending' && loan.status === 'approved')
    : []

  return {
    tracker: { initialized: true, statuses },
    newlyApproved,
  }
}

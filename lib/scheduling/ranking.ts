import {
  candidateSlotSchema,
  type CandidateSlot,
  type ScoreComponent,
} from '../domain';

const BASE_SCORE = 100;

const SCORE_RULES = {
  movable_event: {
    impact: -20,
    message: 'Moving a required participant event creates disruption.',
  },
  preference_match: {
    impact: 10,
    message: 'An explicit preference supports this candidate.',
  },
  optional_attendee_conflict: {
    impact: -5,
    message: 'An optional attendee cannot join this candidate.',
  },
} as const;

export function scoreCandidateSlot(candidate: CandidateSlot): CandidateSlot {
  const validatedCandidate = candidateSlotSchema.parse(candidate);
  if (validatedCandidate.status === 'rejected') return validatedCandidate;

  const scoreBreakdown: ScoreComponent[] = [
    {
      code: 'base_availability',
      impact: BASE_SCORE,
      message: 'The candidate satisfies all hard constraints.',
    },
  ];

  for (const reason of validatedCandidate.reasons) {
    if (!(reason.code in SCORE_RULES)) continue;
    const code = reason.code as keyof typeof SCORE_RULES;
    const rule = SCORE_RULES[code];
    scoreBreakdown.push({ code, ...rule });
  }

  return candidateSlotSchema.parse({
    ...validatedCandidate,
    score: scoreBreakdown.reduce(
      (total, component) => total + component.impact,
      0,
    ),
    scoreBreakdown,
  });
}

export function rankCandidateSlots(
  candidates: readonly CandidateSlot[],
): CandidateSlot[] {
  return candidates
    .filter(({ status }) => status !== 'rejected')
    .map(scoreCandidateSlot)
    .sort((first, second) => {
      const scoreDifference = second.score - first.score;
      if (scoreDifference !== 0) return scoreDifference;

      const disruptionDifference =
        countDisruptions(first) - countDisruptions(second);
      if (disruptionDifference !== 0) return disruptionDifference;

      return Date.parse(first.startsAt) - Date.parse(second.startsAt);
    });
}

function countDisruptions(candidate: CandidateSlot): number {
  return candidate.reasons.filter(({ code }) =>
    ['movable_event', 'optional_attendee_conflict'].includes(code),
  ).length;
}

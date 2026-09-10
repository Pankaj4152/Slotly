import { z } from 'zod';

import {
  meetingTypeSchema,
  scenarioInputSchema,
  type ScenarioInput,
} from '../domain';
import {
  generateWithTimeout,
  ModelProviderError,
  type ModelProvider,
} from './provider';

const identifier = z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/);

export const extractedMeetingIntentSchema = z.object({
  title: z.string().trim().min(1),
  participantIds: z.array(identifier).min(2),
  durationMinutes: z.number().int().positive().max(480),
  windowStartsAt: z.iso.datetime({ offset: true }),
  windowEndsAt: z.iso.datetime({ offset: true }),
  meetingType: meetingTypeSchema,
  ambiguities: z
    .array(
      z.enum([
        'timezone',
        'duration',
        'participants',
        'date_window',
        'move_permission',
      ]),
    )
    .default([]),
  confidence: z.enum(['low', 'medium', 'high']),
});

export type ExtractedMeetingIntent = z.infer<
  typeof extractedMeetingIntentSchema
>;

export class IntentExtractionError extends ModelProviderError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'IntentExtractionError';
  }
}

export async function extractMeetingIntent(
  provider: ModelProvider,
  scenario: ScenarioInput,
  timeoutMs = 10_000,
): Promise<ExtractedMeetingIntent> {
  const validatedScenario = scenarioInputSchema.parse(scenario);
  const response = await generateWithTimeout(
    provider,
    {
      responseFormat: 'json',
      temperature: 0,
      messages: [
        { role: 'system', content: INTENT_SYSTEM_PROMPT },
        { role: 'user', content: serializeIntentContext(validatedScenario) },
      ],
    },
    timeoutMs,
  );

  const text = stripMarkdownFence(response.text);
  if (!text)
    throw new IntentExtractionError('Model returned an empty intent response');

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new IntentExtractionError('Model returned invalid intent JSON', {
      cause: error,
    });
  }

  const result = extractedMeetingIntentSchema.safeParse(value);
  if (!result.success) {
    throw new IntentExtractionError(
      `Model intent failed schema validation: ${z.prettifyError(result.error)}`,
      { cause: result.error },
    );
  }

  const knownParticipants = new Set(
    validatedScenario.participants.map(({ id }) => id),
  );
  const unknownParticipant = result.data.participantIds.find(
    (id) => !knownParticipants.has(id),
  );
  if (unknownParticipant) {
    throw new IntentExtractionError(
      `Model referenced unknown participant: ${unknownParticipant}`,
    );
  }

  return result.data;
}

export function createDeterministicIntent(
  scenario: ScenarioInput,
): ExtractedMeetingIntent {
  const validatedScenario = scenarioInputSchema.parse(scenario);
  const request = validatedScenario.meetingRequest;
  return extractedMeetingIntentSchema.parse({
    title: request.title,
    participantIds: request.participantIds,
    durationMinutes: request.durationMinutes,
    windowStartsAt: request.windowStartsAt,
    windowEndsAt: request.windowEndsAt,
    meetingType: request.meetingType,
    ambiguities: [],
    confidence: 'high',
  });
}

export function applyExtractedIntent(
  scenario: ScenarioInput,
  intent: ExtractedMeetingIntent,
): ScenarioInput {
  const validatedScenario = scenarioInputSchema.parse(scenario);
  const validatedIntent = extractedMeetingIntentSchema.parse(intent);

  return scenarioInputSchema.parse({
    ...validatedScenario,
    meetingRequest: {
      ...validatedScenario.meetingRequest,
      title: validatedIntent.title,
      participantIds: validatedIntent.participantIds,
      durationMinutes: validatedIntent.durationMinutes,
      windowStartsAt: validatedIntent.windowStartsAt,
      windowEndsAt: validatedIntent.windowEndsAt,
      meetingType: validatedIntent.meetingType,
    },
  });
}

export function serializeIntentContext(scenario: ScenarioInput): string {
  return JSON.stringify(
    {
      displayTimezone: scenario.displayTimezone,
      participants: scenario.participants.map(
        ({ id, name, role, timezone }) => ({
          id,
          name,
          role,
          timezone,
        }),
      ),
      conversation: scenario.conversation,
    },
    null,
    2,
  );
}

const INTENT_SYSTEM_PROMPT = `You extract scheduling intent from a conversation.
Return exactly one JSON object with: title, participantIds, durationMinutes,
windowStartsAt, windowEndsAt, meetingType, ambiguities, and confidence.
Use only participant IDs supplied by the user. Preserve explicit UTC offsets.
Record missing or unclear information in ambiguities. Never choose a meeting slot,
move an event, or make a scheduling decision.`;

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

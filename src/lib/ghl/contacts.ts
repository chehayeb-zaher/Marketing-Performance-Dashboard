import "server-only";
import { ghlGet, mapWithConcurrency, GhlApiError } from "./http";
import { GhlContactResponseSchema, type GhlContact } from "./schemas";

const CONTACT_FETCH_CONCURRENCY = 4;

/**
 * Fetches contacts by ID with bounded concurrency and maps them by contact ID.
 * A contact that fails to fetch (deleted, permission issue, etc.) is omitted from the
 * map rather than aborting the whole batch; callers treat a missing contact as
 * "no source / no tags known" during cleaning.
 */
export async function getContactsByIds(contactIds: string[]): Promise<Map<string, GhlContact>> {
  const uniqueIds = [...new Set(contactIds.filter(Boolean))];
  const map = new Map<string, GhlContact>();

  await mapWithConcurrency(uniqueIds, CONTACT_FETCH_CONCURRENCY, async (contactId) => {
    try {
      const raw = await ghlGet(`/contacts/${encodeURIComponent(contactId)}`);
      const parsed = GhlContactResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(`Contact ${contactId} response did not match the expected shape`);
      }
      map.set(contactId, parsed.data.contact);
    } catch (err) {
      if (err instanceof GhlApiError && err.status === 404) return;
      throw err;
    }
  });

  return map;
}

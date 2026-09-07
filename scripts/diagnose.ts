/**
 * Development-only diagnostic: verifies GHL connectivity and reports the *shape* of the
 * real API responses (field names, record counts, pipeline/stage names) so the Zod
 * schemas and transformation logic can be built against reality instead of guesswork.
 *
 * Never prints the bearer token or any contact PII (name/email/phone/address). Only
 * object key names and counts are logged for opportunity/contact records.
 *
 * Run with: npm run diagnose
 */
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import { getGhlEnv } from "../src/lib/ghl/env";
import { getPipelines, getPipelineByName, getOrderedStages } from "../src/lib/ghl/pipelines";
import { getAllOpportunities } from "../src/lib/ghl/opportunities";
import { getContactsByIds } from "../src/lib/ghl/contacts";
import { DEFAULT_REPORT_RANGE, toUtcInstantRange } from "../src/lib/reportDateRange";

const TARGET_PIPELINE_NAME = "Sales Pipeline";

function keysOf(obj: unknown): string[] {
  if (obj === null || typeof obj !== "object") return [];
  return Object.keys(obj as Record<string, unknown>).sort();
}

async function main() {
  console.log("=== GHL Connection Diagnostic ===\n");

  let env;
  try {
    env = getGhlEnv();
  } catch (err) {
    console.error("[FAIL] Environment configuration invalid:");
    console.error(`  ${(err as Error).message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[OK] Env loaded. Base URL=${env.GHL_API_BASE_URL} Version=${env.GHL_API_VERSION} TZ=${env.REPORT_TIMEZONE}`);
  console.log(`     Location ID present: ${env.GHL_LOCATION_ID ? "yes" : "no"} (value not printed)`);
  console.log(`     Token present: ${env.GHL_PRIVATE_TOKEN ? "yes" : "no"} (value not printed)\n`);

  // 1. Pipelines
  console.log("--- Pipelines ---");
  let pipelines;
  try {
    pipelines = await getPipelines();
  } catch (err) {
    console.error("[FAIL] Could not fetch pipelines:", (err as Error).message);
    console.error("       Likely cause: missing 'View Pipelines'/opportunities read scope, or bad token/location ID.");
    process.exitCode = 1;
    return;
  }
  console.log(`[OK] Retrieved ${pipelines.length} pipeline(s).`);
  for (const p of pipelines) {
    console.log(`  - "${p.name}" (id=${p.id}), ${p.stages.length} stage(s)`);
  }
  if (pipelines.length > 0) {
    console.log(`  Sample pipeline object keys: [${keysOf(pipelines[0]).join(", ")}]`);
    if (pipelines[0].stages.length > 0) {
      console.log(`  Sample stage object keys: [${keysOf(pipelines[0].stages[0]).join(", ")}]`);
    }
  }
  console.log();

  // 2. Target pipeline + stage order
  console.log(`--- "${TARGET_PIPELINE_NAME}" stages (in API order) ---`);
  let targetPipeline;
  try {
    targetPipeline = await getPipelineByName(TARGET_PIPELINE_NAME);
  } catch (err) {
    console.error(`[FAIL] ${(err as Error).message}`);
    process.exitCode = 1;
    return;
  }
  const orderedStages = getOrderedStages(targetPipeline);
  orderedStages.forEach((s, i) => {
    console.log(`  ${i}. ${s.name} (id=${s.id}${s.position !== undefined ? `, position=${s.position}` : ", no position field - using array order"})`);
  });
  console.log(`  Total stages: ${orderedStages.length}${orderedStages.length !== 8 ? "  [WARNING: brief expects 8 stages]" : ""}\n`);

  // 3. Opportunities for default range
  console.log(`--- Opportunities (${DEFAULT_REPORT_RANGE.start} to ${DEFAULT_REPORT_RANGE.endExclusive} exclusive, TZ=${env.REPORT_TIMEZONE}) ---`);
  const utcRange = toUtcInstantRange(DEFAULT_REPORT_RANGE, env.REPORT_TIMEZONE);
  console.log(`  UTC instant range: ${utcRange.startIso} .. ${utcRange.endIsoExclusive} (exclusive)`);

  let opportunities;
  try {
    opportunities = await getAllOpportunities(targetPipeline.id, utcRange);
  } catch (err) {
    console.error("[FAIL] Could not fetch opportunities:", (err as Error).message);
    process.exitCode = 1;
    return;
  }
  console.log(`[OK] Retrieved ${opportunities.length} opportunity record(s) across pagination.`);
  if (opportunities.length > 0) {
    console.log(`  Sample opportunity object keys: [${keysOf(opportunities[0]).join(", ")}]`);
    const withSource = opportunities.filter((o) => o.source && o.source.trim() !== "").length;
    const withStageChangeTs = opportunities.filter((o) => o.lastStageChangeAt).length;
    const withStatusChangeTs = opportunities.filter((o) => o.lastStatusChangeAt).length;
    console.log(`  Opportunities with a non-blank 'source': ${withSource}/${opportunities.length}`);
    console.log(`  Opportunities with 'lastStageChangeAt' present: ${withStageChangeTs}/${opportunities.length}`);
    console.log(`  Opportunities with 'lastStatusChangeAt' present: ${withStatusChangeTs}/${opportunities.length}`);
    const statuses = new Set(opportunities.map((o) => o.status ?? "(none)"));
    console.log(`  Distinct 'status' values seen: ${[...statuses].join(", ")}`);

    // Which stage-id field actually matches the pipeline's stage list?
    const stageIds = new Set(orderedStages.map((s) => s.id));
    const first = opportunities[0] as unknown as Record<string, unknown>;
    const matchesPipelineStageId = opportunities.filter((o) =>
      stageIds.has((o as unknown as Record<string, unknown>).pipelineStageId as string),
    ).length;
    const matchesPipelineStageUId = opportunities.filter((o) =>
      stageIds.has((o as unknown as Record<string, unknown>).pipelineStageUId as string),
    ).length;
    console.log(`  'pipelineStageId' matches a known pipeline stage id: ${matchesPipelineStageId}/${opportunities.length}`);
    console.log(`  'pipelineStageUId' matches a known pipeline stage id: ${matchesPipelineStageUId}/${opportunities.length}`);

    // Does the embedded contact sub-object include tags (would avoid a separate contact fetch)?
    const embeddedContact = first.contact;
    console.log(`  Embedded opportunity.contact keys (first record): [${keysOf(embeddedContact).join(", ")}]`);

    // Attribution object shape, if present.
    console.log(`  opportunity.attributions keys (first record): [${keysOf(first.attributions).join(", ")}]`);
    if (Array.isArray(first.attributions) && first.attributions.length > 0) {
      console.log(`  opportunity.attributions[0] keys: [${keysOf(first.attributions[0]).join(", ")}]`);
    }

    // Did the API actually date-filter, or did we get everything regardless of range?
    const createdDates = opportunities
      .map((o) => o.createdAt)
      .filter((d): d is string => Boolean(d))
      .sort();
    if (createdDates.length > 0) {
      console.log(`  createdAt range across returned records: ${createdDates[0]} .. ${createdDates[createdDates.length - 1]}`);
      const inRange = opportunities.filter(
        (o) => o.createdAt && o.createdAt >= utcRange.startIso && o.createdAt < utcRange.endIsoExclusive,
      ).length;
      console.log(`  Records with createdAt inside the requested window: ${inRange}/${opportunities.length}`);
    }

    // Monetary value sanity.
    const invalidMoney = opportunities.filter((o) => {
      const v = o.monetaryValue;
      return v === null || v === undefined || (typeof v === "string" && Number.isNaN(Number(v)));
    }).length;
    console.log(`  Opportunities with missing/invalid monetaryValue: ${invalidMoney}/${opportunities.length}`);

    const distinctOppSources = new Set(opportunities.map((o) => (o.source ?? "").trim() || "(blank)"));
    console.log(`  Distinct opportunity 'source' values: [${[...distinctOppSources].sort().join(", ")}]`);
  }
  console.log();

  // 4. Contacts
  console.log("--- Contacts (mapped by ID) ---");
  const contactIds = opportunities.map((o) => o.contactId).filter((id): id is string => Boolean(id));
  let contactMap;
  try {
    contactMap = await getContactsByIds(contactIds);
  } catch (err) {
    console.error("[FAIL] Could not fetch contacts:", (err as Error).message);
    console.error("       Likely cause: missing 'View Contacts' scope.");
    process.exitCode = 1;
    return;
  }
  console.log(`[OK] Sampled ${contactMap.size} contact(s) (of ${contactIds.length} unique contact IDs referenced).`);
  const firstContact = [...contactMap.values()][0];
  if (firstContact) {
    console.log(`  Sample contact object keys: [${keysOf(firstContact).join(", ")}]`);
    const withTags = [...contactMap.values()].filter((c) => c.tags && c.tags.length > 0).length;
    console.log(`  Sampled contacts with a non-empty 'tags' array: ${withTags}/${contactMap.size}`);

    // Tag *values* are internal CRM labels, not personal data - safe to enumerate to
    // validate our exclusion-tag matching against what's really in the data.
    const distinctTags = new Set<string>();
    for (const c of contactMap.values()) {
      for (const t of c.tags ?? []) distinctTags.add(t.toLowerCase().trim());
    }
    console.log(`  Distinct tags seen across sample (lowercased): [${[...distinctTags].sort().join(", ")}]`);

    const distinctSources = new Set<string>();
    for (const c of contactMap.values()) {
      distinctSources.add((c.source ?? "(blank)").trim() || "(blank)");
    }
    console.log(`  Distinct contact 'source' values across sample: [${[...distinctSources].sort().join(", ")}]`);
  }

  console.log("\n=== Diagnostic complete ===");
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exitCode = 1;
});

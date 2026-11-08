import assert from "node:assert/strict";
import { test } from "node:test";
import { BusinessError } from "../types/business";
import {
  checkIsActiveMember,
  checkIsOwner,
  chooseActiveMembership,
} from "./membership-rules";
import { now, owner, ownerMembership } from "../testing/sample-data";

function hasCode(code: string) {
  return (error: unknown) =>
    error instanceof BusinessError && error.code === code;
}

test("permissions reject removed members, other users, other businesses, and staff acting as owner", () => {
  for (const candidate of [
    null,
    { ...ownerMembership, removedAt: now.toISOString() },
    { ...ownerMembership, userId: "other" },
    { ...ownerMembership, businessId: "other" },
  ]) {
    assert.throws(
      () => checkIsActiveMember(candidate, owner, "business"),
      hasCode("not_member"),
    );
  }
  assert.throws(
    () => checkIsOwner({ ...ownerMembership, role: "STAFF" }, owner, "business"),
    hasCode("owner_required"),
  );
});

test("a forged selection never grants membership and removed rows are not selected", () => {
  assert.equal(chooseActiveMembership([], "foreign-business"), null);
  assert.equal(
    chooseActiveMembership(
      [{ ...ownerMembership, removedAt: now.toISOString() }],
      "business",
    ),
    null,
  );
  assert.equal(
    chooseActiveMembership([ownerMembership], "foreign-business")?.businessId,
    "business",
  );
});

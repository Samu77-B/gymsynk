import type { memberProfiles, memberships, users } from "@/db/schema";

type ProfileRow = typeof memberProfiles.$inferSelect;
type UserRow = typeof users.$inferSelect;
type MembershipRow = typeof memberships.$inferSelect & {
  plan?: { id: string; name: string; slug: string } | null;
};

export const parqStatusOptions = [
  { value: "not_started", label: "Not started" },
  { value: "cleared", label: "Cleared / OK to exercise" },
  { value: "doctor_required", label: "Doctor clearance required" },
  { value: "declined", label: "Declined / not cleared" },
] as const;

export function emptyProfileDefaults() {
  return {
    legalName: "",
    dateOfBirth: null as string | null,
    addressLine1: "",
    addressLine2: "",
    city: "",
    county: "",
    postcode: "",
    country: "United Kingdom",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    parqStatus: "not_started" as const,
    medicalNotes: "",
    accessCardId: "",
    memberPhotoUrl: "",
    billingSameAsHome: true,
    billingAddressLine1: "",
    billingAddressLine2: "",
    billingCity: "",
    billingPostcode: "",
    billingCountry: "",
    joiningFeePaid: false,
    joiningFeeAmount: "",
    joiningFeePaidAt: null as string | null,
    waiverSignedAt: null as string | null,
    termsAcceptedAt: null as string | null,
    paymentMethodNote: "",
  };
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function formatDateTime(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function serializeMemberProfile(profile: ProfileRow | null | undefined) {
  if (!profile) {
    return emptyProfileDefaults();
  }

  return {
    legalName: profile.legalName ?? "",
    dateOfBirth: formatDate(profile.dateOfBirth),
    addressLine1: profile.addressLine1 ?? "",
    addressLine2: profile.addressLine2 ?? "",
    city: profile.city ?? "",
    county: profile.county ?? "",
    postcode: profile.postcode ?? "",
    country: profile.country ?? "United Kingdom",
    emergencyContactName: profile.emergencyContactName ?? "",
    emergencyContactRelationship: profile.emergencyContactRelationship ?? "",
    emergencyContactPhone: profile.emergencyContactPhone ?? "",
    parqStatus: profile.parqStatus,
    medicalNotes: profile.medicalNotes ?? "",
    accessCardId: profile.accessCardId ?? "",
    memberPhotoUrl: profile.memberPhotoUrl ?? "",
    billingSameAsHome: profile.billingSameAsHome,
    billingAddressLine1: profile.billingAddressLine1 ?? "",
    billingAddressLine2: profile.billingAddressLine2 ?? "",
    billingCity: profile.billingCity ?? "",
    billingPostcode: profile.billingPostcode ?? "",
    billingCountry: profile.billingCountry ?? "",
    joiningFeePaid: profile.joiningFeePaid,
    joiningFeeAmount: profile.joiningFeeAmount ?? "",
    joiningFeePaidAt: formatDateTime(profile.joiningFeePaidAt),
    waiverSignedAt: formatDateTime(profile.waiverSignedAt),
    termsAcceptedAt: formatDateTime(profile.termsAcceptedAt),
    paymentMethodNote: profile.paymentMethodNote ?? "",
  };
}

export function serializeMemberListItem(
  user: UserRow,
  profile: ProfileRow | null | undefined,
  membership: {
    membership: MembershipRow;
    isPrimary: boolean;
  } | null,
) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    isActive: user.isActive,
    profile: serializeMemberProfile(profile),
    membership: membership
      ? {
          id: membership.membership.id,
          planName: membership.membership.plan?.name ?? "Unknown",
          status: membership.membership.status,
          isPrimary: membership.isPrimary,
          startDate: formatDateTime(membership.membership.startDate),
          contractEndDate: formatDateTime(membership.membership.contractEndDate),
          trialEndsAt: formatDateTime(membership.membership.trialEndsAt),
        }
      : null,
    profileComplete: calculateProfileCompleteness(
      serializeMemberProfile(profile),
    ),
  };
}

export function calculateProfileCompleteness(
  profile: ReturnType<typeof serializeMemberProfile>,
) {
  const checks = [
    Boolean(profile.legalName),
    Boolean(profile.dateOfBirth),
    Boolean(profile.addressLine1),
    Boolean(profile.postcode),
    Boolean(profile.emergencyContactName),
    Boolean(profile.emergencyContactPhone),
    profile.parqStatus !== "not_started",
    Boolean(profile.memberPhotoUrl),
    Boolean(profile.waiverSignedAt),
    Boolean(profile.termsAcceptedAt),
  ];

  return Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );
}

export type MemberProfilePayload = Omit<
  ReturnType<typeof serializeMemberProfile>,
  "joiningFeeAmount" | "medicalNotes"
> & {
  joiningFeeAmount: string | null;
  medicalNotes: string | null;
};

export function profileToDbValues(data: MemberProfilePayload) {
  return {
    legalName: data.legalName || null,
    dateOfBirth: data.dateOfBirth || null,
    addressLine1: data.addressLine1 || null,
    addressLine2: data.addressLine2 || null,
    city: data.city || null,
    county: data.county || null,
    postcode: data.postcode || null,
    country: data.country || null,
    emergencyContactName: data.emergencyContactName || null,
    emergencyContactRelationship: data.emergencyContactRelationship || null,
    emergencyContactPhone: data.emergencyContactPhone || null,
    parqStatus: data.parqStatus,
    medicalNotes: data.medicalNotes || null,
    accessCardId: data.accessCardId || null,
    memberPhotoUrl: data.memberPhotoUrl || null,
    billingSameAsHome: data.billingSameAsHome,
    billingAddressLine1: data.billingAddressLine1 || null,
    billingAddressLine2: data.billingAddressLine2 || null,
    billingCity: data.billingCity || null,
    billingPostcode: data.billingPostcode || null,
    billingCountry: data.billingCountry || null,
    joiningFeePaid: data.joiningFeePaid,
    joiningFeeAmount: data.joiningFeeAmount || null,
    joiningFeePaidAt: data.joiningFeePaidAt
      ? new Date(data.joiningFeePaidAt)
      : null,
    waiverSignedAt: data.waiverSignedAt ? new Date(data.waiverSignedAt) : null,
    termsAcceptedAt: data.termsAcceptedAt
      ? new Date(data.termsAcceptedAt)
      : null,
    paymentMethodNote: data.paymentMethodNote || null,
    updatedAt: new Date(),
  };
}

import { relations } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "admin",
  "trainer",
  "member",
]);

export const scheduleStatusEnum = pgEnum("schedule_status", [
  "scheduled",
  "completed",
  "cancelled",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "confirmed",
  "waitlisted",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "refunded",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "trialing",
  "active",
  "past_due",
  "cancelled",
  "incomplete",
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    role: userRoleEnum("role").notNull(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    bio: text("bio"),
    photoUrl1: varchar("photo_url_1", { length: 2048 }),
    photoUrl2: varchar("photo_url_2", { length: 2048 }),
    photoUrl3: varchar("photo_url_3", { length: 2048 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("users_tenant_email_idx").on(table.tenantId, table.email),
  ],
);

export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  capacity: integer("capacity").notNull().default(15),
  durationMinutes: integer("duration_minutes").notNull().default(45),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0.00"),
});

export const classSchedules = pgTable("class_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  trainerId: uuid("trainer_id").references(() => users.id, {
    onDelete: "set null",
  }),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  status: scheduleStatusEnum("status").notNull().default("scheduled"),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  scheduleId: uuid("schedule_id")
    .notNull()
    .references(() => classSchedules.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bookingStatus: bookingStatusEnum("booking_status")
    .notNull()
    .default("confirmed"),
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("pending"),
  paysynkTransactionId: varchar("paysynk_transaction_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const staffShifts = pgTable(
  "staff_shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shiftStart: timestamp("shift_start", { withTimezone: true }).notNull(),
    shiftEnd: timestamp("shift_end", { withTimezone: true }).notNull(),
    roleAssigned: varchar("role_assigned", { length: 100 }),
    notes: text("notes"),
  },
  () => [
    check(
      "staff_shifts_end_after_start",
      sql`shift_end > shift_start`,
    ),
  ],
);

export const membershipPlans = pgTable(
  "membership_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    maxMembers: integer("max_members").notNull().default(1),
    priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }).notNull(),
    trialDays: integer("trial_days").notNull().default(30),
    stripePriceId: varchar("stripe_price_id", { length: 255 }),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("membership_plans_tenant_slug_idx").on(
      table.tenantId,
      table.slug,
    ),
  ],
);

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => membershipPlans.id, { onDelete: "restrict" }),
  primaryUserId: uuid("primary_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 })
    .notNull()
    .unique(),
  status: membershipStatusEnum("status").notNull().default("incomplete"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const membershipMembers = pgTable(
  "membership_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("membership_members_membership_user_idx").on(
      table.membershipId,
      table.userId,
    ),
  ],
);

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  classes: many(classes),
  schedules: many(classSchedules),
  bookings: many(bookings),
  shifts: many(staffShifts),
  membershipPlans: many(membershipPlans),
  memberships: many(memberships),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  schedules: many(classSchedules),
  bookings: many(bookings),
  shifts: many(staffShifts),
  primaryMemberships: many(memberships),
  membershipLinks: many(membershipMembers),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [classes.tenantId],
    references: [tenants.id],
  }),
  schedules: many(classSchedules),
}));

export const classSchedulesRelations = relations(
  classSchedules,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [classSchedules.tenantId],
      references: [tenants.id],
    }),
    class: one(classes, {
      fields: [classSchedules.classId],
      references: [classes.id],
    }),
    trainer: one(users, {
      fields: [classSchedules.trainerId],
      references: [users.id],
    }),
    bookings: many(bookings),
  }),
);

export const bookingsRelations = relations(bookings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [bookings.tenantId],
    references: [tenants.id],
  }),
  schedule: one(classSchedules, {
    fields: [bookings.scheduleId],
    references: [classSchedules.id],
  }),
  member: one(users, {
    fields: [bookings.memberId],
    references: [users.id],
  }),
}));

export const staffShiftsRelations = relations(staffShifts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [staffShifts.tenantId],
    references: [tenants.id],
  }),
  staff: one(users, {
    fields: [staffShifts.staffId],
    references: [users.id],
  }),
}));

export const membershipPlansRelations = relations(
  membershipPlans,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [membershipPlans.tenantId],
      references: [tenants.id],
    }),
    memberships: many(memberships),
  }),
);

export const membershipsRelations = relations(
  memberships,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [memberships.tenantId],
      references: [tenants.id],
    }),
    plan: one(membershipPlans, {
      fields: [memberships.planId],
      references: [membershipPlans.id],
    }),
    primaryUser: one(users, {
      fields: [memberships.primaryUserId],
      references: [users.id],
    }),
    members: many(membershipMembers),
  }),
);

export const membershipMembersRelations = relations(
  membershipMembers,
  ({ one }) => ({
    membership: one(memberships, {
      fields: [membershipMembers.membershipId],
      references: [memberships.id],
    }),
    user: one(users, {
      fields: [membershipMembers.userId],
      references: [users.id],
    }),
  }),
);

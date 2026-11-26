import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  /** 邮箱注册用户的密码哈希（scrypt，格式 salt:hash）；Kimi OAuth 用户为 null */
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: varchar("role", { length: 16 }).default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** 每个用户一份书签桌面完整状态（AppState JSON），整包读写 */
export const userStates = pgTable("user_states", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  state: jsonb("state").notNull(),
  revision: integer("revision").default(0).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type UserState = typeof userStates.$inferSelect;

export const articles = pgTable('articles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: integer('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description').notNull().default(''),
  cover: text('cover').notNull().default(''),
  note: text('note').notNull().default(''),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  read: boolean('read').notNull().default(false),
  starred: boolean('starred').notNull().default(false),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex('articles_user_url_unique').on(table.userId, table.url)]);

/** Only hashes of extension credentials are persisted. */
export const extensionCodes = pgTable("extension_codes", {
  codeHash: varchar("codeHash", { length: 64 }).primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  challenge: varchar("challenge", { length: 43 }).notNull(),
  redirectUri: text("redirectUri").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
});

export const extensionSessions = pgTable("extension_sessions", {
  tokenHash: varchar("tokenHash", { length: 64 }).primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
});

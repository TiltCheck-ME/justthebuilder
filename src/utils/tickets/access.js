import { loadGuildConfig, saveGuildConfig } from "../storage/guildConfig.js";

export const TICKET_SUPPORT_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

function isOwnerGuild(guild) {
  const ownerId = process.env.BOT_OWNER_ID;
  return Boolean(ownerId && guild?.ownerId === ownerId);
}

/** When ticket support ends for a guild (ms), or null if never granted. */
export function ticketSupportUntil(guildId) {
  const cfg = loadGuildConfig(guildId);
  if (cfg.ticketsUntil) return Date.parse(cfg.ticketsUntil);
  if (cfg.polishAppliedAt) return Date.parse(cfg.polishAppliedAt) + TICKET_SUPPORT_DAYS * DAY_MS;
  return null;
}

/**
 * Tickets are included for 3 months with the $0.99 unlock.
 * The bot owner's own servers are always on.
 */
export function ticketAccess(guild) {
  if (isOwnerGuild(guild)) return { allowed: true, reason: "owner", until: null };
  const until = ticketSupportUntil(guild.id);
  if (until && until > Date.now()) return { allowed: true, reason: "included", until };
  return { allowed: false, reason: until ? "expired" : "none", until };
}

/** Start (or extend) 3 months of ticket support, e.g. on a $0.99 unlock. */
export function grantTicketSupport(guildId, days = TICKET_SUPPORT_DAYS) {
  const cfg = loadGuildConfig(guildId);
  const current = cfg.ticketsUntil ? Date.parse(cfg.ticketsUntil) : 0;
  const base = Math.max(current, Date.now());
  const ticketsUntil = new Date(base + days * DAY_MS).toISOString();
  saveGuildConfig(guildId, { ...cfg, ticketsUntil });
  return ticketsUntil;
}

export function ticketDeniedMessage(access) {
  return access.reason === "expired"
    ? "🎟️ Ticket support on this server ran out. Server owner: a monthly support plan is coming soon."
    : "🎟️ Tickets come with the $0.99 full unlock (3 months included). Server owner: run `/setup unlock`.";
}

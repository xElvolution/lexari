/**
 * Agent payment cards. Each agent gets its own card, paid from your Lexari balance.
 * Cards come from the server's issuer (server/cards/issuer.ts). Today that is the devnet TEST issuer,
 * so the card number cannot be used anywhere real. A real issuer plugs in on the server only.
 */
export const CARD_LIMITS = [100, 250, 500, 1000];
export const CARD_TEST_NOTE = "A Tempo card: your agent pays merchants in stablecoins on Tempo, inside the limits you set. Every payment waits for your Confirm.";

/**
 * pokemontcg.service.ts
 *
 * Previously called the remote PokéTCG API. Now delegates entirely to the
 * local card_catalog SQLite table populated by catalog.service.ts.
 * Public interface is unchanged so scan.ts requires no modifications.
 */
import {
  catalogRowToCardData,
  searchCatalog,
  type CatalogRow,
} from "./catalog.service";
import type { Card } from "../types";

// Re-export as PokemonTCGCard so existing imports in scan.ts continue to work
export type PokemonTCGCard = CatalogRow;

/**
 * Searches the local catalog for a card by name, set and number.
 * Returns null if the catalog is empty or no match is found.
 */
export async function searchCard(
  name: string,
  set?: string,
  number?: string,
): Promise<PokemonTCGCard | null> {
  return searchCatalog(name, set, number);
}

/**
 * Converts a catalog entry to the internal Card data format.
 */
export function mapToCard(
  apiCard: PokemonTCGCard,
): Omit<Card, "quantity" | "isDuplicate" | "addedAt" | "updatedAt"> {
  return catalogRowToCardData(apiCard);
}


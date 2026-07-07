import type { Card, CardRow, ScanSession, ScanSessionRow } from "../types";

export function rowToCard(row: CardRow): Card {
  return {
    id: row.id,
    name: row.name,
    supertype: row.supertype as Card["supertype"],
    subtypes: JSON.parse(row.subtypes) as string[],
    hp: row.hp !== null ? row.hp : undefined,
    types: JSON.parse(row.types) as string[],
    evolvesFrom: row.evolves_from !== null ? row.evolves_from : undefined,
    attacks: JSON.parse(row.attacks) as Card["attacks"],
    weaknesses: JSON.parse(row.weaknesses) as Card["weaknesses"],
    setId: row.set_id,
    setName: row.set_name,
    number: row.number,
    rarity: row.rarity !== null ? row.rarity : undefined,
    imageUrl: row.image_url !== null ? row.image_url : undefined,
    imageUrlHires:
      row.image_url_hires !== null ? row.image_url_hires : undefined,
    quantity: row.quantity,
    isDuplicate: row.is_duplicate === 1,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  };
}

export function rowToSession(row: ScanSessionRow): ScanSession {
  return {
    id: row.id,
    createdAt: row.created_at,
    cardCount: row.card_count,
    identifiedCards: JSON.parse(row.identified_cards) as string[],
    candidates: JSON.parse(row.candidates ?? "[]") as ScanSession["candidates"],
    status: row.status as ScanSession["status"],
    errorMessage: row.error_message !== null ? row.error_message : undefined,
  };
}

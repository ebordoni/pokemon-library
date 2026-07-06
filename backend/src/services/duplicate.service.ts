import { getDb } from "../db/schema";
import type { Card } from "../types";

type NewCardData = Omit<
  Card,
  "quantity" | "isDuplicate" | "addedAt" | "updatedAt"
>;

/**
 * Inserts a new card or increments its quantity if it already exists.
 * Returns true when the card was already in the collection (duplicate).
 */
export function upsertCard(cardData: NewCardData): boolean {
  const db = getDb();

  const existing = db
    .prepare("SELECT quantity FROM cards WHERE id = ?")
    .get(cardData.id) as { quantity: number } | undefined;

  if (existing) {
    const newQty = existing.quantity + 1;
    db.prepare(
      "UPDATE cards SET quantity = ?, is_duplicate = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(newQty, cardData.id);
    return true;
  }

  db.prepare(
    `
    INSERT INTO cards (
      id, name, supertype, subtypes, hp, types, evolves_from,
      attacks, weaknesses, set_id, set_name, number, rarity,
      image_url, image_url_hires, quantity, is_duplicate
    ) VALUES (
      @id, @name, @supertype, @subtypes, @hp, @types, @evolvesFrom,
      @attacks, @weaknesses, @setId, @setName, @number, @rarity,
      @imageUrl, @imageUrlHires, 1, 0
    )
  `,
  ).run({
    id: cardData.id,
    name: cardData.name,
    supertype: cardData.supertype,
    subtypes: JSON.stringify(cardData.subtypes),
    hp: cardData.hp ?? null,
    types: JSON.stringify(cardData.types),
    evolvesFrom: cardData.evolvesFrom ?? null,
    attacks: JSON.stringify(cardData.attacks),
    weaknesses: JSON.stringify(cardData.weaknesses),
    setId: cardData.setId,
    setName: cardData.setName,
    number: cardData.number,
    rarity: cardData.rarity ?? null,
    imageUrl: cardData.imageUrl ?? null,
    imageUrlHires: cardData.imageUrlHires ?? null,
  });

  return false;
}

/**
 * Removes one copy of a card. If quantity reaches 0, deletes the row.
 * Returns the remaining quantity (-1 if card not found).
 */
export function decrementOrRemoveCard(id: string): number {
  const db = getDb();
  const row = db.prepare("SELECT quantity FROM cards WHERE id = ?").get(id) as
    | { quantity: number }
    | undefined;

  if (!row) return -1;

  if (row.quantity <= 1) {
    db.prepare("DELETE FROM cards WHERE id = ?").run(id);
    return 0;
  }

  const newQty = row.quantity - 1;
  db.prepare(
    "UPDATE cards SET quantity = ?, is_duplicate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).run(newQty, newQty > 1 ? 1 : 0, id);

  return newQty;
}

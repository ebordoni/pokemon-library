import { Request, Response, Router } from "express";
import { getCatalogStatus, seedCatalog } from "../services/catalog.service";

const router = Router();

// GET /api/catalog — catalog status and card count
router.get("/", (_req: Request, res: Response) => {
  res.json(getCatalogStatus());
});

// POST /api/catalog/update — trigger a full catalog re-seed in the background
router.post("/update", (_req: Request, res: Response) => {
  const status = getCatalogStatus();

  if (status.isSeeding) {
    res.status(409).json({
      message: "Catalog seeding already in progress",
      progress: status.seedingProgress,
    });
    return;
  }

  void seedCatalog();
  res
    .status(202)
    .json({
      message:
        "Catalog update started in background. Check GET /api/catalog for progress.",
    });
});

export default router;

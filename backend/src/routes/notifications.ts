import { Router, Response } from "express";
import { prisma } from "../lib/db";
import { authenticateJWT, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/notifications — unread notifications for the caller
router.get("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { address: req.user!.address },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/notifications/read-all — mark all as read
router.post("/read-all", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { address: req.user!.address, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

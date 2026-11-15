import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiHandler from "./api/index.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers for API routes
  app.use(express.json());
  app.use(express.text({ type: "text/plain" }));

  // API route mapping
  app.all("/api", async (req, res, next) => {
    try {
      await apiHandler(req, res);
    } catch (err) {
      next(err);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

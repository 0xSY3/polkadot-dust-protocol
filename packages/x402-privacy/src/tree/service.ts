import type { TreeIndexer } from "./indexer";

type Request = { params: Record<string, string> };
type Response = {
  json: (data: unknown) => void;
  status: (code: number) => Response;
};
type Router = {
  get: (
    path: string,
    handler: (req: Request, res: Response) => Promise<void>,
  ) => void;
};

export interface TreeServiceDeps {
  indexer: TreeIndexer;
  createRouter: () => Router;
}

export function createTreeRouter(deps: TreeServiceDeps): Router {
  const { indexer, createRouter } = deps;
  const router = createRouter();

  router.get("/root", async (_req, res) => {
    res.json({
      root: indexer.root.toString(),
      leafCount: indexer.leafCount,
    });
  });

  router.get("/path/:leafIndex", async (req, res) => {
    const leafIndex = parseInt(req.params.leafIndex, 10);
    if (isNaN(leafIndex) || leafIndex < 0) {
      res.status(400).json({ error: "Invalid leaf index" });
      return;
    }
    try {
      const proof = await indexer.getProof(leafIndex);
      res.json({
        root: proof.root.toString(),
        pathElements: proof.pathElements.map(String),
        pathIndices: proof.pathIndices,
        leafIndex,
      });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  router.get("/commitment/:hash", async (req, res) => {
    const leafIndex = indexer.lookupCommitment(req.params.hash);
    res.json({
      exists: leafIndex !== undefined,
      leafIndex,
    });
  });

  return router;
}

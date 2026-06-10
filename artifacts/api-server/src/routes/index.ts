import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import filtersRouter from "./filters";
import cartridgesRouter from "./cartridges";
import replaceAllRouter from "./replace-all";
import historyRouter from "./history";
import settingsRouter from "./settings";
import bannersRouter from "./banners";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/filters", filtersRouter);
router.use("/filters/:filterId/cartridges", cartridgesRouter);
router.use("/filters/:filterId/replace-all", replaceAllRouter);
router.use("/filters", historyRouter);
router.use("/history", historyRouter);
router.use("/settings", settingsRouter);
router.use(bannersRouter);

export default router;

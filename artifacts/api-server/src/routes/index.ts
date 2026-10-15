import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mizanRouter from "./mizan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mizanRouter);

export default router;

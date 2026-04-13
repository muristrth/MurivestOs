import { Router, type IRouter } from "express";
import healthRouter from "./health";
import murivestRouter from "./murivest";
import storageRouter from "./storage";
import academyRouter from "./academy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(murivestRouter);
router.use(academyRouter);

export default router;

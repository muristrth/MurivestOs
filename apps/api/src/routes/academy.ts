import { getAuth } from "@clerk/express";
import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { eq, and, asc, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@murivest/db";
import {
  academyCoursesTable,
  academyLearningPathsTable,
  academyEnrollmentsTable,
  academyCertificationsTable,
  usersTable,
} from "@murivest/db";

const router: IRouter = Router();

const requireAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = userId;
  next();
};

const requireDb = (_req: Request, res: Response, next: NextFunction) => {
  if (!db) {
    res.status(503).json({
      error: "Database not configured",
      message:
        "DATABASE_URL environment variable is not set. Please configure a database connection to enable academy operations.",
      status: "database_unavailable",
    });
    return;
  }
  next();
};

router.use(requireAuthenticated);
router.use(requireDb);

const CourseBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  type: z.enum(["video", "pdf", "document", "assessment"]),
  format: z.enum(["online", "live", "hybrid"]).default("online"),
  contentUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  durationMinutes: z.number().int().positive().optional(),
  orderIndex: z.number().int().default(0),
  targetAudience: z.string().optional(),
  prerequisites: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isPublished: z.boolean().default(false),
});

const LearningPathBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  courseIds: z.array(z.string()).default([]),
  targetRoles: z.array(z.string()).default([]),
  targetDepartments: z.array(z.string()).default([]),
  estimatedHours: z.number().positive().optional(),
  isActive: z.boolean().default(true),
});

const EnrollmentBody = z.object({
  courseId: z.string().uuid(),
  status: z
    .enum(["not_started", "in_progress", "completed", "failed"])
    .default("not_started"),
  progressPercent: z.number().int().min(0).max(100).default(0),
  score: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().datetime().optional(),
});

const ProgressUpdateBody = z.object({
  status: z
    .enum(["not_started", "in_progress", "completed", "failed"])
    .optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  score: z.number().int().min(0).max(100).optional(),
});

router.get("/academy/courses", async (_req, res) => {
  const courses = await db
    .select()
    .from(academyCoursesTable)
    .where(eq(academyCoursesTable.isPublished, true))
    .orderBy(asc(academyCoursesTable.orderIndex));
  res.json(courses);
});

router.get("/academy/courses/admin", async (_req, res) => {
  const courses = await db
    .select()
    .from(academyCoursesTable)
    .orderBy(asc(academyCoursesTable.orderIndex));
  res.json(courses);
});

router.get("/academy/courses/:id", async (req, res) => {
  const [course] = await db
    .select()
    .from(academyCoursesTable)
    .where(eq(academyCoursesTable.id, req.params.id));
  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }
  res.json(course);
});

router.post("/academy/courses", async (req, res) => {
  try {
    const input = CourseBody.parse(req.body);
    const [created] = await db
      .insert(academyCoursesTable)
      .values({
        ...input,
        contentUrl: input.contentUrl,
        thumbnailUrl: input.thumbnailUrl,
        prerequisites: JSON.stringify(input.prerequisites),
        learningObjectives: JSON.stringify(input.learningObjectives),
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error("Course create error:", err);
    res.status(400).json({ error: String(err) });
  }
});

router.patch("/academy/courses/:id", async (req, res) => {
  try {
    const input = CourseBody.partial().parse(req.body);
    const values: Record<string, unknown> = { ...input };
    if (input.prerequisites)
      values.prerequisites = JSON.stringify(input.prerequisites);
    if (input.learningObjectives)
      values.learningObjectives = JSON.stringify(input.learningObjectives);

    const [updated] = await db
      .update(academyCoursesTable)
      .set(values)
      .where(eq(academyCoursesTable.id, req.params.id))
      .returning();
    if (!updated) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.delete("/academy/courses/:id", async (req, res) => {
  const [deleted] = await db
    .delete(academyCoursesTable)
    .where(eq(academyCoursesTable.id, req.params.id))
    .returning();
  if (!deleted) {
    return res.status(404).json({ error: "Course not found" });
  }
  res.json(deleted);
});

router.get("/academy/learning-paths", async (_req, res) => {
  const paths = await db
    .select()
    .from(academyLearningPathsTable)
    .where(eq(academyLearningPathsTable.isActive, true));
  res.json(paths);
});

router.get("/academy/learning-paths/:id", async (req, res) => {
  const [path] = await db
    .select()
    .from(academyLearningPathsTable)
    .where(eq(academyLearningPathsTable.id, req.params.id));
  if (!path) {
    return res.status(404).json({ error: "Learning path not found" });
  }
  res.json(path);
});

router.post("/academy/learning-paths", async (req, res) => {
  try {
    const input = LearningPathBody.parse(req.body);
    const [created] = await db
      .insert(academyLearningPathsTable)
      .values({
        ...input,
        courseIds: JSON.stringify(input.courseIds),
        targetRoles: JSON.stringify(input.targetRoles),
        targetDepartments: JSON.stringify(input.targetDepartments),
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error("Learning path create error:", err);
    res.status(400).json({ error: String(err) });
  }
});

router.get("/academy/enrollments", async (req, res) => {
  const userId = req.query.userId as string | undefined;
  const courseId = req.query.courseId as string | undefined;

  let conditions = [];
  if (userId) {
    conditions.push(eq(academyEnrollmentsTable.userId, userId));
  }
  if (courseId) {
    conditions.push(eq(academyEnrollmentsTable.courseId, courseId));
  }

  const enrollments = await db
    .select()
    .from(academyEnrollmentsTable)
    .where(conditions.length ? and(...conditions) : undefined);
  res.json(enrollments);
});

router.post("/academy/enrollments", async (req, res) => {
  try {
    const input = EnrollmentBody.parse(req.body);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, req.userId!));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const [enrollment] = await db
      .insert(academyEnrollmentsTable)
      .values({
        userId: user.id,
        courseId: input.courseId,
        status: input.status,
        progressPercent: input.progressPercent,
        score: input.score,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      })
      .onConflictDoUpdate({
        target: [
          academyEnrollmentsTable.userId,
          academyEnrollmentsTable.courseId,
        ],
        set: {
          status: input.status,
          progressPercent: input.progressPercent,
          score: input.score,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.status(201).json(enrollment);
  } catch (err) {
    console.error("Enrollment error:", err);
    res.status(400).json({ error: String(err) });
  }
});

router.patch("/academy/enrollments/:id", async (req, res) => {
  try {
    const input = ProgressUpdateBody.parse(req.body);
    const values: Record<string, unknown> = { ...input };

    if (input.status === "in_progress") {
      values.startedAt = new Date();
    }
    if (input.status === "completed") {
      values.completedAt = new Date();
    }

    const [updated] = await db
      .update(academyEnrollmentsTable)
      .set(values)
      .where(eq(academyEnrollmentsTable.id, req.params.id))
      .returning();
    if (!updated) {
      return res.status(404).json({ error: "Enrollment not found" });
    }
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.get("/academy/certifications", async (req, res) => {
  const userId = req.query.userId as string | undefined;

  let condition;
  if (userId) {
    condition = eq(academyCertificationsTable.userId, userId);
  }

  const certs = await db
    .select()
    .from(academyCertificationsTable)
    .where(condition);
  res.json(certs);
});

router.post("/academy/certifications", async (req, res) => {
  try {
    const input = req.body;
    const {
      userId,
      courseId,
      learningPathId,
      title,
      expiresAt,
      certificateUrl,
    } = input;

    const [certification] = await db
      .insert(academyCertificationsTable)
      .values({
        userId,
        courseId,
        learningPathId,
        title,
        expiresAt,
        certificateUrl,
      })
      .returning();
    res.status(201).json(certification);
  } catch (err) {
    console.error("Certification error:", err);
    res.status(400).json({ error: String(err) });
  }
});

router.get("/academy/dashboard", async (_req, res) => {
  const totalCourses = await db
    .select({ count: sql<number>`count(*)` })
    .from(academyCoursesTable)
    .where(eq(academyCoursesTable.isPublished, true));

  const totalEnrollments = await db
    .select({ count: sql<number>`count(*)` })
    .from(academyEnrollmentsTable);

  const completedEnrollments = await db
    .select({ count: sql<number>`count(*)` })
    .from(academyEnrollmentsTable)
    .where(eq(academyEnrollmentsTable.status, "completed"));

  const totalCertifications = await db
    .select({ count: sql<number>`count(*)` })
    .from(academyCertificationsTable);

  res.json({
    totalCourses: totalCourses[0]?.count || 0,
    totalEnrollments: totalEnrollments[0]?.count || 0,
    completedEnrollments: completedEnrollments[0]?.count || 0,
    totalCertifications: totalCertifications[0]?.count || 0,
  });
});

export default router;

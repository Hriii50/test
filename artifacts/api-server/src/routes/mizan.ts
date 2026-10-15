import { Router, type IRouter, type Request, type Response } from "express";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import {
  CreateBudgetBody,
  CreateBudgetResponse,
  CreateGoalBody,
  CreateGoalResponse,
  CreateOrderBody,
  CreateOrderResponse,
  CreateTransactionBody,
  CreateTransactionResponse,
  DeleteBudgetParams,
  DeleteBudgetResponse,
  DeleteGoalParams,
  DeleteGoalResponse,
  DeleteTransactionParams,
  DeleteTransactionResponse,
  GetCurrentUserResponse,
  GetDashboardResponse,
  GetFinancialAdviceResponse,
  GetProfileResponse,
  ListBudgetsResponse,
  ListGoalsResponse,
  ListOrdersResponse,
  ListTransactionsResponse,
  LoginUserBody,
  LoginUserResponse,
  LogoutUserResponse,
  RegisterUserBody,
  RegisterUserResponse,
  UpdateBudgetBody,
  UpdateBudgetParams,
  UpdateBudgetResponse,
  UpdateGoalBody,
  UpdateGoalParams,
  UpdateGoalResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
  UpdateTransactionBody,
  UpdateTransactionParams,
  UpdateTransactionResponse,
} from "@workspace/api-zod";
import {
  type BudgetDocument,
  type GoalDocument,
  type OrderDocument,
  type TransactionDocument,
  type UserDocument,
  getDatabase,
  publicDocument,
} from "../lib/mongo";
import {
  clearSessionCookie,
  issueSession,
  requireAuth,
  setSessionCookie,
  userIdFrom,
} from "../lib/auth";

const router: IRouter = Router();
type AuthResponse = Response<unknown, { userId: string }>;

function getId(req: Request, schema: { safeParse: (value: unknown) => { success: boolean; data?: { id: string } } }): string | null {
  const parsed = schema.safeParse(req.params);
  if (!parsed.success || !parsed.data || !ObjectId.isValid(parsed.data.id)) return null;
  return parsed.data.id;
}

function dateNow(): string {
  return new Date().toISOString();
}

function monthNow(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthOf(date: string): string {
  return date.slice(0, 7);
}

function dateOnly(date: Date | string): string {
  return typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10);
}

function asUser(document: UserDocument) {
  return {
    id: String(document._id),
    name: document.name,
    email: document.email,
    currency: "KWD" as const,
  };
}

function expenseTotal(transactions: TransactionDocument[]): number {
  return transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
}

function incomeTotal(transactions: TransactionDocument[]): number {
  return transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
}

function parseBody<T>(
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T; error?: { message: string } } },
  body: unknown,
  res: Response,
): T | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success || parsed.data === undefined) {
    res.status(400).json({ error: parsed.error?.message ?? "بيانات غير صالحة" });
    return null;
  }
  return parsed.data;
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const input = parseBody(RegisterUserBody, req.body, res);
  if (!input) return;

  const db = await getDatabase();
  const email = input.email.trim().toLowerCase();
  const existing = await db.collection<UserDocument>("users").findOne({ email });
  if (existing) {
    res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    return;
  }

  const user: UserDocument = {
    _id: new ObjectId(),
    name: input.name.trim(),
    email,
    passwordHash: await bcrypt.hash(input.password, 12),
    currency: "KWD",
    createdAt: dateNow(),
  };
  await db.collection<UserDocument>("users").insertOne(user);
  setSessionCookie(res, await issueSession(String(user._id)));
  res.status(201).json(RegisterUserResponse.parse({ user: asUser(user) }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const input = parseBody(LoginUserBody, req.body, res);
  if (!input) return;

  const db = await getDatabase();
  const user = await db.collection<UserDocument>("users").findOne({
    email: input.email.trim().toLowerCase(),
  });
  const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !valid) {
    res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    return;
  }

  setSessionCookie(res, await issueSession(String(user._id)));
  res.json(LoginUserResponse.parse({ user: asUser(user) }));
});

router.post("/auth/logout", (_req, res): void => {
  clearSessionCookie(res);
  res.json(LogoutUserResponse.parse({ message: "تم تسجيل الخروج" }));
});

router.use(requireAuth);

router.get("/auth/me", async (_req, res: AuthResponse): Promise<void> => {
  const db = await getDatabase();
  const user = await db.collection<UserDocument>("users").findOne({ _id: new ObjectId(userIdFrom(res)) });
  if (!user) {
    clearSessionCookie(res);
    res.status(401).json({ error: "الحساب غير موجود" });
    return;
  }
  res.json(GetCurrentUserResponse.parse(asUser(user)));
});

router.get("/profile", async (_req, res: AuthResponse): Promise<void> => {
  const db = await getDatabase();
  const user = await db.collection<UserDocument>("users").findOne({ _id: new ObjectId(userIdFrom(res)) });
  if (!user) {
    res.status(404).json({ error: "الحساب غير موجود" });
    return;
  }
  res.json(GetProfileResponse.parse(asUser(user)));
});

router.patch("/profile", async (req, res: AuthResponse): Promise<void> => {
  const input = parseBody(UpdateProfileBody, req.body, res);
  if (!input) return;

  const db = await getDatabase();
  const collection = db.collection<UserDocument>("users");
  const email = input.email.trim().toLowerCase();
  const userId = userIdFrom(res);
  const duplicate = await collection.findOne({ email, _id: { $ne: new ObjectId(userId) } });
  if (duplicate) {
    res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    return;
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: { name: input.name.trim(), email } },
    { returnDocument: "after" },
  );
  if (!result) {
    res.status(404).json({ error: "الحساب غير موجود" });
    return;
  }
  res.json(UpdateProfileResponse.parse(asUser(result)));
});

router.get("/transactions", async (_req, res: AuthResponse): Promise<void> => {
  const db = await getDatabase();
  const rows = await db.collection<TransactionDocument>("transactions")
    .find({ userId: userIdFrom(res) })
    .sort({ date: -1, _id: -1 })
    .toArray();
  res.json(ListTransactionsResponse.parse(rows.map(publicDocument)));
});

router.post("/transactions", async (req, res: AuthResponse): Promise<void> => {
  const input = parseBody(CreateTransactionBody, req.body, res);
  if (!input) return;
  const document: TransactionDocument = {
    _id: new ObjectId(),
    userId: userIdFrom(res),
    ...input,
    date: dateOnly(input.date),
    note: input.note ?? null,
    createdAt: dateNow(),
  };
  const db = await getDatabase();
  await db.collection<TransactionDocument>("transactions").insertOne(document);
  res.status(201).json(CreateTransactionResponse.parse(publicDocument(document)));
});

router.patch("/transactions/:id", async (req, res: AuthResponse): Promise<void> => {
  const id = getId(req, UpdateTransactionParams);
  if (!id) {
    res.status(400).json({ error: "معرّف المعاملة غير صالح" });
    return;
  }
  const input = parseBody(UpdateTransactionBody, req.body, res);
  if (!input) return;
  const patch: Partial<TransactionDocument> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.amount !== undefined) patch.amount = input.amount;
  if (input.type !== undefined) patch.type = input.type;
  if (input.category !== undefined) patch.category = input.category;
  if (input.date !== undefined) patch.date = dateOnly(input.date);
  if (input.note !== undefined) patch.note = input.note;
  const db = await getDatabase();
  const result = await db.collection<TransactionDocument>("transactions").findOneAndUpdate(
    { _id: new ObjectId(id), userId: userIdFrom(res) },
    { $set: patch },
    { returnDocument: "after" },
  );
  if (!result) {
    res.status(404).json({ error: "المعاملة غير موجودة" });
    return;
  }
  res.json(UpdateTransactionResponse.parse(publicDocument(result)));
});

router.delete("/transactions/:id", async (req, res: AuthResponse): Promise<void> => {
  const id = getId(req, DeleteTransactionParams);
  if (!id) {
    res.status(400).json({ error: "معرّف المعاملة غير صالح" });
    return;
  }
  const db = await getDatabase();
  const result = await db.collection<TransactionDocument>("transactions")
    .deleteOne({ _id: new ObjectId(id), userId: userIdFrom(res) });
  if (!result.deletedCount) {
    res.status(404).json({ error: "المعاملة غير موجودة" });
    return;
  }
  res.json(DeleteTransactionResponse.parse({ message: "تم حذف المعاملة" }));
});

router.get("/budgets", async (_req, res: AuthResponse): Promise<void> => {
  const db = await getDatabase();
  const userId = userIdFrom(res);
  const month = monthNow();
  const [budgets, transactions] = await Promise.all([
    db.collection<BudgetDocument>("budgets").find({ userId }).toArray(),
    db.collection<TransactionDocument>("transactions").find({ userId, type: "expense" }).toArray(),
  ]);
  const result = budgets.map((budget) => ({
    ...publicDocument(budget),
    spent: transactions
      .filter((transaction) => transaction.category === budget.category && monthOf(transaction.date) === (budget.month || month))
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  }));
  res.json(ListBudgetsResponse.parse(result));
});

router.post("/budgets", async (req, res: AuthResponse): Promise<void> => {
  const input = parseBody(CreateBudgetBody, req.body, res);
  if (!input) return;
  const document: BudgetDocument = { _id: new ObjectId(), userId: userIdFrom(res), ...input };
  const db = await getDatabase();
  await db.collection<BudgetDocument>("budgets").insertOne(document);
  res.status(201).json(CreateBudgetResponse.parse({ ...publicDocument(document), spent: 0 }));
});

router.patch("/budgets/:id", async (req, res: AuthResponse): Promise<void> => {
  const id = getId(req, UpdateBudgetParams);
  if (!id) {
    res.status(400).json({ error: "معرّف الميزانية غير صالح" });
    return;
  }
  const input = parseBody(UpdateBudgetBody, req.body, res);
  if (!input) return;
  const db = await getDatabase();
  const result = await db.collection<BudgetDocument>("budgets").findOneAndUpdate(
    { _id: new ObjectId(id), userId: userIdFrom(res) },
    { $set: input },
    { returnDocument: "after" },
  );
  if (!result) {
    res.status(404).json({ error: "الميزانية غير موجودة" });
    return;
  }
  const spent = await db.collection<TransactionDocument>("transactions").aggregate<{ total: number }>([
    { $match: { userId: userIdFrom(res), type: "expense", category: result.category, date: { $regex: `^${result.month}` } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]).toArray();
  res.json(UpdateBudgetResponse.parse({ ...publicDocument(result), spent: spent[0]?.total ?? 0 }));
});

router.delete("/budgets/:id", async (req, res: AuthResponse): Promise<void> => {
  const id = getId(req, DeleteBudgetParams);
  if (!id) {
    res.status(400).json({ error: "معرّف الميزانية غير صالح" });
    return;
  }
  const db = await getDatabase();
  const result = await db.collection<BudgetDocument>("budgets").deleteOne({ _id: new ObjectId(id), userId: userIdFrom(res) });
  if (!result.deletedCount) {
    res.status(404).json({ error: "الميزانية غير موجودة" });
    return;
  }
  res.json(DeleteBudgetResponse.parse({ message: "تم حذف الميزانية" }));
});

router.get("/goals", async (_req, res: AuthResponse): Promise<void> => {
  const db = await getDatabase();
  const rows = await db.collection<GoalDocument>("goals").find({ userId: userIdFrom(res) }).sort({ createdAt: -1 }).toArray();
  res.json(ListGoalsResponse.parse(rows.map(publicDocument)));
});

router.post("/goals", async (req, res: AuthResponse): Promise<void> => {
  const input = parseBody(CreateGoalBody, req.body, res);
  if (!input) return;
  const document: GoalDocument = {
    _id: new ObjectId(),
    userId: userIdFrom(res),
    ...input,
    targetDate: input.targetDate ? dateOnly(input.targetDate) : null,
    createdAt: dateNow(),
  };
  const db = await getDatabase();
  await db.collection<GoalDocument>("goals").insertOne(document);
  res.status(201).json(CreateGoalResponse.parse(publicDocument(document)));
});

router.patch("/goals/:id", async (req, res: AuthResponse): Promise<void> => {
  const id = getId(req, UpdateGoalParams);
  if (!id) {
    res.status(400).json({ error: "معرّف الهدف غير صالح" });
    return;
  }
  const input = parseBody(UpdateGoalBody, req.body, res);
  if (!input) return;
  const patch: Partial<GoalDocument> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.targetAmount !== undefined) patch.targetAmount = input.targetAmount;
  if (input.currentAmount !== undefined) patch.currentAmount = input.currentAmount;
  if (input.targetDate !== undefined) {
    patch.targetDate = input.targetDate ? dateOnly(input.targetDate) : null;
  }
  const db = await getDatabase();
  const result = await db.collection<GoalDocument>("goals").findOneAndUpdate(
    { _id: new ObjectId(id), userId: userIdFrom(res) },
    { $set: patch },
    { returnDocument: "after" },
  );
  if (!result) {
    res.status(404).json({ error: "الهدف غير موجود" });
    return;
  }
  res.json(UpdateGoalResponse.parse(publicDocument(result)));
});

router.delete("/goals/:id", async (req, res: AuthResponse): Promise<void> => {
  const id = getId(req, DeleteGoalParams);
  if (!id) {
    res.status(400).json({ error: "معرّف الهدف غير صالح" });
    return;
  }
  const db = await getDatabase();
  const result = await db.collection<GoalDocument>("goals").deleteOne({ _id: new ObjectId(id), userId: userIdFrom(res) });
  if (!result.deletedCount) {
    res.status(404).json({ error: "الهدف غير موجود" });
    return;
  }
  res.json(DeleteGoalResponse.parse({ message: "تم حذف الهدف" }));
});

router.get("/orders", async (_req, res: AuthResponse): Promise<void> => {
  const db = await getDatabase();
  const rows = await db.collection<OrderDocument>("orders").find({ userId: userIdFrom(res) }).sort({ date: -1 }).toArray();
  res.json(ListOrdersResponse.parse(rows.map(publicDocument)));
});

router.post("/orders", async (req, res: AuthResponse): Promise<void> => {
  const input = parseBody(CreateOrderBody, req.body, res);
  if (!input) return;
  const document: OrderDocument = {
    _id: new ObjectId(),
    userId: userIdFrom(res),
    ...input,
    date: dateOnly(input.date),
    note: input.note ?? null,
  };
  const db = await getDatabase();
  await db.collection<OrderDocument>("orders").insertOne(document);
  res.status(201).json(CreateOrderResponse.parse(publicDocument(document)));
});

router.get("/dashboard", async (_req, res: AuthResponse): Promise<void> => {
  const db = await getDatabase();
  const userId = userIdFrom(res);
  const [transactions, budgets] = await Promise.all([
    db.collection<TransactionDocument>("transactions").find({ userId }).sort({ date: -1 }).toArray(),
    db.collection<BudgetDocument>("budgets").find({ userId, month: monthNow() }).toArray(),
  ]);
  const expenses = expenseTotal(transactions);
  const income = incomeTotal(transactions);
  const categories = new Map<string, number>();
  const months = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    categories.set(transaction.category, (categories.get(transaction.category) ?? 0) + transaction.amount);
    const month = monthOf(transaction.date);
    months.set(month, (months.get(month) ?? 0) + transaction.amount);
  }
  const monthlySpending = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - (5 - index));
    const month = date.toISOString().slice(0, 7);
    return { month, amount: months.get(month) ?? 0 };
  });
  const budgetAlerts = budgets.map((budget) => {
    const spent = transactions
      .filter((transaction) => transaction.type === "expense" && transaction.category === budget.category && monthOf(transaction.date) === budget.month)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    return { category: budget.category, spent, limit: budget.limit, exceeded: spent > budget.limit };
  });
  const currentMonthTransactions = transactions.filter((transaction) => monthOf(transaction.date) === monthNow());
  const currentMonthIncome = incomeTotal(currentMonthTransactions);
  const currentMonthExpenses = expenseTotal(currentMonthTransactions);
  const summary = {
    income: currentMonthIncome,
    expenses: currentMonthExpenses,
    savings: currentMonthIncome - currentMonthExpenses,
    spendingByCategory: Array.from(categories, ([category, amount]) => ({ category, amount })),
    monthlySpending,
    recentTransactions: transactions.slice(0, 6).map(publicDocument),
    budgetAlerts,
  };
  res.json(GetDashboardResponse.parse(summary));
});

router.get("/advisor", async (_req, res: AuthResponse): Promise<void> => {
  const db = await getDatabase();
  const userId = userIdFrom(res);
  const [transactions, budgets] = await Promise.all([
    db.collection<TransactionDocument>("transactions").find({ userId }).toArray(),
    db.collection<BudgetDocument>("budgets").find({ userId, month: monthNow() }).toArray(),
  ]);
  const income = incomeTotal(transactions);
  const expenses = expenseTotal(transactions);
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const categoryTotals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type === "expense") {
      categoryTotals.set(transaction.category, (categoryTotals.get(transaction.category) ?? 0) + transaction.amount);
    }
  }

  const suggestions: Array<{ title: string; detail: string; kind: "positive" | "warning" | "insight" }> = [];
  const exceeded = budgets
    .map((budget) => ({
      budget,
      spent: transactions.filter((transaction) =>
        transaction.type === "expense" &&
        transaction.category === budget.category &&
        monthOf(transaction.date) === budget.month
      ).reduce((sum, transaction) => sum + transaction.amount, 0),
    }))
    .filter(({ budget, spent }) => spent > budget.limit);

  for (const item of exceeded) {
    suggestions.push({
      title: `تجاوز ميزانية ${item.budget.category}`,
      detail: `سجلت ${item.spent.toFixed(3)} د.ك مقابل حد ${item.budget.limit.toFixed(3)} د.ك هذا الشهر.`,
      kind: "warning",
    });
  }

  const largestCategory = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0];
  if (largestCategory && expenses > 0) {
    const share = Math.round((largestCategory[1] / expenses) * 100);
    suggestions.push({
      title: "الفئة الأعلى إنفاقًا",
      detail: `${largestCategory[0]} تمثل ${share}% من مصروفاتك المسجلة (${largestCategory[1].toFixed(3)} د.ك). راجع المعاملات في هذه الفئة لتحديد فرصة مناسبة للتوفير.`,
      kind: "insight",
    });
  }

  if (income > 0) {
    suggestions.push({
      title: savingsRate >= 20 ? "معدل الادخار جيد" : "تابع معدل الادخار",
      detail: `الفارق بين الدخل والمصروفات المسجلة يعطي معدلًا قدره ${savingsRate}% (${(income - expenses).toFixed(3)} د.ك).`,
      kind: savingsRate >= 20 ? "positive" : "insight",
    });
  }
  if (suggestions.length === 0) {
    suggestions.push({
      title: "أضف بياناتك للحصول على تحليل",
      detail: "ستظهر اقتراحات مخصصة بعد تسجيل معاملات أو ميزانيات. لا نعرض أرقامًا تقديرية.",
      kind: "insight",
    });
  }

  const result = GetFinancialAdviceResponse.parse({ suggestions, income, expenses, savingsRate });
  res.json(result);
});

export default router;

import { Buffer } from "node:buffer";
import type Stripe from "stripe";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import {
  CreateBillingCheckoutBody,
  CreateBillingCheckoutResponse,
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
  GetBillingPriceResponse,
  GetBillingSessionQueryParams,
  GetBillingSessionResponse,
  GetCurrentUserResponse,
  GetDashboardResponse,
  GetFinancialAdviceResponse,
  GetProfileResponse,
  HealthCheckResponse,
  ListBudgetsResponse,
  ListGoalsResponse,
  ListOrdersResponse,
  ListTransactionsResponse,
  LoginUserBody,
  LoginUserResponse,
  LogoutUserResponse,
  RegisterUserBody,
  RegisterUserResponse,
  ReceiveStripeWebhookResponse,
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
import type {
  BudgetDocument,
  GoalDocument,
  OrderDocument,
  TransactionDocument,
  UserDocument,
} from "./mongo";
import { getDatabase, publicDocument } from "./mongo";
import { clearedSessionCookie, getSessionUserId, issueSession, sessionCookie } from "./auth";
import {
  getConfiguredPrice,
  getStripeGateway,
  getStripePriceId,
  getStripeWebhookSecret,
  recordPaidCheckout,
  type StripeGateway,
} from "./billing";

type SafeSchema<T> = {
  safeParse(value: unknown):
    | { success: true; data: T }
    | { success: false; error: { message: string } };
};

type MizanApiDependencies = {
  getDatabase: typeof getDatabase;
  issueSession: typeof issueSession;
  getSessionUserId: typeof getSessionUserId;
  getStripeGateway: () => StripeGateway | null;
  getStripePriceId: () => string | null;
  getStripeWebhookSecret: () => string | null;
};

function json(body: unknown, status = 200, cookie?: string): Response {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

function error(message: string, status: number): Response {
  return json({ error: message }, status);
}

function redirect(location: string, cookie?: string): Response {
  const headers = new Headers({ Location: location });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

function isFormPost(request: Request): boolean {
  return request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase()
    === "application/x-www-form-urlencoded";
}

async function parseInput<T>(
  request: Request,
  schema: SafeSchema<T>,
): Promise<{ data: T } | { response: Response }> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 32 * 1024) {
    return { response: error("حجم الطلب أكبر من المسموح", 413) };
  }

  let value: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 32 * 1024) {
      return { response: error("حجم الطلب أكبر من المسموح", 413) };
    }
    value = isFormPost(request)
      ? Object.fromEntries(new URLSearchParams(raw).entries())
      : JSON.parse(raw);
  } catch {
    return { response: error("بيانات الطلب غير صالحة", 400) };
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return { response: error(parsed.error.message, 400) };
  }
  return { data: parsed.data };
}

function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/api") return "/";
  return path.startsWith("/api/") ? path.slice(4) : path;
}

function forwardedOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
    || request.headers.get("host")
    || url.host;
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
    || url.protocol.slice(0, -1);
  return new URL(`${protocol}://${host}`).origin;
}

function hasSameOrigin(request: Request): boolean {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) return false;
  try {
    const trustedOrigin = new URL(forwardedOrigin(request));
    if (process.env.NODE_ENV === "production" && trustedOrigin.protocol !== "https:") return false;
    return new URL(requestOrigin).origin === trustedOrigin.origin;
  } catch {
    return false;
  }
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

function validatedId(
  id: string,
  schema: SafeSchema<{ id: string }>,
): string | null {
  const parsed = schema.safeParse({ id });
  return parsed.success && ObjectId.isValid(parsed.data.id) ? parsed.data.id : null;
}

async function handleStripeWebhook(
  request: Request,
  dependencies: MizanApiDependencies,
): Promise<Response> {
  const stripe = dependencies.getStripeGateway();
  const webhookSecret = dependencies.getStripeWebhookSecret();
  const priceId = dependencies.getStripePriceId();
  if (!stripe || !webhookSecret || !priceId) {
    return error("إعداد الدفع غير مكتمل", 503);
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return error("توقيع Stripe مفقود", 400);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 1024 * 1024) return error("حجم الطلب أكبر من المسموح", 413);

  let payload: Buffer;
  try {
    payload = Buffer.from(await request.arrayBuffer());
  } catch {
    return error("بيانات Stripe غير صالحة", 400);
  }
  if (payload.byteLength > 1024 * 1024) return error("حجم الطلب أكبر من المسموح", 413);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return error("توقيع Stripe غير صالح", 400);
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    if (
      checkoutSession.metadata?.mizanApp === "mizan" &&
      checkoutSession.payment_status === "paid"
    ) {
      const recorded = await recordPaidCheckout(
        await dependencies.getDatabase(),
        checkoutSession,
        priceId,
      );
      if (!recorded) return error("تعذّر تسجيل الدفعة", 500);
    }
  }

  return json(ReceiveStripeWebhookResponse.parse({ received: true }));
}

async function handlePublicRoute(
  request: Request,
  path: string,
  dependencies: MizanApiDependencies,
): Promise<Response | null> {
  const method = request.method.toUpperCase();

  if (method === "POST" && path === "/webhooks/stripe") {
    return handleStripeWebhook(request, dependencies);
  }

  if (method === "GET" && path === "/healthz") {
    return json(HealthCheckResponse.parse({ status: "ok" }));
  }

  if (method === "POST" && path === "/auth/register") {
    const parsed = await parseInput(request, RegisterUserBody);
    if ("response" in parsed) return parsed.response;

    const db = await dependencies.getDatabase();
    const email = parsed.data.email.trim().toLowerCase();
    const users = db.collection<UserDocument>("users");
    if (await users.findOne({ email })) {
      return isFormPost(request)
        ? redirect("/signup?authError=duplicate")
        : error("البريد الإلكتروني مستخدم بالفعل", 409);
    }

    const user: UserDocument = {
      _id: new ObjectId(),
      name: parsed.data.name.trim(),
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      currency: "KWD",
      createdAt: dateNow(),
    };
    await users.insertOne(user);
    const token = await dependencies.issueSession(String(user._id));
    const cookie = sessionCookie(token);
    return isFormPost(request)
      ? redirect("/dashboard", cookie)
      : json(RegisterUserResponse.parse({ user: asUser(user) }), 201, cookie);
  }

  if (method === "POST" && path === "/auth/login") {
    const parsed = await parseInput(request, LoginUserBody);
    if ("response" in parsed) return parsed.response;

    const db = await dependencies.getDatabase();
    const user = await db.collection<UserDocument>("users").findOne({
      email: parsed.data.email.trim().toLowerCase(),
    });
    const valid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
    if (!user || !valid) {
      return isFormPost(request)
        ? redirect("/login?authError=invalid")
        : error("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401);
    }

    const token = await dependencies.issueSession(String(user._id));
    const cookie = sessionCookie(token);
    return isFormPost(request)
      ? redirect("/dashboard", cookie)
      : json(LoginUserResponse.parse({ user: asUser(user) }), 200, cookie);
  }

  if (method === "POST" && path === "/auth/logout") {
    return json(LogoutUserResponse.parse({ message: "تم تسجيل الخروج" }), 200, clearedSessionCookie());
  }

  return null;
}

async function handleAuthenticatedRoute(
  request: Request,
  path: string,
  userId: string,
  dependencies: MizanApiDependencies,
): Promise<Response> {
  const method = request.method.toUpperCase();
  const db = await dependencies.getDatabase();

  if (path === "/billing/price" && method === "GET") {
    const stripe = dependencies.getStripeGateway();
    const priceId = dependencies.getStripePriceId();
    if (!stripe || !priceId) return error("إعداد الدفع غير مكتمل", 503);
    try {
      const price = await getConfiguredPrice(stripe, priceId);
      if (!price) return error("لم يتم إعداد سعر دفع لمرة واحدة", 503);
      return json(GetBillingPriceResponse.parse(price));
    } catch {
      return error("تعذّر تحميل تفاصيل الدفع", 503);
    }
  }

  if (path === "/billing/checkout" && method === "POST") {
    if (!hasSameOrigin(request)) return error("الطلب غير صالح", 403);
    const parsed = await parseInput(request, CreateBillingCheckoutBody);
    if ("response" in parsed) return parsed.response;

    const stripe = dependencies.getStripeGateway();
    const priceId = dependencies.getStripePriceId();
    if (!stripe || !priceId) return error("إعداد الدفع غير مكتمل", 503);

    const user = await db.collection<UserDocument>("users").findOne({
      _id: new ObjectId(userId),
    });
    if (!user) return error("الحساب غير موجود", 404);

    try {
      const price = await getConfiguredPrice(stripe, priceId);
      if (!price) return error("لم يتم إعداد سعر دفع لمرة واحدة", 503);

      const origin = forwardedOrigin(request);
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email,
        client_reference_id: userId,
        metadata: { mizanApp: "mizan", userId, priceId },
        payment_intent_data: {
          metadata: { mizanApp: "mizan", userId, priceId },
        },
        success_url: `${origin}/payment?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/payment?canceled=1`,
      });
      if (!checkoutSession.url) return error("تعذّر بدء عملية الدفع", 502);
      return json(CreateBillingCheckoutResponse.parse({ url: checkoutSession.url }));
    } catch {
      return error("تعذّر بدء عملية الدفع. حاول مرة أخرى.", 502);
    }
  }

  if (path === "/billing/session" && method === "GET") {
    const params = GetBillingSessionQueryParams.safeParse({
      session_id: new URL(request.url).searchParams.get("session_id"),
    });
    if (!params.success || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(params.data.session_id)) {
      return error("جلسة الدفع غير صالحة", 400);
    }

    const stripe = dependencies.getStripeGateway();
    const priceId = dependencies.getStripePriceId();
    if (!stripe || !priceId) return error("إعداد الدفع غير مكتمل", 503);

    let checkoutSession: Stripe.Checkout.Session;
    try {
      checkoutSession = await stripe.checkout.sessions.retrieve(params.data.session_id);
    } catch {
      return error("جلسة الدفع غير موجودة", 404);
    }

    if (
      checkoutSession.mode !== "payment" ||
      checkoutSession.metadata?.mizanApp !== "mizan" ||
      checkoutSession.metadata.userId !== userId ||
      checkoutSession.metadata.priceId !== priceId
    ) {
      return error("جلسة الدفع غير موجودة", 404);
    }

    if (
      checkoutSession.payment_status === "paid" &&
      !await recordPaidCheckout(db, checkoutSession, priceId)
    ) {
      return error("تعذّر تأكيد الدفع", 500);
    }

    const status = checkoutSession.payment_status === "paid"
      ? "paid"
      : checkoutSession.status === "complete"
        ? "processing"
        : "unpaid";
    return json(GetBillingSessionResponse.parse({
      status,
      amount: checkoutSession.amount_total,
      currency: checkoutSession.currency?.toUpperCase() ?? null,
    }));
  }

  if (method === "GET" && path === "/auth/me") {
    const user = await db.collection<UserDocument>("users").findOne({ _id: new ObjectId(userId) });
    if (!user) return error("الحساب غير موجود", 401);
    return json(GetCurrentUserResponse.parse(asUser(user)));
  }

  if (path === "/profile" && method === "GET") {
    const user = await db.collection<UserDocument>("users").findOne({ _id: new ObjectId(userId) });
    if (!user) return error("الحساب غير موجود", 404);
    return json(GetProfileResponse.parse(asUser(user)));
  }

  if (path === "/profile" && method === "PATCH") {
    const parsed = await parseInput(request, UpdateProfileBody);
    if ("response" in parsed) return parsed.response;

    const users = db.collection<UserDocument>("users");
    const email = parsed.data.email.trim().toLowerCase();
    const duplicate = await users.findOne({ email, _id: { $ne: new ObjectId(userId) } });
    if (duplicate) return error("البريد الإلكتروني مستخدم بالفعل", 409);

    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { name: parsed.data.name.trim(), email } },
      { returnDocument: "after" },
    );
    if (!result) return error("الحساب غير موجود", 404);
    return json(UpdateProfileResponse.parse(asUser(result)));
  }

  if (path === "/transactions" && method === "GET") {
    const rows = await db.collection<TransactionDocument>("transactions")
      .find({ userId })
      .sort({ date: -1, _id: -1 })
      .toArray();
    return json(ListTransactionsResponse.parse(rows.map(publicDocument)));
  }

  if (path === "/transactions" && method === "POST") {
    const parsed = await parseInput(request, CreateTransactionBody);
    if ("response" in parsed) return parsed.response;
    const document: TransactionDocument = {
      _id: new ObjectId(),
      userId,
      ...parsed.data,
      date: dateOnly(parsed.data.date),
      note: parsed.data.note ?? null,
      createdAt: dateNow(),
    };
    await db.collection<TransactionDocument>("transactions").insertOne(document);
    return json(CreateTransactionResponse.parse(publicDocument(document)), 201);
  }

  const transactionMatch = path.match(/^\/transactions\/([^/]+)$/);
  if (transactionMatch && method === "PATCH") {
    const id = validatedId(transactionMatch[1], UpdateTransactionParams);
    if (!id) return error("معرّف المعاملة غير صالح", 400);
    const parsed = await parseInput(request, UpdateTransactionBody);
    if ("response" in parsed) return parsed.response;

    const patch: Partial<TransactionDocument> = {};
    if (parsed.data.title !== undefined) patch.title = parsed.data.title;
    if (parsed.data.amount !== undefined) patch.amount = parsed.data.amount;
    if (parsed.data.type !== undefined) patch.type = parsed.data.type;
    if (parsed.data.category !== undefined) patch.category = parsed.data.category;
    if (parsed.data.date !== undefined) patch.date = dateOnly(parsed.data.date);
    if (parsed.data.note !== undefined) patch.note = parsed.data.note;
    const result = await db.collection<TransactionDocument>("transactions").findOneAndUpdate(
      { _id: new ObjectId(id), userId },
      { $set: patch },
      { returnDocument: "after" },
    );
    if (!result) return error("المعاملة غير موجودة", 404);
    return json(UpdateTransactionResponse.parse(publicDocument(result)));
  }

  if (transactionMatch && method === "DELETE") {
    const id = validatedId(transactionMatch[1], DeleteTransactionParams);
    if (!id) return error("معرّف المعاملة غير صالح", 400);
    const result = await db.collection<TransactionDocument>("transactions")
      .deleteOne({ _id: new ObjectId(id), userId });
    if (!result.deletedCount) return error("المعاملة غير موجودة", 404);
    return json(DeleteTransactionResponse.parse({ message: "تم حذف المعاملة" }));
  }

  if (path === "/budgets" && method === "GET") {
    const month = monthNow();
    const [budgets, transactions] = await Promise.all([
      db.collection<BudgetDocument>("budgets").find({ userId }).toArray(),
      db.collection<TransactionDocument>("transactions").find({ userId, type: "expense" }).toArray(),
    ]);
    const result = budgets.map((budget) => ({
      ...publicDocument(budget),
      spent: transactions
        .filter((transaction) =>
          transaction.category === budget.category &&
          monthOf(transaction.date) === (budget.month || month)
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    }));
    return json(ListBudgetsResponse.parse(result));
  }

  if (path === "/budgets" && method === "POST") {
    const parsed = await parseInput(request, CreateBudgetBody);
    if ("response" in parsed) return parsed.response;
    const document: BudgetDocument = { _id: new ObjectId(), userId, ...parsed.data };
    await db.collection<BudgetDocument>("budgets").insertOne(document);
    return json(CreateBudgetResponse.parse({ ...publicDocument(document), spent: 0 }), 201);
  }

  const budgetMatch = path.match(/^\/budgets\/([^/]+)$/);
  if (budgetMatch && method === "PATCH") {
    const id = validatedId(budgetMatch[1], UpdateBudgetParams);
    if (!id) return error("معرّف الميزانية غير صالح", 400);
    const parsed = await parseInput(request, UpdateBudgetBody);
    if ("response" in parsed) return parsed.response;
    const result = await db.collection<BudgetDocument>("budgets").findOneAndUpdate(
      { _id: new ObjectId(id), userId },
      { $set: parsed.data },
      { returnDocument: "after" },
    );
    if (!result) return error("الميزانية غير موجودة", 404);
    const spent = await db.collection<TransactionDocument>("transactions").aggregate<{ total: number }>([
      {
        $match: {
          userId,
          type: "expense",
          category: result.category,
          date: { $regex: `^${result.month}` },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).toArray();
    return json(UpdateBudgetResponse.parse({ ...publicDocument(result), spent: spent[0]?.total ?? 0 }));
  }

  if (budgetMatch && method === "DELETE") {
    const id = validatedId(budgetMatch[1], DeleteBudgetParams);
    if (!id) return error("معرّف الميزانية غير صالح", 400);
    const result = await db.collection<BudgetDocument>("budgets")
      .deleteOne({ _id: new ObjectId(id), userId });
    if (!result.deletedCount) return error("الميزانية غير موجودة", 404);
    return json(DeleteBudgetResponse.parse({ message: "تم حذف الميزانية" }));
  }

  if (path === "/goals" && method === "GET") {
    const rows = await db.collection<GoalDocument>("goals")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    return json(ListGoalsResponse.parse(rows.map(publicDocument)));
  }

  if (path === "/goals" && method === "POST") {
    const parsed = await parseInput(request, CreateGoalBody);
    if ("response" in parsed) return parsed.response;
    const document: GoalDocument = {
      _id: new ObjectId(),
      userId,
      ...parsed.data,
      targetDate: parsed.data.targetDate ? dateOnly(parsed.data.targetDate) : null,
      createdAt: dateNow(),
    };
    await db.collection<GoalDocument>("goals").insertOne(document);
    return json(CreateGoalResponse.parse(publicDocument(document)), 201);
  }

  const goalMatch = path.match(/^\/goals\/([^/]+)$/);
  if (goalMatch && method === "PATCH") {
    const id = validatedId(goalMatch[1], UpdateGoalParams);
    if (!id) return error("معرّف الهدف غير صالح", 400);
    const parsed = await parseInput(request, UpdateGoalBody);
    if ("response" in parsed) return parsed.response;
    const patch: Partial<GoalDocument> = {};
    if (parsed.data.title !== undefined) patch.title = parsed.data.title;
    if (parsed.data.targetAmount !== undefined) patch.targetAmount = parsed.data.targetAmount;
    if (parsed.data.currentAmount !== undefined) patch.currentAmount = parsed.data.currentAmount;
    if (parsed.data.targetDate !== undefined) {
      patch.targetDate = parsed.data.targetDate ? dateOnly(parsed.data.targetDate) : null;
    }
    const result = await db.collection<GoalDocument>("goals").findOneAndUpdate(
      { _id: new ObjectId(id), userId },
      { $set: patch },
      { returnDocument: "after" },
    );
    if (!result) return error("الهدف غير موجود", 404);
    return json(UpdateGoalResponse.parse(publicDocument(result)));
  }

  if (goalMatch && method === "DELETE") {
    const id = validatedId(goalMatch[1], DeleteGoalParams);
    if (!id) return error("معرّف الهدف غير صالح", 400);
    const result = await db.collection<GoalDocument>("goals")
      .deleteOne({ _id: new ObjectId(id), userId });
    if (!result.deletedCount) return error("الهدف غير موجود", 404);
    return json(DeleteGoalResponse.parse({ message: "تم حذف الهدف" }));
  }

  if (path === "/orders" && method === "GET") {
    const rows = await db.collection<OrderDocument>("orders")
      .find({ userId })
      .sort({ date: -1 })
      .toArray();
    return json(ListOrdersResponse.parse(rows.map(publicDocument)));
  }

  if (path === "/orders" && method === "POST") {
    const parsed = await parseInput(request, CreateOrderBody);
    if ("response" in parsed) return parsed.response;
    const document: OrderDocument = {
      _id: new ObjectId(),
      userId,
      ...parsed.data,
      date: dateOnly(parsed.data.date),
      note: parsed.data.note ?? null,
    };
    await db.collection<OrderDocument>("orders").insertOne(document);
    return json(CreateOrderResponse.parse(publicDocument(document)), 201);
  }

  if (path === "/dashboard" && method === "GET") {
    const [transactions, budgets] = await Promise.all([
      db.collection<TransactionDocument>("transactions").find({ userId }).sort({ date: -1 }).toArray(),
      db.collection<BudgetDocument>("budgets").find({ userId, month: monthNow() }).toArray(),
    ]);
    const categories = new Map<string, number>();
    const months = new Map<string, number>();
    for (const transaction of transactions) {
      if (transaction.type !== "expense") continue;
      categories.set(
        transaction.category,
        (categories.get(transaction.category) ?? 0) + transaction.amount,
      );
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
        .filter((transaction) =>
          transaction.type === "expense" &&
          transaction.category === budget.category &&
          monthOf(transaction.date) === budget.month
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      return { category: budget.category, spent, limit: budget.limit, exceeded: spent > budget.limit };
    });
    const currentMonthTransactions = transactions.filter(
      (transaction) => monthOf(transaction.date) === monthNow(),
    );
    return json(GetDashboardResponse.parse({
      income: incomeTotal(currentMonthTransactions),
      expenses: expenseTotal(currentMonthTransactions),
      savings: incomeTotal(currentMonthTransactions) - expenseTotal(currentMonthTransactions),
      spendingByCategory: Array.from(categories, ([category, amount]) => ({ category, amount })),
      monthlySpending,
      recentTransactions: transactions.slice(0, 6).map(publicDocument),
      budgetAlerts,
    }));
  }

  if (path === "/advisor" && method === "GET") {
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
        categoryTotals.set(
          transaction.category,
          (categoryTotals.get(transaction.category) ?? 0) + transaction.amount,
        );
      }
    }

    const suggestions: Array<{
      title: string;
      detail: string;
      kind: "positive" | "warning" | "insight";
    }> = [];
    const exceeded = budgets
      .map((budget) => ({
        budget,
        spent: transactions
          .filter((transaction) =>
            transaction.type === "expense" &&
            transaction.category === budget.category &&
            monthOf(transaction.date) === budget.month
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0),
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

    return json(GetFinancialAdviceResponse.parse({ suggestions, income, expenses, savingsRate }));
  }

  return error("المسار غير موجود", 404);
}

export function createMizanApiHandler(overrides: Partial<MizanApiDependencies> = {}) {
  const dependencies: MizanApiDependencies = {
    getDatabase,
    issueSession,
    getSessionUserId,
    getStripeGateway,
    getStripePriceId,
    getStripeWebhookSecret,
    ...overrides,
  };

  return async function handleMizanApi(request: Request): Promise<Response> {
    try {
      const path = normalizePath(new URL(request.url).pathname);
      const publicResponse = await handlePublicRoute(request, path, dependencies);
      if (publicResponse) return publicResponse;

      const session = await dependencies.getSessionUserId(request);
      if (!session.userId) {
        return json(
          { error: session.invalid ? "انتهت صلاحية الجلسة" : "تسجيل الدخول مطلوب" },
          401,
          session.invalid ? clearedSessionCookie() : undefined,
        );
      }

      const response = await handleAuthenticatedRoute(request, path, session.userId, dependencies);
      if (path === "/auth/me" && response.status === 401) {
        return json({ error: "الحساب غير موجود" }, 401, clearedSessionCookie());
      }
      return response;
    } catch {
      return error("حدث خطأ غير متوقع. حاول مرة أخرى.", 500);
    }
  };
}

export const handleMizanApi = createMizanApiHandler();

import { MongoClient } from "mongodb";
import type { Db, Document } from "mongodb";

type MizanMongoGlobal = typeof globalThis & {
  __mizanMongoClientPromise?: Promise<MongoClient>;
};

const mongoGlobal = globalThis as MizanMongoGlobal;

export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!mongoGlobal.__mizanMongoClientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
    });
    mongoGlobal.__mizanMongoClientPromise = client.connect().then(async (connected) => {
      const database = connected.db(process.env.MONGODB_DATABASE ?? "mizan_ai");
      await Promise.all([
        database.collection("users").createIndex({ email: 1 }, { unique: true }),
        database.collection("transactions").createIndex({ userId: 1, date: -1 }),
        database.collection("budgets").createIndex({ userId: 1, month: 1, category: 1 }),
        database.collection("goals").createIndex({ userId: 1 }),
        database.collection("orders").createIndex({ userId: 1, date: -1 }),
      ]);
      return connected;
    }).catch((error: unknown) => {
      mongoGlobal.__mizanMongoClientPromise = undefined;
      throw error;
    });
  }

  const client = await mongoGlobal.__mizanMongoClientPromise;
  return client.db(process.env.MONGODB_DATABASE ?? "mizan_ai");
}

export type UserDocument = Document & {
  name: string;
  email: string;
  passwordHash: string;
  currency: "KWD";
  createdAt: string;
};

export type TransactionDocument = Document & {
  userId: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  note: string | null;
  createdAt: string;
};

export type BudgetDocument = Document & {
  userId: string;
  category: string;
  limit: number;
  month: string;
};

export type GoalDocument = Document & {
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  createdAt: string;
};

export type OrderDocument = Document & {
  userId: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  status: "paid" | "pending";
  note: string | null;
};

export function publicDocument<T extends Document>(
  document: T,
): Omit<T, "_id" | "userId" | "passwordHash"> & { id: string } {
  const { _id, userId: _userId, passwordHash: _passwordHash, ...fields } = document;
  return {
    ...fields,
    id: String(_id),
  } as Omit<T, "_id" | "userId" | "passwordHash"> & { id: string };
}

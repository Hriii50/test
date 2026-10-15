import { MongoClient } from "mongodb";
import type { Db, Document } from "mongodb";

let clientPromise: Promise<MongoClient> | undefined;

export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!clientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
    });
    clientPromise = client.connect().then(async (connected) => {
      const databaseName = process.env.MONGODB_DATABASE ?? "mizan_ai";
      const database = connected.db(databaseName);
      await database.collection("users").createIndex({ email: 1 }, { unique: true });
      await database.collection("transactions").createIndex({ userId: 1, date: -1 });
      await database.collection("budgets").createIndex({ userId: 1, month: 1, category: 1 });
      await database.collection("goals").createIndex({ userId: 1 });
      await database.collection("orders").createIndex({ userId: 1, date: -1 });
      return connected;
    });
  }

  return (await clientPromise).db(process.env.MONGODB_DATABASE ?? "mizan_ai");
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

export function publicDocument<T extends Document>(document: T): Omit<T, "_id" | "userId" | "passwordHash"> & { id: string } {
  const { _id, userId: _userId, passwordHash: _passwordHash, ...fields } = document;
  return { ...fields, id: String(_id) } as Omit<T, "_id" | "userId" | "passwordHash"> & { id: string };
}

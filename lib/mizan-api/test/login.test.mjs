import assert from "node:assert/strict";
import test from "node:test";
import { createMizanApiHandler } from "../src/index.ts";

test("registration and login share bcrypt handling and return Arabic credential errors", async () => {
  const users = [];
  const collection = {
    findOne: async ({ email }) => users.find((user) => user.email === email) ?? null,
    insertOne: async (user) => {
      users.push(user);
      return { acknowledged: true, insertedId: user._id };
    },
  };
  const database = {
    collection(name) {
      assert.equal(name, "users");
      return collection;
    },
  };
  const handler = createMizanApiHandler({
    getDatabase: async () => database,
    issueSession: async () => "unit-test-session",
  });
  const password = "mizan-unit-test-passphrase";

  const registration = await handler(new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Mizan Test Account",
      email: "test-login@example.invalid",
      password,
    }),
  }));

  assert.equal(registration.status, 201);
  assert.equal(users.length, 1);
  assert.ok(users[0].passwordHash.startsWith("$2"));

  const validLogin = await handler(new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "TEST-LOGIN@EXAMPLE.INVALID",
      password,
    }),
  }));
  assert.equal(validLogin.status, 200);
  assert.match(validLogin.headers.get("set-cookie") ?? "", /HttpOnly/);
  assert.equal((await validLogin.json()).user.email, "test-login@example.invalid");

  const invalidLogin = await handler(new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "test-login@example.invalid",
      password: "incorrect-test-password",
    }),
  }));
  assert.equal(invalidLogin.status, 401);
  assert.equal(
    (await invalidLogin.json()).error,
    "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  );

  const formLogin = await handler(new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      accept: "text/html",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      email: "test-login@example.invalid",
      password,
    }),
  }));
  assert.equal(formLogin.status, 303);
  assert.equal(formLogin.headers.get("location"), "/dashboard");
  assert.match(formLogin.headers.get("set-cookie") ?? "", /HttpOnly/);

  const invalidFormLogin = await handler(new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      accept: "text/html",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      email: "test-login@example.invalid",
      password: "incorrect-test-password",
    }),
  }));
  assert.equal(invalidFormLogin.status, 303);
  assert.equal(invalidFormLogin.headers.get("location"), "/login?authError=invalid");
});

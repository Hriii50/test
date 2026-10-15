---
name: MIZAN auth credential logging
description: Persistent security constraints for sign-in and sign-up request handling.
---

Do not place email or password fields in URL query strings or log request bodies. Sign-in and sign-up must submit credentials in POST bodies.

**Why:** Earlier browser-native form submissions put password fields in URL query strings and server logs. The user explicitly requires that secrets not be exposed and passwords not be logged.

**How to apply:** When changing authentication forms, routes, proxies, or request logging, check that credentials stay in POST bodies and avoid dumping raw request URLs or logs that could contain credentials. If credentials were previously submitted in URLs, advise changing those passwords.

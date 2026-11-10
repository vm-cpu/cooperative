export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return Response.json(
        { ok: true, environment: env.APP_ENV ?? "local", time: new Date().toISOString() },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    // Keep business endpoints closed until application authentication exists.
    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Потрібен вхід у застосунок." }, { status: 401 });
    }
    const response = await env.ASSETS.fetch(request);
    const production = env.APP_ENV === "production";
    const label = production ? "Робоче середовище" : "Тестове середовище";
    const description = production
      ? "Застосунок ще готується до запуску. Реєстр і внесення даних поки недоступні."
      : "Місце для перевірки майбутнього реєстру гаражів і власників. Функції реєстру ще розробляються; даних членів кооперативу тут немає.";
    const result = response.headers.get("Content-Type")?.includes("text/html")
      ? new HTMLRewriter()
          .on("[data-environment]", { element: (e) => e.setInnerContent(label) })
          .on("[data-description]", { element: (e) => e.setInnerContent(description) })
          .transform(response)
      : response;
    const secured = new Response(result.body, result);
    secured.headers.set("Cache-Control", "no-store");
    secured.headers.set("X-Robots-Tag", "noindex, nofollow");
    secured.headers.set("X-Content-Type-Options", "nosniff");
    secured.headers.set("Referrer-Policy", "same-origin");
    secured.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
    return secured;
  },
};

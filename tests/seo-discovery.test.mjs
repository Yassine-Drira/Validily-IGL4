import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import robotsFn from "../src/app/robots.ts";
import sitemapFn from "../src/app/sitemap.ts";

test("SEO Architecture: robots.ts configuration contract", () => {
  const robotsPath = path.resolve("src/app/robots.ts");
  assert.ok(fs.existsSync(robotsPath), "robots.ts must exist");

  const robots = robotsFn();
  assert.ok(robots.rules, "robots must define crawl rules");
  assert.ok(robots.sitemap, "robots must declare sitemap URL");
  assert.ok(robots.sitemap.includes("sitemap.xml"), "sitemap directive must point to sitemap.xml");

  const disallowList = Array.isArray(robots.rules)
    ? robots.rules.flatMap((r) => r.disallow || [])
    : robots.rules.disallow || [];

  assert.ok(disallowList.includes("/admin"), "admin routes must be disallowed from indexing");
  assert.ok(disallowList.includes("/my-space"), "my-space routes must be disallowed from indexing");
  assert.ok(disallowList.includes("/api/*"), "internal api endpoints must be disallowed from indexing");
});

test("SEO Architecture: sitemap.ts route generation", () => {
  const sitemapPath = path.resolve("src/app/sitemap.ts");
  assert.ok(fs.existsSync(sitemapPath), "sitemap.ts must exist");

  const sitemap = sitemapFn();
  assert.ok(Array.isArray(sitemap), "sitemap must return an array of routes");
  assert.ok(sitemap.length >= 8, "sitemap must include core public routes");

  const urls = sitemap.map((entry) => entry.url);
  assert.ok(urls.some((u) => u.endsWith("/") || u.includes("vercel.app")), "sitemap must include home root");
  assert.ok(urls.some((u) => u.includes("/library")), "sitemap must include /library");
  assert.ok(urls.some((u) => u.includes("/semesters")), "sitemap must include /semesters");
  assert.ok(urls.some((u) => u.includes("/subjects")), "sitemap must include /subjects");
  assert.ok(urls.some((u) => u.includes("/quizzes")), "sitemap must include /quizzes");
  assert.ok(urls.some((u) => u.includes("/login")), "sitemap must include /login");
});

test("SEO Architecture: Root layout metadata & structured data", () => {
  const layoutPath = path.resolve("src/app/layout.tsx");
  assert.ok(fs.existsSync(layoutPath), "layout.tsx must exist");

  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  assert.ok(layoutContent.includes("metadataBase"), "layout must define metadataBase");
  assert.ok(layoutContent.includes("openGraph"), "layout must define openGraph metadata");
  assert.ok(layoutContent.includes("twitter"), "layout must define twitter metadata");
  assert.ok(layoutContent.includes("application/ld+json"), "layout must inject JSON-LD structured data");
  assert.ok(layoutContent.includes("EducationalOrganization"), "layout must declare EducationalOrganization schema");
  assert.ok(layoutContent.includes("validily-igl-4"), "layout must declare validily-igl-4 entity name");
});

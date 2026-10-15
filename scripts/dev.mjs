// scripts/dev.mjs - Dev server launcher ensuring NODE_OPTIONS propagation to all Next.js/Turbopack child processes
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ""} --max-http-header-size=65536`.trim();
import("../node_modules/next/dist/bin/next");

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/admin/semesters",
        destination: "/admin",
        permanent: false,
      },
      {
        source: "/admin/subjects",
        destination: "/admin",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

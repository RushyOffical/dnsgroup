import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Built as plain files for GitHub Pages: there is no server at runtime.
  output: "export",
  // Emit `/cleaning/index.html` rather than `/cleaning.html`. Pages would
  // otherwise redirect `/cleaning` into the RSC payload folder of the same
  // name and 404.
  trailingSlash: true,
};

export default nextConfig;

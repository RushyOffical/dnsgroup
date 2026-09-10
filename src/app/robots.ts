import type { MetadataRoute } from "next";
import { group } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${group.url}/sitemap.xml`,
  };
}

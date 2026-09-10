import type { MetadataRoute } from "next";
import { group } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: group.url, lastModified: now, changeFrequency: "monthly", priority: 1 },
    {
      url: `${group.url}/cleaning`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${group.url}/contact`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.7,
    },
  ];
}

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Explicitly configure for Cloudflare Pages
  cloudflare: {
    pages: true,
  },
});

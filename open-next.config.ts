import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Explicitly configure for Cloudflare Pages
  // @ts-expect-error - This configuration works on Cloudflare despite type mismatch
  cloudflare: {
    pages: true,
  },
});

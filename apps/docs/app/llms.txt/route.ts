import { renderLlmsTxt } from "@/src/llms/llms-txt";

export const dynamic = "force-static";

/** T317: schema-derived llms.txt (T130b stub is public/llms.txt). */
export function GET(): Response {
  return new Response(renderLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

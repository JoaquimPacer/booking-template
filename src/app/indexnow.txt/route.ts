// Serves the IndexNow verification key at /indexnow.txt. Search engines that
// receive our IndexNow submissions (see scripts/indexnow-submit.mjs) fetch this
// once to confirm we control the host. 404s when the project has no key set.
export function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(key, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}


export async function onRequest(context) {
  const response = await context.next();

  const path = new URL(context.request.url).pathname;

  const isTargetDirectory =
    /^\/(nom|sip|jednosmerkovo)\//.test(path);

  const isExcludedAsset =
    /^\/nom\/pic\//.test(path) ||
    /^\/jednosmerkovo\/assets\//.test(path);

  const filename = path.split("/").pop();

  if (
    isTargetDirectory &&
    !isExcludedAsset &&
    filename &&
    !filename.includes(".") &&
    response.status === 200
  ) {
    const headers = new Headers(response.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  return response;
}

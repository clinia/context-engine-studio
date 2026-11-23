// eslint-disable-next-line no-restricted-syntax -- probes carry no tenant or user to scope to
export function GET() {
  return new Response("ok", { status: 200 });
}

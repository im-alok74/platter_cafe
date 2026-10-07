// Fail the server at startup, not at first request, if env is misconfigured.
export async function register() {
  await import("./env");
}

export default {
  async fetch(request: Request, env: { ASSETS: { fetch: (r: Request) => Promise<Response> } }) {
    return env.ASSETS.fetch(request);
  },
};
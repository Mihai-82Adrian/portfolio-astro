import { onRequestPost as __api_chat_ts_onRequestPost } from "/home/mihai-82adrian/Projects/portfolio-astro/functions/api/chat.ts"

export const routes = [
    {
      routePath: "/api/chat",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_chat_ts_onRequestPost],
    },
  ]
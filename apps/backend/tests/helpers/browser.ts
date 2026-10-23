import { configProvider } from "@adonisjs/core";
import app from "@adonisjs/core/services/app";
import type { ResolvedSessionConfig } from "@adonisjs/session/types";

import sessionConfig from "#config/session";
import env from "#start/env";

export const sessionCookie = (await configProvider.resolve<ResolvedSessionConfig>(
  app,
  sessionConfig,
))!.cookieName;

/** Sends the real cookies received over HTTP, without Japa's synthetic session helpers. */
export function browser() {
  const cookies = new Map<string, string>();
  return {
    cookies,
    async request(path: string, body?: Record<string, unknown>, headers?: Record<string, string>) {
      const response = await fetch(`http://${env.get("HOST")}:${env.get("PORT")}/api/v1${path}`, {
        method: body ? "POST" : "GET",
        redirect: "manual",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Cookie": [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
          ...(body && cookies.has("XSRF-TOKEN")
            ? { "X-XSRF-TOKEN": cookies.get("XSRF-TOKEN")! }
            : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(";", 1)[0]!;
        const separator = pair.indexOf("=");
        cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
      return response;
    },
  };
}

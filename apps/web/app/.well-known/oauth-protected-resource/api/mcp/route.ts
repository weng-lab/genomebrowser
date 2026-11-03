import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandlerClerk,
} from "@clerk/mcp-tools/next";

export function GET(request: Request) {
  return protectedResourceHandlerClerk({
    resource: new URL("/api/mcp", request.url).href,
    scopes_supported: ["openid", "profile", "email"],
  })(request);
}
export const OPTIONS = metadataCorsOptionsRequestHandler();

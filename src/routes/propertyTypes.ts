import { createRoute } from "@hono/zod-openapi";
import { responses } from "~/utils/defaultApiResponse";

export const PropertyTypesRoute = createRoute({
  method: "get",
  path: "/v1/property-types",
  tags: ["Property Listing"],
  description: "Property types",
  operationId: "property-types",
  summary: "Property types summary",
  responses,
});

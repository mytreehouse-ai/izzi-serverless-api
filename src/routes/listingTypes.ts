import { createRoute } from "@hono/zod-openapi";
import { responses } from "~/utils/defaultApiResponse";

export const ListingTypesRoute = createRoute({
  method: "get",
  path: "/v1/listing-types",
  tags: ["Property Listing"],
  description: "Listing types",
  operationId: "listing-types",
  summary: "Listing types summary",
  responses,
});

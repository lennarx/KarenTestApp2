import spec from "@/generated/openapi.json";

/** Especificación OpenAPI 3 (importable en Postman: Import → Link → /api/swagger). */
export function GET() {
  return Response.json(spec);
}

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

/**
 * GET /api/docs - Get OpenAPI specification
 */
export async function GET() {
  try {
    const yamlPath = path.join(process.cwd(), "src/app/api/docs/openapi.yaml");
    const yamlContent = fs.readFileSync(yamlPath, "utf8");
    const spec = yaml.load(yamlContent);

    return NextResponse.json(spec);
  } catch (error) {
    console.error("Failed to load OpenAPI spec:", error);
    return NextResponse.json({ error: "Failed to load API documentation" }, { status: 500 });
  }
}

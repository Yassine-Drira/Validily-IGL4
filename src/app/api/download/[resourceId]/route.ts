import { NextRequest, NextResponse } from "next/server";
import { getResourceById } from "@/lib/supabase/repository";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  const { resourceId } = await params;
  const resource = await getResourceById(resourceId);

  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  // Handle external URLs (Google Drive, GitHub, etc.) by redirecting directly
  const isExternalUrl =
    resource.storage_path?.startsWith("http://") ||
    resource.storage_path?.startsWith("https://") ||
    resource.mime_type === "application/x-url" ||
    resource.mime_type === "application/vnd.google-apps" ||
    Boolean(resource.external_url);

  if (isExternalUrl) {
    const targetUrl =
      (resource.storage_path?.startsWith("http") ? resource.storage_path : null) ||
      resource.external_url ||
      "https://drive.google.com";
    return NextResponse.redirect(targetUrl, 303);
  }

  if (!isSupabaseConfigured()) {
    // Return sample PDF stream or informative message
    return new NextResponse(
      `%PDF-1.4\n1 0 obj\n<< /Title (${resource.title}) /Creator (Validily Academic Platform) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`,
      {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            resource.original_filename
          )}"`,
        },
      }
    );
  }

  const supabase = await createClient();

  // Create short-lived signed URL (60 seconds)
  const { data, error } = await supabase.storage
    .from("academic-resources")
    .createSignedUrl(resource.storage_path, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Failed to generate download authorization." },
      { status: 500 }
    );
  }

  return NextResponse.redirect(data.signedUrl);
}

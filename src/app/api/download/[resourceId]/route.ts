import { NextRequest, NextResponse } from "next/server";
import { getResourceById } from "@/lib/supabase/repository";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getRequesterUser } from "@/lib/auth/authorization";
import { checkResourceAccess } from "@/lib/actions/sharing-actions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  const { resourceId } = await params;
  const resource = await getResourceById(resourceId);

  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  // Strict Access Control: Private resources are only accessible by owner or admin, and shared resources by authorized recipients
  if (resource.visibility === "private" || resource.visibility === "shared") {
    const requester = await getRequesterUser();
    const accessCheck = await checkResourceAccess(resource, requester?.id, "view");
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.reason || "Accès refusé pour télécharger cette ressource." },
        { status: 403 }
      );
    }
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

  const isInline = req.nextUrl.searchParams.get("inline") === "true";

  if (!isSupabaseConfigured()) {
    // Return sample PDF stream or informative message
    const dispositionType = isInline ? "inline" : "attachment";
    return new NextResponse(
      `%PDF-1.4\n1 0 obj\n<< /Title (${resource.title}) /Creator (Validily Academic Platform) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`,
      {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(
            resource.original_filename
          )}"`,
        },
      }
    );
  }

  const supabase = await createClient();

  // Create short-lived signed URL (300 seconds for comfortable in-app reading)
  const { data, error } = await supabase.storage
    .from("academic-resources")
    .createSignedUrl(
      resource.storage_path,
      300,
      isInline ? undefined : { download: resource.original_filename }
    );

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Failed to generate download authorization." },
      { status: 500 }
    );
  }

  const response = NextResponse.redirect(data.signedUrl, 307);
  if (resource.visibility === "private" || resource.visibility === "shared") {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  } else {
    response.headers.set("Cache-Control", "private, max-age=60");
  }
  return response;
}


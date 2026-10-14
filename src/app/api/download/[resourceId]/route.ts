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

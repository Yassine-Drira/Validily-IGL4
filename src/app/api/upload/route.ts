import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase, getEffectiveUserId } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const subjectId = formData.get("subjectId") as string;
    const categoryId = formData.get("categoryId") as string;
    const title = formData.get("title") as string;
    const instructor = formData.get("instructor") as string | null;
    const submitShared = formData.get("submitShared") === "on";

    // 1. Validation
    if (!file || !subjectId || !categoryId || !title) {
      return NextResponse.json(
        { error: "Missing required fields: file, subjectId, categoryId, or title." },
        { status: 400 }
      );
    }

    // 2. MIME type & Extension Validation (PDF or HTML)
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    const isHtml = file.name.toLowerCase().endsWith(".html") || file.type === "text/html";
    if (!isPdf && !isHtml) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF (.pdf) and HTML (.html) documents are permitted." },
        { status: 400 }
      );
    }

    // 3. File size limit (50 MB)
    const MAX_SIZE_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds the 50MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB).` },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.redirect(new URL("/library?uploaded=demo", req.url));
    }

    const userId = await getEffectiveUserId();
    const serviceSupabase = getServiceSupabase();

    // 4. Generate secure unique storage path
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueStoragePath = `${userId}/${Date.now()}-${sanitizedFilename}`;

    const fileBuffer = await file.arrayBuffer();
    const mimeType = isHtml ? "text/html" : "application/pdf";

    const { error: storageError } = await serviceSupabase.storage
      .from("academic-resources")
      .upload(uniqueStoragePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      return NextResponse.json(
        { error: `Failed to upload file to storage: ${storageError.message}` },
        { status: 500 }
      );
    }

    // 5. Insert database record
    const visibility = submitShared ? "shared" : "public";
    const publication_status = "published";

    const { data: resource, error: dbError } = await serviceSupabase
      .from("resources")
      .insert({
        subject_id: subjectId,
        category_id: categoryId,
        owner_id: userId,
        title: title.trim(),
        storage_path: uniqueStoragePath,
        original_filename: file.name,
        mime_type: mimeType,
        file_size_bytes: file.size,
        instructor: instructor?.trim() || null,
        visibility,
        publication_status,
      })
      .select("*, subject:subjects(slug)")
      .single();

    if (dbError) {
      console.error("DB insert error, rolling back file:", dbError);
      await serviceSupabase.storage
        .from("academic-resources")
        .remove([uniqueStoragePath]);

      return NextResponse.json(
        { error: `Database record creation failed: ${dbError.message}` },
        { status: 500 }
      );
    }

    const redirectPath = resource?.subject?.slug
      ? `/subjects/${resource.subject.slug}`
      : `/library?uploaded=true`;

    return NextResponse.redirect(new URL(redirectPath, req.url));
  } catch (err: any) {
    console.error("Upload route uncaught exception:", err);
    return NextResponse.json(
      { error: "Internal server error during upload process." },
      { status: 500 }
    );
  }
}

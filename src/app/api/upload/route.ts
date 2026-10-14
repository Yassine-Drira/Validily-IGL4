import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

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

    // 2. MIME type & Extension Validation
    const isPdfMime = file.type === "application/pdf";
    const isPdfExt = file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfMime && !isPdfExt) {
      return NextResponse.json(
        { error: "Invalid file type. Only standard PDF documents (.pdf) are permitted." },
        { status: 400 }
      );
    }

    // 3. File size limit (50 MB)
    const MAX_SIZE_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds the 50MB free-tier upload limit (${(file.size / 1024 / 1024).toFixed(1)}MB).` },
        { status: 400 }
      );
    }

    // 4. Supabase Auth & Upload
    if (!isSupabaseConfigured()) {
      // In offline/demo mode, redirect with success query
      return NextResponse.redirect(new URL("/library?uploaded=demo", req.url));
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required to upload resources." },
        { status: 401 }
      );
    }

    // 5. Generate secure unique storage path
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueStoragePath = `${user.id}/${Date.now()}-${sanitizedFilename}`;

    const fileBuffer = await file.arrayBuffer();
    const { error: storageError } = await supabase.storage
      .from("academic-resources")
      .upload(uniqueStoragePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      return NextResponse.json(
        { error: `Failed to upload file to storage: ${storageError.message}` },
        { status: 500 }
      );
    }

    // 6. Insert database record
    const visibility = submitShared ? "shared" : "private";
    const publication_status = submitShared ? "pending_review" : "draft";

    const { error: dbError } = await supabase.from("resources").insert({
      subject_id: subjectId,
      category_id: categoryId,
      owner_id: user.id,
      title: title.trim(),
      storage_path: uniqueStoragePath,
      original_filename: file.name,
      mime_type: "application/pdf",
      file_size_bytes: file.size,
      instructor: instructor?.trim() || null,
      visibility,
      publication_status,
    });

    if (dbError) {
      console.error("DB insert error, rolling back file:", dbError);
      // Clean up orphaned storage object
      await supabase.storage.from("academic-resources").remove([uniqueStoragePath]);
      return NextResponse.json(
        { error: `Failed to register resource in database: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL("/library?uploaded=success", req.url));
  } catch (err: any) {
    console.error("Unhandled upload error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error during upload." },
      { status: 500 }
    );
  }
}

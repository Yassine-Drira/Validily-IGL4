import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getRequesterUser } from "@/lib/auth/authorization";
import { invalidateRepositoryCache } from "@/lib/supabase/repository";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const subjectId = formData.get("subjectId") as string;
    const categoryId = formData.get("categoryId") as string;
    const title = formData.get("title") as string;
    const instructor = formData.get("instructor") as string | null;
    const visibilityParam = formData.get("visibility") as string | null;
    const submitShared = formData.get("submitShared") === "on";

    const folderId = (formData.get("folderId") as string | null) || (formData.get("chapter") as string | null);

    // 1. Validation
    if (!file || !subjectId || !categoryId || !title) {
      return NextResponse.json(
        { error: "Missing required fields: file, subjectId, categoryId, or title." },
        { status: 400 }
      );
    }

    // 2. MIME type & Extension Validation (PDF, TXT, Markdown, HTML)
    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith(".pdf") || file.type === "application/pdf";
    const isHtml = lowerName.endsWith(".html") || file.type === "text/html";
    const isTxt = lowerName.endsWith(".txt") || file.type === "text/plain";
    const isMd = lowerName.endsWith(".md") || lowerName.endsWith(".markdown") || file.type === "text/markdown";

    if (!isPdf && !isHtml && !isTxt && !isMd) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé. Formats acceptés : PDF (.pdf), Markdown (.md), Texte brut (.txt) et HTML (.html)." },
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

    const acceptHeader = req.headers.get("accept") || "";
    const isFetch =
      acceptHeader.includes("application/json") ||
      req.headers.get("sec-fetch-dest") === "empty";

    if (!isSupabaseConfigured()) {
      const mockResource = {
        id: `mock_upload_${Date.now()}`,
        subject_id: subjectId,
        category_id: categoryId,
        owner_id: "demo_user",
        title: title.trim(),
        storage_path: `mock/${file.name}`,
        original_filename: file.name,
        mime_type: isHtml
          ? "text/html"
          : isMd
          ? "text/markdown"
          : isTxt
          ? "text/plain"
          : "application/pdf",
        file_size_bytes: file.size,
        academic_year: (formData.get("academicYear") as string | null) || "2026-2027",
        exam_session: (formData.get("examSession") as string | null) || null,
        instructor: instructor?.trim() || null,
        chapter: folderId || null,
        visibility: visibilityParam || (submitShared ? "public" : "private"),
        publication_status: "published",
        created_at: new Date().toISOString(),
      };

      if (isFetch) {
        return NextResponse.json({
          success: true,
          resource: mockResource,
          redirectUrl: "/library?uploaded=demo",
        });
      }
      return NextResponse.redirect(new URL("/library?uploaded=demo", req.url), 303);
    }

    const requester = await getRequesterUser();
    if (!requester || !requester.id) {
      return NextResponse.json(
        { error: "Authentification requise pour téléverser un fichier." },
        { status: 401 }
      );
    }

    const userId = requester.id;
    const serviceSupabase = getServiceSupabase();

    // 4. Generate secure unique storage path
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueStoragePath = `${userId}/${Date.now()}-${sanitizedFilename}`;

    const fileBuffer = await file.arrayBuffer();
    const mimeType = isHtml
      ? "text/html"
      : isMd
      ? "text/markdown"
      : isTxt
      ? "text/plain"
      : "application/pdf";

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

    // 5. Insert database record (Default to private study material for data hygiene)
    let visibility: "public" | "shared" | "private" = "private";
    if (visibilityParam === "public" || visibilityParam === "shared" || visibilityParam === "private") {
      visibility = visibilityParam;
    } else if (submitShared) {
      visibility = "public";
    }
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
        chapter: folderId || null,
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

    // Invalidate repository cache so subject counts, library, and workspace lists refresh immediately
    invalidateRepositoryCache("resources");

    const redirectPath = resource?.subject?.slug
      ? `/subjects/${resource.subject.slug}`
      : `/library?uploaded=true`;

    if (isFetch) {
      return NextResponse.json({
        success: true,
        resource,
        redirectUrl: redirectPath,
      });
    }

    // HTTP 303 (See Other) forces the browser to navigate using GET instead of re-POSTing
    return NextResponse.redirect(new URL(redirectPath, req.url), 303);
  } catch (err: any) {
    console.error("Upload route uncaught exception:", err);
    return NextResponse.json(
      { error: "Internal server error during upload process." },
      { status: 500 }
    );
  }
}

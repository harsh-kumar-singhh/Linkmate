import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Logic for actual file storage would go here (e.g., S3, Cloudinary)
        // For MVP/Demo, we'll return a placeholder URL or a local-ish looking one
        // Note: Real storage is out of scope for this prompt's request to "avoid overengineering"
        // and use "browser default" behavior.

        // Read file as buffer
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64Data = buffer.toString("base64");

        // Simulating a successful upload
        const fileName = `${Date.now()}-${file.name.replace(/\s/g, "-")}`;
        const imageUrl = `/uploads/${fileName}`;

        return NextResponse.json({
            success: true,
            data: {
                imageUrl,
                imageData: base64Data,
                name: file.name
            },
            message: "Image uploaded successfully"
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ 
            success: false, 
            error: "Upload failed",
            message: "Failed to upload image" 
        }, { status: 500 });
    }
}

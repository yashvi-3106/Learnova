import { NextResponse } from "next/server";
import { queueEmail } from "@/services/emailService";
import { getBulkAnnouncementTemplate } from "@/lib/email/templates";
import { requireAuth } from "@/lib/rbac";
import { connectDb } from "@/lib/mongodb";
import { withErrorHandler, parseJSON } from "@/lib/error-handler";

export const POST = withErrorHandler(async (request) => {
  // Only admins can send bulk emails
  const decodedToken = await requireAuth(request, { roles: ["admin", "institute"] });

  const body = await parseJSON(request);
  const { subject, bodyHtml, bodyText, audience } = body;

  if (!subject || !bodyHtml) {
    return NextResponse.json({ success: false, message: "Missing required fields: subject, bodyHtml" }, { status: 400 });
  }

  const db = await connectDb();
  
  // Find users based on audience
  let query = {};
  if (audience === "parents") {
    query.role = "parent";
  } else if (audience === "students") {
    query.role = "student";
  } else if (audience === "all") {
    query.role = { $in: ["parent", "student", "teacher"] };
  } else {
    return NextResponse.json({ success: false, message: "Invalid audience" }, { status: 400 });
  }

  // Handle user email preferences
  query["notifications.bulkAnnouncements"] = { $ne: false };

  const users = await db.collection("users").find(query, { projection: { email: 1, name: 1 } }).toArray();

  if (users.length === 0) {
    return NextResponse.json({ success: true, message: "No users matched the audience criteria." });
  }

  const template = getBulkAnnouncementTemplate(subject, bodyHtml, bodyText);

  // Queue emails
  for (const user of users) {
    if (user.email) {
      await queueEmail(user.email, template, "announcement");
    }
  }

  return NextResponse.json({
    success: true,
    message: `Successfully queued ${users.length} emails.`,
    count: users.length
  });
});

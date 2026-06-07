import { connectDb } from "@/lib/mongodb";
import { sendEmail } from "@/lib/email/provider";
import logger from "@/utils/logger";

const MAX_EMAILS_PER_SECOND = 10;
const BATCH_SIZE = 50;

/**
 * Pushes an email to the queue to be processed later.
 * @param {string} to 
 * @param {Object} template - The rendered template object { subject, text, html }
 * @param {string} type - Notification type (e.g., 'attendance_alert')
 */
export async function queueEmail(to, template, type = "general") {
  const db = await connectDb();
  await db.collection("email_queue").insertOne({
    to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    type,
    status: "pending",
    attempts: 0,
    createdAt: new Date(),
  });
  
  // Asynchronously trigger processing if not already running
  // In a real environment, this might be triggered by a CRON job instead
  processQueue().catch(err => {
    logger?.error("[EmailService] Failed to process queue in background", { error: err.message });
  });
}

// In-memory lock to prevent concurrent processing in the same instance
let isProcessing = false;

export async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const db = await connectDb();
    
    // Find pending emails (up to BATCH_SIZE)
    const pendingEmails = await db.collection("email_queue")
      .find({ status: "pending" })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    if (pendingEmails.length === 0) {
      isProcessing = false;
      return;
    }

    logger?.info(`[EmailService] Processing batch of ${pendingEmails.length} emails`);

    // Process with rate limit (e.g. 10 emails / second)
    const msPerEmail = 1000 / MAX_EMAILS_PER_SECOND;

    for (const email of pendingEmails) {
      const startTime = Date.now();
      try {
        await db.collection("email_queue").updateOne(
          { _id: email._id },
          { $set: { status: "processing", attempts: email.attempts + 1 } }
        );

        await sendEmail({
          to: email.to,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });

        await db.collection("email_queue").updateOne(
          { _id: email._id },
          { $set: { status: "sent", sentAt: new Date() } }
        );
      } catch (error) {
        logger?.error(`[EmailService] Failed to send email to ${email.to}`, { error: error.message });
        await db.collection("email_queue").updateOne(
          { _id: email._id },
          { $set: { status: email.attempts >= 3 ? "failed" : "pending", error: error.message } }
        );
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < msPerEmail) {
        await new Promise(resolve => setTimeout(resolve, msPerEmail - elapsed));
      }
    }

  } catch (error) {
    logger?.error("[EmailService] Queue processing error", { error: error.message });
  } finally {
    isProcessing = false;
  }
}

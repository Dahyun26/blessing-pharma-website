
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedTypes = [
  "Inquiry",
  "General Inquiry",
  "Purchasing",
  "Quotation",
  "Partnership",
  "Other",
];

// =====================================
// DEPARTMENT EMAIL ROUTING
// =====================================

const departmentNames: Record<string, string> = {
  Inquiry: "Sales",
  "General Inquiry": "Sales",
  Purchasing: "Purchasing",
  Quotation: "Sales",
  Partnership: "Partnerships",
  Other: "General Inquiries",
};

const departmentEmails: Record<string, string> = {
  Inquiry: "blessingpharmacysales@gmail.com",
  "General Inquiry": "blessingpharmacysales@gmail.com",
  Purchasing: "blessingpharmedsuppliestrading@gmail.com",
  Quotation: "blessingpharmacysales@gmail.com",
  Partnership: "blessingpharmedsuppliestrading@gmail.com",
  Other: "blessingpharmedsuppliestrading@gmail.com",
};

const HR_EMAIL = "hrblessingpharma@gmail.com";

Deno.serve(async (req: Request) => {
  const respond = (data: object, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respond({ error: "Method not allowed." }, 405);
  }

  let supabase: ReturnType<typeof createClient> | null = null;
  let uploadedResumePath: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !resendApiKey ||
      !fromEmail
    ) {
      return respond({
        error: "Server configuration is incomplete.",
      }, 500);
    }

    supabase = createClient(supabaseUrl, serviceRoleKey);

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // =====================================
    // APPLICATION SUBMISSION
    // =====================================

    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await req.formData();

      const applicantName = String(
        formData.get("fullName") || ""
      ).trim();

      const applicantEmail = String(
        formData.get("email") || ""
      ).trim();

      const phone = String(
        formData.get("phone") || ""
      ).trim();

      const position = String(
        formData.get("position") || ""
      ).trim();

      const message = String(
        formData.get("message") || ""
      ).trim();

      const consent = String(
        formData.get("applicationConsent") || ""
      );

      const resume = formData.get("resume");

      if (
        !applicantName ||
        !applicantEmail ||
        !position ||
        !(resume instanceof File)
      ) {
        return respond({
          error: "Please complete all required application fields.",
        }, 400);
      }

      if (
        consent !== "true" ||
        applicantName.length > 150 ||
        applicantEmail.length > 254 ||
        phone.length > 30 ||
        position.length > 150 ||
        message.length > 5000
      ) {
        return respond({
          error: "Please check your application details and consent.",
        }, 400);
      }

      if (!emailPattern.test(applicantEmail)) {
        return respond({
          error: "Please provide a valid email address.",
        }, 400);
      }

      if (resume.size === 0 || resume.size > MAX_FILE_SIZE) {
        return respond({
          error: "Your resume must be greater than 0 bytes and no larger than 5 MB.",
        }, 400);
      }

      const originalName = resume.name.toLowerCase();
      const isPdf = originalName.endsWith(".pdf");
      const isDocx = originalName.endsWith(".docx");

      if (!isPdf && !isDocx) {
        return respond({
          error: "Only PDF and DOCX resumes are accepted.",
        }, 400);
      }

      const expectedMime = isPdf
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      if (resume.type && resume.type !== expectedMime) {
        return respond({
          error: "The uploaded file type does not match its extension.",
        }, 400);
      }

      // Create a private, unique storage path.
      const fileExtension = isPdf ? "pdf" : "docx";
      const filePath = `${crypto.randomUUID()}.${fileExtension}`;

      // Upload to the PRIVATE applicant-resumes bucket.
      const { error: uploadError } = await supabase.storage
        .from("applicant-resumes")
        .upload(filePath, resume, {
          contentType: expectedMime,
          upsert: false,
        });

      if (uploadError) {
        console.error("Resume upload error:", uploadError);

        return respond({
          error: "Unable to upload your resume. Please try again.",
        }, 500);
      }

      uploadedResumePath = filePath;

      // Save application details.
      const { data: application, error: databaseError } =
        await supabase
          .from("applications")
          .insert({
            applicant_name: applicantName,
            applicant_email: applicantEmail,
            phone: phone || null,
            position_applied: position,
            resume_path: filePath,
            consent_at: new Date().toISOString(),
            application_status: "New",
          })
          .select("id")
          .single();

      if (databaseError) {
        console.error("Application database error:", databaseError);

        await supabase.storage
          .from("applicant-resumes")
          .remove([filePath]);

        uploadedResumePath = null;

        return respond({
          error: "Unable to save your application. Please try again.",
        }, 500);
      }

      // =====================================
      // GET RESUME FOR EMAIL ATTACHMENT
      // =====================================

      const { data: resumeFile, error: downloadError } =
        await supabase.storage
          .from("applicant-resumes")
          .download(filePath);

      if (downloadError || !resumeFile) {
        console.error("Resume download error:", downloadError);

        return respond({
          success: true,
          emailSent: false,
          message:
            "Your application was saved, but the resume could not be attached to the email.",
          applicationId: application.id,
        });
      }

      // Convert PDF/DOCX into Base64 for Resend.
      const resumeBytes = new Uint8Array(
        await resumeFile.arrayBuffer()
      );

      let binary = "";

      for (let i = 0; i < resumeBytes.length; i++) {
        binary += String.fromCharCode(resumeBytes[i]);
      }

      const resumeBase64 = btoa(binary);

      // =====================================
      // SEND APPLICATION TO HR
      // =====================================

      const emailResponse = await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [HR_EMAIL],
            reply_to: applicantEmail,
            subject: `New Job Application - ${position}`,
            text: `
A new job application has been received.

Department: Human Resources
Recipient: ${HR_EMAIL}

Applicant Name: ${applicantName}
Applicant Email: ${applicantEmail}
Phone Number: ${phone || "Not provided"}
Position Applied For: ${position}

Message:
${message || "No additional message provided."}

Application Reference: ${application.id}
            `,
            attachments: [
              {
                filename: resume.name,
                content: resumeBase64,
              },
            ],
          }),
        }
      );

      if (!emailResponse.ok) {
        const emailError = await emailResponse.text();

        console.error("Application email error:", emailError);

        return respond({
          success: true,
          emailSent: false,
          message:
            "Your application was saved, but the HR notification could not be sent.",
          applicationId: application.id,
        });
      }

      return respond({
        success: true,
        emailSent: true,
        message: "Your application has been submitted successfully.",
        applicationId: application.id,
      });
    }

    // =====================================
    // NORMAL INQUIRY SUBMISSION
    // =====================================

    const body = await req.json();

    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const inquiryType = String(body.subject || "").trim();
    const message = String(body.message || "").trim();

    if (!fullName || !email || !inquiryType || !message) {
      return respond({
        error: "Please complete all required fields.",
      }, 400);
    }

    if (
      fullName.length > 150 ||
      email.length > 254 ||
      phone.length > 30 ||
      message.length > 5000
    ) {
      return respond({
        error: "One or more fields exceed the allowed length.",
      }, 400);
    }

    if (!emailPattern.test(email)) {
      return respond({
        error: "Please provide a valid email address.",
      }, 400);
    }

    if (!allowedTypes.includes(inquiryType)) {
      return respond({
        error: "Invalid inquiry type.",
      }, 400);
    }

    // Save inquiry to Supabase.
    const { data: inquiry, error: databaseError } =
      await supabase
        .from("inquiries")
        .insert({
          full_name: fullName,
          email,
          phone: phone || null,
          inquiry_type: inquiryType,
          message,
        })
        .select("id")
        .single();

    if (databaseError) {
      console.error("Inquiry database error:", databaseError);

      return respond({
        error: "Unable to save your inquiry. Please try again.",
      }, 500);
    }

    // Determine the actual recipient on the server.
    const department = departmentNames[inquiryType];
    const departmentRecipient = departmentEmails[inquiryType];

    // =====================================
    // SEND INQUIRY TO CORRECT DEPARTMENT
    // =====================================

    const emailResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [departmentRecipient],
          reply_to: email,
          subject: `New ${inquiryType} - Blessing Pharma`,
          text: `
New inquiry received.

Department: ${department}
Inquiry Type: ${inquiryType}
Recipient Email: ${departmentRecipient}

Customer Name: ${fullName}
Customer Email: ${email}
Phone Number: ${phone || "Not provided"}

Message:
${message}

Inquiry Reference: ${inquiry.id}
          `,
        }),
      }
    );

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();

      console.error("Inquiry email error:", emailError);

      return respond({
        success: true,
        emailSent: false,
        message:
          "Your inquiry was saved, but the email notification could not be sent.",
        inquiryId: inquiry.id,
      });
    }

    return respond({
      success: true,
      emailSent: true,
      message: "Your inquiry has been submitted successfully.",
      inquiryId: inquiry.id,
    });

  } catch (error) {
    console.error("Unexpected error:", error);

    // Best-effort cleanup if an unexpected error occurs
    // after the resume was uploaded.
    if (supabase && uploadedResumePath) {
      await supabase.storage
        .from("applicant-resumes")
        .remove([uploadedResumePath]);
    }

    return respond({
      error: "An unexpected error occurred. Please try again.",
    }, 500);
  }
});

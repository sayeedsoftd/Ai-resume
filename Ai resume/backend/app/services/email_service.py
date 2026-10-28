import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
from app.core.config import settings
from app.utils.logger import logger


class SMTPEmailService:
    """
    Formal Email Dispatcher for Interview Scheduling and Application Workflow.
    Supports live SMTP servers (e.g. Gmail, SendGrid, Amazon SES) with automatic
    simulated delivery fallback for local development.
    """

    @classmethod
    def send_interview_invitation(
        cls,
        recipient_email: str,
        candidate_name: str,
        job_title: str,
        company_name: str,
        interview_date: str,
        interview_time: str,
        meeting_link: str,
        preparation_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates and dispatches a formal interview appointment email.
        """
        subject = f"Formal Interview Invitation: {job_title} at {company_name}"
        
        # HTML Email Body
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }}
    .header p {{ margin: 8px 0 0; font-size: 14px; opacity: 0.9; }}
    .body {{ padding: 32px 24px; }}
    .greeting {{ font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }}
    .message {{ font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px; }}
    .details-box {{ background-color: #f1f5f9; border-radius: 12px; padding: 20px; border-left: 4px solid #4f46e5; margin-bottom: 24px; }}
    .detail-row {{ display: flex; margin-bottom: 12px; font-size: 13px; }}
    .detail-row:last-child {{ margin-bottom: 0; }}
    .detail-label {{ width: 140px; font-weight: 700; color: #475569; }}
    .detail-value {{ flex: 1; color: #0f172a; font-weight: 600; }}
    .button-container {{ text-align: center; margin: 28px 0; }}
    .btn {{ display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3); }}
    .notes-box {{ background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 16px; font-size: 13px; color: #854d0e; margin-bottom: 24px; }}
    .footer {{ background: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #64748b; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Interview Invitation</h1>
      <p>{company_name} • Hiring & Talent Acquisition</p>
    </div>
    <div class="body">
      <div class="greeting">Dear {candidate_name},</div>
      <div class="message">
        We were impressed with your application and assessment results for the <strong>{job_title}</strong> position. We would like to invite you to a formal interview with our hiring team.
      </div>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Position:</span>
          <span class="detail-value">{job_title}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Company:</span>
          <span class="detail-value">{company_name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">{interview_date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:</span>
          <span class="detail-value">{interview_time}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Meeting Venue / Link:</span>
          <span class="detail-value"><a href="{meeting_link}" style="color: #4f46e5;">{meeting_link}</a></span>
        </div>
      </div>

      <div class="button-container">
        <a href="{meeting_link}" class="btn">Join Interview Meeting</a>
      </div>

      {f'<div class="notes-box"><strong>Preparation Notes from Recruiter:</strong><br>{preparation_notes}</div>' if preparation_notes else ''}

      <div class="message" style="margin-bottom: 0;">
        Please make sure to test your audio, camera, and internet connection ahead of time. If you need to reschedule or have any questions, please reply directly or reach out through the candidate portal.
      </div>
    </div>
    <div class="footer">
      Sent automatically by {settings.PROJECT_NAME}. All rights reserved.
    </div>
  </div>
</body>
</html>
"""

        # Plain Text Fallback
        plain_text = f"""
Dear {candidate_name},

We are pleased to invite you to a formal interview for the {job_title} position at {company_name}.

Interview Details:
- Position: {job_title}
- Company: {company_name}
- Date: {interview_date}
- Time: {interview_time}
- Meeting Link / Venue: {meeting_link}

{f"Preparation Notes: {preparation_notes}" if preparation_notes else ""}

Please join the meeting link at your scheduled time:
{meeting_link}

Best regards,
Hiring Team at {company_name}
{settings.PROJECT_NAME}
"""

        smtp_user = getattr(settings, "SMTP_USER", "")
        smtp_password = getattr(settings, "SMTP_PASSWORD", "")
        smtp_host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
        smtp_port = getattr(settings, "SMTP_PORT", 587)
        from_email = getattr(settings, "EMAILS_FROM_EMAIL", "no-reply@airesumesystem.com")

        # Live SMTP delivery if credentials present
        if smtp_user and smtp_password:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"{company_name} via AI Resume <{from_email}>"
                msg["To"] = recipient_email

                part1 = MIMEText(plain_text, "plain")
                part2 = MIMEText(html_content, "html")
                msg.attach(part1)
                msg.attach(part2)

                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(from_email, [recipient_email], msg.as_string())

                logger.info(f"[EMAIL] Successfully sent live interview invitation email to {recipient_email}")
                return {"success": True, "mode": "live_smtp", "recipient": recipient_email}
            except Exception as e:
                logger.error(f"[EMAIL] Live SMTP send failed: {e}. Falling back to simulated delivery.")

        # Development / Simulation Fallback (logged cleanly)
        logger.info(
            f"\n"
            f"=================================================================\n"
            f"[FORMAL INTERVIEW EMAIL DISPATCHED (SIMULATED)]\n"
            f"To: {recipient_email} ({candidate_name})\n"
            f"Subject: {subject}\n"
            f"Scheduled Date/Time: {interview_date} at {interview_time}\n"
            f"Meeting Link: {meeting_link}\n"
            f"Notes: {preparation_notes or 'None'}\n"
            f"================================================================="
        )
        return {
            "success": True,
            "mode": "simulated",
            "recipient": recipient_email,
            "subject": subject,
            "interview_date": interview_date,
            "interview_time": interview_time,
            "meeting_link": meeting_link,
        }

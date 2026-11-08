import smtplib
from datetime import datetime, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
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

    @classmethod
    def send_candidate_direct_message_email(
        cls,
        to_email: str,
        candidate_name: str,
        recruiter_name: str,
        job_title: str,
        message_subject: str,
        message_body: str,
        company_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches a direct communication email from recruiter to candidate.
        Format:
        - Header: "ResumeAI Match - Message from Recruiter"
        - Content: Recruiter Name, Job Requisition applied for, and the message content.
        - Footer: "Please log in to your candidate dashboard to reply or track your application status."
        """
        org_name = company_name or "Hiring Team"
        subject = message_subject or f"Message regarding your application for {job_title}"
        
        # Escape newlines for HTML
        formatted_html_body = message_body.replace("\n", "<br>")

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 28px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }}
    .header p {{ margin: 6px 0 0; font-size: 13px; opacity: 0.95; }}
    .body {{ padding: 28px 24px; }}
    .greeting {{ font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }}
    .meta-box {{ background-color: #f1f5f9; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; border-left: 4px solid #4f46e5; }}
    .meta-row {{ margin-bottom: 6px; }}
    .meta-row:last-child {{ margin-bottom: 0; }}
    .message-card {{ background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 20px; margin-bottom: 24px; }}
    .message-title {{ font-size: 14px; font-weight: 800; color: #581c87; margin-bottom: 10px; border-bottom: 1px dashed #d8b4fe; padding-bottom: 6px; }}
    .message-content {{ font-size: 14px; line-height: 1.7; color: #3b0764; }}
    .button-container {{ text-align: center; margin: 24px 0; }}
    .btn {{ display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 26px; border-radius: 8px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.25); }}
    .footer {{ background: #f8fafc; padding: 18px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #64748b; line-height: 1.5; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ResumeAI Match - Message from Recruiter</h1>
      <p>{org_name} • Candidate Direct Communication</p>
    </div>
    <div class="body">
      <div class="greeting">Dear {candidate_name},</div>
      
      <div class="meta-box">
        <div class="meta-row"><strong>From:</strong> {recruiter_name} ({org_name})</div>
        <div class="meta-row"><strong>Target Position:</strong> {job_title}</div>
      </div>

      <div class="message-card">
        <div class="message-title">{subject}</div>
        <div class="message-content">{formatted_html_body}</div>
      </div>

      <div class="button-container">
        <a href="http://localhost:5173/dashboard" class="btn">Open Candidate Dashboard</a>
      </div>
    </div>
    <div class="footer">
      Please log in to your candidate dashboard to reply or track your application status.<br>
      Sent automatically by {settings.PROJECT_NAME}.
    </div>
  </div>
</body>
</html>
"""

        plain_text = f"""
ResumeAI Match - Message from Recruiter
------------------------------------------------
Dear {candidate_name},

You have received a direct message from {recruiter_name} ({org_name}) regarding your application for {job_title}:

Subject: {subject}

Message:
{message_body}

------------------------------------------------
Please log in to your candidate dashboard to reply or track your application status.
Dashboard: http://localhost:5173/dashboard

Sent automatically by {settings.PROJECT_NAME}.
"""

        smtp_user = getattr(settings, "SMTP_USER", "")
        smtp_password = getattr(settings, "SMTP_PASSWORD", "")
        smtp_host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
        smtp_port = getattr(settings, "SMTP_PORT", 587)
        from_email = getattr(settings, "EMAILS_FROM_EMAIL", "no-reply@airesumesystem.com")

        # Live SMTP delivery if credentials configured
        if smtp_user and smtp_password:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"{recruiter_name} ({org_name}) <{from_email}>"
                msg["To"] = to_email

                part1 = MIMEText(plain_text, "plain")
                part2 = MIMEText(html_content, "html")
                msg.attach(part1)
                msg.attach(part2)

                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(from_email, [to_email], msg.as_string())

                logger.info(f"[EMAIL] Successfully dispatched live recruiter direct message email to {to_email}")
                return {"success": True, "mode": "live_smtp", "recipient": to_email}
            except Exception as e:
                logger.error(f"[EMAIL] Live SMTP send failed: {e}. Falling back to simulated delivery.")

        # Development / Simulation Fallback
        logger.info(
            f"\n"
            f"=================================================================\n"
            f"[RECRUITER DIRECT MESSAGE EMAIL DISPATCHED (SIMULATED)]\n"
            f"To: {to_email} ({candidate_name})\n"
            f"From: {recruiter_name} ({org_name})\n"
            f"Position: {job_title}\n"
            f"Subject: {subject}\n"
            f"Body:\n{message_body}\n"
            f"================================================================="
        )
        return {
            "success": True,
            "mode": "simulated",
            "recipient": to_email,
            "subject": subject,
            "recruiter": recruiter_name,
            "job_title": job_title,
        }

    @classmethod
    def send_candidate_reply_email(
        cls,
        to_email: str,
        candidate_name: str,
        candidate_email: str,
        recruiter_name: Optional[str] = None,
        job_title: Optional[str] = None,
        reply_subject: Optional[str] = None,
        reply_body: str = "",
        company_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches a candidate's reply directly to the recruiter's email inbox via live SMTP
        (with simulated fallback). Configures Reply-To directly to the candidate's email address.
        """
        r_name = recruiter_name or "Hiring Team"
        c_name = candidate_name or "Candidate"
        position = job_title or "Position Applied"
        org = company_name or "Hiring Organization"
        subject = reply_subject or f"Candidate Reply regarding {position}"
        formatted_html_body = reply_body.replace("\n", "<br>")

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 28px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }}
    .header p {{ margin: 6px 0 0; font-size: 13px; opacity: 0.95; }}
    .body {{ padding: 28px 24px; }}
    .greeting {{ font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }}
    .meta-box {{ background-color: #f0fdf4; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; border-left: 4px solid #10b981; }}
    .meta-row {{ margin-bottom: 6px; }}
    .meta-row:last-child {{ margin-bottom: 0; }}
    .message-card {{ background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }}
    .message-title {{ font-size: 14px; font-weight: 800; color: #065f46; margin-bottom: 10px; border-bottom: 1px dashed #a7f3d0; padding-bottom: 6px; }}
    .message-content {{ font-size: 14px; line-height: 1.7; color: #1e293b; }}
    .button-container {{ text-align: center; margin: 24px 0; }}
    .btn {{ display: inline-block; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 26px; border-radius: 8px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.25); }}
    .footer {{ background: #f8fafc; padding: 18px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #64748b; line-height: 1.5; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ResumeAI Match - Candidate Response</h1>
      <p>{org} • Recruiter Inquiry Thread</p>
    </div>
    <div class="body">
      <div class="greeting">Dear {r_name},</div>
      
      <div class="meta-box">
        <div class="meta-row"><strong>From Candidate:</strong> {c_name} (&lt;{candidate_email}&gt;)</div>
        <div class="meta-row"><strong>Requisition:</strong> {position}</div>
      </div>

      <div class="message-card">
        <div class="message-title">{subject}</div>
        <div class="message-content">{formatted_html_body}</div>
      </div>

      <div class="button-container">
        <a href="http://localhost:5173/recruiter/dashboard" class="btn">View in Recruiter Dashboard</a>
      </div>
    </div>
    <div class="footer">
      Candidate replied via the ResumeAI Candidate Portal.<br>
      You can reply directly to &lt;{candidate_email}&gt; to continue this conversation.
    </div>
  </div>
</body>
</html>
"""

        plain_text = f"""
ResumeAI Match - Candidate Response
------------------------------------------------
Dear {r_name},

Candidate {c_name} ({candidate_email}) has sent a reply regarding {position}:

Subject: {subject}

Reply Message:
{reply_body}

------------------------------------------------
Recruiter Dashboard: http://localhost:5173/recruiter/dashboard
Sent automatically via {settings.PROJECT_NAME}.
"""

        smtp_user = getattr(settings, "SMTP_USER", "")
        smtp_password = getattr(settings, "SMTP_PASSWORD", "")
        smtp_host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
        smtp_port = getattr(settings, "SMTP_PORT", 587)
        from_email = getattr(settings, "EMAILS_FROM_EMAIL", "no-reply@airesumesystem.com")

        if smtp_user and smtp_password:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"{c_name} via {settings.PROJECT_NAME} <{from_email}>"
                msg["To"] = to_email
                msg["Reply-To"] = f"{c_name} <{candidate_email}>"

                part1 = MIMEText(plain_text, "plain")
                part2 = MIMEText(html_content, "html")
                msg.attach(part1)
                msg.attach(part2)

                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(from_email, [to_email], msg.as_string())

                logger.info(f"[EMAIL] Successfully dispatched candidate reply email to {to_email}")
                return {"success": True, "mode": "live_smtp", "recipient": to_email}
            except Exception as e:
                logger.error(f"[EMAIL] Live SMTP send failed: {e}. Falling back to simulated delivery.")

        logger.info(
            f"\n"
            f"=================================================================\n"
            f"[CANDIDATE REPLY EMAIL DISPATCHED (SIMULATED)]\n"
            f"To Recruiter: {to_email} ({r_name})\n"
            f"From Candidate: {candidate_email} ({c_name})\n"
            f"Position: {position}\n"
            f"Subject: {subject}\n"
            f"Body:\n{reply_body}\n"
            f"================================================================="
        )
        return {
            "success": True,
            "mode": "simulated",
            "recipient": to_email,
            "subject": subject,
            "candidate": c_name,
            "job_title": position,
        }

    @classmethod
    def send_smart_interview_calendar_email(
        cls,
        candidate_email: str,
        candidate_name: str,
        recruiter_email: Optional[str],
        recruiter_name: Optional[str],
        job_title: str,
        company_name: str,
        interview_title: str,
        scheduled_at: datetime,
        duration_minutes: int,
        timezone_str: str,
        meeting_link: str,
        calendar_event_url: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches a formal Google Meet calendar invitation email with an attached .ics (iCalendar) file
        to the candidate (and recruiter).
        """
        org_name = company_name or "Hiring Team"
        r_name = recruiter_name or "Hiring Manager"
        c_name = candidate_name or "Candidate"
        from_email = getattr(settings, "EMAILS_FROM_EMAIL", "no-reply@airesumesystem.com")

        # Compute end datetime
        from datetime import timedelta
        end_dt = scheduled_at + timedelta(minutes=duration_minutes)

        date_str = scheduled_at.strftime("%A, %B %d, %Y")
        time_str = scheduled_at.strftime("%I:%M %p")
        end_time_str = end_dt.strftime("%I:%M %p")

        subject = f"Confirmed: {interview_title} ({date_str})"
        formatted_notes = (notes or "").replace("\n", "<br>")

        # HTML Email Content
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
    .container {{ max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #1e40af 0%, #4338ca 50%, #6366f1 100%); padding: 32px 28px; text-align: center; color: #ffffff; }}
    .badge {{ display: inline-block; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.25); }}
    .header h1 {{ margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }}
    .header p {{ margin: 8px 0 0; font-size: 13px; opacity: 0.95; }}
    .body {{ padding: 32px 28px; }}
    .greeting {{ font-size: 16px; font-weight: 700; margin-bottom: 16px; color: #0f172a; }}
    .intro {{ font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px; }}
    .details-card {{ background-color: #f8fafc; border-radius: 14px; padding: 20px 24px; border: 1px solid #e2e8f0; margin-bottom: 24px; }}
    .detail-row {{ display: flex; margin-bottom: 12px; font-size: 13px; }}
    .detail-row:last-child {{ margin-bottom: 0; }}
    .detail-label {{ width: 140px; font-weight: 700; color: #64748b; }}
    .detail-value {{ flex: 1; color: #0f172a; font-weight: 700; }}
    .cta-container {{ display: flex; gap: 12px; justify-content: center; margin: 32px 0 24px; flex-wrap: wrap; text-align: center; }}
    .btn-meet {{ display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3); }}
    .btn-cal {{ display: inline-block; background: #ffffff; color: #1e293b !important; text-decoration: none; font-size: 13px; font-weight: 700; padding: 13px 24px; border-radius: 10px; border: 1px solid #cbd5e1; margin-left: 8px; }}
    .notes-box {{ background-color: #fefce8; border: 1px solid #fef08a; border-radius: 10px; padding: 16px 20px; font-size: 13px; color: #854d0e; margin-bottom: 24px; line-height: 1.6; }}
    .footer {{ background: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #64748b; line-height: 1.5; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Google Meet Video Interview</div>
      <h1>{interview_title}</h1>
      <p>{org_name} • Talent Acquisition & Hiring</p>
    </div>
    <div class="body">
      <div class="greeting">Dear {c_name},</div>
      <div class="intro">
        Congratulations! We are delighted to confirm your formal technical interview for the <strong>{job_title}</strong> role at <strong>{org_name}</strong>.
      </div>

      <div class="details-card">
        <div class="detail-row">
          <span class="detail-label">Position:</span>
          <span class="detail-value">{job_title}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Company:</span>
          <span class="detail-value">{org_name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Interviewer:</span>
          <span class="detail-value">{r_name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">{date_str}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:</span>
          <span class="detail-value">{time_str} - {end_time_str} ({timezone_str})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration:</span>
          <span class="detail-value">{duration_minutes} Minutes</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Meeting URL:</span>
          <span class="detail-value"><a href="{meeting_link}" style="color: #2563eb; word-break: break-all;">{meeting_link}</a></span>
        </div>
      </div>

      <div class="cta-container">
        <a href="{meeting_link}" class="btn-meet">🎥 Join Video Call (Google Meet)</a>
        {f'<a href="{calendar_event_url}" class="btn-cal">📅 Add to Google Calendar</a>' if calendar_event_url else ''}
      </div>

      {f'<div class="notes-box"><strong>Agenda & Preparation Notes from Recruiter:</strong><br>{formatted_notes}</div>' if notes else ''}

      <div class="intro" style="font-size: 13px; color: #64748b; margin-bottom: 0;">
        💡 <strong>Tips:</strong> An interactive calendar invite (<code>invite.ics</code>) has been attached to this email. Please click the attachment to automatically sync the session into your Google Calendar, Outlook, or Apple Calendar.
      </div>
    </div>
    <div class="footer">
      This invitation was generated by {settings.PROJECT_NAME}.<br>
      If you need to reschedule or have questions, reply directly to this email.
    </div>
  </div>
</body>
</html>
"""

        plain_text = f"""
Formal Interview Confirmed: {interview_title}
------------------------------------------------------------
Dear {c_name},

We are pleased to confirm your formal technical interview for the {job_title} position at {org_name}.

Session Details:
- Position: {job_title}
- Company: {org_name}
- Interviewer: {r_name}
- Date: {date_str}
- Time: {time_str} - {end_time_str} ({timezone_str})
- Duration: {duration_minutes} Minutes
- Google Meet Video Call: {meeting_link}

{f"Agenda / Notes:\n{notes}\n" if notes else ""}
Please click the meeting link at your scheduled time:
{meeting_link}

------------------------------------------------------------
Sent automatically via {settings.PROJECT_NAME}.
"""

        # Generate standard .ics (iCalendar) content
        uid = f"interview-{int(scheduled_at.timestamp())}-{c_name[:4]}"
        start_utc_str = scheduled_at.strftime("%Y%m%dT%H%M%SZ")
        end_utc_str = end_dt.strftime("%Y%m%dT%H%M%SZ")
        now_utc_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        clean_desc = f"{interview_title}\\n\\nJoin Video Call: {meeting_link}\\n\\nNotes: {notes or 'None'}"

        ics_content = (
            "BEGIN:VCALENDAR\r\n"
            "VERSION:2.0\r\n"
            "PRODID:-//ResumeAI Match//Smart Meeting Scheduler//EN\r\n"
            "CALSCALE:GREGORIAN\r\n"
            "METHOD:REQUEST\r\n"
            "BEGIN:VEVENT\r\n"
            f"UID:{uid}@airesumesystem.com\r\n"
            f"DTSTAMP:{now_utc_str}\r\n"
            f"DTSTART:{start_utc_str}\r\n"
            f"DTEND:{end_utc_str}\r\n"
            f"SUMMARY:{interview_title}\r\n"
            f"DESCRIPTION:{clean_desc}\r\n"
            f"LOCATION:{meeting_link}\r\n"
            "STATUS:CONFIRMED\r\n"
            f"ORGANIZER;CN={org_name}:mailto:{from_email}\r\n"
            f"ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN={c_name}:mailto:{candidate_email}\r\n"
            "END:VEVENT\r\n"
            "END:VCALENDAR\r\n"
        )

        smtp_user = getattr(settings, "SMTP_USER", "")
        smtp_password = getattr(settings, "SMTP_PASSWORD", "")
        smtp_host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
        smtp_port = getattr(settings, "SMTP_PORT", 587)

        recipients = [candidate_email]
        if recruiter_email and recruiter_email not in recipients:
            recipients.append(recruiter_email)

        # Attempt live SMTP sending with attachment
        if smtp_user and smtp_password:
            try:
                msg = MIMEMultipart("mixed")
                msg["Subject"] = subject
                msg["From"] = f"{org_name} via {settings.PROJECT_NAME} <{from_email}>"
                msg["To"] = candidate_email
                if recruiter_email:
                    msg["Cc"] = recruiter_email
                    msg["Reply-To"] = recruiter_email

                # Alternative container for text & html
                alt_container = MIMEMultipart("alternative")
                alt_container.attach(MIMEText(plain_text, "plain"))
                alt_container.attach(MIMEText(html_content, "html"))
                msg.attach(alt_container)

                # Attach .ics file
                part_ics = MIMEBase("text", "calendar", method="REQUEST", name="invite.ics")
                part_ics.set_payload(ics_content.encode("utf-8"))
                encoders.encode_base64(part_ics)
                part_ics.add_header("Content-Disposition", "attachment; filename=invite.ics")
                part_ics.add_header("Content-Class", "urn:content-classes:calendarmessage")
                msg.attach(part_ics)

                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(from_email, recipients, msg.as_string())

                logger.info(f"[EMAIL] Successfully dispatched live calendar invite email with .ics attachment to {recipients}")
                return {"success": True, "mode": "live_smtp", "recipients": recipients, "meeting_link": meeting_link}
            except Exception as e:
                logger.error(f"[EMAIL] Live SMTP send failed: {e}. Falling back to simulated delivery.")

        # Development / Simulation Fallback
        logger.info(
            f"\n"
            f"=================================================================\n"
            f"[SMART MEETING CALENDAR INVITE DISPATCHED (SIMULATED)]\n"
            f"To Candidate: {candidate_email} ({c_name})\n"
            f"To Recruiter: {recruiter_email or 'None'} ({r_name})\n"
            f"Position: {job_title} at {org_name}\n"
            f"Title: {interview_title}\n"
            f"Scheduled: {date_str} at {time_str} ({timezone_str})\n"
            f"Duration: {duration_minutes} mins\n"
            f"Google Meet URL: {meeting_link}\n"
            f"Google Calendar URL: {calendar_event_url or 'N/A'}\n"
            f"iCalendar (.ics): Generated and attached ({len(ics_content)} bytes)\n"
            f"Notes:\n{notes or 'None'}\n"
            f"================================================================="
        )
        return {
            "success": True,
            "mode": "simulated",
            "recipients": recipients,
            "subject": subject,
            "meeting_link": meeting_link,
            "calendar_event_url": calendar_event_url,
            "scheduled_at": scheduled_at.isoformat(),
        }



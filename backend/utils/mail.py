import os
from threading import Thread
from flask import current_app
from mailersend import emails

# --------------------------------------------------------------------
# 1️⃣ FUNCTION: Send email using MailerSend
# --------------------------------------------------------------------
def send_mailersend_email(from_email, to_email, subject, html_content, text_content=None):
    """
    Send an email using MailerSend API.
    """
    try:
        api_key = os.environ.get('MAILERSEND_API_KEY')
        print(f"🔍 DEBUG: API Key exists: {bool(api_key)}")
        if api_key:
            print(f"🔍 DEBUG: API Key starts with: {api_key[:15]}...")
            print(f"🔍 DEBUG: API Key length: {len(api_key)}")
        
        if not api_key:
            raise ValueError("MAILERSEND_API_KEY not set in environment variables.")

        mailer = emails.NewEmail(api_key)

        # Ensure 'to_email' is always a list
        if isinstance(to_email, str):
            to_email = [to_email]

        # Build the message body
        mail_body = {
            "from": {"email": from_email, "name": "ERP Support"},
            "to": [{"email": addr} for addr in to_email],
            "subject": subject,
            "html": html_content,
            "text": text_content or html_content,
        }

        response = mailer.send(mail_body)
        print(f"✅ Email sent successfully to {to_email}, response: {response}")
        return True

    except Exception as e:
        print(f"❌ Failed to send MailerSend email: {e}")
        return False


# --------------------------------------------------------------------
# 2️⃣ FUNCTION: Send email asynchronously (non-blocking)
# --------------------------------------------------------------------
def send_email_async(app, to_email, subject, html_content, text_content=None):
    """
    Runs the MailerSend email sending in a background thread
    with Flask app context.
    """
    with app.app_context():
        send_mailersend_email(
            current_app.config.get('MAILERSEND_FROM_EMAIL'),
            to_email,
            subject,
            html_content,
            text_content
        )

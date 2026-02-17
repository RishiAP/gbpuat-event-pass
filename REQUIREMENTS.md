Implement the following changes to the existing system to introduce structured, event-based template management with strict input rules and production-grade validation.

**Goal:**
Enable reliable handling of dynamic templates by enforcing format-specific inputs — **MJML only for emails** and **HTML only for invitation PDFs** — while applying dual-layer validation (frontend + backend) and storing only sanitized HTML in the database.

---

### 1. Email Template Support (MJML → HTML Only)

* Accept **only MJML** for email templates. Reject raw HTML submissions.
* Send MJML to the backend for compilation into responsive HTML.
* Sanitize the compiled HTML before persistence.
* **Do NOT store MJML.** Persist only the final HTML in MongoDB.
* Associate each template with its respective event.

**Validation Rules:**

* Automatically reject invalid MJML.
* Detect template variables using a structured format such as `{{variable_name}}`.
* Ensure templates meet basic structural requirements before saving.

---

### 2. Invitation PDF Templates (HTML Only)

* Accept **only clean HTML** templates for invitation PDFs. Reject MJML inputs.
* Sanitize HTML to prevent unsafe markup or script injection.
* Store the validated HTML in MongoDB linked to the corresponding event.

**Validation Rules:**

* Enforce proper HTML structure.
* Detect and extract required variables.
* Reject malformed templates.

---

### 3. Dual-Layer Variable Detection & Validation

**Frontend (Early Detection):**

* Detect variables in real time while admins create templates.
* Display extracted variables clearly.
* Warn users about missing or malformed variables before submission.
* Provide immediate, user-friendly validation feedback.

**Backend (Final Enforcement):**

* Re-parse all templates regardless of frontend checks.
* Never trust client-side validation alone.
* Reject templates that fail structural or variable validation.
* Prevent email sending or PDF generation if required variables are missing at runtime.
* Return clear, actionable error responses.

---

### 4. Database / Model Updates

Update or introduce MongoDB schemas to support:

* Event-linked templates
* Template type (`email_html`, `pdf_html`)
* Sanitized HTML
* Extracted variables
* Required variables
* Template metadata (name, timestamps, optional versioning)

Ensure schemas are optimized for scalability, maintainability, and efficient querying.

---

### 5. Backend Enhancements

* Build or update secure APIs to create, update, fetch, and delete templates per event.
* Perform MJML → HTML conversion strictly on the server.
* Enforce format restrictions (MJML for emails, HTML for PDFs).
* Centralize sanitization, validation, and error handling.
* Implement event-level access control.
* Treat backend validation as the ultimate authority.

---

### 6. Frontend Adjustments

Enhance the admin interface to:

* Provide an MJML editor for email templates.
* Provide an HTML editor for PDF templates.
* Allow previewing templates using backend-generated HTML.
* Display detected variables.
* Surface validation warnings before submission.
* Enable structured template management per event.

Focus on a clean, professional UX with proactive feedback.

---

### 7. Template Usage Integration

* Use stored HTML templates when sending emails or generating invitation PDFs.
* Replace variables dynamically at runtime.
* Perform a final validation check before execution.
* Block sending or PDF generation if required data is missing.

---

### 8. Architecture Expectations

* Maintain clear separation of concerns (models, services, controllers, routes).
* Write modular, reusable, production-grade code.
* Ensure consistency between frontend detection and backend enforcement.
* Optimize for security, performance, and long-term scalability.

The implementation should strengthen the existing system while enforcing strict template formats, early error detection, secure backend validation, and efficient storage practices.
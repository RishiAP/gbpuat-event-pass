import User from "@/types/User";
import jwt from "jsonwebtoken";

const InvitationTemplate = (
  user: User,
  event_id: string,
  verifier: string,
  enclosure_no: string,
  entry_gate: string | null
) => {
  const qrToken = jwt.sign(
    { event: event_id, email: user.email },
    String(process.env.JWT_USER_QR_SECRET)
  );

  // Determine type of user
  const isStudent = Boolean(user.college_id);
  const isStaff = !isStudent && Boolean(user.college);
  const isOther = !isStudent && !isStaff;

  // Fallback photo
  const photo =
    user.photo ??
    "https://res.cloudinary.com/dnxfq38fr/image/upload/v1729400669/gbpuat-event-pass/viukl6evcdn1aj7rgqbb.png";

  // Generate dynamic details block
  let userDetails = "";

  if (isStudent) {
    userDetails = `
      <div class="detail-row">
        <strong>ID No.</strong>
        <strong class="span"><span>:</span><span>${user.college_id}</span></strong>
      </div>
      <div class="detail-row">
        <strong>Hostel</strong>
        <strong class="span"><span>:</span><span>${user.hostel?.name ?? "N/A"}</span></strong>
      </div>
    `;
  } else if (isStaff) {
    userDetails = `
      <div class="detail-row">
        <strong>Designation</strong>
        <strong class="span"><span>:</span><span>${user.designation ?? "N/A"}</span></strong>
      </div>
      ${
        user.department
          ? `<div class="detail-row">
              <strong>Department</strong>
              <strong class="span"><span>:</span><span>${user.department.name}</span></strong>
            </div>`
          : ""
      }
      <div class="detail-row">
        <strong>College</strong>
        <strong class="span"><span>:</span><span>${user.college?.name ?? "N/A"}</span></strong>
      </div>
    `;
  } else {
    userDetails = `
      <div class="detail-row">
        <strong>Visitor Type</strong>
        <strong class="span"><span>:</span><span>Guest</span></strong>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>36th Convocation Invitation</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: #ffffff;
      font-family: 'Times New Roman', Times, serif;
    }

    .container { max-width: 800px; margin: 0 auto; }
    .university-logo { width: 115px; height: auto; margin: 7px 0; }
    .profile-section { display: grid; align-items: center; grid-template-columns: auto 1fr; gap: 2rem; margin: 1rem 0; padding: 0.5rem 1.75rem; border: 1px solid #ddd; border-radius: 8px; }
    .profile-image { width: 150px; height: 200px; border-radius: 6px; object-fit: cover; border: 1px solid #ccc; }
    .profile-details { display: grid; gap: 0.3rem; }
    .detail-row { display: flex; font-size: 20px; }
    .detail-row strong { display: flex; align-items: start; width: 200px; }
    .detail-row .span { width: 100%; display: flex; gap: 1.5rem; }
    .contact_details { margin: 0 8rem; justify-content: space-between; display: flex; }

    @media print {
      .page-break { page-break-before: always; }
      @page { size: A4; margin: 20mm; }
    }

    :root {
      --primary-blue: #002066;
      --accent-red: #c00000;
      --secondary-blue: #0070c0;
      --dark-blue: #0a0d84;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="page-break text-center">
      <img src="https://res.cloudinary.com/dnxfq38fr/image/upload/v1729400669/gbpuat-event-pass/viukl6evcdn1aj7rgqbb.png" alt="University Logo" class="university-logo">

      <h3 style="color: #990000; font-size: 25px;" class="mt-1">
        Vice-Chancellor, Board of Management and Academic Council
      </h3>

      <h3 style="color: #00b050; font-size: 24px;">G.B. Pant University of Agriculture and Technology, Pantnagar</h3>
      <h3 style="font-size: 20px;">cordially invite you to the</h3>
      <h3 style="color: #00b050;"><strong>XXXVI CONVOCATION</strong></h3>

      <div class="text-center">
        <h6 style="color: rgb(32, 30, 30); font-size: 17px;">to be held on</h6>
        <h4 style="color: rgb(33, 33, 149); font-size: 20px; margin-bottom: 2px;">
          <strong>Wednesday, 27 November, 2024 at 11:00 a.m.</strong>
        </h4>
        <h6 style="color: rgb(32, 30, 30); font-size: 17px; margin-bottom: 2px;">at</h6>
        <h4 style="color: rgb(33, 33, 149); font-size: 20px;">
          <strong>Convocation Ground of the University.</strong>
        </h4>
      </div>

      <img src="https://api.qrserver.com/v1/create-qr-code/?size=196x196&data=${qrToken}" alt="QR Code" class="mt-3" style="width: 196px; height: 196px;">

      <div class="profile-section">
        <img src="${photo}" alt="Profile Image" class="profile-image">
        <div class="profile-details">
          <div class="detail-row">
            <strong>Name</strong>
            <strong class="span"><span>:</span><span>${user.name}</span></strong>
          </div>
          ${userDetails}
          <div class="detail-row">
            <strong>Aadhar No.</strong>
            <strong class="span"><span>:</span><span>${user.aadhar ?? "N/A"}</span></strong>
          </div>
          <div class="detail-row">
            <strong>Main Gate</strong>
            <strong class="span"><span>:</span><span>${verifier}</span></strong>
          </div>
          <div class="detail-row">
            <strong>Entry Gate</strong>
            <strong class="span"><span>:</span><span>${entry_gate ?? "N/A"}</span></strong>
          </div>
          <div class="detail-row">
            <strong>Enclosure No.</strong>
            <strong class="span"><span>:</span><span>${enclosure_no}</span></strong>
          </div>
        </div>
      </div>

      <h4 style="font-size: 17px;">R.S.V.P</h4>
      <h4 style="color: var(--secondary-blue); font-size: 24px;">Registrar</h4>

      <div class="contact_details">
        <h6>Ph. 05944-233640</h6>
        <h6>Mobile: 9528023394</h6>
      </div>

      <div>
        <p style="color: rgb(150, 25, 0); margin-top: 1rem;">
          PS: Please bring a printout of this card for QR code scanning at the Security Gate for Pandal Entry.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

export default InvitationTemplate;
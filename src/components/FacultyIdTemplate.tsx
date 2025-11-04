import Event from '@/types/Event'
import User from '@/types/User'
import React from 'react'
import jwt from "jsonwebtoken";

const FacultyIdTemplate = (event: Event, user: User) => {
    const qrToken = jwt.sign(
        { event: event._id, email: user.email },
        String(process.env.JWT_USER_QR_SECRET)
      );
      const userEvent = (user.events as any).get(event._id);
  return (
    `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Faculty ID Card - CR-100</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css" rel="stylesheet">
    <style>
        html,body{
            max-width: fit-content;
            max-height: fit-content;
        }
        /*  ID Card Design (Print-Ready)
            Size: 100mm × 64mm
            DPI: 300 (Recommended for high-quality print)
            Pixel Dimensions: 1181px × 756px */
        .id-card {
            width: 1181px;
            height: 756px;
            background: white;
            border-radius: 38px;
            overflow: hidden;
            position: relative;
        }

        .card-header-custom {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 56px 32px 25px 32px;
            display: flex;
            align-items: center;
        }

        .logo-container {
            width: 100px;
            height: 100px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            overflow: hidden;
        }

        .logo-container img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .header-text {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .college-name {
            font-size: 32px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 1px;
            line-height: 1.2;
            text-align: center;
        }

        .event-name {
            font-size: 28px;
            margin: 6px 0 0 0;
            opacity: 0.95;
            font-weight: 600;
            letter-spacing: 1.5px;
            text-align: center;
        }

        .card-body-custom {
            padding: 32px;
            display: flex;
            gap: 32px;
            height: calc(100% - 194px);
        }

        .details-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .info-group {
            margin-bottom: 16px;
        }

        .info-label {
            font-size: 25px;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 3px;
            font-weight: 600;
        }

        .info-value {
            font-size: 35px;
            color: #212529;
            font-weight: 600;
            line-height: 1.2;
            word-wrap: break-word;
        }

        .info-value.large {
            font-size: 41px;
            font-weight: 700;
        }

        .bottom-section {
            display: flex;
            gap: 19px;
            margin-top: auto;
            padding-bottom: 44px;
        }

        .info-box {
            flex: 0.7;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 3px solid #dee2e6;
            border-radius: 19px;
            padding: 13px 19px;
        }

        .info-box .info-label {
            font-size: 22px;
            margin-bottom: 3px;
        }

        .info-box .info-value {
            font-size: 35px;
            font-weight: 700;
        }

        .aadhar-box {
            background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
            border-color: #feb2b2;
            flex: 1.6;
        }

        .aadhar-box .info-value {
            font-family: 'Courier New', monospace;
            color: #c53030;
            font-size: 30px;
            letter-spacing: 1px;
        }

        .photo-section {
            width: 314px;
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
        }

        .photo-container {
            width: 235px;
            height: 314px;
            background: #f8f9fa;
        }

        .photo-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .qr-section {
            width: 164px;
            height: 164px;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 13px;
        }

        .qr-section img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .bottom-stripe {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 9px;
            background: linear-gradient(90deg, #1e3c72 0%, #2a5298 100%);
        }
    </style>
</head>

<body>
    <!-- CR-100 ID Card -->
    <div class="id-card">
        <!-- Header with Logo & Text -->
        <div class="card-header-custom">
            <div class="logo-container">
                <img src="https://res.cloudinary.com/dnxfq38fr/image/upload/v1762230148/gbpuat_logo_100px_off5hr.png"
                    alt="Logo">
            </div>
            <div class="header-text">
                <div class="college-name">G.B. PANT UNIVERSITY OF AGRICULTURE & TECHNOLOGY</div>
                <div class="event-name">${event.title}</div>
            </div>
        </div>

        <!-- Body -->
        <div class="card-body-custom">
            <!-- Left Section: Details -->
            <div class="details-section">
                <div>
                    <div class="info-group">
                        <div class="info-label">Name</div>
                        <div class="info-value large">${user.name}</div>
                    </div>

                    <div class="info-group">
                        <div class="info-label">Designation</div>
                        <div class="info-value">${user.designation}</div>
                    </div>

                    <div class="info-group">
                        <div class="info-label">College</div>
                        <div class="info-value">${user.college?.name}</div>
                    </div>

                    <div class="info-group">
                        <div class="info-label">Department</div>
                        <div class="info-value">${user.department?.name}</div>
                    </div>
                </div>

                <!-- Bottom Info Boxes -->
                <div class="bottom-section">
                    <div class="info-box">
                        <div class="info-label">Main Gate</div>
                        <div class="info-value">${userEvent.verifier.name}</div>
                    </div>
                    <div class="info-box">
                        <div class="info-label">Enclosure</div>
                        <div class="info-value">${userEvent.enclosure_no}</div>
                    </div>
                    <div class="info-box aadhar-box">
                        <div class="info-label">Aadhar</div>
                        <div class="info-value">${user.aadhar}</div>
                    </div>
                </div>
            </div>

            <!-- Right Section: Photo & QR -->
            <div class="photo-section">
                <div class="photo-container">
                    <img src="${user.photo ||
                        "https://res.cloudinary.com/dnxfq38fr/image/upload/v1729400669/gbpuat-event-pass/viukl6evcdn1aj7rgqbb.png"}"
                        alt="Photo">
                </div>
                <div class="qr-section">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=164x164&data=${qrToken}"
                        alt="QR Code">
                </div>
            </div>
        </div>

        <!-- Bottom Stripe -->
        <div class="bottom-stripe"></div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/js/bootstrap.bundle.min.js"></script>
</body>

</html>`
  )
}

export default FacultyIdTemplate
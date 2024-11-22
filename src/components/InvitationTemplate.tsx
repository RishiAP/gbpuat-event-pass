import React from 'react'
import User from '@/types/User'
import jwt from 'jsonwebtoken'

const InvitationTemplate = (user:User,event_id:string,verifier:string,enclosure_no:string) => {
  return (
    `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>36th Convocation Invitation</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        /* Define font-face for local fonts */
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700');

        /* Global styles */
        body {
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
        }

        /* Custom classes */
        .dancing-script {
            font-family: "Dancing Script", cursive;
            font-weight: bold;
        }

        .university-logo {
            width: 150px;
            height: auto;
            margin: 20px 0;
        }

        .admin-building {
            width: 100%;
            max-width: 480px;
            height: auto;
            margin: 20px 0;
        }

        .profile-section {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 2rem;
            margin: 2rem 0;
            padding: 1rem;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        
        .gate-enclosure{
            display:flex;
            justify-content:space-evenly;
            margin: 2rem 0;
            padding: 1rem;
            border: 1px solid #ddd;
            border-radius: 8px;
        }

        .profile-image {
            width: 150px;
            height: 150px;
            object-fit: cover;
            border-radius: 4px;
        }

        .profile-details {
            display: grid;
            gap: 0.5rem;
        }

        .detail-row{
            display: flex;
        }
        .detail-row strong {
            display: flex;
            align-items: start;
            width:200px;
        }
        .detailed-row span {
            width: 100%;
        }

        /* Print specific styles */
        @media print {
            .page-break {
                page-break-before: always;
            }
            
            @page {
                size: A4;
                margin: 20mm;
            }
        }

        /* Color variables */
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
        <!-- Page 1 -->
        <div class="text-center">
            <img src="https://res.cloudinary.com/dnxfq38fr/image/upload/v1729400669/gbpuat-event-pass/viukl6evcdn1aj7rgqbb.png" alt="University Logo" class="university-logo">
            <h2 class="fs-3 mb-0" style="color: var(--primary-blue);">Invitation</h2>
            <h3 style="color: var(--accent-red);">G. B. Pant University of Agriculture and Technology</h3>
            <h3 style="color: var(--primary-blue);">Pantnagar-263145, U. S. Nagar, Uttarakhand</h3>
            
            <img src="https://res.cloudinary.com/dnxfq38fr/image/upload/v1732103768/gbpuat-event-pass/oaahfvo36cv2lkxm2qo3.jpg" alt="Administrative Building" class="admin-building">
            
            <h3 class="dancing-script" style="color: var(--accent-red);">36TH</h3>
            <h3 class="dancing-script" style="color: var(--dark-blue);">CONVOCATION</h3>
            <h3 class="dancing-script">WEDNESDAY 27 NOVEMBER, 2024</h3>
            
            <div class="mt-4">
                <h3>at</h3>
                <h3>Convocation Ground of the University</h3>
                <h3 style="color: var(--accent-red)">Smt. Droupadi Murmu</h3>
                <h3 style="color: var(--accent-red);">Hon'ble President of India</h3>
                <h3 style="color: var(--secondary-blue)">will be the Chief Guest and deliver Convocation Address</h3>
                <h3 style="color: var(--accent-red);">Lt. General Gurmit Singh (Retd.)</h3>
            </div>
        </div>

        <!-- Page 2 -->
        <div class="page-break text-center">
            <img src="https://res.cloudinary.com/dnxfq38fr/image/upload/v1729400669/gbpuat-event-pass/viukl6evcdn1aj7rgqbb.png" alt="University Logo" class="university-logo">
            
            <h3 style="color: var(--accent-red);" class="mt-1">
                Vice-Chancellor, Board of Management<br>
                And<br>
                Academic Council
            </h3>
            
            <h3 style="color: #00b050;">G.B. Pant University of Agriculture and Technology, Pantnagar</h3>
            <h3>cordially invite you to the</h3>
            <h3>XXXVI CONVOCATION</h3>
            
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=196x196&data=${jwt.sign({event:event_id,email:user.email},String(process.env.JWT_USER_QR_SECRET))}" alt="QR Code" class="mt-4" style="width: 196px; height: 196px;">
            
            <div class="profile-section">
                <img src="${user.photo}" alt="Profile Image" class="profile-image">
                <div class="profile-details">
                    <div class="detail-row">
                        <strong>Name:</strong>
                        <span>${user.name}</span>
                    </div>
                    ${user.designation=="Student" || user.designation==null?`
                        <div class="detail-row">
                        <strong>ID No:</strong>
                        <span>${user.college_id}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Hostel:</strong>
                        <span>${user.hostel?.name}</span>
                    </div>`:""}
                    ${user.designation!="Student" && user.designation!=null?`
                        <div class="detail-row">
                        <strong>Designation :</strong>
                        <span>${user.designation}</span>
                    </div>
                    <div class="detail-row">
                        <strong>College:</strong>
                        <span>${user.college?.name}</span>
                    </div>`:""}
                    <div class="detail-row">
                        <strong>Aadhar No.:</strong>
                        <span>${user.aadhar}</span>
                    </div>
                </div>
            </div>
            <div class="gate-enclosure">
                <div class="d-flex gap-4 align-items-center">
                    <strong>Gate No:</strong>
                    <span>${verifier}</span>
                </div>
                <div class="d-flex gap-4 align-items-center">
                    <strong>Enclosure No:</strong>
                    <span>${enclosure_no}</span>
                </div>
            </div>
            
            <h3 style="font-size: 25px;">R.S.V.P</h3>
            <h3 style="color: var(--secondary-blue); font-size: 30px;">Registrar</h3>
        </div>
    </div>
</body>
</html>`
  )
}

export default InvitationTemplate
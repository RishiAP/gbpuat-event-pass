import React from 'react'
import User from '@/types/User'
import jwt from 'jsonwebtoken'

const InvitationTemplate = (user:User,event_id:string,verifier:string,enclosure_no:string,entry_gate:string|null) => {
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

        /* @import url('https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap'); */
        
        /* @import url('https://fonts.cdnfonts.com/css/times-new-roman');  */
        

        /* Global styles */
        body {
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
            font-family: 'Times New Roman', Times, serif;
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
            width: 115px;
            height: auto;
            margin: 7px 0;
        }

        .admin-building {
            width: 100%;
            max-width: 480px;
            height: auto;
            margin: 20px 0;
        }

        .profile-section {
            display: grid;
            align-items: center;
            grid-template-columns: auto 1fr;
            gap: 2rem;
            margin: 0.7rem 0;
            margin-top: 1rem;
            padding: 0.5rem 1.75rem;
            border: 1px solid #ddd;
            border-radius: 8px;
        }

        .profile-image {
            width: 150px;
            height: auto;
            /* object-fit: cover;
            border-radius: 4px; */
        }

        .profile-details {
            display: grid;
            gap: 0.2rem;
        }
        .profile-details_2 {
            display: contents;
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
        .detail-row .span {
            width: 100%;
            display: flex;
            gap: 2rem;
        }
        .contact_details{
            /* margin: 0.5rem 0;
            padding: 0.25rem; */
            margin-left: 8rem;
            margin-right: 8rem;
            justify-content: space-between;
            display: flex;
            /* border: 1px solid #ddd;
            border-radius: 8px; */
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
        <!-- Page -->
        <div class="page-break text-center">
            <img src="https://res.cloudinary.com/dnxfq38fr/image/upload/v1729400669/gbpuat-event-pass/viukl6evcdn1aj7rgqbb.png" alt="University Logo" class="university-logo">
            
            <h3 style="color: #990000; font-size: 25px;" class="mt-1">
                Vice-Chancellor, Board of Management
                and
                Academic Council
            </h3>
            
            <h3 style="color: #00b050; font-size: 24px;" >G.B. Pant University of Agriculture and Technology, Pantnagar</h3>
            <h3 style="font-size: 20px;">cordially invite you to the</h3>
            <h3 style="color: #00b050; "><strong>XXXVI CONVOCATION</strong></h3>
            <div class="text-center">
                    <h6 style="color: rgb(32, 30, 30); font-size: 17px;">to be held on</h6>
                    <h4 style="color: rgb(33, 33, 149); font-size: 20px; margin-bottom: 2px;"><strong>Wednesday, 27 November, 2024 at 11:00 a.m.</strong></h4>
                    <h6 style="color: rgb(32, 30, 30); font-size: 17px; margin-bottom: 2px;">at</h6>
                    <h4 style="color: rgb(33, 33, 149); font-size: 20px;"><strong>Convocation Ground of the University.</strong></h4>
            </div>
            
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=196x196&data=${jwt.sign({event:event_id,email:user.email},String(process.env.JWT_USER_QR_SECRET))}" alt="QR Code" class="mt-2" style="width: 196px; height: 196px;">
            
            <div class="profile-section">
                <img src="${user.photo!=null?user.photo:"https://res.cloudinary.com/dnxfq38fr/image/upload/v1729400669/gbpuat-event-pass/viukl6evcdn1aj7rgqbb.png"}" alt="Profile Image" class="profile-image">
                <div class="profile-details">
                    <div class="detail-row" style="font-size: 22.5px;">
                        <strong>Name</strong>
                        <strong class="span"><span>:</span><span>${user.name}</span></strong>
                    </div>
                    ${
                        user.college!=null?
                        `<div class="detail-row">
                        <strong>Designation</strong>
                        <strong class="span"><span>:</span><span>${user.designation}</span></strong>
                    </div>
                        ${user.department!=null?
                        `<div class="detail-row">
                            <strong>Department</strong>
                            <strong class="span"><span>:</span><span>${user.department.name}</span></strong>
                        </div>`:""
                        }
                    <div class="detail-row">
                        <strong>College</strong>
                        <strong class="span"><span>:</span><span>${user.college.name}</span></strong>
                    </div>`:
                    `
                    <div class="detail-row">
                        <strong>ID No.</strong>
                        <strong class="span"><span>:</span><span>${user.college_id}</span></strong>
                    </div>
                    <div class="detail-row">
                        <strong>Hostel</strong>
                        <strong class="span"><span>:</span><span>${user.hostel!.name}</span></strong>
                    </div>
                    `
                    }
                    
                    <div class="detail-row">
                        <strong>Aadhar No.</strong>
                        <strong class="span"><span>:</span><span>${user.aadhar}</span></strong>
                    </div>
                    <div class="detail-row" style="font-size: 22.5px;">
                        <strong>Main Gate</strong>
                        <strong class="span"><span>:</span><span>${verifier}</span></strong>
                    </div>
                    <div class="detail-row" >
                        <strong>Entry Gate</strong>
                        <strong class="span"><span>:</span><span>${entry_gate}</span></strong>
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
            <!-- <hr style="border: 2px solid black;"> -->
            <div>
                <p style="color: rgb(150, 25, 0);">PS: Please bring a printout of this card for QR code scanning at the Security Gate for Pandal Entry.</p>
            </div>
        </div>
    </div>
</body>
</html>`
  )
}

export default InvitationTemplate
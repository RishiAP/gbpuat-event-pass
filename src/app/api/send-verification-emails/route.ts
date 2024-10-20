import { getUserFromHeader } from "@/helpers/common_func";
import sendEmail from "@/helpers/mailer";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import VerificationEmail from "@/templates/emails/VerificationEmail";
import EventType from "@/types/Event";
import UserType from "@/types/User";

type EmailSuccess = {
    email: string;
    messageId: string;
};

type EmailFailure = {
    email: string;
    error: string;
};

function formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
  
    // Add the correct suffix (st, nd, rd, th) for the day
    const day: number = date.getDate();
    const suffix: string = (day % 10 === 1 && day !== 11) ? 'st' :
                           (day % 10 === 2 && day !== 12) ? 'nd' :
                           (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
  
    return formattedDate.replace(day.toString(), `${day}${suffix}`);
  }  

export async function POST(req: NextRequest) {
    const successfulEmails: EmailSuccess[] = [];
    const failedEmails: EmailFailure[] = [];

    try {
        const user = await getUserFromHeader(req, true);
        let dataNotUpdated=0;
        if (user == null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { event_id } = await req.json();
        const event:EventType|null=await Event.findById(event_id);
        if(event_id==null || event==null){
            return NextResponse.json({error:"Invalid event_id"},{status:400});
        }
        const users = await User.find({
            [`events.${event_id}`]: { $exists: true, $ne: null },
            [`events.${event_id}.emails_sent`]: { $size: 0 }
        }, { email: 1, _id: 0,name:1,designation:1 }).limit(3);
        let jwtAccessToken=null;
        let date:string|Date=new Date(event.date);
        const time=date.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
        date=formatDate(date);
        const emailPromises = users.map(async (user:UserType) => {
            try {
                jwtAccessToken=jwt.sign({event:event_id,email:user.email},String(process.env.JWT_USER_QR_SECRET));
                const messageId = await sendEmail(
                    `"Alumni Cell GBPUAT" <${process.env.SMTP_NOREPLY}>`,
                    user.email,
                    "Event Verification",
                    `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${jwtAccessToken}`,
                    VerificationEmail({jwtAccessToken,event,user,time,date})
                );

                // Record successful email sending
                successfulEmails.push({ email: user.email, messageId });

                // Try to update the `emails_sent` array in the database
                const updatedUser = await User.findOneAndUpdate(
                    { email: user.email },
                    { $push: { [`events.${event_id}.emails_sent`]: messageId } },
                    { new: true }
                );

                // Verify that the document was updated
                if (!updatedUser) {
                    dataNotUpdated++;
                    throw new Error(`Failed to update emails_sent for user ${user.email}`);
                }

            } catch (emailError: any) {
                // Log email sending or updating errors
                failedEmails.push({ email: user.email, error: emailError.message });
            }
        });

        // Wait for all email promises to settle
        await Promise.all(emailPromises);

        // Update the event with the count of emails sent
        await Event.findByIdAndUpdate(
            event_id,
            {
                emails_sent: (await User.find({
                    [`events.${event_id}`]: { $exists: true, $ne: null },
                    [`events.${event_id}.emails_sent`]: { $gt: 0 }
                }, { email: 1, _id: 0 })).length
            },
            { new: true }
        );

        // Return the results
        return NextResponse.json({
            dataNotUpdated,
            successfulEmails,
            failedEmails,
        }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

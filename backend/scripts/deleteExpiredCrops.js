import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || 'your_gmail@gmail.com';
const GMAIL_PASS = process.env.GMAIL_PASS || 'your_app_password';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

async function main() {
  const db = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'Dela',
    password: process.env.DB_PASS || 'RockZ@1234',
    database: process.env.DB_NAME || 'agrofresh',
  });

  // 1. Find crops expiring in 1 day
  const [expiringSoon] = await db.query(
    "SELECT crops.*, users.email FROM crops JOIN users ON crops.farmer_id = users.id WHERE crops.created_at < NOW() - INTERVAL 6 DAY AND crops.created_at >= NOW() - INTERVAL 7 DAY"
  );

  // 2. Notify the farmer (send email)
  for (const crop of expiringSoon) {
    const mailOptions = {
      from: GMAIL_USER,
      to: crop.email,
      subject: `Your crop \"${crop.name}\" will be deleted soon`,
      text: `Dear Farmer,\n\nYour crop \"${crop.name}\" (ID: ${crop.id}) will be deleted from AgroFresh in 1 day. Please take any necessary action.\n\nThank you,\nAgroFresh Team`,
    };
    try {
      await transporter.sendMail(mailOptions);
      console.log(`EMAIL SENT: Crop \"${crop.name}\" (ID: ${crop.id}) for farmer ${crop.farmer_id} (${crop.email}) will be deleted in 1 day.`);
    } catch (err) {
      console.error(`FAILED TO SEND EMAIL to ${crop.email}:`, err);
    }
  }

  // 3. Delete crops older than 7 days
  const [result] = await db.query(
    "DELETE FROM crops WHERE created_at < NOW() - INTERVAL 7 DAY"
  );

  console.log(`Deleted ${result.affectedRows} expired crops.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error deleting expired crops:', err);
  process.exit(1);
}); 
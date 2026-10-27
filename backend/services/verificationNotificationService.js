const { sendNewSellerVerificationEmail } = require('./emailService');

async function notifyAdminsOfVerificationRequest(
  db,
  seller,
  requestId,
  sendNotification = sendNewSellerVerificationEmail
) {
  const admins = await db.collection('users')
    .find({
      type: 'admin',
      email: { $type: 'string' },
      accountStatus: { $ne: 'suspended' }
    })
    .project({ name: 1, email: 1 })
    .toArray();

  const seenEmails = new Set();
  const recipients = admins.reduce((uniqueAdmins, admin) => {
    const email = admin.email?.trim().toLowerCase();
    if (!email || seenEmails.has(email)) return uniqueAdmins;
    seenEmails.add(email);
    uniqueAdmins.push({ ...admin, email: admin.email.trim() });
    return uniqueAdmins;
  }, []);

  const results = await Promise.allSettled(
    recipients.map((admin) => sendNotification(admin, seller, requestId.toString()))
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `Verification admin email failed for ${recipients[index].email}:`,
        result.reason?.message || result.reason
      );
    }
  });

  return {
    attempted: recipients.length,
    delivered: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length
  };
}

module.exports = { notifyAdminsOfVerificationRequest };

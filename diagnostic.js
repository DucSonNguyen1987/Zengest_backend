require('dotenv').config();

console.log('🔍 DIAGNOSTIC CONFIGURATION EMAIL');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD longueur:', process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0);
console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_SECURE:', process.env.SMTP_SECURE);

if (process.env.EMAIL_PASSWORD) {
  const password = process.env.EMAIL_PASSWORD;
  console.log('EMAIL_PASSWORD début:', password.substring(0, 4) + '...');
  const isAppPasswordFormat = /^[a-z]{16}$/i.test(password.replace(/\s/g, ''));
  console.log('Format App Password:', isAppPasswordFormat ? '✅' : '❌ (pas 16 lettres)');
  
  if (!isAppPasswordFormat) {
    console.log('⚠️ Vous utilisez probablement votre mot de passe Gmail normal');
    console.log('⚠️ Il faut créer un App Password Gmail (16 lettres)');
  }
} else {
  console.log('❌ EMAIL_PASSWORD non défini');
}
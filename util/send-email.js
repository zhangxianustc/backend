const Email = require('email-templates')
const nodemailer = require('nodemailer')
const path = require('path')

let transporter = nodemailer.createTransport({
  // 使用内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
  host: process.env.HOST_EMAIL_HOST,
  service: process.env.HOST_EMAIL_SERVICE,
  port: Number(process.env.HOST_EMAIL_PORT),
  secureConnection: true,
  auth: {
    user: process.env.HOST_EMAIL,
    pass: process.env.HOST_EMAIL_PASSWORD
  }
})
const email = new Email({
  views: { root: path.resolve(__dirname, '../email_templates') },
  message: {
    from: process.env.HOST_EMAIL_ALIAS ? '"' + process.env.HOST_EMAIL_ALIAS + '" <' + process.env.HOST_EMAIL + '>' : process.env.HOST_EMAIL
  },
  // uncomment below to send emails in development/test env:
  send: true,
  transport: transporter,
  subjectPrefix: process.env.ENABLE_EMAIL_SUBJECT_PREFIX === 'true' ? `[${(process.env.NODE_ENV || 'development').toUpperCase()}]` : false,
  juice: true,
  juiceResources: {
    preserveImportant: true,
    webResources: {
    //   relativeTo: path.resolve('build')
      relativeTo: path.join(__dirname, '..', 'email_templates', 'assets'),
      images: true
    }
  }
})

function sendEmail (opts) {
  if (typeof opts !== 'object') {
    throw new Error('Invalid parameters')
  }
  if (!opts.template) {
    throw new Error('Template is missing')
  }
  if (!opts.recipient) {
    throw new Error('Target emails are missing')
  }
  if (!opts.locals || typeof opts.locals !== 'object') {
    throw new Error('Email parameters are missing')
  }

  return email
    .send({
      template: opts.template,
      message: {
        to: opts.recipient
      },
      locals: opts.locals
    })
}

module.exports = { sendEmail }

import { BaseMail } from "@adonisjs/mail";

export default class VerifyEmailNotification extends BaseMail {
  subject = "Подтверждение email в QR Studio";

  constructor(
    private readonly recipient: string,
    private readonly url: string,
  ) {
    super();
  }

  prepare() {
    this.message
      .to(this.recipient)
      .text(
        `Здравствуйте!\n\nПодтвердите email по ссылке (действует 24 часа):\n${this.url}\n\n` +
          "Если вы не регистрировались в QR Studio, просто проигнорируйте письмо.",
      )
      .html(
        `<p>Здравствуйте!</p>` +
          `<p>Подтвердите email по <a href="${this.url}">ссылке</a> (действует 24 часа).</p>` +
          `<p>Если вы не регистрировались в QR Studio, просто проигнорируйте письмо.</p>`,
      );
  }
}

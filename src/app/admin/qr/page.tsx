import QRCode from "qrcode";
import { QRActions } from "./qr-actions";

export default async function QRCodePage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!baseUrl) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <h1 className="font-heading text-2xl font-light text-white">
          Guest QR Code
        </h1>
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/70">
            <span className="font-mono text-sm text-[#c4956a]">
              NEXT_PUBLIC_APP_URL
            </span>{" "}
            is not set.
          </p>
          <p className="mt-2 text-sm text-white/40">
            Set this environment variable to your production URL to generate the
            guest QR code.
          </p>
        </div>
      </div>
    );
  }

  const chatUrl = `${baseUrl}/chat`;
  const qrDataUrl = await QRCode.toDataURL(chatUrl, {
    width: 400,
    margin: 2,
    color: { dark: "#0a1628", light: "#ffffff" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="no-print mb-8">
        <h1 className="font-heading text-2xl font-light text-white">
          Guest QR Code
        </h1>
        <p className="mt-1 text-sm text-white/40">
          Print this QR code and place it at tables. Guests scan it to open the
          menu assistant.
        </p>
      </div>

      {/* QR display */}
      <div className="print-area flex flex-col items-center">
        <div className="rounded-2xl border border-white/10 bg-white p-6 print:border-none print:shadow-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR code for guest chat"
            width={400}
            height={400}
            className="h-auto w-full max-w-[400px]"
          />
        </div>

        {/* URL display */}
        <div className="mt-4 text-center">
          <p className="font-heading text-lg font-medium text-white print:text-black">
            Old Florida Fish House
          </p>
          <p className="mt-1 text-sm text-white/50 print:text-gray-600">
            Scan to chat with our menu assistant
          </p>
          <p className="mt-2 rounded-lg bg-white/5 px-4 py-2 font-mono text-xs text-white/40 print:bg-gray-100 print:text-gray-500">
            {chatUrl}
          </p>
        </div>
      </div>

      {/* Actions */}
      <QRActions chatUrl={chatUrl} />
    </div>
  );
}

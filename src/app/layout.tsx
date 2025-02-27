import "./globals.css";
import { Toaster } from "sonner";
import Header from "@/components/Header";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Toaster richColors />
        <Header />
        {children}
      </body>
    </html>
  );
}

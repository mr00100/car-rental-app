import { Header } from "./header";
import { Footer } from "./footer";
import { ChatWidget } from "@/components/chat/chat-widget";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatWidget />
    </>
  );
}

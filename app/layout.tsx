import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentStaff } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCA Open Repository",
  description: "Open academic repository for the MCA department",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const staff = await getCurrentStaff();
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container nav">
            <Link href="/" className="brand"><span className="brand-mark">M</span><span>MCA Open Repository</span></Link>
            <nav>
              {staff ? (
                <>
                  <span className="nav-user">{staff.name}</span>
                  <form action="/api/staff/logout" method="post" className="nav-logout-form">
                    <button type="submit" className="nav-logout">Logout</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/">Repository</Link>
                  <Link href="/staff/login">Staff Portal</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer"><div className="container">MCA Department · Open academic resources</div></footer>
      </body>
    </html>
  );
}

"use client";

import { useState } from "react";
import { EightLoginDialog } from "~/components/eightLogin";
import { TemperatureProfileForm } from "~/components/temperatureProfileForm";
import { LogoutButton } from "~/components/logout";

export default function ClientHome({
  initialLoginState,
}: {
  initialLoginState: boolean;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoginState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-center text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Eightsleep <span className="text-[hsl(280,100%,70%)]">Nosub</span> App
        </h1>
        <div className="flex flex-col items-center gap-2">
          {!isLoggedIn && (
            <EightLoginDialog onLoginSuccess={() => setIsLoggedIn(true)} />
          )}
          {isLoggedIn && (
            <>
              <div className="mx-auto flex w-full flex-row items-center justify-center rounded-lg bg-white p-6 shadow-xl">
                <LogoutButton onLogoutSuccess={() => setIsLoggedIn(false)} />
              </div>
              <TemperatureProfileForm />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

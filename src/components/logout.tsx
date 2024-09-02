"use client";
import React from "react";
import { apiR } from "~/trpc/react";

interface LogoutButtonProps {
  onLogoutSuccess: () => void;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({ onLogoutSuccess }) => {
  const logoutMutation = apiR.user.logout.useMutation({
    onSuccess: () => {
      // Handle successful logout
      console.log("Logout successful");
      onLogoutSuccess(); // Call the prop function on successful logout
    },
    onError: (error) => {
      // Handle logout error
      console.error("Logout failed:", error.message);
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <>
      <button
        onClick={handleLogout}
        className="w-24 rounded-md border border-transparent bg-red-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        disabled={logoutMutation.isPending}
      >
        {logoutMutation.isPending ? "Logging out..." : "Logout"}
      </button>
      {logoutMutation.isError && (
        <p className="mt-4 text-center text-sm text-red-600">
          {logoutMutation.error.message}
        </p>
      )}
    </>
  );
};
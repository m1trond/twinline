import { useState } from "react";
import type { AuthMode } from "@/shared/types";

export function useAuthFormState() {
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authUsername, setAuthUsername] = useState("");
  const [authUsernameError, setAuthUsernameError] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  return {
    authMode,
    setAuthMode,
    authUsername,
    setAuthUsername,
    authUsernameError,
    setAuthUsernameError,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
  };
}

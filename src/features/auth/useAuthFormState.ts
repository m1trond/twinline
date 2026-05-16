import { useState } from "react";
import type { AuthContactMethod, AuthMode } from "@/shared/types";

export function useAuthFormState() {
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authContactMethod, setAuthContactMethod] = useState<AuthContactMethod>("email");
  const [authUsername, setAuthUsername] = useState("");
  const [authUsernameError, setAuthUsernameError] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  return {
    authMode,
    setAuthMode,
    authContactMethod,
    setAuthContactMethod,
    authUsername,
    setAuthUsername,
    authUsernameError,
    setAuthUsernameError,
    authEmail,
    setAuthEmail,
    authPhone,
    setAuthPhone,
    authPassword,
    setAuthPassword,
  };
}

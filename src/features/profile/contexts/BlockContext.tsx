import { createContext, useContext } from "react";
import type { ReactNode, Dispatch, SetStateAction, MutableRefObject } from "react";

type BlockConfirmationState = {
  action: "block" | "unblock";
  targetLabel: string;
  userId: string;
} | null;

type BlockContextType = {
  blockedByMeProfiles: Array<{
    avatarUrl: string | null;
    name: string;
    username: string | null;
    userId: string;
  }>;
  blockedByMeProfileIds: string[];
  blockedMeProfileIds: string[];
  blockedProfileIds: string[];
  blockedProfileIdsRef: MutableRefObject<Set<string>>;
  confirmBlockChange: () => Promise<void>;
  requestBlockChange: (userId: string, targetLabel: string) => void;
  blockConfirmation: BlockConfirmationState;
  setBlockConfirmation: Dispatch<SetStateAction<BlockConfirmationState>>;
  profileNotificationMenuUserId: string | null;
  setProfileNotificationMenuUserId: Dispatch<SetStateAction<string | null>>;
  isSelectedChatBlocked: boolean;
  isSelectedChatBlockedByMe: boolean;
  isSelectedChatBlockingMe: boolean;
};

const BlockContext = createContext<BlockContextType | null>(null);

export function BlockContextProvider({ children, value }: { children: ReactNode; value: BlockContextType }) {
  return (
    <BlockContext.Provider value={value}>
      {children}
    </BlockContext.Provider>
  );
}

export function useBlock() {
  const context = useContext(BlockContext);
  if (!context) {
    throw new Error("useBlock must be used within a BlockContextProvider");
  }
  return context;
}

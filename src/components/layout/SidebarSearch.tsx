import { Avatar } from "@/components/ui/Avatar";
import type { TranslationKey } from "@/shared/i18n";
import type { ProfileRow } from "@/shared/types";

type SearchResultItemProps = {
  profile: ProfileRow;
  onSelect: (profile: ProfileRow) => void;
  className?: string;
  nicknameNotSetText: string;
  avatarAltText: string;
};

export function SearchResultItem({
  profile,
  onSelect,
  className = "flex items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-[#f4f4f5]/10",
  nicknameNotSetText,
  avatarAltText,
}: SearchResultItemProps) {
  return (
    <button
      className={className}
      onClick={() => onSelect(profile)}
      type="button"
    >
      <Avatar
        alt={avatarAltText + " " + profile.display_name}
        className="h-8 w-8 text-xs"
        name={profile.display_name}
        src={profile.avatar_url}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-[#f4f4f5]">
          {profile.display_name}
        </span>
        <span className="block truncate text-xs text-[#a1a1aa]">
          {profile.username ? "@" + profile.username : nicknameNotSetText}
        </span>
      </span>
    </button>
  );
}

type SearchResultListProps = {
  query: string;
  searchableProfiles: ProfileRow[];
  onSelectProfile: (profile: ProfileRow) => void;
  t: (key: TranslationKey) => string;
  itemClassName?: string;
  keyPrefix?: string;
};

export function SearchResultList({
  query,
  searchableProfiles,
  onSelectProfile,
  t,
  itemClassName,
  keyPrefix = "search-",
}: SearchResultListProps) {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length === 0) {
    return null;
  }

  const cleanedQuery = trimmedQuery.replace(/^@+/, "");

  if (cleanedQuery.length < 2) {
    return (
      <p className="px-2 py-1 text-xs text-[#a1a1aa]">
        {t("searchMinUsername")}
      </p>
    );
  }

  if (searchableProfiles.length === 0) {
    return (
      <p className="px-2 py-1 text-xs text-[#a1a1aa]">
        {t("searchUserNotFound")}
      </p>
    );
  }

  return (
    <>
      {searchableProfiles.map((profile) => (
        <SearchResultItem
          avatarAltText={t("avatarAlt") || "Avatar"}
          className={itemClassName}
          key={keyPrefix + profile.user_id}
          nicknameNotSetText={t("nicknameNotSet")}
          onSelect={onSelectProfile}
          profile={profile}
        />
      ))}
    </>
  );
}

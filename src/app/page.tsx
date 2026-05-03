"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type MessageRow = {
  id: number;
  author: string;
  text: string;
  created_at: string;
};

type Author = "me" | "friend";
type ActiveView = "profile" | "messages" | "gallery" | "ideas";

const authorLabels: Record<string, string> = {
  me: "Я",
  friend: "Друг",
};

const navItems: Array<{ label: string; view: ActiveView }> = [
  { label: "Профиль", view: "profile" },
  { label: "Сообщения", view: "messages" },
  { label: "Галерея", view: "gallery" },
  { label: "Идеи", view: "ideas" },
];

const imageMessagePrefix = "image::";

function formatMessageTime(createdAt: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function getMessageImageUrl(text: string) {
  if (!text.startsWith(imageMessagePrefix)) {
    return null;
  }

  return text.slice(imageMessagePrefix.length);
}

function mergeMessages(currentMessages: MessageRow[], nextMessages: MessageRow[]) {
  const messagesById = new Map<number, MessageRow>();

  for (const message of currentMessages) {
    messagesById.set(message.id, message);
  }

  for (const message of nextMessages) {
    messagesById.set(message.id, message);
  }

  return Array.from(messagesById.values()).sort((firstMessage, secondMessage) => {
    return (
      new Date(firstMessage.created_at).getTime() -
      new Date(secondMessage.created_at).getTime()
    );
  });
}

async function fetchMessages() {
  return supabase
    .from("messages")
    .select("id, author, text, created_at")
    .order("created_at", { ascending: true });
}

async function fetchMessagesAfter(createdAt: string) {
  return supabase
    .from("messages")
    .select("id, author, text, created_at")
    .gt("created_at", createdAt)
    .order("created_at", { ascending: true });
}

export default function Home() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messageText, setMessageText] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("profile");
  const [author, setAuthor] = useState<Author>(() => {
    if (typeof window === "undefined") {
      return "me";
    }

    const savedAuthor = window.localStorage.getItem("chat-author");

    return savedAuthor === "friend" ? "friend" : "me";
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const latestMessageCreatedAtRef = useRef<string | null>(null);

  const activeAuthorName = useMemo(() => {
    return authorLabels[author] ?? "Я";
  }, [author]);

  useEffect(() => {
    window.localStorage.setItem("chat-author", author);
  }, [author]);

  useEffect(() => {
    latestMessageCreatedAtRef.current =
      messages.filter((message) => message.id > 0).at(-1)?.created_at ?? null;
  }, [messages]);

  useEffect(() => {
    let isMounted = true;

    async function syncAllMessages(showLoading = false) {
      if (showLoading) {
        setIsLoading(true);
      }

      const { data, error } = await fetchMessages();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Не получилось загрузить сообщения.");
      } else {
        setMessages(data ?? []);
        setErrorMessage("");
      }

      setIsLoading(false);
    }

    async function syncNewMessages() {
      const latestMessageCreatedAt = latestMessageCreatedAtRef.current;

      if (!latestMessageCreatedAt) {
        await syncAllMessages();
        return;
      }

      const { data, error } = await fetchMessagesAfter(latestMessageCreatedAt);

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Не получилось загрузить новые сообщения.");
      } else if (data?.length) {
        setMessages((currentMessages) => mergeMessages(currentMessages, data));
        setErrorMessage("");
      }
    }

    syncAllMessages(true);

    const newMessagesInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        syncNewMessages();
      }
    }, 900);

    const fullSyncInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        syncAllMessages();
      }
    }, 10000);

    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;

          setMessages((currentMessages) =>
            mergeMessages(currentMessages, [newMessage]),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const deletedMessage = payload.old as Pick<MessageRow, "id">;

          setMessages((currentMessages) =>
            currentMessages.filter((message) => message.id !== deletedMessage.id),
          );
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.clearInterval(newMessagesInterval);
      window.clearInterval(fullSyncInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedText = messageText.trim();

    if (!trimmedText) {
      return;
    }

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author,
      text: trimmedText,
      created_at: new Date().toISOString(),
    };

    setMessageText("");
    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author,
        text: trimmedText,
      })
      .select("id, author, text, created_at")
      .single();

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setMessageText(trimmedText);
      setErrorMessage("Не получилось отправить сообщение.");
    } else {
      setMessages((currentMessages) => {
        const withoutOptimisticMessage = currentMessages.filter(
          (message) => message.id !== optimisticMessage.id,
        );

        return mergeMessages(
          withoutOptimisticMessage,
          data ? [data] : [],
        );
      });
      setErrorMessage("");
    }
  }

  async function sendImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Можно отправлять только изображения.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage("Изображение должно быть меньше 8 МБ.");
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage("");

    const fileExtension = file.name.split(".").pop() ?? "jpg";
    const filePath = `${author}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setIsUploadingImage(false);
      setErrorMessage("Не получилось загрузить изображение.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;
    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author,
      text: `${imageMessagePrefix}${imageUrl}`,
      created_at: new Date().toISOString(),
    };

    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author,
        text: `${imageMessagePrefix}${imageUrl}`,
      })
      .select("id, author, text, created_at")
      .single();

    setIsUploadingImage(false);

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("Не получилось отправить изображение.");
    } else {
      setMessages((currentMessages) => {
        const withoutOptimisticMessage = currentMessages.filter(
          (message) => message.id !== optimisticMessage.id,
        );

        return mergeMessages(
          withoutOptimisticMessage,
          data ? [data] : [],
        );
      });
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      sendImage(file);
    }

    event.target.value = "";
  }

  async function deleteMessage(message: MessageRow) {
    const previousMessages = messages;

    setMessages((currentMessages) =>
      currentMessages.filter((currentMessage) => currentMessage.id !== message.id),
    );

    const { data, error } = await supabase
      .from("messages")
      .delete()
      .eq("id", message.id)
      .eq("author", author)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      setMessages(previousMessages);
      setErrorMessage("Не получилось удалить сообщение из базы.");
    } else {
      setErrorMessage("");
    }
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-[#070604] text-[#fff8ea]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(240,196,93,0.16),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(255,248,234,0.08),transparent_28%),linear-gradient(135deg,#070604_0%,#11100d_46%,#050403_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,248,234,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,248,234,0.45)_1px,transparent_1px)] [background-size:44px_44px]"
      />
      <div className="relative h-full overflow-hidden bg-[#090806]/35">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <header className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-[#e6b85c]/45 bg-[#15120d]/82 px-3 py-3 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:mb-4 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f0c45d] shadow-[0_8px_24px_rgba(240,196,93,0.28)] sm:h-11 sm:w-11">
              <svg
                aria-hidden="true"
                className="h-7 w-7 sm:h-8 sm:w-8"
                fill="none"
                viewBox="0 0 40 40"
              >
                <path
                  d="M9.5 22.2c0-5.1 5.6-9.2 10.5-3.1 4.9-6.1 10.5-2 10.5 3.1 0 4.4-4.7 7.4-9.1 2.5L20 23.1l-1.4 1.6c-4.4 4.9-9.1 1.9-9.1-2.5Z"
                  stroke="#1c1509"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3.2"
                />
                <path
                  d="M14.2 16.4 20 10.5l5.8 5.9"
                  stroke="#1c1509"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3.2"
                />
                <circle cx="20" cy="10.5" fill="#1c1509" r="2" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal sm:text-2xl">
                Twinline
              </h1>
              <p className="max-w-[210px] truncate text-xs font-medium text-[#d8c7a5] sm:max-w-none sm:text-sm">
                Приватное пространство для двоих
              </p>
            </div>
          </div>

        </header>

        <nav className="scrollbar-hidden mb-3 flex shrink-0 gap-2 overflow-x-auto rounded-2xl border border-[#e6b85c]/45 bg-[#15120d]/78 p-2 shadow-[0_14px_45px_rgba(0,0,0,0.24)] backdrop-blur-md lg:hidden">
          {navItems.map((item) => (
            <button
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeView === item.view
                  ? "bg-[#f0c45d] text-[#1c1509]"
                  : "text-[#fff8ea] opacity-80 hover:bg-white/10 hover:opacity-100"
              }`}
              key={item.view}
              onClick={() => setActiveView(item.view)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className="grid min-h-0 flex-1 gap-3 overflow-hidden pb-3 sm:gap-4 sm:pb-4 lg:grid-cols-[280px_1fr]">
          <aside className="hidden min-h-0 rounded-2xl border border-[#e6b85c]/45 bg-[#15120d]/78 p-4 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md lg:block">
            <div className="mb-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d8b875]">
                Меню
              </p>
            </div>

            <nav className="grid gap-2">
              {navItems.map((item) => (
                <button
                  className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                    activeView === item.view
                      ? "bg-[#f0c45d] text-[#1c1509]"
                      : "text-[#fff8ea] opacity-80 hover:bg-white/10 hover:opacity-100"
                  }`}
                  key={item.view}
                  onClick={() => setActiveView(item.view)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </nav>

          </aside>

          {activeView === "profile" ? (
            <div className="min-h-0 overflow-y-auto rounded-2xl border border-[#e6b85c]/45 bg-[#15120d]/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#e6b85c]/35 pb-5 sm:mb-6">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#f0c45d] text-xl font-black text-[#1c1509] sm:h-16 sm:w-16 sm:text-2xl">
                    {activeAuthorName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#d8b875]">
                      Активный профиль
                    </p>
                    <h2 className="text-2xl font-semibold sm:text-3xl">
                      {activeAuthorName}
                    </h2>
                  </div>
                </div>

                <div className="grid w-full grid-cols-2 rounded-lg border border-[#e6b85c]/45 bg-black/20 p-1 sm:w-auto">
                  <button
                    className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                      author === "me"
                        ? "bg-[#f0c45d] text-[#1c1509]"
                        : "text-[#fff8ea] hover:bg-white/10"
                    }`}
                    onClick={() => setAuthor("me")}
                    type="button"
                  >
                    Я
                  </button>
                  <button
                    className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                      author === "friend"
                        ? "bg-[#f0c45d] text-[#1c1509]"
                        : "text-[#fff8ea] hover:bg-white/10"
                    }`}
                    onClick={() => setAuthor("friend")}
                    type="button"
                  >
                    Друг
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-2xl border border-[#e6b85c]/35 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8b875]">
                    Twinline ID
                  </p>
                  <p className="mt-3 text-lg font-semibold">
                    {author === "me" ? "@me" : "@friend"}
                  </p>
                </section>

                <section className="rounded-2xl border border-[#e6b85c]/35 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8b875]">
                    Роль
                  </p>
                  <p className="mt-3 text-lg font-semibold">
                    {author === "me" ? "Владелец пространства" : "Участник"}
                  </p>
                </section>

                <section className="rounded-2xl border border-[#e6b85c]/35 bg-black/20 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8b875]">
                    О профиле
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#fff8ea]">
                    Этот экран пока управляет тем, от чьего имени ты пишешь.
                    Когда подключим настоящий вход, Twinline будет сам понимать,
                    кто открыл сайт, и переключатель больше не понадобится.
                  </p>
                </section>
              </div>
            </div>
          ) : activeView === "gallery" ? (
            <div className="min-h-0 overflow-y-auto rounded-2xl border border-[#e6b85c]/45 bg-[#15120d]/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-5">
              <div className="mb-5 border-b border-[#e6b85c]/35 pb-5">
                <p className="text-sm font-medium text-[#d8b875]">Раздел</p>
                <h2 className="text-2xl font-semibold sm:text-3xl">Галерея</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                <article className="aspect-[16/10] overflow-hidden rounded-2xl border border-[#e6b85c]/35 bg-black/20 sm:aspect-[4/5]">
                  <div
                    className="h-full bg-cover bg-center"
                    style={{ backgroundImage: "url('/chat-background.jpg')" }}
                  />
                </article>
                <article className="aspect-[16/10] overflow-hidden rounded-2xl border border-[#e6b85c]/35 bg-black/20 sm:aspect-[4/5]">
                  <div
                    className="h-full bg-cover bg-center"
                    style={{ backgroundImage: "url('/chat-background-right.jpg')" }}
                  />
                </article>
                <article className="grid aspect-[16/10] place-items-center rounded-2xl border border-dashed border-[#e6b85c]/45 bg-black/20 p-6 text-center sm:aspect-[4/5]">
                  <div>
                    <p className="text-lg font-semibold text-[#fff8ea]">
                      Новые фото
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#d8c7a5]">
                      Позже подключим загрузку изображений и общую ленту.
                    </p>
                  </div>
                </article>
              </div>
            </div>
          ) : activeView === "ideas" ? (
            <div className="min-h-0 overflow-y-auto rounded-2xl border border-[#e6b85c]/45 bg-[#15120d]/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-5">
              <div className="mb-5 border-b border-[#e6b85c]/35 pb-5">
                <p className="text-sm font-medium text-[#d8b875]">Раздел</p>
                <h2 className="text-2xl font-semibold sm:text-3xl">Идеи</h2>
              </div>

              <div className="grid gap-4">
                {[
                  "Добавить вход только для двоих",
                  "Сделать общую галерею с фото",
                  "Добавить капсулы времени",
                  "Сделать реакции на сообщения",
                ].map((idea) => (
                  <article
                    className="rounded-2xl border border-[#e6b85c]/35 bg-black/20 p-4"
                    key={idea}
                  >
                    <p className="text-base font-semibold text-[#fff8ea]">
                      {idea}
                    </p>
                    <p className="mt-2 text-sm text-[#d8c7a5]">
                      Черновик идеи для развития Twinline.
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e6b85c]/45 bg-[#15120d]/78 px-3 py-3 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:mb-4 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#f0c45d] text-base font-semibold text-[#1c1509]">
                {activeAuthorName[0]}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">
                  Приватный чат
                </h2>
                <p className="truncate text-sm text-[#d8c7a5]">
                  Сейчас пишешь как: {activeAuthorName}
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 rounded-lg border border-[#e6b85c]/45 bg-black/20 p-1 sm:w-auto">
              <button
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  author === "me"
                    ? "bg-[#f0c45d] text-[#1c1509]"
                    : "text-[#fff8ea] hover:bg-white/10"
                }`}
                onClick={() => setAuthor("me")}
                type="button"
              >
                Я
              </button>
              <button
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  author === "friend"
                    ? "bg-[#f0c45d] text-[#1c1509]"
                    : "text-[#fff8ea] hover:bg-white/10"
                }`}
                onClick={() => setAuthor("friend")}
                type="button"
              >
                Друг
              </button>
            </div>
          </div>

          <div
            className="scrollbar-hidden flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-[#e6b85c]/45 bg-[#100d09]/82 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-4"
          >
            {isLoading ? (
              <p className="text-sm text-[#d8c7a5]">Загружаю сообщения...</p>
            ) : null}

            {!isLoading && messages.length === 0 ? (
              <p className="text-sm text-[#d8c7a5]">
                Сообщений пока нет. Напиши первое.
              </p>
            ) : null}

            {messages.map((message) => {
              const isMine = message.author === author;
              const imageUrl = getMessageImageUrl(message.text);

              return (
                <article
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  key={message.id}
                >
                  <div
                    className={`max-w-[86%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[62%] ${
                      isMine
                        ? "rounded-br-md bg-[#f0c45d] text-[#1c1509]"
                        : "rounded-bl-md border border-[#e6b85c]/35 bg-[#fff8ea] text-[#21180c]"
                    }`}
                  >
                    <p className="mb-1 text-xs font-semibold opacity-70">
                      {authorLabels[message.author] ?? message.author}
                    </p>
                    {imageUrl ? (
                      <a
                        href={imageUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt="Отправленное изображение"
                          className="max-h-80 w-full rounded-xl object-cover"
                          src={imageUrl}
                        />
                      </a>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {message.text}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-end gap-3">
                      {isMine ? (
                        <button
                          className="text-xs font-semibold opacity-75 transition hover:opacity-100"
                          onClick={() => deleteMessage(message)}
                          type="button"
                        >
                          Удалить
                        </button>
                      ) : null}
                      <p
                        className={`text-right text-xs ${
                          isMine ? "text-[#6f5319]" : "text-[#7f735d]"
                        }`}
                      >
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <form
            className="mt-3 flex gap-2 rounded-2xl border border-[#e6b85c]/45 bg-[#15120d]/82 p-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:mt-4"
            onSubmit={sendMessage}
          >
            <input
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
              ref={imageInputRef}
              type="file"
            />
            <button
              aria-label="Прикрепить изображение"
              className="grid min-h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#e6b85c]/35 bg-[#fff8ea]/12 text-[#fff8ea] transition hover:bg-[#fff8ea]/18 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isUploadingImage}
              onClick={() => imageInputRef.current?.click()}
              type="button"
            >
              {isUploadingImage ? (
                <span className="h-4 w-4 rounded-full border-2 border-[#f0c45d] border-t-transparent" />
              ) : (
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="m8.5 12.5 5.9-5.9a3.2 3.2 0 0 1 4.5 4.5l-7.1 7.1a5 5 0 0 1-7.1-7.1l7.8-7.8"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </button>
            <input
              aria-label="Текст сообщения"
              className="min-h-12 min-w-0 flex-1 rounded-lg border border-transparent bg-[#fff8ea]/12 px-3 text-base text-[#fff8ea] outline-none transition placeholder:text-[#d8c7a5]/70 focus:border-[#f0c45d] focus:bg-[#fff8ea]/18 sm:px-4"
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Напиши сообщение..."
              type="text"
              value={messageText}
            />
            <button
              className="min-h-12 rounded-lg bg-[#f0c45d] px-3 text-sm font-semibold text-[#1c1509] transition hover:bg-[#ffd775] disabled:cursor-not-allowed disabled:bg-[#83765d] sm:px-5"
              disabled={!messageText.trim() || isUploadingImage}
              type="submit"
            >
              Отправить
            </button>
          </form>

          {errorMessage ? (
            <p className="mt-2 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          ) : null}
            </div>
          )}
        </section>
        </div>
      </div>
    </main>
  );
}

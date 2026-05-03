"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MessageRow = {
  id: number;
  author: string;
  text: string;
  created_at: string;
};

type Author = "me" | "friend";
type ActiveView = "profile" | "messages";

const authorLabels: Record<string, string> = {
  me: "Я",
  friend: "Друг",
};

function formatMessageTime(createdAt: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
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
  const [errorMessage, setErrorMessage] = useState("");

  const activeAuthorName = useMemo(() => {
    return authorLabels[author] ?? "Я";
  }, [author]);

  useEffect(() => {
    window.localStorage.setItem("chat-author", author);
  }, [author]);

  useEffect(() => {
    let isMounted = true;

    async function refreshMessages(showLoading = false) {
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

    refreshMessages(true);

    const refreshInterval = window.setInterval(() => {
      refreshMessages();
    }, 2500);

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
      window.clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedText = messageText.trim();

    if (!trimmedText) {
      return;
    }

    setMessageText("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author,
        text: trimmedText,
      })
      .select("id, author, text, created_at")
      .single();

    if (error) {
      setMessageText(trimmedText);
      setErrorMessage("Не получилось отправить сообщение.");
    } else {
      setMessages((currentMessages) =>
        mergeMessages(currentMessages, data ? [data] : []),
      );
      setErrorMessage("");
    }
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
    <main className="relative h-dvh overflow-hidden text-[#fff8ea]">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 h-full w-1/2 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/chat-background.jpg')" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 h-full w-1/2 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/chat-background-right.jpg')" }}
      />
      <div className="relative h-full overflow-hidden bg-[#090806]/60 backdrop-blur-[2px]">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-[#e6b85c]/45 bg-[#15120d]/82 px-4 py-3 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-[#f0c45d] shadow-[0_8px_24px_rgba(240,196,93,0.28)]">
              <span className="absolute h-6 w-2 rotate-45 rounded-full bg-[#1c1509]" />
              <span className="absolute h-6 w-2 -rotate-45 rounded-full bg-[#1c1509]" />
              <span className="h-3 w-3 rounded-full border-2 border-[#1c1509] bg-[#f0c45d]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Twinline
              </h1>
              <p className="text-sm font-medium text-[#d8c7a5]">
                Приватное пространство для двоих
              </p>
            </div>
          </div>

        </header>

        <section className="grid min-h-0 flex-1 gap-4 overflow-hidden pb-4 lg:grid-cols-[280px_1fr]">
          <aside className="hidden min-h-0 rounded-2xl border border-[#e6b85c]/45 bg-[#15120d]/78 p-4 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md lg:block">
            <div className="mb-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d8b875]">
                Меню
              </p>
            </div>

            <nav className="grid gap-2">
              <button
                className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  activeView === "profile"
                    ? "bg-[#f0c45d] text-[#1c1509]"
                    : "text-[#fff8ea] opacity-80 hover:bg-white/10 hover:opacity-100"
                }`}
                onClick={() => setActiveView("profile")}
                type="button"
              >
                Профиль
              </button>
              <button
                className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  activeView === "messages"
                    ? "bg-[#f0c45d] text-[#1c1509]"
                    : "text-[#fff8ea] opacity-80 hover:bg-white/10 hover:opacity-100"
                }`}
                onClick={() => setActiveView("messages")}
                type="button"
              >
                Сообщения
              </button>
            </nav>

          </aside>

          {activeView === "profile" ? (
            <div className="min-h-0 overflow-hidden rounded-2xl border border-[#e6b85c]/45 bg-[#15120d]/78 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#e6b85c]/35 pb-5">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#f0c45d] text-2xl font-black text-[#1c1509]">
                    {activeAuthorName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#d8b875]">
                      Активный профиль
                    </p>
                    <h2 className="text-3xl font-semibold">
                      {activeAuthorName}
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 rounded-lg border border-[#e6b85c]/45 bg-black/20 p-1">
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
          ) : (
            <div className="grid min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e6b85c]/45 bg-[#15120d]/78 px-4 py-3 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md">
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

            <div className="grid grid-cols-2 rounded-lg border border-[#e6b85c]/45 bg-black/20 p-1">
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
            className="scrollbar-hidden flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-[#e6b85c]/45 bg-[#100d09]/82 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md"
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

              return (
                <article
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  key={message.id}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[62%] ${
                      isMine
                        ? "rounded-br-md bg-[#f0c45d] text-[#1c1509]"
                        : "rounded-bl-md border border-[#e6b85c]/35 bg-[#fff8ea] text-[#21180c]"
                    }`}
                  >
                    <p className="mb-1 text-xs font-semibold opacity-70">
                      {authorLabels[message.author] ?? message.author}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                      {message.text}
                    </p>
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
            className="mt-4 flex gap-2 rounded-2xl border border-[#e6b85c]/45 bg-[#15120d]/82 p-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md"
            onSubmit={sendMessage}
          >
            <input
              aria-label="Текст сообщения"
              className="min-h-12 flex-1 rounded-lg border border-transparent bg-[#fff8ea]/12 px-4 text-base text-[#fff8ea] outline-none transition placeholder:text-[#d8c7a5]/70 focus:border-[#f0c45d] focus:bg-[#fff8ea]/18"
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Напиши сообщение..."
              type="text"
              value={messageText}
            />
            <button
              className="min-h-12 rounded-lg bg-[#f0c45d] px-5 text-sm font-semibold text-[#1c1509] transition hover:bg-[#ffd775] disabled:cursor-not-allowed disabled:bg-[#83765d]"
              disabled={!messageText.trim()}
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

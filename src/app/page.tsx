"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type MessageRow = {
  id: number;
  author: string;
  text: string;
  created_at: string;
  user_id: string | null;
};

type GalleryItem = {
  id: number;
  user_id: string;
  author: string;
  file_url: string;
  file_type: "image" | "video";
  caption: string | null;
  created_at: string;
};

type IdeaRow = {
  id: number;
  user_id: string;
  author: string;
  text: string;
  created_at: string;
};

type ActiveView = "profile" | "messages" | "gallery" | "ideas";
type AuthMode = "sign-in" | "sign-up";

const navItems: Array<{ label: string; view: ActiveView }> = [
  { label: "Профиль", view: "profile" },
  { label: "Сообщения", view: "messages" },
  { label: "Галерея", view: "gallery" },
  { label: "Идеи", view: "ideas" },
];

const imageMessagePrefix = "image::";
const videoMessagePrefix = "video::";
const audioMessagePrefix = "audio::";
const maxAttachmentSize = 50 * 1024 * 1024;

function formatMessageTime(createdAt: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function getDisplayName(user: User | null) {
  const metadataName = user?.user_metadata?.display_name;

  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  return user?.email?.split("@")[0] ?? "Гость";
}

function getMessageImageUrl(text: string) {
  return text.startsWith(imageMessagePrefix)
    ? text.slice(imageMessagePrefix.length)
    : null;
}

function getMessageVideoUrl(text: string) {
  return text.startsWith(videoMessagePrefix)
    ? text.slice(videoMessagePrefix.length)
    : null;
}

function getMessageAudioUrl(text: string) {
  return text.startsWith(audioMessagePrefix)
    ? text.slice(audioMessagePrefix.length)
    : null;
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
    .select("id, author, text, created_at, user_id")
    .order("created_at", { ascending: true });
}

async function fetchMessagesAfter(createdAt: string) {
  return supabase
    .from("messages")
    .select("id, author, text, created_at, user_id")
    .gt("created_at", createdAt)
    .order("created_at", { ascending: true });
}

async function fetchGalleryItems() {
  return supabase
    .from("gallery_items")
    .select("id, user_id, author, file_url, file_type, caption, created_at")
    .order("created_at", { ascending: false });
}

async function fetchIdeas() {
  return supabase
    .from("ideas")
    .select("id, user_id, author, text, created_at")
    .order("created_at", { ascending: false });
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [messageText, setMessageText] = useState("");
  const [galleryCaption, setGalleryCaption] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("profile");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isUploadingGalleryItem, setIsUploadingGalleryItem] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const latestMessageCreatedAtRef = useRef<string | null>(null);

  const activeUserName = useMemo(() => getDisplayName(user), [user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setMessages([]);
      setGalleryItems([]);
      setIdeas([]);
      latestMessageCreatedAtRef.current = null;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    latestMessageCreatedAtRef.current =
      messages.filter((message) => message.id > 0).at(-1)?.created_at ?? null;
  }, [messages]);

  useEffect(() => {
    return () => {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;

    async function syncAllMessages(showLoading = false) {
      if (showLoading) {
        setIsLoadingMessages(true);
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

      setIsLoadingMessages(false);
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
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;

    async function syncSharedSections() {
      const [galleryResult, ideasResult] = await Promise.all([
        fetchGalleryItems(),
        fetchIdeas(),
      ]);

      if (!isMounted) {
        return;
      }

      if (galleryResult.error || ideasResult.error) {
        setErrorMessage("Не получилось загрузить Галерею или Идеи.");
        return;
      }

      setGalleryItems(galleryResult.data ?? []);
      setIdeas(ideasResult.data ?? []);
    }

    syncSharedSections();

    const sharedSectionsInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        syncSharedSections();
      }
    }, 5000);

    const channel = supabase
      .channel("shared-sections-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gallery_items",
        },
        (payload) => {
          const newItem = payload.new as GalleryItem;

          setGalleryItems((currentItems) => {
            if (currentItems.some((item) => item.id === newItem.id)) {
              return currentItems;
            }

            return [newItem, ...currentItems];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "gallery_items",
        },
        (payload) => {
          const deletedItem = payload.old as Pick<GalleryItem, "id">;

          setGalleryItems((currentItems) =>
            currentItems.filter((item) => item.id !== deletedItem.id),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ideas",
        },
        (payload) => {
          const newIdea = payload.new as IdeaRow;

          setIdeas((currentIdeas) => {
            if (currentIdeas.some((idea) => idea.id === newIdea.id)) {
              return currentIdeas;
            }

            return [newIdea, ...currentIdeas];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "ideas",
        },
        (payload) => {
          const deletedIdea = payload.old as Pick<IdeaRow, "id">;

          setIdeas((currentIdeas) =>
            currentIdeas.filter((idea) => idea.id !== deletedIdea.id),
          );
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.clearInterval(sharedSectionsInterval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (authMode === "sign-up") {
      const { error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: {
            display_name: authName.trim() || authEmail.trim().split("@")[0],
          },
        },
      });

      if (error) {
        setErrorMessage("Не получилось зарегистрироваться.");
      } else {
        setErrorMessage("Аккаунт создан. Если Supabase попросит, подтверди email.");
        setAuthMode("sign-in");
      }

      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });

    if (error) {
      setErrorMessage("Не получилось войти. Проверь email и пароль.");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setActiveView("profile");
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    const trimmedText = messageText.trim();

    if (!trimmedText) {
      return;
    }

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      text: trimmedText,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setMessageText("");
    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        text: trimmedText,
        user_id: user.id,
      })
      .select("id, author, text, created_at, user_id")
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

        return mergeMessages(withoutOptimisticMessage, data ? [data] : []);
      });
      setErrorMessage("");
    }
  }

  async function sendAttachment(file: File) {
    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setErrorMessage("Можно отправлять только изображения и видео.");
      return;
    }

    if (file.size > maxAttachmentSize) {
      setErrorMessage("Файл должен быть меньше 50 МБ.");
      return;
    }

    setIsUploadingAttachment(true);
    setErrorMessage("");

    const fileExtension = file.name.split(".").pop() ?? "jpg";
    const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setIsUploadingAttachment(false);
      setErrorMessage("Не получилось загрузить файл.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(filePath);

    const attachmentUrl = publicUrlData.publicUrl;
    const messagePrefix = isVideo ? videoMessagePrefix : imageMessagePrefix;
    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      text: `${messagePrefix}${attachmentUrl}`,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        text: `${messagePrefix}${attachmentUrl}`,
        user_id: user.id,
      })
      .select("id, author, text, created_at, user_id")
      .single();

    setIsUploadingAttachment(false);

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("Не получилось отправить файл.");
    } else {
      setMessages((currentMessages) => {
        const withoutOptimisticMessage = currentMessages.filter(
          (message) => message.id !== optimisticMessage.id,
        );

        return mergeMessages(withoutOptimisticMessage, data ? [data] : []);
      });
    }
  }

  async function sendVoiceMessage(audioBlob: Blob) {
    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    if (audioBlob.size > maxAttachmentSize) {
      setErrorMessage("Голосовое сообщение должно быть меньше 50 МБ.");
      return;
    }

    setIsUploadingAttachment(true);
    setErrorMessage("");

    const filePath = `${user.id}/voice-${Date.now()}-${crypto.randomUUID()}.webm`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(filePath, audioBlob, {
        cacheControl: "3600",
        contentType: audioBlob.type || "audio/webm",
        upsert: false,
      });

    if (uploadError) {
      setIsUploadingAttachment(false);
      setErrorMessage("Не получилось загрузить голосовое сообщение.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(filePath);

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      text: `${audioMessagePrefix}${publicUrlData.publicUrl}`,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        text: `${audioMessagePrefix}${publicUrlData.publicUrl}`,
        user_id: user.id,
      })
      .select("id, author, text, created_at, user_id")
      .single();

    setIsUploadingAttachment(false);

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("Не получилось отправить голосовое сообщение.");
    } else {
      setMessages((currentMessages) => {
        const withoutOptimisticMessage = currentMessages.filter(
          (message) => message.id !== optimisticMessage.id,
        );

        return mergeMessages(withoutOptimisticMessage, data ? [data] : []);
      });
    }
  }

  async function startVoiceRecording() {
    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Браузер не поддерживает запись голоса.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(recordingChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        recordingChunksRef.current = [];
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;

        if (audioBlob.size > 0) {
          sendVoiceMessage(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setErrorMessage("");
    } catch {
      setErrorMessage("Не получилось получить доступ к микрофону.");
    }
  }

  function stopVoiceRecording() {
    const mediaRecorder = mediaRecorderRef.current;

    if (!mediaRecorder) {
      return;
    }

    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    setIsRecordingVoice(false);
  }

  function toggleVoiceRecording() {
    if (isRecordingVoice) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  }

  function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      sendAttachment(file);
    }

    event.target.value = "";
  }

  async function addIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    const trimmedIdea = ideaText.trim();

    if (!trimmedIdea) {
      return;
    }

    setIdeaText("");

    const { data, error } = await supabase
      .from("ideas")
      .insert({
        author: activeUserName,
        text: trimmedIdea,
        user_id: user.id,
      })
      .select("id, user_id, author, text, created_at")
      .single();

    if (error) {
      setIdeaText(trimmedIdea);
      setErrorMessage("Не получилось сохранить идею.");
      return;
    }

    if (data) {
      setIdeas((currentIdeas) => [data, ...currentIdeas]);
    }

    setErrorMessage("");
  }

  async function uploadGalleryItem(file: File) {
    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setErrorMessage("В галерею можно загружать только фото и видео.");
      return;
    }

    if (file.size > maxAttachmentSize) {
      setErrorMessage("Файл должен быть меньше 50 МБ.");
      return;
    }

    setIsUploadingGalleryItem(true);
    setErrorMessage("");

    const fileExtension = file.name.split(".").pop() ?? "jpg";
    const filePath = `gallery/${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setIsUploadingGalleryItem(false);
      setErrorMessage("Не получилось загрузить файл в галерею.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from("gallery_items")
      .insert({
        author: activeUserName,
        caption: galleryCaption.trim() || null,
        file_type: isVideo ? "video" : "image",
        file_url: publicUrlData.publicUrl,
        user_id: user.id,
      })
      .select("id, user_id, author, file_url, file_type, caption, created_at")
      .single();

    setIsUploadingGalleryItem(false);

    if (error) {
      setErrorMessage("Файл загрузился, но не получилось сохранить его в галерее.");
      return;
    }

    if (data) {
      setGalleryItems((currentItems) => [data, ...currentItems]);
    }

    setGalleryCaption("");
    setErrorMessage("");
  }

  function handleGalleryFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      uploadGalleryItem(file);
    }

    event.target.value = "";
  }

  async function deleteGalleryItem(item: GalleryItem) {
    const previousItems = galleryItems;

    setGalleryItems((currentItems) =>
      currentItems.filter((currentItem) => currentItem.id !== item.id),
    );

    const { error } = await supabase
      .from("gallery_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      setGalleryItems(previousItems);
      setErrorMessage("Не получилось удалить файл из галереи.");
    } else {
      setErrorMessage("");
    }
  }

  async function deleteIdea(idea: IdeaRow) {
    const previousIdeas = ideas;

    setIdeas((currentIdeas) =>
      currentIdeas.filter((currentIdea) => currentIdea.id !== idea.id),
    );

    const { error } = await supabase.from("ideas").delete().eq("id", idea.id);

    if (error) {
      setIdeas(previousIdeas);
      setErrorMessage("Не получилось удалить идею.");
    } else {
      setErrorMessage("");
    }
  }

  async function deleteMessage(message: MessageRow) {
    if (!user || message.user_id !== user.id) {
      setErrorMessage("Можно удалять только свои сообщения.");
      return;
    }

    const previousMessages = messages;

    setMessages((currentMessages) =>
      currentMessages.filter((currentMessage) => currentMessage.id !== message.id),
    );

    const { data, error } = await supabase
      .from("messages")
      .delete()
      .eq("id", message.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      setMessages(previousMessages);
      setErrorMessage("Не получилось удалить сообщение из базы.");
    } else {
      setErrorMessage("");
    }
  }

  if (isAuthLoading) {
    return (
      <main className="grid h-dvh place-items-center bg-[#05080a] text-[#e3f4f4]">
        <p className="text-sm font-semibold text-[#8fb7bb]">Загружаю Twinline...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="relative grid h-dvh place-items-center overflow-hidden bg-[#05080a] px-4 text-[#e3f4f4]">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(47,174,164,0.2),transparent_32%),linear-gradient(135deg,#05080a_0%,#0b1418_48%,#030506_100%)]"
        />
        <section className="relative w-full max-w-md rounded-3xl border border-[#2faea4]/45 bg-[#0d171c]/86 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#37c6b8]">
              <span className="text-xl font-black text-[#041012]">T</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Twinline</h1>
              <p className="text-sm text-[#8fb7bb]">Вход в приватное пространство</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 rounded-xl border border-[#2faea4]/35 bg-black/20 p-1">
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                authMode === "sign-in"
                  ? "bg-[#37c6b8] text-[#041012]"
                  : "text-[#e3f4f4]"
              }`}
              onClick={() => setAuthMode("sign-in")}
              type="button"
            >
              Вход
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                authMode === "sign-up"
                  ? "bg-[#37c6b8] text-[#041012]"
                  : "text-[#e3f4f4]"
              }`}
              onClick={() => setAuthMode("sign-up")}
              type="button"
            >
              Регистрация
            </button>
          </div>

          <form className="grid gap-3" onSubmit={handleAuth}>
            {authMode === "sign-up" ? (
              <input
                className="min-h-12 rounded-xl border border-transparent bg-[#e3f4f4]/12 px-4 text-base outline-none placeholder:text-[#8fb7bb]/70 focus:border-[#37c6b8]"
                onChange={(event) => setAuthName(event.target.value)}
                placeholder="Имя в Twinline"
                type="text"
                value={authName}
              />
            ) : null}
            <input
              className="min-h-12 rounded-xl border border-transparent bg-[#e3f4f4]/12 px-4 text-base outline-none placeholder:text-[#8fb7bb]/70 focus:border-[#37c6b8]"
              onChange={(event) => setAuthEmail(event.target.value)}
              placeholder="Email"
              type="email"
              value={authEmail}
            />
            <input
              className="min-h-12 rounded-xl border border-transparent bg-[#e3f4f4]/12 px-4 text-base outline-none placeholder:text-[#8fb7bb]/70 focus:border-[#37c6b8]"
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder="Пароль"
              type="password"
              value={authPassword}
            />
            <button
              className="min-h-12 rounded-xl bg-[#37c6b8] px-4 text-sm font-bold text-[#041012] transition hover:bg-[#65d8cc]"
              type="submit"
            >
              {authMode === "sign-in" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>

          {errorMessage ? (
            <p className="mt-4 text-sm font-semibold text-[#65d8cc]">
              {errorMessage}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-[#05080a] text-[#e3f4f4]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(47,174,164,0.16),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(227,244,244,0.08),transparent_28%),linear-gradient(135deg,#05080a_0%,#0b1418_46%,#030506_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(227,244,244,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(227,244,244,0.45)_1px,transparent_1px)] [background-size:44px_44px]"
      />
      <div className="relative h-full overflow-hidden bg-[#061014]/35">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
          <header className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/82 px-3 py-3 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:mb-4 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#37c6b8] shadow-[0_8px_24px_rgba(47,174,164,0.24)] sm:h-11 sm:w-11">
                <span className="text-xl font-black text-[#041012]">T</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-normal sm:text-2xl">
                  Twinline
                </h1>
                <p className="max-w-[210px] truncate text-xs font-medium text-[#8fb7bb] sm:max-w-none sm:text-sm">
                  Приватное пространство для двоих
                </p>
              </div>
            </div>
            <button
              className="shrink-0 rounded-xl border border-[#2faea4]/35 px-3 py-2 text-xs font-bold text-[#e3f4f4] transition hover:bg-white/10 sm:text-sm"
              onClick={signOut}
              type="button"
            >
              Выйти
            </button>
          </header>

          <nav className="scrollbar-hidden mb-3 flex shrink-0 gap-2 overflow-x-auto rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/78 p-2 shadow-[0_14px_45px_rgba(0,0,0,0.24)] backdrop-blur-md lg:hidden">
            {navItems.map((item) => (
              <button
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  activeView === item.view
                    ? "bg-[#37c6b8] text-[#041012]"
                    : "text-[#e3f4f4] opacity-80 hover:bg-white/10 hover:opacity-100"
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
            <aside className="hidden min-h-0 rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/78 p-4 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md lg:block">
              <div className="mb-5">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#5bbdb4]">
                  Меню
                </p>
              </div>

              <nav className="grid gap-2">
                {navItems.map((item) => (
                  <button
                    className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                      activeView === item.view
                        ? "bg-[#37c6b8] text-[#041012]"
                        : "text-[#e3f4f4] opacity-80 hover:bg-white/10 hover:opacity-100"
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
              <div className="min-h-0 overflow-y-auto rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#2faea4]/35 pb-5 sm:mb-6">
                  <div className="flex items-center gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#37c6b8] text-xl font-black text-[#041012] sm:h-16 sm:w-16 sm:text-2xl">
                      {activeUserName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#5bbdb4]">
                        Активный профиль
                      </p>
                      <h2 className="text-2xl font-semibold sm:text-3xl">
                        {activeUserName}
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <section className="rounded-2xl border border-[#2faea4]/35 bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5bbdb4]">
                      Email
                    </p>
                    <p className="mt-3 break-words text-lg font-semibold">
                      {user.email}
                    </p>
                  </section>

                  <section className="rounded-2xl border border-[#2faea4]/35 bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5bbdb4]">
                      Доступ
                    </p>
                    <p className="mt-3 text-lg font-semibold">
                      Авторизован
                    </p>
                  </section>

                  <section className="rounded-2xl border border-[#2faea4]/35 bg-black/20 p-4 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5bbdb4]">
                      О профиле
                    </p>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#e3f4f4]">
                      Теперь Twinline понимает, кто открыл сайт. Сообщения и
                      файлы привязаны к твоему аккаунту, а удалять можно только
                      свои сообщения.
                    </p>
                  </section>
                </div>
              </div>
            ) : activeView === "gallery" ? (
              <div className="min-h-0 overflow-y-auto rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-5">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[#2faea4]/35 pb-5">
                  <div>
                    <p className="text-sm font-medium text-[#5bbdb4]">Общий раздел</p>
                    <h2 className="text-2xl font-semibold sm:text-3xl">Галерея</h2>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <input
                      className="min-h-11 min-w-0 flex-1 rounded-xl border border-transparent bg-[#e3f4f4]/12 px-3 text-sm outline-none placeholder:text-[#8fb7bb]/70 focus:border-[#37c6b8] sm:w-64"
                      onChange={(event) => setGalleryCaption(event.target.value)}
                      placeholder="Подпись к фото..."
                      type="text"
                      value={galleryCaption}
                    />
                    <input
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleGalleryFileChange}
                      ref={galleryInputRef}
                      type="file"
                    />
                    <button
                      className="min-h-11 rounded-xl bg-[#37c6b8] px-4 text-sm font-bold text-[#041012] transition hover:bg-[#65d8cc] disabled:cursor-not-allowed disabled:bg-[#52666a]"
                      disabled={isUploadingGalleryItem}
                      onClick={() => galleryInputRef.current?.click()}
                      type="button"
                    >
                      {isUploadingGalleryItem ? "Загрузка..." : "Добавить"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {galleryItems.length === 0 ? (
                    <article className="rounded-2xl border border-dashed border-[#2faea4]/45 bg-black/20 p-6 text-center sm:col-span-2 xl:col-span-3">
                      <p className="text-base font-semibold">Галерея пока пустая</p>
                      <p className="mt-2 text-sm text-[#8fb7bb]">
                        Загрузи первое фото или видео, и оно будет видно вам обоим.
                      </p>
                    </article>
                  ) : null}

                  {galleryItems.map((item) => (
                    <article
                      className="overflow-hidden rounded-2xl border border-[#2faea4]/35 bg-black/20"
                      key={item.id}
                    >
                      {item.file_type === "image" ? (
                        <button
                          className="block aspect-[16/10] w-full overflow-hidden sm:aspect-[4/5]"
                          onClick={() => setSelectedImageUrl(item.file_url)}
                          type="button"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={item.caption ?? "Фото из галереи"}
                            className="h-full w-full object-cover"
                            src={item.file_url}
                          />
                        </button>
                      ) : (
                        <video
                          className="aspect-[16/10] w-full bg-black object-cover sm:aspect-[4/5]"
                          controls
                          preload="metadata"
                          src={item.file_url}
                        />
                      )}
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold">{item.author}</p>
                          <button
                            className="rounded-lg border border-[#2faea4]/35 px-2 py-1 text-[11px] font-bold text-[#8fb7bb] transition hover:bg-white/10 hover:text-[#e3f4f4]"
                            onClick={() => deleteGalleryItem(item)}
                            type="button"
                          >
                            Удалить
                          </button>
                        </div>
                        {item.caption ? (
                          <p className="mt-1 text-sm text-[#8fb7bb]">{item.caption}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-[#5f8185]">
                          {formatMessageTime(item.created_at)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : activeView === "ideas" ? (
              <div className="min-h-0 overflow-y-auto rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-5">
                <div className="mb-5 border-b border-[#2faea4]/35 pb-5">
                  <p className="text-sm font-medium text-[#5bbdb4]">Общий раздел</p>
                  <h2 className="text-2xl font-semibold sm:text-3xl">Идеи</h2>
                </div>

                <form
                  className="mb-4 flex gap-2 rounded-2xl border border-[#2faea4]/35 bg-black/20 p-2"
                  onSubmit={addIdea}
                >
                  <input
                    className="min-h-12 min-w-0 flex-1 rounded-xl border border-transparent bg-[#e3f4f4]/12 px-4 text-base outline-none placeholder:text-[#8fb7bb]/70 focus:border-[#37c6b8]"
                    onChange={(event) => setIdeaText(event.target.value)}
                    placeholder="Напиши общую идею..."
                    type="text"
                    value={ideaText}
                  />
                  <button
                    className="min-h-12 rounded-xl bg-[#37c6b8] px-4 text-sm font-bold text-[#041012] transition hover:bg-[#65d8cc] disabled:cursor-not-allowed disabled:bg-[#52666a]"
                    disabled={!ideaText.trim()}
                    type="submit"
                  >
                    Добавить
                  </button>
                </form>

                <div className="grid gap-3">
                  {ideas.length === 0 ? (
                    <article className="rounded-2xl border border-dashed border-[#2faea4]/45 bg-black/20 p-6 text-center">
                      <p className="text-base font-semibold">Идей пока нет</p>
                      <p className="mt-2 text-sm text-[#8fb7bb]">
                        Добавьте первую идею, и она сохранится здесь для вас обоих.
                      </p>
                    </article>
                  ) : null}

                  {ideas.map((idea) => (
                    <article
                      className="rounded-2xl border border-[#2faea4]/35 bg-black/20 p-4"
                      key={idea.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-base font-semibold text-[#e3f4f4]">
                          {idea.text}
                        </p>
                        <button
                          className="shrink-0 rounded-lg border border-[#2faea4]/35 px-2 py-1 text-[11px] font-bold text-[#8fb7bb] transition hover:bg-white/10 hover:text-[#e3f4f4]"
                          onClick={() => deleteIdea(idea)}
                          type="button"
                        >
                          Удалить
                        </button>
                      </div>
                      <p className="mt-3 text-xs font-semibold text-[#8fb7bb]">
                        {idea.author} · {formatMessageTime(idea.created_at)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/78 px-3 py-3 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:mb-4 sm:px-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-[#37c6b8] text-base font-semibold text-[#041012]">
                      {activeUserName[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">
                        Приватный чат
                      </h2>
                      <p className="truncate text-sm text-[#8fb7bb]">
                        Сейчас пишешь как: {activeUserName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="scrollbar-hidden flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-[#2faea4]/45 bg-[#081216]/82 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-4">
                  {isLoadingMessages ? (
                    <p className="text-sm text-[#8fb7bb]">Загружаю сообщения...</p>
                  ) : null}

                  {!isLoadingMessages && messages.length === 0 ? (
                    <p className="text-sm text-[#8fb7bb]">
                      Сообщений пока нет. Напиши первое.
                    </p>
                  ) : null}

                  {messages.map((message) => {
                    const isMine = message.user_id === user.id;
                    const imageUrl = getMessageImageUrl(message.text);
                    const videoUrl = getMessageVideoUrl(message.text);
                    const audioUrl = getMessageAudioUrl(message.text);
                    const hasAttachment = Boolean(imageUrl || videoUrl || audioUrl);

                    return (
                      <article
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        key={message.id}
                      >
                        <div
                          className={`max-w-[92%] rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.18)] sm:max-w-[72%] ${
                            hasAttachment ? "p-2" : "px-3.5 py-2.5"
                          } ${
                            isMine
                              ? "rounded-br-md bg-[#2faea4] text-[#031012]"
                              : "rounded-bl-md bg-[#eaf6f6] text-[#071316]"
                          }`}
                        >
                          <p className={`${hasAttachment ? "mb-1.5 px-1" : "mb-0.5"} text-[11px] font-bold leading-4 opacity-55`}>
                            {message.author}
                          </p>
                          {imageUrl ? (
                            <button
                              className="block w-full overflow-hidden rounded-xl"
                              onClick={() => setSelectedImageUrl(imageUrl)}
                              type="button"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt="Отправленное изображение"
                                className="max-h-[420px] w-full object-cover"
                                src={imageUrl}
                              />
                            </button>
                          ) : videoUrl ? (
                          <video
                            className="max-h-[420px] w-full rounded-xl bg-black"
                            controls
                            preload="metadata"
                            src={videoUrl}
                          />
                        ) : audioUrl ? (
                          <div className="rounded-xl bg-black/15 p-2">
                            <p className="mb-2 text-sm font-semibold opacity-75">
                              Голосовое сообщение
                            </p>
                            <audio
                              className="w-full min-w-64 max-w-full"
                              controls
                              preload="metadata"
                              src={audioUrl}
                            />
                          </div>
                        ) : (
                            <p className="whitespace-pre-wrap break-words text-[15px] leading-6">
                              {message.text}
                            </p>
                          )}
                          <div className={`${hasAttachment ? "mt-2 px-1" : "mt-1"} flex items-center justify-end gap-3`}>
                            {isMine ? (
                              <button
                                className="text-[11px] font-semibold opacity-55 transition hover:opacity-90"
                                onClick={() => deleteMessage(message)}
                                type="button"
                              >
                                Удалить
                              </button>
                            ) : null}
                            <p
                              className={`text-right text-[11px] font-medium ${
                                isMine ? "text-[#0b4643]" : "text-[#6d878a]"
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
                  className="mt-3 flex gap-2 rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/82 p-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:mt-4"
                  onSubmit={sendMessage}
                >
                  <input
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleAttachmentChange}
                    ref={imageInputRef}
                    type="file"
                  />
                  <button
                    aria-label="Прикрепить файл"
                    className="grid min-h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#2faea4]/35 bg-[#e3f4f4]/12 text-[#e3f4f4] transition hover:bg-[#e3f4f4]/18 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isUploadingAttachment || isRecordingVoice}
                    onClick={() => imageInputRef.current?.click()}
                    type="button"
                  >
                    {isUploadingAttachment ? (
                      <span className="h-4 w-4 rounded-full border-2 border-[#37c6b8] border-t-transparent" />
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
                  <button
                    aria-label={isRecordingVoice ? "Остановить запись" : "Записать голосовое"}
                    className={`grid min-h-12 w-12 shrink-0 place-items-center rounded-lg border text-[#e3f4f4] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isRecordingVoice
                        ? "border-red-400/60 bg-red-500/25"
                        : "border-[#2faea4]/35 bg-[#e3f4f4]/12 hover:bg-[#e3f4f4]/18"
                    }`}
                    disabled={isUploadingAttachment}
                    onClick={toggleVoiceRecording}
                    type="button"
                  >
                    {isRecordingVoice ? (
                      <span className="h-3.5 w-3.5 rounded-sm bg-red-300" />
                    ) : (
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                        <path
                          d="M19 11a7 7 0 0 1-14 0M12 18v3M9 21h6"
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
                    className="min-h-12 min-w-0 flex-1 rounded-lg border border-transparent bg-[#e3f4f4]/12 px-3 text-base text-[#e3f4f4] outline-none transition placeholder:text-[#8fb7bb]/70 focus:border-[#37c6b8] focus:bg-[#e3f4f4]/18 sm:px-4"
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder="Напиши сообщение..."
                    type="text"
                    value={messageText}
                  />
                  <button
                    className="min-h-12 rounded-lg bg-[#37c6b8] px-3 text-sm font-semibold text-[#041012] transition hover:bg-[#65d8cc] disabled:cursor-not-allowed disabled:bg-[#52666a] sm:px-5"
                    disabled={!messageText.trim() || isUploadingAttachment || isRecordingVoice}
                    type="submit"
                  >
                    Отправить
                  </button>
                </form>

                {errorMessage ? (
                  <p className="mt-2 text-sm font-medium text-[#65d8cc]">
                    {errorMessage}
                  </p>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>
      {selectedImageUrl ? (
        <button
          aria-label="Закрыть изображение"
          className="fixed inset-0 z-50 grid place-items-center bg-black/58 p-4 backdrop-blur-sm"
          onClick={() => setSelectedImageUrl(null)}
          type="button"
        >
          <span className="absolute right-4 top-4 rounded-full border border-[#2faea4]/45 bg-[#0d171c]/90 px-4 py-2 text-sm font-semibold text-[#e3f4f4]">
            Закрыть
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Просмотр изображения"
            className="max-h-[76dvh] max-w-[82vw] rounded-2xl border border-[#2faea4]/35 object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
            src={selectedImageUrl}
          />
        </button>
      ) : null}
    </main>
  );
}

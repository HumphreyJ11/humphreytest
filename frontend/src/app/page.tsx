"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";

type Topic = { id: number; title: string; description: string | null };
type MessageTone = "error" | "loading" | "success";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");
const topicsApiUrl = apiBaseUrl + "/topics";

const inputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100";
const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-3 focus:ring-indigo-200";
const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-3 focus:ring-slate-200";

function StatusMessage({ tone, children }: { tone: MessageTone; children: string }) {
  const toneClassName = {
    error: "border-red-200 bg-red-50 text-red-700",
    loading: "border-slate-200 bg-slate-50 text-slate-600",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <p
      className={"rounded-lg border px-3 py-2 text-sm " + toneClassName}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authMessageTone, setAuthMessageTone] = useState<MessageTone>("success");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topicMessage, setTopicMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    }

    void loadSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    const accessToken = session.access_token;

    async function fetchTopics() {
      setIsLoading(true);
      try {
        const response = await fetch(topicsApiUrl, {
          headers: { Authorization: "Bearer " + accessToken },
        });
        if (!response.ok) throw new Error("The topics request failed.");

        const data: Topic[] = await response.json();
        setTopics(data);
        setError(null);
      } catch {
        setError("Could not load topics from the backend.");
      } finally {
        setIsLoading(false);
      }
    }

    void fetchTopics();
  }, [session]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthMessage(error.message);
      setAuthMessageTone("error");
      return;
    }

    setSession(data.session);
    setAuthMessage("Signed in successfully.");
    setAuthMessageTone("success");
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthMessage(error.message);
      setAuthMessageTone("error");
      return;
    }

    setSession(null);
    setTopics([]);
    setEditingTopicId(null);
    setAuthMessage("Signed out.");
    setAuthMessageTone("success");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Please enter a topic title.");
      return;
    }

    try {
      const response = await fetch(topicsApiUrl, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + session.access_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: trimmedTitle, description: description.trim() || null }),
      });
      if (!response.ok) throw new Error("The create topic request failed.");

      const newTopic: Topic = await response.json();
      setTopics((currentTopics) => [...currentTopics, newTopic]);
      setTitle("");
      setDescription("");
      setError(null);
      setTopicMessage("Topic added.");
    } catch {
      setError("Could not create the topic. Please try again.");
    }
  }

  function startEditing(topic: Topic) {
    setEditingTopicId(topic.id);
    setEditTitle(topic.title);
    setEditDescription(topic.description ?? "");
    setError(null);
    setTopicMessage(null);
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || editingTopicId === null) return;

    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setError("Please enter a topic title.");
      return;
    }

    try {
      const response = await fetch(topicsApiUrl + "/" + editingTopicId, {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + session.access_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          description: editDescription.trim() || null,
        }),
      });
      if (!response.ok) throw new Error("The update topic request failed.");

      const updatedTopic: Topic = await response.json();
      setTopics((currentTopics) =>
        currentTopics.map((topic) => (topic.id === updatedTopic.id ? updatedTopic : topic)),
      );
      setEditingTopicId(null);
      setError(null);
      setTopicMessage("Topic updated.");
    } catch {
      setError("Could not update the topic. Please try again.");
    }
  }

  async function handleDelete(topicId: number) {
    if (!session) return;

    try {
      const response = await fetch(topicsApiUrl + "/" + topicId, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + session.access_token },
      });
      if (!response.ok) throw new Error("The delete topic request failed.");

      setTopics((currentTopics) => currentTopics.filter((topic) => topic.id !== topicId));
      setError(null);
      setTopicMessage("Topic deleted.");
    } catch {
      setError("Could not delete the topic. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-950">LearnLog</h1>
            <p className="mt-0.5 text-sm text-slate-500">Learning tracker</p>
          </div>
          {session && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <p className="max-w-48 truncate text-sm text-slate-600" title={session.user.email}>
                {session.user.email}
              </p>
              <button className={secondaryButtonClassName} type="button" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          )}
        </header>

        {session ? (
          <div className="space-y-6 pt-8">
            {authMessage && <StatusMessage tone={authMessageTone}>{authMessage}</StatusMessage>}
            <section>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Topics</h2>
              <p className="mt-1 text-sm text-slate-600">
                Keep track of the subjects you&apos;re currently learning.
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <h3 className="text-base font-semibold text-slate-900">Add Topic</h3>
                <p className="mt-1 text-sm text-slate-500">Add a subject you want to keep learning.</p>
              </div>
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="title">Title</label>
                  <input className={inputClassName} id="title" onChange={(event) => setTitle(event.target.value)} placeholder="For example, React" value={title} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="description">
                    Description <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea className={inputClassName + " min-h-24 resize-y"} id="description" onChange={(event) => setDescription(event.target.value)} placeholder="What would you like to learn?" value={description} />
                </div>
                <div><button className={primaryButtonClassName} type="submit">Add Topic</button></div>
              </form>
            </section>

            <section aria-labelledby="topic-list-heading">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="text-base font-semibold text-slate-900" id="topic-list-heading">Your topics</h3>
                <span className="text-sm text-slate-500">{topics.length} {topics.length === 1 ? "topic" : "topics"}</span>
              </div>
              <div className="space-y-3">
                {isLoading && <StatusMessage tone="loading">Loading topics...</StatusMessage>}
                {error && <StatusMessage tone="error">{error}</StatusMessage>}
                {topicMessage && <StatusMessage tone="success">{topicMessage}</StatusMessage>}

                {!isLoading && topics.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                    <h4 className="font-medium text-slate-900">No topics yet</h4>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                      Add your first topic above to start tracking what you&apos;re learning.
                    </p>
                  </div>
                )}

                {topics.map((topic) => (
                  <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={topic.id}>
                    {editingTopicId === topic.id ? (
                      <form className="space-y-4" onSubmit={handleEdit}>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor={"edit-title-" + topic.id}>Title</label>
                          <input className={inputClassName} id={"edit-title-" + topic.id} onChange={(event) => setEditTitle(event.target.value)} value={editTitle} />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor={"edit-description-" + topic.id}>
                            Description <span className="font-normal text-slate-400">(optional)</span>
                          </label>
                          <textarea className={inputClassName + " min-h-24 resize-y"} id={"edit-description-" + topic.id} onChange={(event) => setEditDescription(event.target.value)} value={editDescription} />
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button className={primaryButtonClassName} type="submit">Save Topic</button>
                          <button className={secondaryButtonClassName} type="button" onClick={() => setEditingTopicId(null)}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h4 className="text-base font-semibold text-slate-900">{topic.title}</h4>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{topic.description ?? "No description provided."}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-3">
                          <button className={secondaryButtonClassName} type="button" onClick={() => startEditing(topic)}>Edit</button>
                          <button className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-3 focus:ring-red-100" type="button" onClick={() => handleDelete(topic.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <section className="mx-auto max-w-md pt-12 sm:pt-16" aria-labelledby="sign-in-heading">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950" id="sign-in-heading">Sign in to LearnLog</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Track what you&apos;re learning and keep your progress organized.
                </p>
              </div>
              <form className="space-y-4" onSubmit={handleSignIn}>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="email">Email</label>
                  <input autoComplete="email" className={inputClassName} id="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="password">Password</label>
                  <input autoComplete="current-password" className={inputClassName} id="password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
                </div>
                <button className={primaryButtonClassName + " w-full"} type="submit">Sign In</button>
              </form>
              <p className="mt-5 text-center text-xs text-slate-500">Accounts are created by an administrator.</p>
              {authMessage && <div className="mt-4"><StatusMessage tone={authMessageTone}>{authMessage}</StatusMessage></div>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

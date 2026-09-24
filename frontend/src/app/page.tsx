"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";

type Topic = { id: number; title: string; description: string | null };

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");
const topicsApiUrl = `${apiBaseUrl}/topics`;

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    }

    void loadSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => setSession(nextSession),
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    const accessToken = session.access_token;

    async function fetchTopics() {
      setIsLoading(true);

      try {
        const response = await fetch(topicsApiUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
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

  async function handleSignIn() {
    setAuthMessage(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setSession(data.session);
    setAuthMessage("Signed in successfully.");
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setSession(null);
    setTopics([]);
    setEditingTopicId(null);
    setAuthMessage("Signed out.");
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
          Authorization: `Bearer ${session.access_token}`,
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
    } catch {
      setError("Could not create the topic. Please try again.");
    }
  }

  function startEditing(topic: Topic) {
    setEditingTopicId(topic.id);
    setEditTitle(topic.title);
    setEditDescription(topic.description ?? "");
    setError(null);
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
      const response = await fetch(`${topicsApiUrl}/${editingTopicId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
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
        currentTopics.map((topic) => topic.id === updatedTopic.id ? updatedTopic : topic),
      );
      setEditingTopicId(null);
      setError(null);
    } catch {
      setError("Could not update the topic. Please try again.");
    }
  }

  async function handleDelete(topicId: number) {
    if (!session) return;

    try {
      const response = await fetch(`${topicsApiUrl}/${topicId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error("The delete topic request failed.");

      setTopics((currentTopics) => currentTopics.filter((topic) => topic.id !== topicId));
      setError(null);
    } catch {
      setError("Could not delete the topic. Please try again.");
    }
  }

  return (
    <main>
      <h1>LearnLog</h1>
      <h2>Account</h2>

      {session ? (
        <>
          <p>Signed in as {session.user.email}</p>
          <button type="button" onClick={handleSignOut}>Sign Out</button>
        </>
      ) : (
        <>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <p>Accounts are created by an administrator.</p>
          <button type="button" onClick={handleSignIn}>Sign In</button>
        </>
      )}
      {authMessage && <p>{authMessage}</p>}

      {session && (
        <>
          <h2>Topics</h2>
          {isLoading ? <p>Loading topics...</p> : topics.length > 0 ? (
            <ul>
              {topics.map((topic) => (
                <li key={topic.id}>
                  {editingTopicId === topic.id ? (
                    <form onSubmit={handleEdit}>
                      <label htmlFor="edit-title">Title</label>
                      <input id="edit-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                      <label htmlFor="edit-description">Description</label>
                      <textarea id="edit-description" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} />
                      <button type="submit">Save Topic</button>
                      <button type="button" onClick={() => setEditingTopicId(null)}>Cancel</button>
                    </form>
                  ) : (
                    <>
                      <h3>{topic.title}</h3>
                      <p>{topic.description ?? "No description provided."}</p>
                      <button type="button" onClick={() => startEditing(topic)}>Edit</button>
                      <button type="button" onClick={() => handleDelete(topic.id)}>Delete</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : <p>No topics yet.</p>}
          {error && <p>{error}</p>}
          <h2>Add Topic</h2>
          <form onSubmit={handleSubmit}>
            <label htmlFor="title">Title</label>
            <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <label htmlFor="description">Description</label>
            <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} />
            <button type="submit">Create Topic</button>
          </form>
        </>
      )}
    </main>
  );
}

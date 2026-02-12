"use client";

import useSWR, { mutate } from "swr";
import { supabase } from "../lib/supabase";

interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
}

const fetcher = async (url: string) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("No session");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) throw new Error("Failed to fetch");

  return response.json();
};

export default function BookmarkList() {
  const {
    data: bookmarks,
    error,
    isLoading,
  } = useSWR<Bookmark[]>("/api/bookmarks", fetcher, {
    refreshInterval: 2000, // Poll every 2 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this bookmark?")) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      // Optimistic update
      mutate(
        "/api/bookmarks",
        bookmarks?.filter((b) => b.id !== id),
        false,
      );

      const response = await fetch(`/api/bookmarks/${id}/delete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      // Revalidate
      mutate("/api/bookmarks");
    } catch (error) {
      console.error("Error deleting bookmark:", error);
      alert("Failed to delete bookmark");
      // Revert on error
      mutate("/api/bookmarks");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-red-500">Failed to load bookmarks</p>
      </div>
    );
  }

  if (!bookmarks || bookmarks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">
          No bookmarks yet. Add your first one above!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className="p-4 hover:bg-gray-50 transition-colors flex items-start justify-between gap-4"
        >
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">
              {bookmark.title}
            </h3>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate block"
            >
              {bookmark.url}
            </a>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(bookmark.createdAt).toLocaleDateString()}
            </p>
          </div>

          <button
            onClick={() => handleDelete(bookmark.id)}
            className="flex-shrink-0 text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/src/hooks/useAuth";
import AddBookmarkForm from "@/src/components/add-bookmark-form";
import BookmarkList from "@/src/components/bookmark-list";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔖</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Bookmarks</h1>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>

          <button
            onClick={signOut}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <AddBookmarkForm />
        <h2 className="text-lg text-gray-700 font-medium">
          Your Bookmark List
        </h2>
        <BookmarkList />
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import AppHeader from "@/app/components/AppHeader";
import { getCroppedCircleBlob, getDefaultCenterCrop } from "@/lib/cropImage";

export default function ProfilePage() {
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null);
      if (!user) setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (data) {
          setProfile(data);
          setDisplayName(data.display_name ?? "");
        }
        setLoading(false);
      });
  }, [user]);

  async function handleUpdateDisplayName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setNameError("");
    setNameSuccess(false);
    const trimmed = displayName.trim();
    if (!trimmed) {
      setNameError("Display name cannot be empty.");
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("id", user.id);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, display_name: trimmed } : null));
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setSavingName(false);
    }
  }

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  function handleAvatarFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarError("");
    setAvatarSuccess(false);
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      setAvatarError("Please choose a JPG, PNG, GIF, or WebP image (max 5 MB).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be under 5 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreviewUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setAvatarCropOpen(true);
    e.target.value = "";
  }

  function closeCropModal() {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarCropOpen(false);
    setAvatarPreviewUrl(null);
    setAvatarFile(null);
    setCroppedAreaPixels(null);
  }

  async function handleAvatarCropApply() {
    if (!avatarPreviewUrl || !user) return;
    setAvatarError("");
    setAvatarSuccess(false);
    setAvatarUploading(true);
    try {
      const cropArea =
        croppedAreaPixels ?? (await getDefaultCenterCrop(avatarPreviewUrl));
      const blob = await getCroppedCircleBlob(avatarPreviewUrl, cropArea);
      const ext = avatarFile?.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (updateError) throw updateError;
      setProfile((p) => (p ? { ...p, avatar_url: path } : null));
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 3000);
      window.dispatchEvent(new CustomEvent("profile-updated"));
      closeCropModal();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    setPasswordError("");
    setPasswordSuccess(false);
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setPasswordError("Current password is incorrect.");
        setSavingPassword(false);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-stone-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-stone-200 dark:border-stone-700 border-t-stone-600 dark:border-t-stone-400 animate-spin" />
          <p className="text-sm text-stone-500 dark:text-stone-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-stone-950">
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          Not signed in.{" "}
          <Link href="/login" className="text-accent hover:text-accent-hover font-medium transition">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-stone-950">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight mb-6">Profile</h1>

        <div className="space-y-8">
          <section className="bg-surface-card dark:bg-stone-900 rounded-2xl border border-surface-border dark:border-stone-700 p-5 shadow-soft">
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4">
              Account info
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-stone-500 dark:text-stone-400">Email</dt>
                <dd className="text-stone-800 dark:text-stone-200 font-medium">{user.email}</dd>
              </div>
              {profile && (
                <div>
                  <dt className="text-stone-500 dark:text-stone-400">Username</dt>
                  <dd className="text-stone-800 dark:text-stone-200 font-medium">{profile.username}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="bg-surface-card dark:bg-stone-900 rounded-2xl border border-surface-border dark:border-stone-700 p-5 shadow-soft">
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4">
              Profile picture
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
              Shown in the navbar. If you don’t set one, your initial is used.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              {profile?.avatar_url && process.env.NEXT_PUBLIC_SUPABASE_URL ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover border-2 border-surface-border dark:border-stone-600"
                />
              ) : (
                <span className="w-16 h-16 rounded-full bg-stone-200 dark:bg-stone-600 border-2 border-surface-border dark:border-stone-600 flex items-center justify-center text-stone-600 dark:text-stone-200 text-xl font-semibold">
                  {(profile?.display_name || user.email || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarFileSelect}
                  disabled={avatarUploading}
                  className="block w-full text-sm text-stone-500 dark:text-stone-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-stone-100 dark:file:bg-stone-700 file:text-stone-700 dark:file:text-stone-200 hover:file:bg-stone-200 dark:hover:file:bg-stone-600 disabled:opacity-50"
                />
                {avatarError && (
                  <p className="text-sm text-rose-600 mt-1">{avatarError}</p>
                )}
                {avatarSuccess && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">Profile picture updated.</p>
                )}
              </div>
            </div>

            {/* Crop modal */}
            {avatarCropOpen && avatarPreviewUrl && (
              <div
                className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="crop-modal-title"
              >
                <h2 id="crop-modal-title" className="sr-only">
                  Position and zoom your profile picture
                </h2>
                <div className="w-full max-w-md rounded-2xl overflow-hidden bg-stone-900 border border-stone-700">
                  <p className="text-center text-sm text-stone-400 py-3 px-4 border-b border-stone-700">
                    Drag the image to position it, then use the slider to zoom.
                  </p>
                  <div className="relative h-[320px] min-h-[280px] w-full bg-stone-800">
                    <Cropper
                      image={avatarPreviewUrl}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      objectFit="cover"
                      showGrid={false}
                      restrictPosition={true}
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                      style={{
                        containerStyle: { backgroundColor: "#292524" },
                      }}
                    />
                  </div>
                  <div className="p-4 space-y-4 bg-stone-900 border-t border-stone-700">
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1">Zoom</label>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-stone-700 accent-stone-400"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={closeCropModal}
                        className="flex-1 py-2.5 rounded-xl border border-stone-600 text-stone-300 text-sm font-medium hover:bg-stone-800 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAvatarCropApply}
                        disabled={avatarUploading}
                        className="flex-1 py-2.5 rounded-xl bg-white text-stone-900 text-sm font-medium hover:bg-stone-100 disabled:opacity-50 transition"
                      >
                        {avatarUploading ? "Uploading…" : "Apply"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="bg-surface-card dark:bg-stone-900 rounded-2xl border border-surface-border dark:border-stone-700 p-5 shadow-soft">
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4">
              Display name
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
              This is how your name appears on your posts.
            </p>
            <form onSubmit={handleUpdateDisplayName} className="space-y-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-surface-border dark:border-stone-600 rounded-xl px-4 py-2.5 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/15 dark:focus:ring-stone-500 focus:border-stone-400 dark:focus:border-stone-500"
              />
              {nameError && (
                <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900 px-3 py-2 rounded-lg">
                  {nameError}
                </p>
              )}
              {nameSuccess && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 px-3 py-2 rounded-lg">
                  Display name updated.
                </p>
              )}
              <button
                type="submit"
                disabled={savingName}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition shadow-card"
              >
                {savingName ? "Saving…" : "Save display name"}
              </button>
            </form>
          </section>

          <section className="bg-surface-card dark:bg-stone-900 rounded-2xl border border-surface-border dark:border-stone-700 p-5 shadow-soft">
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4">
              Change password
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
              Enter your current password, then choose a new one.
            </p>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                required
                className="w-full border border-surface-border dark:border-stone-600 rounded-xl px-4 py-2.5 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/15 dark:focus:ring-stone-500 focus:border-stone-400 dark:focus:border-stone-500"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                required
                minLength={6}
                className="w-full border border-surface-border dark:border-stone-600 rounded-xl px-4 py-2.5 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/15 dark:focus:ring-stone-500 focus:border-stone-400 dark:focus:border-stone-500"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
                className="w-full border border-surface-border dark:border-stone-600 rounded-xl px-4 py-2.5 text-sm text-stone-800 dark:text-stone-100 dark:bg-stone-800 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/15 dark:focus:ring-stone-500 focus:border-stone-400 dark:focus:border-stone-500"
              />
              {passwordError && (
                <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900 px-3 py-2 rounded-lg">
                  {passwordError}
                </p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 px-3 py-2 rounded-lg">
                  Password updated.
                </p>
              )}
              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition shadow-card"
              >
                {savingPassword ? "Updating…" : "Change password"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

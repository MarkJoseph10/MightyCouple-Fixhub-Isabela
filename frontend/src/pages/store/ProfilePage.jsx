import { Capacitor } from "@capacitor/core";
import { Camera, CheckCircle2, ImagePlus, LoaderCircle, LockKeyhole, Save, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import PasswordInput from "../../components/common/PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { getMyProfile, updateMyPassword, updateMyProfile } from "../../services/profileService";
import { optimizeImageUrl } from "../../utils/media";
import { captureImageFile, isNativeMediaAvailable, pickImageFile } from "../../utils/nativeMedia";

function buildInitials(value) {
  return String(value || "")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

export default function ProfilePage() {
  const { refreshUser } = useAuth();
  const isNativeApp = Capacitor.isNativePlatform();
  const nativeMediaEnabled = isNativeApp && isNativeMediaAvailable();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    gender: ""
  });
  const currentPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const data = await getMyProfile();
        if (!mounted) {
          return;
        }

        setProfile(data);
        setProfileForm({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          birthDate: data.birthDate || "",
          gender: data.gender || ""
        });
      } catch (requestError) {
        if (!mounted) {
          return;
        }
        setError(requestError.response?.data?.message || "Unable to load your profile right now.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
  }, [avatarPreview]);

  const effectiveAvatar = useMemo(() => {
    if (avatarPreview) {
      return avatarPreview;
    }

    if (!removeAvatar && profile?.avatar) {
      return optimizeImageUrl(profile.avatar, { width: 160, height: 160, fit: "fill" });
    }

    return "";
  }, [avatarPreview, profile?.avatar, removeAvatar]);

  const initials = useMemo(() => buildInitials(profileForm.name || profile?.name || "MC"), [profile?.name, profileForm.name]);
  const profileSummaryItems = useMemo(() => {
    const items = [
      profile?.email ? { label: "Email", value: profile.email } : null,
      profile?.phone ? { label: "Phone", value: profile.phone } : null,
      profile?.role ? { label: "Role", value: profile.role } : null
    ];

    if (profile?.role !== "admin" && profile?.birthDate) {
      items.push({ label: "Birthday", value: profile.birthDate });
    }

    return items.filter(Boolean);
  }, [profile?.birthDate, profile?.email, profile?.phone, profile?.role]);

  function handleProfileField(field, value) {
    setProfileForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "firstName" || field === "lastName") {
        next.name = [field === "firstName" ? value : current.firstName, field === "lastName" ? value : current.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
      }

      return next;
    });
  }

  function applyAvatarFile(file) {
    if (!file) {
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
    setMessage("");
    setError("");
  }

  function handleAvatarSelect(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    applyAvatarFile(file);
  }

  function handleRemoveAvatar() {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarPreview("");
    setAvatarFile(null);
    setRemoveAvatar(true);
    setMessage("");
    setError("");
  }

  async function handleCaptureAvatar() {
    try {
      const file = await captureImageFile("profile-camera");
      applyAvatarFile(file);
    } catch (requestError) {
      setError(requestError?.message || "Unable to open the camera right now.");
    }
  }

  async function handlePickAvatar() {
    try {
      const file = await pickImageFile("profile-gallery");
      applyAvatarFile(file);
    } catch (requestError) {
      setError(requestError?.message || "Unable to open the gallery right now.");
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileSaving(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("firstName", profileForm.firstName);
      formData.append("lastName", profileForm.lastName);
      formData.append("name", profileForm.name);
      formData.append("email", profileForm.email);
      formData.append("phone", profileForm.phone);
      if (profile?.role !== "admin") {
        formData.append("birthDate", profileForm.birthDate || "");
        formData.append("gender", profileForm.gender || "");
      }
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }
      if (removeAvatar) {
        formData.append("removeAvatar", "true");
      }

      const data = await updateMyProfile(formData);
      setProfile(data.user);
      setProfileForm({
        firstName: data.user.firstName || "",
        lastName: data.user.lastName || "",
        name: data.user.name || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
        birthDate: data.user.birthDate || "",
        gender: data.user.gender || ""
      });
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview("");
      setRemoveAvatar(false);
      await refreshUser();
      setMessage(data.message || "Profile updated successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save your profile right now.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordSaving(true);
    setMessage("");
    setError("");

    try {
      const data = await updateMyPassword({
        currentPassword: currentPasswordRef.current?.value || "",
        newPassword: newPasswordRef.current?.value || "",
        confirmPassword: confirmPasswordRef.current?.value || ""
      });
      if (currentPasswordRef.current) currentPasswordRef.current.value = "";
      if (newPasswordRef.current) newPasswordRef.current.value = "";
      if (confirmPasswordRef.current) confirmPasswordRef.current.value = "";
      setMessage(data.message || "Password updated successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update your password right now.");
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={`page-shell ${isNativeApp ? "py-4" : "py-12"}`}>
        <div className={`mx-auto flex max-w-5xl items-center justify-center border border-white/10 bg-slate-950/50 text-slate-300 ${isNativeApp ? "rounded-[24px] p-8 text-sm" : "rounded-[36px] p-16"}`}>
          <LoaderCircle size={20} className="mr-3 animate-spin" />
          Loading your profile...
        </div>
      </div>
    );
  }

  return (
    <div className={`page-shell py-10 ${isNativeApp ? "py-3 pb-24" : ""}`}>
      <div className={`mx-auto max-w-6xl space-y-6 ${isNativeApp ? "space-y-4" : ""}`}>
        <section className={`grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] ${isNativeApp ? "gap-4" : ""}`}>
          <div className={`glass-panel shadow-ambient ${isNativeApp ? "rounded-[24px] p-4" : "rounded-[32px] p-6"}`}>
            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Profile</p>
            <h1 className={`mt-3 font-semibold text-white ${isNativeApp ? "text-[1.55rem]" : "text-3xl"}`}>Personal details and security</h1>
            <p className={`mt-3 text-sm leading-7 text-slate-300 ${isNativeApp ? "max-w-none" : ""}`}>
              Keep your account details updated so orders, repairs, and support messages always point to the right contact information.
            </p>

            <div className={`mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] ${isNativeApp ? "space-y-4 rounded-[22px] p-4" : "p-5 text-center"}`}>
              <div className={`mx-auto flex items-center justify-center overflow-hidden border border-white/10 bg-gradient-to-br from-brand-500 to-orange-400 text-2xl font-semibold text-white ${isNativeApp ? "h-16 w-16 rounded-[20px]" : "h-28 w-28 rounded-[28px]"}`}>
                {effectiveAvatar ? (
                  <img src={effectiveAvatar} alt={profile?.name || "Profile"} className="h-full w-full object-cover" />
                ) : (
                  initials || "MC"
                )}
              </div>
              <p className={`text-lg font-semibold text-white ${isNativeApp ? "mt-3 text-base" : "mt-4"}`}>{profile?.name}</p>
              <p className={`text-slate-400 ${isNativeApp ? "mt-1 text-[12px]" : "mt-1 text-sm"}`}>{profile?.email}</p>
              {profile?.role !== "admin" && profile?.birthDate ? (
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {profile.birthDate} {profile?.gender ? `• ${String(profile.gender).replaceAll("_", " ")}` : ""}
                </p>
              ) : null}
              <p className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                {profile?.role || "customer"}
              </p>

              {isNativeApp ? (
                <div className="mt-4 grid gap-2">
                  {profileSummaryItems.map((item) => (
                    <div key={item.label} className="rounded-[16px] border border-white/10 bg-slate-950/30 px-3 py-2.5 text-left">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                      <p className="mt-2 break-words text-sm font-medium text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

                <label className={`mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 ${isNativeApp ? "w-full" : ""}`}>
                  <Camera size={16} />
                  Upload profile picture
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                </label>
                {nativeMediaEnabled ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleCaptureAvatar}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      <Camera size={15} />
                      Take photo
                    </button>
                    <button
                      type="button"
                      onClick={handlePickAvatar}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      <ImagePlus size={15} />
                      Choose from gallery
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                className="mt-3 block w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                Remove current photo
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {(message || error) && (
              <div className={`rounded-[28px] border px-5 py-4 text-sm ${error ? "border-rose-400/20 bg-rose-500/10 text-rose-100" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-50"}`}>
                {message || error}
              </div>
            )}

            <form id="profile-form" onSubmit={handleProfileSubmit} className={`glass-panel shadow-ambient ${isNativeApp ? "rounded-[24px] p-4" : "rounded-[32px] p-6"}`}>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/10 bg-white/5 text-white">
                  <UserRound size={20} />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Personal details</p>
                  <h2 className={`mt-1 font-semibold text-white ${isNativeApp ? "text-lg" : "text-xl"}`}>Edit your profile information</h2>
                </div>
              </div>

              <div className={`mt-5 grid gap-4 md:grid-cols-2 ${isNativeApp ? "gap-3" : ""}`}>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">First name</span>
                  <input
                    value={profileForm.firstName}
                    onChange={(event) => handleProfileField("firstName", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                    placeholder="First name"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Last name</span>
                  <input
                    value={profileForm.lastName}
                    onChange={(event) => handleProfileField("lastName", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                    placeholder="Last name"
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Full name</span>
                  <input
                    value={profileForm.name}
                    onChange={(event) => handleProfileField("name", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                    placeholder="Your full name"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Email address</span>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(event) => handleProfileField("email", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                    placeholder="you@example.com"
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Mobile number</span>
                  <input
                    value={profileForm.phone}
                    onChange={(event) => handleProfileField("phone", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                    placeholder="09XXXXXXXXX"
                  />
                </label>
                {profile?.role !== "admin" ? (
                  <>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Birthday / Date of birth</span>
                      <input
                        type="date"
                        value={profileForm.birthDate}
                        onChange={(event) => handleProfileField("birthDate", event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Gender</span>
                      <select
                        value={profileForm.gender}
                        onChange={(event) => handleProfileField("gender", event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                      >
                        <option value="">Select your gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </label>
                  </>
                ) : null}
              </div>

              <div className={`mt-6 flex flex-wrap items-center gap-3 ${isNativeApp ? "hidden" : ""}`}>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {profileSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
                  Save profile changes
                </button>
                <p className="text-sm text-slate-400">
                  This updates the {profile?.role !== "admin" ? "name, email, number, birthday, and photo" : "name, email, number, and photo"} you use across the store.
                </p>
              </div>
            </form>

            <section className={`glass-panel shadow-ambient ${isNativeApp ? "rounded-[24px] p-4" : "rounded-[32px] p-6"}`}>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/10 bg-white/5 text-white">
                  <ShieldCheck size={20} />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Password and security</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Keep your account secure</h2>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-300">
                <p className="font-semibold text-white">Sign-in method</p>
                <p className="mt-2">
                  {profile?.authProvider === "local"
                    ? "You use an email and password account."
                    : `You currently sign in with ${String(profile?.authProvider || "social").replace(/^./, (value) => value.toUpperCase())}.`}
                </p>
              </div>

              {profile?.hasPassword ? (
                <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Current password</span>
                    <PasswordInput
                      ref={currentPasswordRef}
                      autoComplete="current-password"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 pr-14 text-white outline-none transition focus:border-brand-400/50"
                      placeholder="Enter your current password"
                    />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-slate-400">New password</span>
                      <PasswordInput
                        ref={newPasswordRef}
                        autoComplete="new-password"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 pr-14 text-white outline-none transition focus:border-brand-400/50"
                        placeholder="At least 8 characters"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Confirm new password</span>
                      <PasswordInput
                        ref={confirmPasswordRef}
                        autoComplete="new-password"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 pr-14 text-white outline-none transition focus:border-brand-400/50"
                        placeholder="Type it again"
                      />
                    </label>
                  </div>

                  <div className={`flex flex-wrap items-center gap-3 ${isNativeApp ? "flex-col items-stretch" : ""}`}>
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className={`inline-flex min-h-[52px] items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60 ${isNativeApp ? "w-full justify-center" : ""}`}
                    >
                      {passwordSaving ? <LoaderCircle size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
                      Update password
                    </button>
                    <p className="text-sm text-slate-400">Use at least 8 characters with uppercase, lowercase, and a number.</p>
                  </div>
                </form>
              ) : (
                <div className="mt-6 rounded-[24px] border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
                  This account currently uses social sign-in, so password changes are not available from this page yet.
                </div>
              )}
            </section>

            {!isNativeApp ? (
              <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="mt-0.5 text-emerald-300" />
                <div>
                  <h2 className="text-lg font-semibold text-white">What updates here affect</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                  Your account details here are used across checkout, repair bookings, chat identity, and support contact details so the store always reaches the right person.
                  </p>
                </div>
              </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>

      {isNativeApp ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[84px] z-30 px-4">
          <div className="pointer-events-auto mx-auto max-w-6xl rounded-[24px] border border-white/10 bg-slate-950/85 p-3 shadow-[0_20px_60px_rgba(2,6,23,0.55)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Profile</p>
                <p className="truncate text-sm text-slate-200">Save your latest personal details and photo.</p>
              </div>
              <button
                type="submit"
                form="profile-form"
                disabled={profileSaving}
                className="inline-flex min-h-[52px] shrink-0 items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {profileSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
